# ADePT System — Admin Manual (System Administrator)

> **ADePT** stands for **A localized Document Request Tracking and Printing System for the Provincial Assessor's Office**.
>
> This manual is for **system administrators** (role `SUPER_ADMIN` or `ADMIN`). Administrators get a separate **Admin Module** with access control, account management, transaction oversight, reports, and the audit log. If you are regular office staff, see the **User Manual** (`User-Manual.md`).
>
> Everything in this manual was verified against the current system. Items that could not be confirmed are marked **`To be verified`**.

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Accessing the Admin Module](#2-accessing-the-admin-module)
3. [Admin Dashboard (Overview)](#3-admin-dashboard-overview)
4. [Account Requests (Approval / Rejection)](#4-account-requests-approval--rejection)
5. [Staff Accounts](#5-staff-accounts)
6. [Transaction Queue](#6-transaction-queue)
7. [Reports & Analytics](#7-reports--analytics)
8. [Audit Log](#8-audit-log)
9. [Admin Settings](#9-admin-settings)
10. [Roles & Permissions at a Glance](#10-roles--permissions-at-a-glance)
11. [Staff-Side Duties an Admin May Perform](#11-staff-side-duties-an-admin-may-perform)
12. [Troubleshooting](#12-troubleshooting)

---

## 1. Introduction

The Admin Module is the administrative arm of ADePT. Administrators can:

- **Approve or reject** new account registrations.
- **Manage staff accounts** (roles, positions, enable/disable).
- **Oversee the transaction queue** (all requests across all staff).
- **View reports and analytics** at office level, including staff performance.
- **Review the audit log** — every important action is recorded.
- **Change their own admin settings** and passwords.

Admins sign in on the same login page as staff. The system decides which module to load based on the account's role.

---

## 2. Accessing the Admin Module

1. Open the system in your browser (production: **https://adept-portal.vercel.app/**).
2. Log in with your administrator username and password.
3. If your role is `SUPER_ADMIN` or `ADMIN`, you land directly in the **Admin Dashboard**; staff land in the regular staff Dashboard.

### Role changes

- If an administrator **demotes** you (or promotes you from staff to admin), the system shows a **role notice** on your next session and logs you out — you must sign in again to get the new module.
- If you were demoted, you will see the staff Dashboard instead of the Admin Module.

> **`To be verified`**: whether there is any in-app way to switch between the staff and admin modules without logging out. In the verified code, admins only see the Admin Module.

---

## 3. Admin Dashboard (Overview)

The Overview (sidebar → **General → Overview**) is the admin home screen. It reports on **accounts** and **transactions**:

### Account statistics

| Card | Meaning |
|---|---|
| Active Accounts | Staff accounts currently active |
| Pending Registration | New sign-ups awaiting your approval |
| Approved Today | Registrations you approved today |
| Declined Today | Registrations you rejected today |

### Transaction statistics

| Card | Meaning |
|---|---|
| Requested Today | Requests created in the selected range |
| Processing | Requests currently in progress |
| Approved Documents | Released/approved documents |
| Void Documents | Voided transactions |

### Other panels

- **Staff Performance** — per-staff processing totals (switchable between date-filtered and all-time views).
- **Recent Transactions** — latest requests across all staff.
- **Document Distribution** — share of Tax Declaration / Land Holding / No Landholding requests.

Every panel can be refreshed individually, and numbers update as staff process requests.

---

## 4. Account Requests (Approval / Rejection)

When staff sign up, their accounts start as **`PENDING_APPROVAL`** and they cannot log in until you act.

1. In the sidebar, go to **Access Control → User Management → Account Request**.
2. The sidebar badge shows how many requests are waiting.
3. Review each applicant's details.
4. **Approve** to activate the account (status becomes `ACTIVE`) or **Decline/Reject** (status becomes `REJECTED`).

Your approvals and declines are recorded — the dashboard counts "Approved Today" and "Declined Today" from these actions.

---

## 5. Staff Accounts

Go to **Access Control → User Management → Staff Accounts** to manage existing accounts.

Administrators can (per verified capabilities):

| Action | Notes |
|---|---|
| View all staff accounts | Including status (`ACTIVE`, `DISABLED`, `PENDING_APPROVAL`, `REJECTED`) |
| **Set staff position / title** | Staff cannot set their own position — the account settings screen tells them "Position can only be set by an administrator" |
| **Enable / Disable accounts** | Disabled accounts are forced out at next login and cannot sign in until re-enabled |
| Change roles | Assign `OFFICE_STAFF` vs `ADMIN`/`SUPER_ADMIN` (**`To be verified`**: exact UI location) |

> **Security note**: be deliberate when granting `SUPER_ADMIN`/`ADMIN` — anyone with it sees the full admin module including the audit log and all accounts.

---

## 6. Transaction Queue

Go to **Access Control → Transaction Queue**. This is the admin view of every document request in the system, with tabs:

| Tab | Shows |
|---|---|
| All | Every request |
| Pending | Requests awaiting processing/payment |
| Released | Completed and released requests |
| Reprints | Requests that were reprinted (CTCs) |

Use it to monitor workload and catch stuck requests before clients are affected.

---

## 7. Reports & Analytics

Go to **Other → Reports & Analytics**. The admin module includes office-level reporting:

- Request volumes and releases.
- Void/cancelled/archived counts.
- Staff performance summaries.

> **`To be verified`**: exact report list and whether any report exports to Excel/PDF (the system bundles the `xlsx` library, but no export button was confirmed in the admin reports screen).

---

## 8. Audit Log

Go to **Other → Audit Log**. Every important action in the system is recorded in the `audit_logs` table, including:

| Action type | Meaning |
|---|---|
| `LOGIN` / `LOGOUT` | Session events |
| `CREATE` / `UPDATE` / `CLONE` / `AMEND` | Record creation and changes |
| `VIEW` / `PRINT` / `RELEASE` | Document handling |
| `OR_VALIDATION` | O.R. validation decisions |
| `VOID` | Voided transactions |
| `PASSWORD_CHANGE` | Password changes |

Staff-side actions (request encoding, O.R. validation, releases) are logged automatically by the same services the admin audit log reads, so the log reflects the whole office, not just admin actions.

---

## 9. Admin Settings

Go to **Other → Settings**. This is your own account settings screen inside the Admin Module:

- Profile information (name, username, position).
- Email address.
- Password change.
- Account photo.
- Disable account (logs you out immediately — ask a second admin to re-enable you if needed, **`To be verified`** that another admin can do so).

---

## 10. Roles & Permissions at a Glance

| Role | Module after login | Capabilities |
|---|---|---|
| `SUPER_ADMIN` | Admin Module | Full administration + oversight (verified gate in `App.tsx`) |
| `ADMIN` | Admin Module | Same admin gate as SUPER_ADMIN (verified in `App.tsx`) |
| `OFFICE_STAFF` | Staff Dashboard | Request encoding, payments, validation, printing, reprints, reports |

> **`To be verified`**: the exact functional differences between `SUPER_ADMIN` and `ADMIN` beyond module access (the verified code gates both the same way at login).

Account statuses an admin will encounter:

| Status | Meaning |
|---|---|
| `PENDING_APPROVAL` | Signed up, waiting for your approval |
| `ACTIVE` | Can log in and work |
| `DISABLED` | Locked out until re-enabled |
| `REJECTED` | Registration declined |

---

## 11. Staff-Side Duties an Admin May Perform

Administrators can also work like staff, since the system shares the same data. Verified staff-side screens exist for:

- Payment processing and **O.R. validation** (approve/disapprove receipts).
- **Signatories** on printed documents — the system tracks an **Authorized Representative** and an **Assistant Assessor** signature on payment details.
- Printing configuration (margins, TD/ARP No., location, lot/title, area, assessed value).

> **`To be verified`**: whether the office expects admins to perform these tasks themselves, or only to monitor them.

---

## 12. Troubleshooting

| Problem | What to do |
|---|---|
| Staff say "account pending approval" | Go to **Account Request** and approve their registration. |
| Staff say "account disabled" | Go to **Staff Accounts**, locate the account, and re-enable it. |
| A request is stuck in one status | Check **Transaction Queue** (Pending tab), then check the **Audit Log** for the last recorded action on it. |
| You changed a role but nothing happens for the user | The user must **log out and back in** (role changes trigger a role notice and forced re-login on next session). |
| A staff member can't set their position | Expected — position is admin-only by design; set it in **Staff Accounts**. |
| You want to know who printed a document | Check the **Audit Log** for `PRINT` actions and the print history in the transaction details. |
| System is slow / data looks wrong | Verify with the transaction registry numbers, then contact the developer with the audit log details. |

---

*For day-to-day request processing instructions, see the User Manual (`User-Manual.md`).*
