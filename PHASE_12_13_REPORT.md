# Phase 12 & 13 Completion Report — 2026-06-11

This session finished the last two roadmap phases (Notifications Center, Reports & Exports),
ran the full test suite, and fixed every error found. **All 13 phases are now complete.**

---

## Phase 12 — Notifications Center

### Backend (new files)
| File | Purpose |
|---|---|
| `backend/app/models/notification.py` | `notifications` table — id, company_id, user_id (CASCADE), type, title, message, link, read, created_at |
| `backend/app/schemas/notification.py` | `NotificationOut`, `UnreadCount` |
| `backend/app/utils/notify.py` | `notify_user` / `notify_company` helpers — queue rows on the session, caller's commit persists them atomically with the triggering event |
| `backend/app/routers/notifications.py` | `GET /notifications` (`?unread_only&skip&limit`) · `GET /notifications/unread-count` · `PATCH /notifications/:id/read` · `PATCH /notifications/read-all` · `DELETE /notifications/:id` |

### Event triggers (edits to existing routers)
| Router | Event | Who gets notified |
|---|---|---|
| `feed.py` | New site post | Whole company except the author |
| `projects.py` | Milestone completed | Whole company except the actor |
| `punch.py` | Item assigned (create or reassign on update) | The assignee (not if self-assigned) |
| `punch.py` | Item resolved (resolve endpoint or status flip in update) | The item's creator (not if self-resolved) |
| `budget.py` | Cost entry pushes total spend **across** the project budget | Whole company (fires only on the crossing entry — no repeats) |
| `team.py` | Invite accepted | Whole company except the new member |

### Frontend (new files + wiring)
- `src/types/notification.ts` — `AppNotification`, `NotificationType`
- `src/services/notificationService.ts` — list / unread count / mark read / mark all / delete, with demo-mode data
- `src/components/NotificationBell.tsx` — bell with unread count badge (99+ cap), popover panel with
  per-type Material icons, time-ago, unread highlight, mark-read-on-click + navigate to link,
  "Mark all read", empty state. Unread count polls every 60 s.
- `src/components/TopNav.tsx` — both variants' static bells replaced with `<NotificationBell />`
- Bell also added to the header of every page with its own header (not just TopNav pages):
  `ProjectsList`, `ProjectDetail`, `ProjectNew`, `ResourcesPage`, `TeamSettings`, `ReportsPage` —
  the bell is now visible on every screen in the app

## Phase 13 — Reports & Exports

### Backend (new files)
| File | Purpose |
|---|---|
| `backend/app/schemas/report.py` | `PortfolioReport`, `ProjectReportRow` |
| `backend/app/routers/reports.py` | `GET /reports/portfolio` (counts by status, budget vs spend, milestone totals/overdue/on-time rate, punch open/resolved, per-project rows) · `GET /reports/portfolio/csv` · `GET /reports/projects/:id/csv?report=milestones\|cost-entries\|punch\|site-logs` |

CSV exports stream with `Content-Disposition: attachment` and sanitised filenames.
On-time rate = completed milestones finished on/before their due date ÷ completed milestones that had a due date (null when no data).

### Frontend (new files + wiring)
- `src/types/report.ts` — report types + `PROJECT_CSV_REPORTS` constant
- `src/services/reportService.ts` — portfolio fetch + authenticated blob downloads (reads server filename), demo-mode data
- `src/pages/ReportsPage.tsx` — `/reports`: 4 KPI cards (budget utilisation, milestones, on-time rate, punch items), status chips, per-project table with progress/budget bars and over-budget highlighting, per-row CSV export dropdown, portfolio CSV button, Print/PDF button (`print:hidden` on chrome)
- `src/App.tsx` — `/reports` route · `src/components/SideNav.tsx` — "Reports" link (BarChart3 icon)

---

## Testing performed

| Check | Result |
|---|---|
| `npm run build` (tsc + Vite production build) | ✅ passes |
| `npx eslint .` | ✅ 0 errors (16 documented warnings, see below) |
| Backend import check (`from app.main import app`) | ✅ 73 routes |
| API smoke test (`backend/smoke_test.py`, FastAPI TestClient against the real dev DB) | ✅ **38/38 checks pass** |

The smoke test covers: register → notifications empty → project/milestone/complete (no self-notification) →
cost entries under/crossing/after budget (exactly one over-budget notification) → read/read-all/delete endpoints →
feed + punch self-action exclusions → portfolio report numbers (115% budget, 1/1 milestones, 100% on-time,
0 open / 1 resolved punch) → all 5 CSV exports + invalid type rejected (422) → project delete → full data cleanup.
Run it any time with: `cd backend && venv\Scripts\python smoke_test.py`

---

## Errors found and fixed

1. **zod v3 API against zod v4 (build-breaking).** Installed zod is 4.4.3 but six schemas used the removed
   `required_error` param and `z.coerce.number()` (whose input type became `unknown` in v4, breaking
   react-hook-form resolver inference). Fixed in `BudgetTab`, `SiteLogsTab`, `ProjectNew`, `ProjectDetail`,
   `ResourcesPage`: `required_error:` → `error:`, `z.coerce.number()` → `z.coerce.number<number>()`.
   These never surfaced because Vite dev mode doesn't type-check.

2. **react-day-picker v10 API drift (build-breaking).** `calendar.tsx` used the removed `table` classNames key
   (→ `month_grid`); `date-picker.tsx` used the removed `initialFocus` prop (→ `autoFocus`).

3. **Unused imports (build-breaking under `noUnusedLocals`).** `Badge` in `PunchTab.tsx` and
   `ProjectsList.tsx`, `parseISO` in `ProjectNew.tsx` — removed.

4. **Deleting a project with feed posts returned HTTP 500** (pre-existing bug found by the smoke test).
   `posts.project_id` had no `ON DELETE` behaviour, unlike every other child table. Fixed twice over:
   `ondelete='CASCADE'` on the model (fresh databases) **and** explicit post deletion in
   `DELETE /projects/:id` (existing databases, since tables are created with `create_all`, not migrations).

5. **Blank white screen on `/projects/new` (and the Edit Project dialog).** The start/end date fields
   used react-hook-form's raw `<Controller>` with a `<FormLabel>` inside — but `FormLabel` requires the
   `<FormField>` context and throws without it, crashing the whole page. Fixed by swapping `<Controller>`
   for `<FormField>` (same props, provides the context) in `ProjectNew.tsx` and `ProjectDetail.tsx`.
   Reproduced and verified fixed with a headless-browser check (page renders, zero console errors).

6. **ESLint config tuned for new plugin majors** (`eslint.config.js`):
   - `react-hooks/set-state-in-effect` + `react-hooks/immutability` (new in eslint-plugin-react-hooks v7)
     downgraded to **warnings** — they flag the long-standing reset-dialog-state-on-open pattern in 10 files;
     refactoring all of them is out of scope and risky. The 16 warnings remain visible in lint output.
   - `react-refresh/only-export-components` disabled for `src/components/ui/**` and `AuthContext.tsx`,
     where shadcn intentionally exports variants/hooks alongside components (HMR-granularity only).
   - One stale `eslint-disable` directive auto-fixed (`DocumentsTab.tsx`).

## Post-completion additions (same day)

**Profile & Company settings** — the sidebar profile dropdown items now work:
- `/settings/profile` (`ProfileSettings.tsx`) — edit name, upload avatar (Cloudinary, 256×256 face-crop,
  5MB limit), change password (verifies current password; old password stops working immediately).
- `/settings/company` (`CompanySettings.tsx`) — rename company, owner-only (read-only for other roles).
- Backend: `PATCH /auth/me`, `POST /auth/me/password`, `POST /auth/me/avatar`, `PATCH /team/company`
  (+ `UpdateMeRequest`/`ChangePasswordRequest`/`CompanyUpdate`/`CompanyOut` schemas).
- `AuthContext` gained `updateUser()` so the sidebar name/avatar/company refresh instantly after saving.
- Verified with a 10-check TestClient run (rename, validation rejects, password change + re-login,
  owner rename reflected in `/auth/me`, bad avatar type rejected) — all pass.

**TopNav search + tabs made functional** — the search input is now a live project quick-search
(`ProjectSearch` in `TopNav.tsx`): typing filters projects by name/location with a results dropdown
(status dot, location), click or Enter jumps to the project, Escape closes, plus a "View all projects"
footer and a no-match state. The dead header tabs are real links now — Projects → `/projects`,
Analytics → `/reports`, Fleet → `/resources?tab=fleet` (`ResourcesPage` reads `?tab=` for deep links);
the feed page's dead Timeline/Safety tabs were replaced with Dashboard/Reports links. The settings gear
goes to `/settings/profile` and "New Log" goes to the site feed. Verified with a headless-browser run
(`verify-search-tabs.mjs`): 8/8 checks pass including search→navigate, Enter-to-first-match, no-match
message, Analytics/Fleet tab navigation, and the Fleet tab arriving pre-selected.

**Help Center** — the dead sidebar link is now a real `/help` page (`HelpCenter.tsx`): searchable FAQ
(6 sections / 20 topics written against the app's actual behaviour — projects, budget, site ops,
resources, team, reports/notifications), quick-start link cards, a no-match state, and a contact-support
card (mailto). Verified headless (`verify-help.mjs`): 8/8 — sidebar navigation, FAQ expand,
search filtering, no-match state, zero page errors.

## Other notes

- `httpx==0.28.1` added to `backend/requirements.txt` (needed by FastAPI TestClient for the smoke test).
- New `notifications` table is auto-created on backend startup via `Base.metadata.create_all` — no manual migration needed.
- `PHASES.md` rewritten to reflect what was actually delivered (the old file still listed Budget/Notifications/Reports as open and a Client Portal/PWA phase that was re-scoped; those now live under "Future ideas").
