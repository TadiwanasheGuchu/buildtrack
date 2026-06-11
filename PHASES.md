# TerraConstruct — Build Roadmap

Construction project management SaaS for the Southern African market.
Stack: React 19 + TypeScript + Vite · FastAPI + PostgreSQL · Modern Earth design system.

**Status: all 13 phases complete (2026-06-11).**

---

## Phase 1 — Foundation ✅
**Goal:** Project scaffolding, design system, and core static screens.

- [x] Vite + React 19 + TypeScript project setup
- [x] Tailwind CSS v3 with Modern Earth design tokens (Clay Red, Savanna Green, Kalahari Gold)
- [x] Public Sans font + Google Material Symbols Outlined icons
- [x] `SideNav` and `TopNav` shared layout components
- [x] `ExecutiveDashboard` screen (static)
- [x] `ProjectSiteFeed` screen (static)
- [x] React Router v7 routing skeleton
- [x] FastAPI backend scaffolding with PostgreSQL + SQLAlchemy

---

## Phase 2 — Authentication ✅
**Goal:** Full auth stack, end-to-end, with email.

- [x] Register (creates Company + Owner user)
- [x] Login / Logout
- [x] JWT access tokens + refresh tokens (auto-refresh 5 min before expiry)
- [x] Forgot password → email via Resend (30 min token)
- [x] Reset password
- [x] `ProtectedRoute` guard, `AuthContext`, `useAuth` hook
- [x] Auth pages: Login, Register, ForgotPassword, ResetPassword

---

## Phase 3 — Projects CRUD ✅
**Goal:** Full project lifecycle management with milestones.

- [x] Projects list with search + status filter
- [x] Create project form (name, location, status, budget, dates, description)
- [x] Project detail page with KPI cards (progress, budget, start, deadline)
- [x] Edit project (inline dialog, full field editing)
- [x] Delete project (confirmation dialog)
- [x] Milestones timeline (add, mark complete, delete)
- [x] Progress auto-recalculates from milestone completion
- [x] Backend: full CRUD + milestone endpoints; snake↔camelCase mapping

---

## Phase 4 — Live Executive Dashboard ✅
**Goal:** Replace all static hardcoded data in the dashboard with real API data.

- [x] Status health cards: real counts of Active / On Hold / Delayed projects
- [x] Active projects list: pull from API, link cards to `/projects/:id`
- [x] Upcoming milestones: show next 5 incomplete milestones across all projects
- [x] Budget Overview widget (company-wide totals)
- [x] Greeting uses the logged-in user's first name; date range shows current month
- [x] Loading skeletons while data fetches
- [x] TopNav uses Avatar with initials fallback

---

## Phase 5 — Team Management ✅
**Goal:** Company owners can invite and manage their team.

- [x] Team settings page (`/settings/team`) — member list with avatars, roles, joined dates
- [x] Invite user by email (sends invite link via Resend, 7-day expiry)
- [x] Accept invite flow (`/accept-invite?token=`) — name + password form, logs in on success
- [x] Change a member's role / remove a member (owner-only)
- [x] Backend: `invitations` table + team endpoints; role-based UI

---

## Phase 6 — Site Feed (Activity Logs) ✅
**Goal:** Real-time project activity log with photo support.

- [x] Post a site update (text + optional image upload via Cloudinary)
- [x] Global feed (`/site-feed`) + per-project feed tab in `ProjectDetail`
- [x] Filter feed by project; FeedPost card with avatar, time-ago, project link
- [x] Backend: `posts` table, `POST /feed/upload`, `GET /feed`, `POST /feed`

---

## Phase 7 — Resources & Logistics ✅
**Goal:** Track equipment, materials, and fleet assigned to projects.

- [x] Equipment inventory (name, category, status: Available / In Use / Maintenance)
- [x] Material tracking (item, quantity, unit, project)
- [x] Fleet management (vehicle name, plate, driver, assigned project)
- [x] Resources tab in `ProjectDetail`
- [x] Backend: `equipment`, `materials`, `vehicles` tables and CRUD

---

## Phase 8 — Budget & Cost Tracking ✅
**Goal:** Track actual spend against project budget.

- [x] Budget breakdown by category (Labour, Materials, Equipment, Subcontractors, Permits & Fees, Other)
- [x] Log cost entries (amount, category, date, vendor, description)
- [x] Budget vs actual summary cards + category bars; Edit Allocations dialog
- [x] Company-wide Budget Overview on dashboard
- [x] Backend: `budget_lines` + `cost_entries` tables, summary endpoints
- [x] Budget tab in `ProjectDetail`

---

## Phase 9 — Punch Lists ✅
**Goal:** Track snags/defects through to resolution.

- [x] Punch items with status (Open / In Progress / Resolved) + priority (Low–Critical)
- [x] Assign to team member, due date, quick-resolve
- [x] Status filter pills + summary; company open count
- [x] Backend: `punch_items` table (native PG enums), CRUD + resolve endpoints
- [x] Punch List tab in `ProjectDetail`

---

## Phase 10 — Documents ✅
**Goal:** Central file store per project.

- [x] Upload via Cloudinary (PDF, images, raw; 20MB limit, `resource_type='auto'`)
- [x] Category filter pills, file-type icons, download + delete
- [x] Backend: `documents` table, upload + CRUD endpoints
- [x] Documents tab in `ProjectDetail`

---

## Phase 11 — Daily Site Logs ✅
**Goal:** Structured daily diary per project.

- [x] Log date, weather, temperature, crew count, work completed, materials delivered, issues, safety notes
- [x] Backend: `site_logs` table (native PG `site_log_weather` enum), CRUD endpoints
- [x] Site Logs tab in `ProjectDetail`

---

## Phase 12 — Notifications Center ✅ (2026-06-11)
**Goal:** Keep users informed of important project events.

- [x] In-app notification bell on every page (TopNav + all page headers) with unread badge (60s polling)
- [x] Dropdown panel: per-type icons, time-ago, unread highlight, mark-read on click, mark-all-read
- [x] Click-through navigation to the related project
- [x] Event triggers:
  - [x] New site feed post → notifies company (except author)
  - [x] Milestone completed → notifies company (except actor)
  - [x] Punch item assigned → notifies assignee
  - [x] Punch item resolved → notifies creator
  - [x] Project crosses its budget → notifies whole company (fires once, on crossing)
  - [x] New team member joins via invite → notifies company
- [x] Backend: `notifications` table, `/notifications` router (list, unread-count, read, read-all, delete), `app/utils/notify.py` helper

---

## Phase 13 — Reports & Exports ✅ (2026-06-11)
**Goal:** Portfolio-level insights and data exports.

- [x] Reports page (`/reports`) with KPI cards: budget utilisation, milestone completion, on-time rate, open punch items
- [x] Project status breakdown chips
- [x] Per-project breakdown table (progress, budget vs spent, % used with over-budget highlight, milestones, open punch)
- [x] CSV exports: portfolio summary + per-project milestones / cost entries / punch list / site logs
- [x] Print / Save-as-PDF via browser print (print-friendly page)
- [x] Backend: `/reports/portfolio`, `/reports/portfolio/csv`, `/reports/projects/:id/csv?report=…`

---

## Post-roadmap polish ✅ (2026-06-11)

- [x] Notification bell rolled out to every page header (not just TopNav pages)
- [x] Profile settings (`/settings/profile`) — edit name, avatar upload (Cloudinary face-crop), change password
- [x] Company settings (`/settings/company`) — rename company (owner-only)
- [x] Sidebar profile dropdown items wired to the new settings pages
- [x] Backend: `PATCH /auth/me` · `POST /auth/me/password` · `POST /auth/me/avatar` · `PATCH /team/company`
- [x] Fixed blank-screen crash on `/projects/new` + Edit Project dialog (raw `Controller` + `FormLabel` without `FormField` context)
- [x] TopNav search is live: project quick-search dropdown (name/location), Enter/click jumps to project, "View all projects" footer
- [x] TopNav tabs are real links — Projects → `/projects`, Analytics → `/reports`, Fleet → `/resources?tab=fleet` (Resources page supports `?tab=` deep links); feed tabs link to Site Feed / Dashboard / Reports
- [x] TopNav settings gear → `/settings/profile`; "New Log" → `/site-feed`
- [x] Help Center (`/help`) — searchable FAQ (6 sections, 20 topics covering all features), quick-start links, contact-support card; sidebar link wired

---

## Future ideas (not scheduled)
- Client portal (read-only project view for clients)
- PWA & mobile polish (offline cache, camera capture, push notifications)
- Native iOS / Android apps
- Multi-currency support (ZAR only for now)
- Payroll / HR · Tender management · Accounting integrations (Xero, Sage)
