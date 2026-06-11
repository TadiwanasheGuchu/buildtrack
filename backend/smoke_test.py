"""End-to-end smoke test for Phase 12 (notifications) + Phase 13 (reports).

Runs against the real dev database via FastAPI TestClient (no network needed).
Creates a throwaway company, exercises the new endpoints, then cleans up.
"""
import sys
import uuid
from fastapi.testclient import TestClient
from app.main import app
from app.database import SessionLocal
from app.models.company import Company
from app.models.notification import Notification
from app.models.user import User

PASS = 0
FAIL = 0


def check(label: str, cond: bool, detail: str = ''):
    global PASS, FAIL
    if cond:
        PASS += 1
        print(f'  PASS  {label}')
    else:
        FAIL += 1
        print(f'  FAIL  {label}  {detail}')


run_id = uuid.uuid4().hex[:8]
email = f'smoke-{run_id}@buildtrack-smoke.com'

with TestClient(app) as client:
    print('-- Health --')
    r = client.get('/health')
    check('GET /health', r.status_code == 200 and r.json()['status'] == 'ok', str(r.status_code))

    print('-- Auth --')
    r = client.post('/auth/register', json={
        'company_name': f'Smoke Test Co {run_id}',
        'name': 'Smoke Tester',
        'email': email,
        'password': 'Password123!',
    })
    check('POST /auth/register', r.status_code == 201, r.text[:200])
    token = r.json()['access_token']
    H = {'Authorization': f'Bearer {token}'}

    print('-- Notifications: empty state --')
    r = client.get('/notifications', headers=H)
    check('GET /notifications empty', r.status_code == 200 and r.json() == [], r.text[:200])
    r = client.get('/notifications/unread-count', headers=H)
    check('unread-count 0', r.status_code == 200 and r.json()['count'] == 0, r.text[:200])

    print('-- Project + milestone --')
    r = client.post('/projects', headers=H, json={
        'name': f'Smoke Project {run_id}', 'location': 'Harare', 'status': 'Active',
        'budget': 1000, 'start_date': '2026-06-01', 'end_date': '2026-12-01',
        'description': 'smoke test',
    })
    check('POST /projects', r.status_code == 201, r.text[:200])
    project_id = r.json()['id']

    r = client.post(f'/projects/{project_id}/milestones', headers=H,
                    json={'title': 'Smoke milestone', 'due_date': '2026-12-01'})
    check('POST milestone', r.status_code == 201, r.text[:200])
    milestone_id = r.json()['id']

    r = client.patch(f'/projects/milestones/{milestone_id}/complete', headers=H)
    check('PATCH milestone complete', r.status_code == 200, r.text[:200])
    # Actor is excluded from milestone notifications → still none for this user
    r = client.get('/notifications/unread-count', headers=H)
    check('no self-notification for milestone', r.json()['count'] == 0, r.text[:200])

    print('-- Budget over-spend trigger --')
    r = client.post(f'/budget/projects/{project_id}/entries', headers=H, json={
        'category': 'Materials', 'description': 'cement', 'amount': 600,
        'vendor': None, 'date': '2026-06-10',
    })
    check('cost entry under budget', r.status_code == 201, r.text[:200])
    r = client.get('/notifications/unread-count', headers=H)
    check('no notification while under budget', r.json()['count'] == 0, r.text[:200])

    r = client.post(f'/budget/projects/{project_id}/entries', headers=H, json={
        'category': 'Labour', 'description': 'crew wages', 'amount': 500,
        'vendor': None, 'date': '2026-06-11',
    })
    check('cost entry crossing budget', r.status_code == 201, r.text[:200])
    r = client.get('/notifications', headers=H)
    notifs = r.json()
    check('over-budget notification created', len(notifs) == 1 and notifs[0]['type'] == 'budget', str(notifs)[:200])

    r = client.post(f'/budget/projects/{project_id}/entries', headers=H, json={
        'category': 'Other', 'description': 'already over', 'amount': 50,
        'vendor': None, 'date': '2026-06-11',
    })
    check('cost entry after crossing', r.status_code == 201, r.text[:200])
    r = client.get('/notifications', headers=H)
    check('no duplicate over-budget notification', len(r.json()) == 1, str(len(r.json())))

    print('-- Notification read endpoints --')
    nid = notifs[0]['id']
    r = client.patch(f'/notifications/{nid}/read', headers=H)
    check('PATCH /read', r.status_code == 200 and r.json()['read'] is True, r.text[:200])
    r = client.get('/notifications/unread-count', headers=H)
    check('unread-count back to 0', r.json()['count'] == 0, r.text[:200])
    r = client.patch('/notifications/read-all', headers=H)
    check('PATCH /read-all', r.status_code == 204, str(r.status_code))
    r = client.delete(f'/notifications/{nid}', headers=H)
    check('DELETE notification', r.status_code == 204, str(r.status_code))
    r = client.get('/notifications', headers=H)
    check('notification list empty after delete', r.json() == [], r.text[:200])

    print('-- Feed + punch triggers (self-actions excluded) --')
    r = client.post('/feed', headers=H, json={'project_id': project_id, 'content': 'smoke update', 'image_url': None})
    check('POST /feed', r.status_code == 201, r.text[:200])
    r = client.post(f'/punch/projects/{project_id}', headers=H, json={
        'title': 'Fix snag', 'description': None, 'status': 'Open', 'priority': 'Medium',
        'assigned_to_id': None, 'due_date': None,
    })
    check('POST punch item', r.status_code == 201, r.text[:200])
    punch_id = r.json()['id']
    r = client.patch(f'/punch/{punch_id}/resolve', headers=H)
    check('resolve punch item', r.status_code == 200, r.text[:200])
    r = client.get('/notifications/unread-count', headers=H)
    check('no self-notifications from feed/punch', r.json()['count'] == 0, r.text[:200])

    print('-- Site log (for CSV export) --')
    r = client.post(f'/site-logs/projects/{project_id}', headers=H, json={
        'log_date': '2026-06-11', 'weather': 'Sunny', 'temperature_c': 24, 'crew_count': 10,
        'work_completed': 'Smoke test work', 'materials_delivered': None, 'issues': None, 'safety_notes': None,
    })
    check('POST site log', r.status_code == 201, r.text[:200])

    print('-- Reports: portfolio --')
    r = client.get('/reports/portfolio', headers=H)
    check('GET /reports/portfolio', r.status_code == 200, r.text[:200])
    rep = r.json()
    check('portfolio totals', rep['projects_total'] == 1 and float(rep['total_budget']) == 1000.0
          and float(rep['total_spent']) == 1150.0, str(rep)[:300])
    check('budget percent > 100', rep['budget_percent_used'] == 115.0, str(rep['budget_percent_used']))
    check('milestone stats', rep['milestones_total'] == 1 and rep['milestones_completed'] == 1
          and rep['milestones_overdue'] == 0, str(rep)[:300])
    check('on-time rate 100', rep['on_time_rate'] == 100.0, str(rep['on_time_rate']))
    check('punch stats', rep['punch_open'] == 0 and rep['punch_resolved'] == 1,
          f"open={rep['punch_open']} resolved={rep['punch_resolved']}")
    check('project row present', len(rep['projects']) == 1 and rep['projects'][0]['punch_open'] == 0,
          str(rep['projects'])[:300])

    print('-- Reports: CSV exports --')
    r = client.get('/reports/portfolio/csv', headers=H)
    check('portfolio CSV', r.status_code == 200 and r.headers['content-type'].startswith('text/csv')
          and 'Smoke Project' in r.text, r.text[:200])
    for kind, expect in [('milestones', 'Smoke milestone'), ('cost-entries', 'cement'),
                         ('punch', 'Fix snag'), ('site-logs', 'Smoke test work')]:
        r = client.get(f'/reports/projects/{project_id}/csv?report={kind}', headers=H)
        check(f'{kind} CSV', r.status_code == 200 and expect in r.text, r.text[:200])
    r = client.get(f'/reports/projects/{project_id}/csv?report=bogus', headers=H)
    check('invalid report type rejected', r.status_code == 422, str(r.status_code))

    print('-- Cleanup --')
    r = client.delete(f'/projects/{project_id}', headers=H)
    check('DELETE project', r.status_code == 204, str(r.status_code))

# Remove all throwaway smoke-test users/companies (including leftovers from failed runs)
from app.models.post import Post  # noqa: E402
from app.models.project import Project  # noqa: E402

db = SessionLocal()
try:
    users = db.query(User).filter(User.email.like('smoke-%@buildtrack-smoke.com')).all()
    for user in users:
        db.query(Notification).filter(Notification.user_id == user.id).delete()
        projects = db.query(Project).filter(Project.company_id == user.company_id).all()
        for p in projects:
            db.query(Post).filter(Post.project_id == p.id).delete()
            db.delete(p)
        db.flush()  # projects (and DB-cascaded children) must go before their creator
        company_id = user.company_id
        db.delete(user)
        company = db.query(Company).filter(Company.id == company_id).first()
        if company:
            db.delete(company)
    db.commit()
    print(f'  cleaned up {len(users)} smoke-test user(s)')
finally:
    db.close()

print(f'\n{PASS} passed, {FAIL} failed')
sys.exit(1 if FAIL else 0)
