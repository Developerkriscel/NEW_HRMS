# NexaHR — Master Documentation
> Multi-Tenant SaaS HRMS Platform · Next.js + MongoDB · v2.0

---

> ## ⚠️ Migration Notice (v2.0)
> The original **Spring Boot + PostgreSQL + Redis** backend and the separate **Vite/React Router** frontend have been fully replaced by a single **Next.js 14 (App Router)** application backed by **MongoDB (Mongoose)**. The `backend/` and `frontend/` directories no longer exist — everything (pages, API routes, auth, data layer) now lives in one project at the repo root.
>
> Sections below have been updated to describe the new stack. Where this doc and the code could drift over time, treat these as the authoritative sources of truth:
> - **API contract / business logic**: `app/api/**/route.js`
> - **Data schema**: `models/*.js` (Mongoose schemas)
> - **Auth & session**: `lib/auth.js` (JWT in httpOnly cookies, not client-side JS) and `middleware.js` (route guarding)
>
> Key deliberate changes from the original Java backend (not bugs — see inline comments in the code for each):
> - JWT access/refresh tokens live in **httpOnly cookies**, not client-side `localStorage` — fixes the original's non-SSR-safe auth model and closes an XSS token-theft vector.
> - The logout token blacklist is a **MongoDB collection with a TTL index**, and — unlike the original, which wrote blacklist entries but never actually checked them — **is now enforced** on every authenticated request.
> - The refresh endpoint now requires a `type: 'refresh'` claim, closing a gap where any valid access token could be replayed there.
> - `POST /api/super-admin/tenants` now actually provisions a logged-in-capable `COMPANY_ADMIN` employee when `adminName`/`adminEmail` are supplied — the original accepted those fields but silently dropped them, leaving new tenants with no way to log in.
> - `GET /api/payroll/payslip/[employeeId]` is now tenant-scoped — the original had no tenant check there at all (a cross-tenant data leak).
>
> Everything else — business rules, role/permission matrix, payroll formula, attendance/leave rules, seed data — was carried over faithfully.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Architecture Overview](#2-architecture-overview)
3. [Tech Stack](#3-tech-stack)
4. [Directory Structure](#4-directory-structure)
5. [Database Schema](#5-database-schema)
6. [Role & Permission Matrix](#6-role--permission-matrix)
7. [API Reference](#7-api-reference)
8. [Authentication Flow](#8-authentication-flow)
9. [Multi-Tenancy Model](#9-multi-tenancy-model)
10. [Payroll Engine](#10-payroll-engine)
11. [Local Setup Guide](#11-local-setup-guide)
12. [Environment Variables](#12-environment-variables)
13. [Deployment Guide](#13-deployment-guide)
14. [Module Status & TODOs](#14-module-status--todos)

---

## 1. Project Overview

NexaHR is a **multi-tenant SaaS HRMS** platform where a single deployment serves multiple companies (tenants). Each company gets a fully isolated HR workspace.

### High-Level Concept

```
Platform Owner (You)
        │
  Super Admin Panel  ──── Manage companies, plans, billing, feature flags
        │
  Tenant A (ABC Corp)      Tenant B (XYZ Ltd)      Tenant C (StartupX)
  ├── Admin                ├── Admin                ├── Admin
  ├── HR Manager           ├── HR Manager           └── Employee
  ├── Manager              └── Employee
  └── Employee
```

### Key Capabilities (Phase 1 MVP)

| Module | Status |
|--------|--------|
| Authentication (JWT + Refresh, httpOnly cookies, MongoDB blacklist) | ✅ Complete |
| Super Admin Panel (tenants, plans, billing) | ✅ Complete |
| Core HR / Employee Database | ✅ Complete |
| Attendance Management | ✅ Complete |
| Leave Management | ✅ Complete |
| Payroll (India statutory) | ✅ Complete |
| Organization (Dept/Designation/Branch) | ✅ Complete |
| Audit Logging | ✅ Complete |
| RBAC + Permission-based Access Control | ✅ Complete |
| Frontend (Next.js App Router + Tailwind) | ✅ Complete |

---

## 2. Architecture Overview

```
┌───────────────────────────────────────────────────────────────┐
│                     Browser (React Client Components)          │
│   SuperAdmin Panel │ CompanyAdmin │ HR │ Manager │ ESS         │
└───────────────────────────────┬─────────────────────────────────┘
                                │ same-origin fetch/axios (httpOnly cookies)
┌───────────────────────────────▼─────────────────────────────────┐
│                    Next.js 14 (App Router)                       │
│                                                                   │
│  ┌────────────────────┐   ┌────────────────────────────────┐   │
│  │   middleware.js     │   │      app/api/**/route.js        │   │
│  │  Edge JWT verify +  │   │  /api/auth   /api/employees     │   │
│  │  role-based redirect│   │  /api/leaves /api/attendance    │   │
│  │  for page routes    │   │  /api/payroll /api/super-admin  │   │
│  └──────────┬──────────┘   └────────────────┬────────────────┘   │
│             │                                │                    │
│             │                    ┌───────────▼────────────┐       │
│             │                    │   lib/auth.js            │       │
│             │                    │  requireAuth/requireRole │       │
│             │                    │  requireTenantId          │       │
│             │                    │  (re-verifies + checks    │       │
│             │                    │   Mongo token blacklist)  │       │
│             │                    └───────────┬────────────┘       │
│             │                                │                    │
│  ┌──────────▼────────────────────────────────▼────────────────┐  │
│  │            Mongoose models (models/*.js)                     │  │
│  └──────────────────────────────┬───────────────────────────────┘  │
└─────────────────────────────────┼─────────────────────────────────┘
                                  │
                       ┌──────────▼──────────┐
                       │   MongoDB (Atlas)     │
                       │  tenants, employees,  │
                       │  attendance, leaves,   │
                       │  payslips, audit_logs  │
                       └───────────────────────┘
```

### Request Flow

```
Client Request (page)                    Client Request (API)
      │                                          │
middleware.js (Edge)                    app/api/**/route.js
  verify JWT signature/exp                       │
  from httpOnly cookie              lib/auth.js requireAuth()
  redirect if unauthenticated         → re-verify JWT (Node runtime)
  or wrong role for the path          → check MongoDB token blacklist
      │                                          │
   page renders                      requireRole() → RBAC check
                                                  │
                                     requireTenantId() → scope all
                                       Mongoose queries by tenantId
                                                  │
                                     lib/audit.js logAction() (awaited,
                                       best-effort) → AuditLog collection
                                                  │
                                              Response
```

---

## 3. Tech Stack

| Component | Technology |
|-----------|------------|
| Framework | Next.js 14 (App Router) — pages and API routes in one project |
| Language | JavaScript (ES modules) |
| Database | MongoDB (Atlas), via Mongoose ODM |
| Auth | JWT (access + refresh) in httpOnly cookies, `jsonwebtoken` (API routes) + `jose` (Edge middleware) |
| Password hashing | bcryptjs (cost factor 12) |
| Route protection | `middleware.js` (Edge, coarse role/redirect) + per-route `requireAuth`/`requireRole` (enforced) |
| State | Zustand |
| HTTP Client | Axios (same-origin, `withCredentials: true`) |
| UI | Tailwind CSS (shadcn-style CSS variable theme) |
| Charts | Recharts |
| Animation | Framer Motion |
| Icons | Lucide React |
| Fonts | `next/font/google` (Inter) |

No Redis and no separate backend process — token blacklisting and password-reset tokens are MongoDB collections with TTL indexes (`models/TokenBlacklist.js`, `models/PasswordResetToken.js`), and audit logging is a plain awaited MongoDB write (`lib/audit.js`) rather than a Spring `@Async` thread pool.

---

## 4. Directory Structure

Single Next.js project at the repo root (no more `backend/`/`frontend/` split):

```
/
├── middleware.js                    ← Edge JWT check + role-based page redirects
├── app/
│   ├── layout.js                    ← Root HTML shell, next/font Inter, globals.css
│   ├── page.js                      ← "/" fallback (middleware redirects before this renders)
│   ├── globals.css                  ← Tailwind base + the app's utility-class "design system"
│   ├── (auth)/
│   │   ├── layout.js                ← AuthShell wrapper
│   │   ├── login/page.js
│   │   └── forgot-password/page.js
│   ├── (dashboard)/
│   │   ├── layout.js                ← DashboardShell (Sidebar + Navbar) wrapper
│   │   ├── super-admin/             ← dashboard, tenants(+[id]), plans, billing, features, tickets, audit-logs, settings
│   │   ├── company/                 ← dashboard, employees(+add/[id]), departments, designations, branches, org-chart, settings
│   │   ├── hr/                      ← dashboard, employees, attendance, leave, payroll, + module stubs
│   │   ├── manager/                 ← dashboard, team, leave-approvals, attendance, performance
│   │   └── employee/                ← dashboard, attendance, leave, payslips, profile, + module stubs
│   └── api/
│       ├── auth/                    ← login, refresh-token, logout, me, forgot/reset/change-password
│       ├── departments/, designations/, branches/
│       ├── employees/               ← + [id], [id]/leave-balance, [id]/payslips, [id]/timeline, [id]/assets, bulk-import
│       ├── attendance/              ← check-in, check-out, today, my-attendance, team, regularization/*, monthly-report
│       ├── leaves/                  ← apply, my-leaves, pending-approval, [id]/*, balance, types, holidays, calendar
│       ├── payroll/                 ← run, monthly, payslip/[employeeId], approve, reports, salary-structure/[employeeId]
│       └── super-admin/             ← dashboard, revenue, tenants/*, plans/*, audit-logs, support-tickets
├── models/                          ← Mongoose schemas (one file per entity)
│   ├── _base.js                     ← shared tenantFields/baseFields mixins
│   ├── Employee.js, Department.js, Designation.js, Branch.js
│   ├── Attendance.js, LeaveType.js, LeaveBalance.js, LeaveRequest.js
│   ├── SalaryStructure.js, Payslip.js, Permission.js
│   ├── Tenant.js, Plan.js, Subscription.js, SuperAdminUser.js
│   ├── AuditLog.js
│   └── TokenBlacklist.js, PasswordResetToken.js  ← MongoDB TTL collections replacing Redis
├── lib/
│   ├── db.js                        ← cached Mongoose connection (serverless-safe)
│   ├── auth.js                      ← JWT sign/verify, bcrypt, cookies, requireAuth/requireRole/requireTenantId
│   ├── userLookup.js                ← findUserByEmail (super admin OR employee), buildUserInfo
│   ├── apiResponse.js                ← ok()/fail()/paged() — same envelope shape as the old ApiResponse<T>/PageResponse<T>
│   ├── handler.js                   ← withApi() wrapper: connects DB, maps errors to the envelope
│   ├── audit.js                     ← logAction()/logSuperAdmin()
│   ├── payrollCalc.js                ← the India-statutory payslip calculation
│   └── utils.js                      ← cn(), formatters, ROLE_DASHBOARDS, etc.
├── store/                            ← Zustand: authStore.js (user/session UI state), uiStore.js (theme/sidebar)
├── services/                         ← Axios wrappers per module (authApi, employeeApi, attendanceApi, leaveApi, payrollApi, tenantApi, departmentApi)
├── components/
│   ├── common/                       ← Sidebar, Navbar, Avatar, Badge, LoadingSpinner, BuildStub
│   ├── layouts/                      ← AuthShell, DashboardShell
│   ├── cards/                        ← StatsCard, GradientStatsCard
│   ├── charts/                       ← Recharts wrappers
│   ├── tables/                       ← DataTable
│   └── pages/                        ← cross-role shared page bodies (EmployeesList, EmployeeDetail, LeaveApprovals)
└── scripts/
    └── seed.mjs                      ← seeds plans, super admin, permissions (run via `npm run seed`)
```

---

## 5. Database Schema

> **Storage engine note:** this section still describes the fields conceptually using the original Postgres table/column names (kept because the field names and relationships carried over almost 1:1). The **actual, authoritative schema is now MongoDB** — every "table" below is a Mongoose collection defined in `models/*.js`, `id UUID PK` is a Mongo `ObjectId` (`_id`), foreign keys are `ObjectId` refs (e.g. `employee: { type: ObjectId, ref: 'Employee' }`) instead of FK columns, and `JSONB` columns are plain nested objects or Mongoose `Map`s. Read `models/*.js` directly for exact field names/types/defaults.

### SaaS Layer Tables

#### `plans`
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| name | VARCHAR(100) | UNIQUE — Free, Starter, Professional, Enterprise |
| price_monthly | DECIMAL | |
| price_yearly | DECIMAL | |
| employee_limit | INT | NULL = unlimited |
| storage_limit_mb | INT | NULL = unlimited |
| features | JSONB | `{"payroll": true, "ai": false, ...}` |
| is_active | BOOLEAN | |

#### `tenants`
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| company_name | VARCHAR | |
| company_code | VARCHAR | UNIQUE slug |
| email | VARCHAR | UNIQUE |
| phone | VARCHAR | |
| gst_number | VARCHAR | |
| pan_number | VARCHAR | |
| address, city, state, country | VARCHAR | |
| logo_url | VARCHAR | |
| industry_type | VARCHAR | |
| status | VARCHAR | ACTIVE / SUSPENDED / TRIAL |
| suspension_reason | TEXT | |
| features | JSONB | Per-company feature overrides |
| created_at, updated_at | TIMESTAMP | |

#### `subscriptions`
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| tenant_id | UUID FK → tenants | |
| plan_id | UUID FK → plans | |
| status | VARCHAR | TRIAL / ACTIVE / EXPIRED / CANCELLED |
| start_date, end_date | DATE | |
| amount_paid | DECIMAL | |

#### `super_admin_users`
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| email | VARCHAR UNIQUE | |
| password | VARCHAR | BCrypt |
| is_active | BOOLEAN | |

---

### HRMS Layer Tables (all tenant-scoped)

#### `employees`
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| tenant_id | UUID | FK to tenants |
| employee_code | VARCHAR | EMP00001 (auto-generated) |
| first_name, last_name | VARCHAR | |
| email | VARCHAR | Login credential |
| password | VARCHAR | BCrypt (temp on create) |
| phone | VARCHAR | |
| gender | VARCHAR | MALE/FEMALE/OTHER/PREFER_NOT_TO_SAY |
| date_of_birth | DATE | |
| joining_date | DATE | |
| status | VARCHAR | ACTIVE/INACTIVE/PROBATION/NOTICE_PERIOD/RESIGNED/TERMINATED/ABSCONDED/RETIRED |
| role | VARCHAR | SUPER_ADMIN/COMPANY_ADMIN/HR/MANAGER/FINANCE/IT_ADMIN/EMPLOYEE |
| department_id | UUID FK | |
| designation_id | UUID FK | |
| branch_id | UUID FK | |
| reporting_manager_id | UUID FK → employees | Self-referential |
| ctc, basic_salary | DECIMAL | |
| bank_name, bank_account_number, bank_ifsc_code | VARCHAR | |
| aadhaar_number, pan_number, pf_number, uan_number | VARCHAR | |
| address, city, state, country, pincode | VARCHAR | |
| employment_type | VARCHAR | Full-time / Contract / Intern |
| work_location | VARCHAR | |
| deleted | BOOLEAN | Soft delete |
| created_at, updated_at | TIMESTAMP | |

#### `departments`
| Column | Type |
|--------|------|
| id | UUID PK |
| tenant_id | UUID |
| name | VARCHAR |
| description | TEXT |
| head_id | UUID FK → employees |
| deleted | BOOLEAN |

#### `designations`
| Column | Type |
|--------|------|
| id | UUID PK |
| tenant_id | UUID |
| name | VARCHAR |
| department_id | UUID FK |
| level | INT |
| deleted | BOOLEAN |

#### `branches`
| Column | Type |
|--------|------|
| id | UUID PK |
| tenant_id | UUID |
| name | VARCHAR |
| address, city, state, country | VARCHAR |
| latitude, longitude | DECIMAL | For geo-fencing |
| geo_fence_radius_meters | INT | |
| is_head_office | BOOLEAN | |

#### `attendance`
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| tenant_id | UUID | |
| employee_id | UUID FK | |
| date | DATE | |
| check_in | TIMESTAMP | |
| check_out | TIMESTAMP | |
| working_hours | DECIMAL | Calculated |
| status | VARCHAR | PRESENT/ABSENT/HALF_DAY/ON_LEAVE/HOLIDAY/WEEKEND |
| late_mark | BOOLEAN | After 10:15 AM |
| overtime_hours | DECIMAL | Working hours > 9 |
| check_in_location, check_out_location | VARCHAR | GPS coords |
| regularization_check_in | TIMESTAMP | Requested correction |
| regularization_check_out | TIMESTAMP | |
| regularization_status | VARCHAR | PENDING/APPROVED/REJECTED |
| regularization_reason | TEXT | |

#### `leave_types`
| Column | Type |
|--------|------|
| id | UUID PK |
| tenant_id | UUID |
| name | VARCHAR | CL, SL, EL, etc. |
| annual_limit | INT | |
| carry_forward | BOOLEAN | |
| is_paid | BOOLEAN | |
| gender_restricted | VARCHAR | MALE/FEMALE/ALL |

#### `leave_balances`
| Column | Type |
|--------|------|
| id | UUID PK |
| employee_id | UUID FK |
| leave_type_id | UUID FK |
| year | INT |
| total_days | DECIMAL |
| used_days | DECIMAL |
| remaining | DECIMAL | Computed |

#### `leave_requests`
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| tenant_id | UUID | |
| employee_id | UUID FK | |
| leave_type_id | UUID FK | |
| start_date, end_date | DATE | |
| number_of_days | INT | |
| reason | TEXT | |
| status | VARCHAR | PENDING/APPROVED/REJECTED/CANCELLED |
| approved_by | UUID FK → employees | Reporting manager |
| approver_remarks | VARCHAR | |
| rejection_reason | VARCHAR | |
| half_day | BOOLEAN | |
| half_day_type | VARCHAR | FIRST_HALF/SECOND_HALF |

#### `salary_structures`
| Column | Type |
|--------|------|
| id | UUID PK |
| tenant_id | UUID |
| employee_id | UUID FK |
| ctc | DECIMAL |
| basic_salary | DECIMAL |
| hra_allowance | DECIMAL |
| conveyance_allowance | DECIMAL |
| medical_allowance | DECIMAL |
| special_allowance | DECIMAL |
| is_active | BOOLEAN |
| effective_from, effective_to | DATE |

#### `payslips`
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| tenant_id | UUID | |
| employee_id | UUID FK | |
| month, year | INT | |
| working_days, present_days, absent_days | INT | |
| gross_salary | DECIMAL | |
| basic_salary, hra_allowance, conveyance_allowance, medical_allowance, special_allowance | DECIMAL | Earnings |
| bonus, overtime_pay, incentive, arrears | DECIMAL | |
| pf_deduction, pf_employer_contribution | DECIMAL | |
| esi_deduction, esi_employer_contribution | DECIMAL | |
| tds_deduction, professional_tax | DECIMAL | |
| net_salary | DECIMAL | |
| status | VARCHAR | DRAFT/APPROVED/PAID |
| bank_transaction_ref | VARCHAR | |

#### `permissions`
| Column | Type |
|--------|------|
| id | UUID PK |
| name | VARCHAR UNIQUE | `employee:create`, `payroll:approve` |
| description | VARCHAR | |
| module | VARCHAR | HR / Payroll / Attendance / Leave |

#### `audit_logs`
| Column | Type |
|--------|------|
| id | UUID PK |
| tenant_id | UUID | NULL for super admin actions |
| performed_by | UUID | |
| performer_email | VARCHAR | |
| performer_role | VARCHAR | |
| action | VARCHAR | EMPLOYEE_CREATED, PAYROLL_APPROVED, etc. |
| entity_type | VARCHAR | Employee, Payslip, LeaveRequest, etc. |
| entity_id | VARCHAR | |
| description | TEXT | |
| old_value, new_value | TEXT | |
| ip_address, user_agent | VARCHAR | |
| created_at | TIMESTAMP | |

---

## 6. Role & Permission Matrix

### Roles

| Role Enum | Description |
|-----------|-------------|
| `SUPER_ADMIN` | Platform owner — no tenant context |
| `COMPANY_ADMIN` | Company owner, full access within tenant |
| `HR` | HR operations across all employees |
| `MANAGER` | Team-level access, approval workflows |
| `FINANCE` | Payroll processing and financial reports |
| `IT_ADMIN` | Asset management, IT helpdesk |
| `EMPLOYEE` | Self-service only |

### Permission Codes (seeded in DB)

| Permission | Module | Who Has It by Default |
|------------|--------|-----------------------|
| `employee:create` | HR | COMPANY_ADMIN, HR |
| `employee:view` | HR | COMPANY_ADMIN, HR, MANAGER |
| `employee:update` | HR | COMPANY_ADMIN, HR |
| `employee:delete` | HR | COMPANY_ADMIN |
| `payroll:view` | Payroll | COMPANY_ADMIN, HR, FINANCE |
| `payroll:process` | Payroll | HR, FINANCE |
| `payroll:approve` | Payroll | COMPANY_ADMIN, FINANCE |
| `attendance:view` | Attendance | COMPANY_ADMIN, HR, MANAGER |
| `attendance:approve` | Attendance | HR, MANAGER |
| `leave:apply` | Leave | All roles |
| `leave:approve` | Leave | MANAGER, HR |
| `reports:view` | Reports | COMPANY_ADMIN, HR, FINANCE |
| `tenant:manage` | SaaS | SUPER_ADMIN only |

### URL Access Rules

Enforced per-route via `requireAuth()`/`requireRole()` inside each `app/api/**/route.js` handler — there's no separate framework-level filter chain in front; `middleware.js` only guards *page* routes, not `/api/**`.

```
/api/auth/**                    → Public (except /me, /logout, /change-password)
/api/super-admin/**             → SUPER_ADMIN only
/api/employees/**               → COMPANY_ADMIN, HR_MANAGER (list also MANAGER; get-one is any authenticated)
/api/attendance/**              → Authenticated (sub-routes further restricted per role — see section 7)
/api/leaves/**                  → Authenticated (approval routes restricted to MANAGER/HR_MANAGER/COMPANY_ADMIN/SUPER_ADMIN)
/api/payroll/**                 → HR_MANAGER, FINANCE, COMPANY_ADMIN (varies per route)
/api/departments/**, /designations/**, /branches/** → writes: COMPANY_ADMIN, HR_MANAGER; reads: any authenticated
```

---

## 7. API Reference

All endpoints return:
```json
{
  "success": true,
  "message": "OK",
  "data": { ... },
  "timestamp": "2026-01-01T10:00:00"
}
```
Errors return `"success": false` with `"error"` and `"errorCode"` fields.

---

### Auth APIs

| Method | URL | Auth | Description |
|--------|-----|------|-------------|
| POST | `/api/auth/login` | Public | Email + password → sets httpOnly JWT cookies |
| POST | `/api/auth/refresh-token` | Public (needs valid refresh cookie) | Refresh cookie → new access+refresh cookies |
| POST | `/api/auth/logout` | Required | Blacklists both tokens in MongoDB (checked on every request) |
| GET | `/api/auth/me` | Required | Current user profile |
| POST | `/api/auth/forgot-password` | Public | Send reset link (email sending still TODO — logs the token) |
| POST | `/api/auth/reset-password` | Public | Token + new password |
| POST | `/api/auth/change-password` | Required | Old + new password |

**Login Request:**
```json
{ "email": "hr@company.com", "password": "Nexahr@1234" }
```

**Login Response:**
```json
{
  "accessToken": "eyJ...",
  "refreshToken": "eyJ...",
  "tokenType": "Bearer",
  "expiresIn": 3600,
  "role": "HR",
  "tenantId": "uuid-here"
}
```

---

### Employee APIs

| Method | URL | Permission | Description |
|--------|-----|------------|-------------|
| GET | `/api/employees` | employee:view | List all (paginated, filterable) |
| POST | `/api/employees` | employee:create | Create new employee |
| GET | `/api/employees/{id}` | employee:view | Get by ID |
| PUT | `/api/employees/{id}` | employee:update | Update employee |
| DELETE | `/api/employees/{id}` | employee:delete | Soft delete |
| POST | `/api/employees/bulk-import` | employee:create | Excel/CSV bulk import (TODO) |
| GET | `/api/employees/{id}/timeline` | employee:view | Activity timeline (TODO) |
| GET | `/api/employees/{id}/leave-balance` | employee:view | Current leave balances |
| GET | `/api/employees/{id}/payslips` | payroll:view | All payslips |
| GET | `/api/employees/{id}/assets` | employee:view | Assigned assets (TODO) |

**Query params for GET /api/employees:**
- `page`, `size`, `sort`
- `search` — name, email, or code
- `departmentId` — UUID filter
- `status` — ACTIVE / INACTIVE / etc.

**Create Employee Body:**
```json
{
  "firstName": "Priya",
  "lastName": "Sharma",
  "email": "priya@company.com",
  "phone": "9876543210",
  "joiningDate": "2026-01-15",
  "departmentId": "uuid",
  "designationId": "uuid",
  "reportingManagerId": "uuid",
  "role": "EMPLOYEE",
  "gender": "FEMALE",
  "employmentType": "Full-time"
}
```

---

### Attendance APIs

| Method | URL | Auth | Description |
|--------|-----|------|-------------|
| POST | `/api/attendance/check-in` | Employee | Mark check-in (GPS optional) |
| POST | `/api/attendance/check-out` | Employee | Mark check-out |
| GET | `/api/attendance/today` | Employee | Today's attendance status |
| GET | `/api/attendance/my-attendance` | Employee | Own monthly records |
| GET | `/api/attendance/team` | Manager | Team attendance for a date |
| GET | `/api/attendance` | HR/Admin | Tenant-wide attendance for a date, + present/absent/late summary |
| POST | `/api/attendance/regularization` | Employee | Request correction |
| GET | `/api/attendance/regularization/pending` | Manager/HR | Pending regularizations |
| PUT | `/api/attendance/regularization/{id}/approve` | Manager/HR | Approve |
| PUT | `/api/attendance/regularization/{id}/reject` | Manager/HR | Reject |
| GET | `/api/attendance/monthly-report` | HR | Month summary |

**Check-in Body:**
```json
{
  "latitude": 28.6139,
  "longitude": 77.2090,
  "notes": "Working from office"
}
```

---

### Leave APIs

| Method | URL | Auth | Description |
|--------|-----|------|-------------|
| POST | `/api/leaves/apply` | Employee | Apply for leave |
| GET | `/api/leaves/my-leaves` | Employee | Own leave history |
| GET | `/api/leaves/pending-approval` | Manager/HR | Leaves awaiting approval |
| GET | `/api/leaves/all` | HR/Admin | All leave requests |
| PUT | `/api/leaves/{id}/approve` | Manager/HR | Approve with remarks |
| PUT | `/api/leaves/{id}/reject` | Manager/HR | Reject with reason |
| PUT | `/api/leaves/{id}/cancel` | Employee | Cancel pending leave |
| GET | `/api/leaves/balance` | Employee | Current year balances |
| GET | `/api/leaves/types` | Authenticated | Available leave types |
| GET | `/api/leaves/holidays` | Authenticated | Holiday calendar |
| GET | `/api/leaves/calendar` | Authenticated | Team leave calendar |

**Apply Leave Body:**
```json
{
  "leaveTypeId": "uuid",
  "startDate": "2026-02-10",
  "endDate": "2026-02-12",
  "reason": "Personal work",
  "halfDay": false
}
```

---

### Payroll APIs

| Method | URL | Permission | Description |
|--------|-----|------------|-------------|
| POST | `/api/payroll/run` | payroll:process | Run payroll for month/year |
| GET | `/api/payroll/monthly` | payroll:view | Get payroll run results |
| GET | `/api/payroll/payslip/{employeeId}` | payroll:view | Employee payslip |
| POST | `/api/payroll/approve` | payroll:approve | Approve draft payslips |
| GET | `/api/payroll/reports` | payroll:view | Payroll reports/summary |
| GET | `/api/payroll/salary-structure/{employeeId}` | payroll:view | Salary breakdown |

**Run Payroll Body:**
```json
{ "month": 1, "year": 2026 }
```

---

### Department / Organization APIs

| Method | URL | Description |
|--------|-----|-------------|
| GET | `/api/departments` | List all departments |
| POST | `/api/departments` | Create department |
| PUT | `/api/departments/{id}` | Update department |
| DELETE | `/api/departments/{id}` | Delete department |
| GET | `/api/designations` | List designations |
| POST | `/api/designations` | Create designation |
| GET | `/api/branches` | List branches |
| POST | `/api/branches` | Create branch |

---

### Super Admin APIs

| Method | URL | Description |
|--------|-----|-------------|
| GET | `/api/super-admin/dashboard` | Platform stats (companies, revenue, users) |
| GET | `/api/super-admin/revenue` | Monthly/yearly revenue breakdown |
| GET | `/api/super-admin/tenants` | List all companies (paginated, searchable) |
| POST | `/api/super-admin/tenants` | Create new company |
| GET | `/api/super-admin/tenants/{id}` | Company details |
| PUT | `/api/super-admin/tenants/{id}` | Update company |
| PUT | `/api/super-admin/tenants/{id}/suspend` | Suspend company |
| PUT | `/api/super-admin/tenants/{id}/activate` | Re-activate company |
| PUT | `/api/super-admin/tenants/{id}/features` | Toggle feature flags |
| GET | `/api/super-admin/tenants/{id}/audit-logs` | Company audit trail |
| GET | `/api/super-admin/plans` | List all plans |
| POST | `/api/super-admin/plans` | Create plan |
| PUT | `/api/super-admin/plans/{id}` | Update plan |
| DELETE | `/api/super-admin/plans/{id}` | Delete plan |
| GET | `/api/super-admin/audit-logs` | Global audit logs |
| GET | `/api/super-admin/support-tickets` | Support tickets (TODO) |

---

## 8. Authentication Flow

JWT lives in **httpOnly cookies** (`nexahr_token` = access, `nexahr_refresh` = refresh) set by the API route handlers — the browser never sees the raw token in JS, unlike the original's `localStorage` model. `lib/userLookup.js#findUserByEmail` checks `SuperAdminUser` first, then `Employee`, same priority as the original `UserDetailsServiceImpl`.

### Login Flow
```
1. POST /api/auth/login  { email, password }
2. findUserByEmail(email) → SuperAdminUser, else Employee (not deleted)
3. bcrypt.compare(password, user.password)
4. isAccountUsable() check (super admin `active`, or employee status ACTIVE/PROBATION)
5. generateAccessToken()/generateRefreshToken() — HS256, claims now include
   userId, role, tenantId, isSuperAdmin, permissions, type:'access'|'refresh'
   (embedded directly in the token so Edge middleware can read them without a DB call —
   the original only put the email in the subject and re-derived everything server-side)
6. setAuthCookies() → httpOnly, sameSite=lax, secure in production
7. Response body: { user: {...}, expiresIn } — no raw token in the JSON
```

### Per-Request Auth (API routes)
```
1. lib/auth.js#requireAuth() reads the nexahr_token cookie
2. jsonwebtoken verifies signature + expiry
3. Checks the `type` claim is 'access'
4. Checks MongoDB TokenBlacklist collection — FIXES a gap in the original,
   which wrote blacklist entries on logout but never actually checked them
5. requireRole(session, [...]) → RBAC check
6. requireTenantId(session) → used to scope every Mongoose query
```

### Per-Request Auth (page routes, via middleware.js)
```
1. middleware.js runs on the Edge runtime — verifies the JWT with `jose`
   (signature + expiry only; it cannot query MongoDB from Edge)
2. Reads role straight from the token claims
3. Redirects to /login if missing/invalid, or to the user's own dashboard
   if the role doesn't match the route's guard
```

### Logout
```
POST /api/auth/logout
→ blacklistToken(accessToken) AND blacklistToken(refreshToken)
   (MongoDB TokenBlacklist doc with a TTL index = token's own remaining expiry)
→ clearAuthCookies()
```

### Password Reset
```
POST /api/auth/forgot-password  { email }
→ Generate UUID reset token
→ MongoDB PasswordResetToken doc, TTL index expires it after 1 hour
→ Email sending is still unimplemented (logged to console only) — matches the original

POST /api/auth/reset-password  { token, newPassword }
→ Look up PasswordResetToken by token
→ If found: update password (bcrypt), delete the token doc
```

---

## 9. Multi-Tenancy Model

Every tenant-scoped Mongoose schema mixes in `tenantFields` from `models/_base.js`, which adds a required, indexed `tenantId: ObjectId` (ref `Tenant`).

### Tenant Isolation Rule
**Every query MUST be scoped by tenantId.** No exceptions. There is still no automatic query filter (no Mongoose plugin/middleware enforces this globally, same as the original having no Hibernate `@Filter`) — it's enforced by convention: every route handler calls `requireTenantId(session)` and passes the result into its Mongoose queries.

```js
// ✅ Correct — always scope by tenant
await Employee.find({ tenantId, deleted: false })

// ❌ Wrong — returns all tenants' data
await Employee.find({})
```

### How tenantId flows
```
JWT claim: tenantId (embedded directly in the token — see section 8)
        │
lib/auth.js#requireAuth() → returns the decoded session { tenantId, role, ... }
        │
Any route handler:
    const tenantId = requireTenantId(session)
    // throws ApiError(400) if session.tenantId is null (e.g. a super admin)
```

### Super Admin has no tenantId
Super admin JWTs have `tenantId: null`. Calling `requireTenantId()` in a super-admin-only route would throw — in practice, super-admin routes (`app/api/super-admin/**`) never call it; they operate cross-tenant by design.

---

## 10. Payroll Engine

India-specific statutory payroll calculation.

### Salary Breakdown Algorithm

```
Given: CTC (annual)

Basic = 40% of monthly CTC
HRA   = 40% of Basic
Conveyance = ₹1,600 (fixed)
Medical    = ₹1,250 (fixed)
Special    = Gross - Basic - HRA - Conveyance - Medical
```

### Attendance-Based Deduction

```
If employee was absent:
  per_day_salary = monthly_gross / working_days_in_month
  deduction = per_day_salary × absent_days
  earned_gross = gross - deduction
```

### Statutory Deductions

#### PF (Provident Fund)
```
PF Wage = min(Basic, ₹15,000)     ← ceiling
PF Deduction (employee) = 12% of PF Wage
PF Employer contribution = 12% of PF Wage
```

#### ESI (Employee State Insurance)
```
Applicable only if Gross ≤ ₹21,000
ESI Deduction (employee) = 0.75% of Gross
ESI Employer contribution = 3.25% of Gross
```

#### Professional Tax (Maharashtra slabs)
```
Gross < ₹7,500   → ₹0
₹7,500 – ₹10,000 → ₹175
> ₹10,000         → ₹200
```

#### TDS
```
Currently: ₹0 (flat — to be enhanced with Form 16 calculation)
```

### Net Salary
```
Net = Earned Gross - PF Deduction - ESI Deduction - Professional Tax - TDS
```

### Payroll Run Workflow
```
1. POST /api/payroll/run  { month, year }
2. Check: no APPROVED payroll exists for that month (idempotency)
3. Fetch all ACTIVE + PROBATION employees for tenant
4. For each employee:
   a. Find active SalaryStructure
   b. Count attendance (present/absent days)
   c. Calculate earnings, deductions, net salary
   d. Save Payslip (status = DRAFT)
5. POST /api/payroll/approve  { month, year }
   → Set all DRAFT → APPROVED
6. Generate bank transfer file (TODO)
```

---

## 11. Local Setup Guide

### Prerequisites

- Node.js 20+
- A MongoDB Atlas cluster (free tier is fine) — or any reachable MongoDB instance

### Step 1 — Configure environment

```bash
cp .env.example .env.local
```

Edit `.env.local` and set `MONGODB_URI` to your Atlas connection string (`mongodb+srv://<user>:<password>@<cluster>.mongodb.net/nexahr?retryWrites=true&w=majority`). Set `JWT_SECRET` to a long random value for anything beyond local dev.

### Step 2 — Install dependencies

```bash
npm install
```

### Step 3 — Seed the database

```bash
npm run seed
```

This seeds (mirrors the original `init.sql`):
- 4 plans (Free, Starter, Professional, Enterprise)
- 1 Super Admin: `admin@nexahr.io` / `Admin@1234`
- 13 permissions

### Step 4 — Run the app

```bash
npm run dev
```

The app starts at `http://localhost:3000` — pages and API routes are served from the same process, no separate backend to run.

### Step 5 — First Login

| Role | Email | Password |
|------|-------|----------|
| Super Admin | admin@nexahr.io | Admin@1234 |

Log in as the super admin, then create a company via **Tenants → Add Company** — fill in the "Admin account" fields in that form to also provision a `COMPANY_ADMIN` employee you can log in as immediately (this is the fixed version of the original flow, which created the tenant but no login-capable user).

---

## 12. Environment Variables

Single `.env.local` file at the repo root (see `.env.example`):

```env
# MongoDB Atlas connection string
MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/nexahr?retryWrites=true&w=majority

# JWT signing secret — use a long random string in production
JWT_SECRET=NexaHRSuperSecretKey2025ForJWTTokenSigningMustBe256BitsOrMore

# Token expiry (ms)
JWT_ACCESS_TOKEN_EXPIRY=3600000
JWT_REFRESH_TOKEN_EXPIRY=604800000

# Public base URL used by the browser client (same-origin by default)
NEXT_PUBLIC_API_URL=/api

# Used to build absolute links (password reset, etc.)
FRONTEND_URL=http://localhost:3000
```

There's no separate frontend `.env` — `NEXT_PUBLIC_*` variables are the only ones exposed to the browser bundle; everything else (`MONGODB_URI`, `JWT_SECRET`) stays server-only by Next.js convention.

---

## 13. Deployment Guide

There's a single deployable Next.js app now — no separate backend/frontend to coordinate, and no Redis to provision.

### Option A — Vercel (simplest)

1. Push the repo, import it into Vercel.
2. Set `MONGODB_URI`, `JWT_SECRET`, `JWT_ACCESS_TOKEN_EXPIRY`, `JWT_REFRESH_TOKEN_EXPIRY`, `FRONTEND_URL` (your production URL) as Vercel environment variables. Leave `NEXT_PUBLIC_API_URL` unset (defaults to same-origin `/api`).
3. Deploy — `next build` runs automatically. Run `npm run seed` once locally (or via a one-off script) pointed at the production `MONGODB_URI` to seed plans/super-admin/permissions.

### Option B — Docker (self-hosted / any Node host)

```dockerfile
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/.next ./.next
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/public ./public
EXPOSE 3000
CMD ["npm", "start"]
```

```yaml
# docker-compose.yml — only needed if you want a local MongoDB instead of Atlas
version: '3.8'
services:
  mongo:
    image: mongo:7
    ports:
      - "27017:27017"
    volumes:
      - mongo_data:/data/db

  app:
    build: .
    environment:
      MONGODB_URI: mongodb://mongo:27017/nexahr
      JWT_SECRET: ${JWT_SECRET}
      FRONTEND_URL: https://nexahr.example.com
    ports:
      - "3000:3000"
    depends_on:
      - mongo

volumes:
  mongo_data:
```

No nginx/reverse-proxy config is required for API routing — Next.js serves `/api/**` and the pages from the same process. Put a reverse proxy in front only for TLS termination/domain routing.

### Production Checklist

- [ ] Use MongoDB Atlas (or a properly secured, access-controlled MongoDB deployment) — never expose an unauthenticated instance
- [ ] Use a strong, random `JWT_SECRET` (256-bit minimum), different per environment
- [ ] Confirm cookies are `secure: true` in production (`lib/auth.js` already does this via `NODE_ENV === 'production'`)
- [ ] Set `FRONTEND_URL` to your real production origin
- [ ] Enable HTTPS end-to-end (Vercel does this automatically; self-hosted needs a TLS-terminating proxy)
- [ ] Set up regular MongoDB backups (Atlas: enable Cloud Backup)
- [ ] Run `npm run seed` once against production data before first use

---

## 14. Module Status & TODOs

### ✅ Complete (Next.js + MongoDB rewrite)

- [x] JWT Authentication in httpOnly cookies (login, refresh, logout, password reset) — `app/api/auth/**`, `lib/auth.js`
- [x] Multi-tenant isolation (`requireTenantId`, every route scopes its own queries)
- [x] Super Admin: tenant CRUD (incl. admin-user provisioning on create), plan management, feature flags, dashboard stats
- [x] Employee CRUD with auto-generated codes (EMP00001)
- [x] Department / Designation / Branch management (incl. frontend CRUD pages — the original had no `Departments`/`Designations`/`Branches` frontend service at all)
- [x] Attendance: check-in/out, late mark, overtime, regularization workflow
- [x] Leave management: apply, multi-level approval, balance tracking, overlap detection
- [x] Payroll: India statutory (PF, ESI, Professional Tax, attendance deductions) — `lib/payrollCalc.js`
- [x] Audit logging for all write operations — `lib/audit.js`
- [x] RBAC via `requireRole()` on every route
- [x] Consistent `{success, message, data, timestamp, errorCode}` error envelope — `lib/handler.js`, `lib/apiResponse.js`
- [x] Paginated responses (`paged()`)
- [x] Soft deletes across all collections
- [x] Frontend for all 5 role panels, now with real API calls instead of the original's mostly-mocked dashboards

### 🔧 Deferred (Phase 2) — same gaps as the original backend, carried forward as-is

- [ ] **Email Service** — Welcome email on employee creation, password reset email (still just `console.log`s the token)
- [ ] **Bulk Import** — `app/api/employees/bulk-import/route.js` accepts the file but doesn't parse it
- [ ] **Employee Timeline** — `app/api/employees/[id]/timeline/route.js` returns an empty list
- [ ] **Asset Management** — `app/api/employees/[id]/assets/route.js` returns empty; no Asset model exists
- [ ] **Support Tickets** — `app/api/super-admin/support-tickets/route.js` is stubbed
- [ ] **Geo-fence Attendance** — check-in accepts lat/lng but doesn't validate against `Branch.geoFenceRadius`
- [ ] **Holiday Calendar** — `app/api/leaves/holidays/route.js` returns a hardcoded 4-holiday list, not a real collection
- [ ] **Create Salary Structure API** — no route exists to create/assign a `SalaryStructure` yet, only to read one
- [ ] **Bank Transfer File Export** — generate NEFT/RTGS bulk file after payroll approval
- [ ] **TDS Calculation** — Currently ₹0; needs Form 16 / new tax regime slabs
- [ ] **Recruitment / ATS Module** — Job posts, candidates, interview pipeline
- [ ] **Performance Management** — Goals, KPIs, 360 reviews, appraisals
- [ ] **Onboarding / Offboarding Checklists**
- [ ] **AI HR Copilot** — OpenAI / Gemini integration for HR document generation
- [ ] **WhatsApp / Slack notifications**
- [ ] **Mobile App** (React Native or Flutter)
- [ ] **White-label / Custom domain** per tenant

### 🚨 Security Hardening (before go-live)

- [ ] Rate limiting on `/api/auth/login` (prevent brute force)
- [ ] Account lockout after N failed attempts
- [ ] 2FA (TOTP) for Company Admin and HR roles
- [ ] Input sanitization — Mongoose parameterizes queries by default, but audit any place raw user input is spread into a query object (NoSQL injection via query operators)
- [ ] File upload validation (bulk import — check MIME type, size limit)
- [ ] CORS: Lock down to specific frontend origins

---

## Seeded Data (init.sql)

### Default Plans

| Plan | Monthly Price | Employee Limit | Key Features |
|------|-------------|----------------|--------------|
| Free | ₹0 | 10 | Core HR + Leave |
| Starter | ₹2,999 | 50 | + Attendance + Documents |
| Professional | ₹7,999 | 250 | + Payroll + Reports |
| Enterprise | ₹19,999 | Unlimited | All modules + AI + API |

### Default Super Admin

| Field | Value |
|-------|-------|
| Email | admin@nexahr.io |
| Password | Admin@1234 |
| **Change this immediately after first login** | ⚠️ |

---

*NexaHR Master Documentation — Generated 2026-05-20*
*Captain / NexaHR Platform*
