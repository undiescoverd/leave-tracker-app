# TDH Agency Leave Tracker Product Requirements Document (PRD)

## Goals and Background Context

### Goals
* Enable TDH Agency to digitally track and manage employee leave.
* Provide a secure and reliable system for leave requests and approvals.
* Automate leave balance calculations to reduce manual errors.
* Ensure all data is accurate and easily accessible to relevant personnel.

### Background Context
The Dark Horse Agency, a London-based talent agency, currently lacks a formal system for managing employee leave. This absence leads to manual tracking, potential errors, and a lack of transparency regarding leave balances and team availability. This leave tracker app aims to provide a centralized solution that addresses this need by offering a secure, automated, and user-friendly platform for leave management.

### Change Log
| Date | Version | Description | Author |
| :--- | :--- | :--- | :--- |
| 2025-08-23 | 1.0 | Initial PRD draft. | John |

---

## Requirements

### Functional
1.  **FR1**: The system will allow an employee to register and log in to the application.
2.  **FR2**: The system will allow an employee to submit a leave request for Annual Leave.
3.  **FR3**: The system will display an employee's current annual leave balance, showing entitled, used, and remaining days.
4.  **FR4**: The system will provide an administrative view to see all pending leave requests.
5.  **FR5**: The system will allow an administrator to approve or reject a leave request and add comments.
6.  **FR6**: The system will automatically update an employee's leave balance when a request is approved.
7.  **FR7**: The system will display a team calendar showing approved leave to prevent overlapping leave for UK agents.
8.  **FR8**: The system will provide a basic user management interface for adding and removing users.
9.  **FR9**: The system will display a warning if a leave request from a UK agent overlaps with another approved UK agent's leave.

### Non-Functional
1.  **NFR1**: The application must be secure, with proper authentication, session management, and password reset functionality.
2.  **NFR2**: The system must enforce row-level security to ensure users can only see their own data and administrators can see all employee data.
3.  **NFR3**: The system's performance should be responsive for a small team of 3-4 users.

---

## User Interface Design Goals

### Overall UX Vision
A clean, corporate-friendly aesthetic with a touch of modern minimalism to reflect TDH Agency's professionalism. The app must be intuitive and easy to use without training.

### Key Interaction Paradigms
* **Clarity over cleverness**: Prioritize clear communication and standard UI patterns.
* **Progressive disclosure**: Only show the user what they need at that moment to avoid clutter.
* **Immediate feedback**: Every action should have a clear, immediate response.

### Core Screens and Views
* Login Screen
* Registration Screen
* Password Reset Flow Screens
* Main Dashboard
* Leave Request Form
* Leave Balance Display
* Team Calendar
* My Leave Requests History
* Admin Pending Requests View
* Admin User Management View
* User Profile & Settings

---

## Technical Assumptions

### Repository Structure: Monorepo
### Service Architecture: Monolith (Next.js API routes)
### Testing Requirements: Unit Only

---

## Epic List

1.  **Epic 1: Foundation & Core Infrastructure**: Establish project setup, authentication, and basic user management.
2.  **Epic 2: Core Leave Management**: Enable users to request leave and admins to approve it.
3.  **Epic 3: UI & Team Coverage**: Finalize the user-facing UI and implement the team calendar feature.

---

## Epic 1: Foundation & Core Infrastructure

**Epic Goal**: Establish the foundational infrastructure of the project, including the database, authentication, and a basic user management system, while delivering the core functionality to allow users to log in and view their data.

### Story 1.1: Project Setup & Database
**As a** developer,
**I want** to set up the project and database,
**so that** I have a working foundation for the application.

### Acceptance Criteria
1.  The project scaffolding is complete with Next.js, TypeScript, and Tailwind.
2.  Prisma is installed and configured to connect to the Vercel Postgres database.
3.  The core `User` data model is defined in the Prisma schema with `id`, `email`, and `role`.
4.  The initial database migration is created and applied.
5.  The project runs successfully locally.

### Story 1.2: User Authentication & Registration
**As a** user,
**I want** to be able to securely register and log in to the application,
**so that** I can access my account.

### Acceptance Criteria
1.  A user can register with a valid email and password.
2.  A user can log in with a registered email and password.
3.  A user can securely log out.
4.  An administrator role can be assigned to a user upon creation via the API.

### Story 1.3: User Management
**As an** administrator,
**I want** to be able to add and view users,
**so that** I can manage the team.

### Acceptance Criteria
1.  The `User` model is extended to include `name` and other necessary profile details.
2.  An API endpoint exists to add a new user with a specified role.
3.  An administrative view displays a list of all users.
4.  The user's role is correctly displayed in the administrative view.
5.  Admins can create new users.

---

## Epic 2: Core Leave Management

**Epic Goal**: To implement the central features of the application, enabling employees to manage their annual leave requests and administrators to oversee and process them.

### Story 2.1: Submit Annual Leave Request
**As a** user,
**I want** to submit a request for annual leave,
**so that** my time off can be formally tracked and approved.

### Acceptance Criteria
1.  A form is available to submit a leave request with start and end dates.
2.  The `Leave` model in the Prisma schema is updated to include `startDate`, `endDate`, and `status`.
3.  A new API endpoint is created to handle leave request submissions.
4.  The leave request is associated with the authenticated user.

### Story 2.2: View Leave Balance and History
**As a** user,
**I want** to see my total annual leave balance and my past requests,
**so that** I can plan my time off effectively.

### Acceptance Criteria
1.  The user's total annual leave entitlement (32 days) is displayed.
2.  The number of used and remaining days is calculated and displayed.
3.  A dedicated page shows a list of all the user's submitted leave requests.
4.  Each request in the list shows its status (pending, approved, rejected).

### Story 2.3: Admin Leave Request Approval
**As an** administrator,
**I want** to see pending leave requests and approve or reject them,
**so that** I can manage the team's leave efficiently.

### Acceptance Criteria
1.  A dedicated administrative view shows all pending leave requests.
2.  An admin can approve a request. Upon approval, the user's leave balance is automatically updated.
3.  An admin can reject a request.
4.  The admin must provide a comment when rejecting a request.

---

## Epic 3: UI & Team Coverage

**Epic Goal**: To complete the user interface, implement critical team coordination features, and ensure the application is ready for use by the TDH Agency team.

### Story 3.1: Finalize User-Facing UI
**As a** user,
**I want** a polished and intuitive user interface,
**so that** I can easily use the application without confusion.

### Acceptance Criteria
1.  The UI for all user-facing pages (dashboard, balance, requests) is implemented according to the `front-end-spec.md`.
2.  The application uses the specified color palette and typography.
3.  UI components are built and used consistently.
4.  The navigation structure is implemented correctly.

### Story 3.2: Team Calendar and Overlap Warning
**As a** user,
**I want** to see a calendar of my team's approved leave,
**so that** I can plan my time off without causing a coverage conflict.

### Acceptance Criteria
1.  A team calendar view is implemented, displaying all approved leave requests for all agents.
2.  When a user submits a leave request, a warning is displayed if their dates overlap with another UK agent's approved leave.
3.  The calendar view is easy to read and shows who is on leave on which days.