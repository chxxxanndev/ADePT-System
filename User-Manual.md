# ADePT System — User Manual (Office Staff)

> **ADePT** stands for **A localized Document Request Tracking and Printing System for the Provincial Assessor's Office**.
>
> This manual is for **office staff** users who create, process, pay, verify, print, and release document requests. If you are a system administrator (SUPER_ADMIN/ADMIN), see the separate **Admin Manual** (`Admin-Manual.md`).
>
> Everything in this manual was verified against the current system. Items that could not be confirmed are marked **`To be verified`**.

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Signing In and Out](#2-signing-in-and-out)
3. [The Dashboard](#3-the-dashboard)
4. [Sidebar Navigation](#4-sidebar-navigation)
5. [Creating a Document Request](#5-creating-a-document-request)
6. [Pending Requests (Payments & O.R. Validation)](#6-pending-requests-payments--or-validation)
7. [Transaction Management (Registry)](#7-transaction-management-registry)
8. [Certified True Copy (CTC) Reprints](#8-certified-true-copy-ctc-reprints)
9. [Void and Amend](#9-void-and-amend)
10. [Archive Management](#10-archive-management)
11. [Reports & Analytics](#11-reports--analytics)
12. [Notifications](#12-notifications)
13. [Account Settings](#13-account-settings)
14. [Document Request Statuses at a Glance](#14-document-request-statuses-at-a-glance)
15. [Troubleshooting](#15-troubleshooting)

---

## 1. Introduction

ADePT lets the office staff of the Provincial Assessor's Office:

- Encode document requests (Tax Declarations, Certificates of Land Holding / No Landholding).
- Track every request from encoding to release.
- Process payments and validate Official Receipts (O.R.).
- Print Certified True Copies and reprint them when needed.
- Void, amend, archive, and restore transactions.
- View reports and analytics without needing IT help.
- Receive notifications whenever a request changes status.

The staff experience is a single **Dashboard** with a left sidebar. The system is web-based — no software installation is needed.

---

## 2. Signing In and Out

### 2.1 Accessing the system

Open your web browser and go to the system URL.

- Production: **https://adept-portal.vercel.app/**
- Local testing: `http://localhost:5173` (depends on how your IT set it up — **`To be verified`** with your administrator)

### 2.2 Logging in

1. Enter your **Username** and **Password**.
2. Click **Sign In / Login**.

If your account was recently created, it may still be **Pending Approval** — you cannot log in until an administrator approves it (see §13 and the Admin Manual).

If your account is **disabled**, you will be asked to reactivate it; after reactivation, an administrator still needs to re-enable you **`To be verified`**.

### 2.3 Forgot password

Use the **"Forgot Password?"** link on the login page and follow the on-screen instructions. The system will guide you through resetting your password.

### 2.4 Logging out

1. Click **Log out** at the bottom of the sidebar.
2. Confirm in the pop-up dialog.

> Logging out is always confirmed first, so you cannot log out by accident.

---

## 3. The Dashboard

The Dashboard is the first screen you see after logging in. It shows:

| Area | What it shows |
|---|---|
| **Statistic cards** | Total Requests, Released Today, Monthly Issued Docs, Active Requests (in the selected period) |
| **Administrative cards** (same page, separate group) | Archived, Voided, Reprinted, Cancelled |
| **Analytics overview** | Charts of requests over time (weekly trend) |
| **Document distribution** | Share of Tax Declaration / Land Holding / No Landholding requests |
| **Recent transactions** | Latest requests with status, control number, declarant, and date |
| **Quick actions** | Shortcuts: New Request, Pending Payment, Search Transactions, Archive Management, Reports & Analytics |
| **Period selector** | Filter the numbers by date range (default: today) |

The numbers come live from the Transaction Registry, so they update as staff process requests.

---

## 4. Sidebar Navigation

The left sidebar is organized into groups:

| Group | Item | What it opens |
|---|---|---|
| **General** | Dashboard | Home screen with stats |
| **General** | Notifications | Your notification inbox (shows an unread badge) |
| **Requests** | Document Request | Start a new document request |
| **Processing** | Pending Requests | Requests awaiting payment / processing |
| **Transactions** | Transaction Management | The full transaction registry |
| **Transactions** | Archive Management | Archived and cancelled requests |
| **Reports** | Reports & Analytics | Reports and summaries |
| **Others** | Settings | Your account settings (profile, password) |
| **Others** | About Us | Information about the system |

The sidebar can be collapsed to an icon rail (toggle button next to the ADePT logo). It also collapses automatically on small screens.

> **Note**: The sidebar you see depends on your account. Only administrators see the admin module; the staff sidebar is exactly as listed above.

---

## 5. Creating a Document Request

### 5.1 Start a new request

1. Click **Document Request** in the sidebar (or **New Request** in Quick Actions).
2. Choose the document type. The system supports:

| Document type | Form used |
|---|---|
| Tax Declaration | `TaxDeclarationForm` — property, owner, administrator, assessment data |
| Certificate of Land Holding | `LandholdingCertificateForm` — owner details |
| Certificate of No Landholding | `NoLandholdingCertificateForm` — owner details |

3. Fill in the required fields. Forms are long and organized into sections (e.g., property info, owner info, assessment rows).
4. **Save** your progress. Incomplete entries are kept so you can continue later — the system warns you if you try to leave a form unfinished.

> The fields differ per document type; follow the labels on the form. Required fields are marked in the form itself.

### 5.2 What happens after saving

The request gets a **control / reference number** and appears in **Pending Requests** and the **Transaction Registry** with the status **`DRAFT`** (or `PENDING_PAYMENT` — see §14).

> **`To be verified`**: the exact label of the first status a new request gets in the live system (the enum includes both `DRAFT` and `PENDING_PAYMENT`).

---

## 6. Pending Requests (Payments & O.R. Validation)

Open **Processing → Pending Requests** from the sidebar. This screen lists requests awaiting action.

### 6.1 Marking a request as paid

1. Open the pending request.
2. Enter the payment / Official Receipt (O.R.) details when prompted.
3. The request then moves to the next stage of processing.

### 6.2 O.R. Validation

When a request is pending verification:

- Open the request and review the O.R. details entered.
- **Approve** or **Disapprove** it (the decision is recorded with the values `PENDING` / `APPROVED` / `DISAPPROVED`).
- Approved requests move forward toward **Ready for Signature**; disapproved ones go back for correction.

### 6.3 Release and printing

- Once signed, requests become **Ready for Release**.
- In the release panel you can configure print layout (left/right margins, TD/ARP No., Location, Lot No., Title No., Area, Assessed Value) before printing.
- After printing, mark the request as **Released** so the client can pick up the document.

> **`To be verified`**: whether printing is done from the staff dashboard or by an administrator — both modules contain print-related screens.

---

## 7. Transaction Management (Registry)

Open **Transactions → Transaction Management**. This is the master list of every transaction.

- **Search** for transactions (by declarant, control number, etc.).
- **Filter by status** using the tabs (e.g., Pending Payment, O.R. Validation, Ready for Signature, Released, Voided).
- **Summary cards** at the top show totals (Total, Released, Pending).
- Click a row to open full details: property info, documents requested, status history, payments.

Long names (declarants, staff) are truncated in the table; hovering the name shows the full value in a tooltip. If a name is cut off and shows **"See more"**, click it to expand the full text.

---

## 8. Certified True Copy (CTC) Reprints

Open the **Certified True Copy / Reprint** screen (from the Transactions area).

- It lists previously printed documents with summary cards: **Total Reprinted Documents**, **Released**, **Pending**.
- Use it when a client needs an additional copy of a document that was already released.
- Each reprint is tracked, so you always know how many copies were printed.

---

## 9. Void and Amend

If a transaction was encoded incorrectly and can no longer be corrected normally:

- Open the transaction and choose **Void / Amend**.
- The original record is kept for audit purposes (status becomes **`VOID`**), and a correction can be made.
- **Voiding cannot be undone without an administrator** — double-check before confirming.

---

## 10. Archive Management

Open **Transactions → Archive Management**.

- Lists requests that are **Archived** or **Cancelled** (inactive records).
- You can **restore** archived requests back to active processing.
- Summary cards show Total Archived, Cancelled, and Archived counts.

---

## 11. Reports & Analytics

Open **Reports → Reports & Analytics**.

- Pre-built summaries of requests, releases, reprints, voids, and cancellations.
- The numbers here come from the same analytics source as the Dashboard, so they never contradict each other.

> **`To be verified`**: whether reports can be exported to Excel — the system includes the `xlsx` library, but no verified export button was confirmed for this screen.

---

## 12. Notifications

Open **Notifications** from the sidebar (a badge shows how many are unread).

- You are notified when a request changes status (created, paid, validated, signed, released, voided, etc.).
- Click a notification to jump to the relevant transaction.

---

## 13. Account Settings

Open **Others → Settings**. This screen has two sections:

### Profile Information

| Field | Who can edit |
|---|---|
| Full Name | You |
| Username | You |
| Position | **Administrator only** (shows a hint: "Position can only be set by an administrator") |
| Photo / Avatar | You |

### Security Settings

| Action | Notes |
|---|---|
| Change email | You |
| Change password | You (enter current password, then the new one) |
| Disable account | You — **careful**: the system logs you out immediately and an administrator must re-enable you |

---

## 14. Document Request Statuses at a Glance

A request moves through these statuses (exact wording may differ slightly on screen):

| Status | Meaning |
|---|---|
| DRAFT | Created but not yet submitted for processing |
| PENDING_PAYMENT | Waiting for payment details to be entered |
| OR_VALIDATED | Official Receipt was validated |
| READY_FOR_SIGNATURE | Awaiting authorized signatory |
| SIGNED | Signed by the authorized representative / assistant assessor |
| RELEASED | Document printed and handed to the client |
| VOID | Voided (incorrect record kept for audit) |

Individual documents inside a request also move: **Pending → PDF Generated → Printed → Released**.

---

## 15. Troubleshooting

| Problem | What to do |
|---|---|
| "Account pending approval" at login | Your account was not approved yet — contact an administrator. |
| "Account disabled" at login | Use the reactivation prompt, then ask an administrator to re-enable the account. |
| Can't find a transaction | Use Transaction Management search, or widen the date range on the Dashboard. |
| Form won't save | Check required fields; incomplete entries are kept for later. |
| A name is cut off in a table | Hover the name for a tooltip; click **See more** to expand. |
| PDF doesn't generate | Tell your administrator; PDFs are generated in the browser, so also check your browser's pop-up / download settings. |
| You think a transaction is wrong | Don't void it unless sure — use **Void & Amend** only after confirming, and inform your administrator. |

---

*Questions about access, roles, or approvals? See the Admin Manual (`Admin-Manual.md`).*
