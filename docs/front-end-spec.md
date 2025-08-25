# TDH Agency Leave Tracker - Comprehensive UX Specification

## 1. Project Overview

### MVP Scope Definition
This specification covers the Minimum Viable Product (MVP) release including:
* Annual leave requests only (32 days per employee)
* Basic approval workflow (admin approval required)
* Team coverage visualization for UK agents
* User management for small team (4 users initially)
* Explicitly excluded from MVP: TOIL (Time Off In Lieu) system, multiple leave types (sick, unpaid), email notifications, advanced reporting features, mobile native app.

### Target User Personas
* **Primary: Agent (Sup Dhanasunthorn, Luis Drake)**
    * Goals: Submit leave requests quickly, check remaining balance, avoid conflicts with UK colleague.
    * Pain Points: Need to coordinate with other UK agent, unclear approval status.
    * Technical Comfort: Moderate, uses web applications daily.
* **Primary: Head Agent/Admin (Senay Taormina)**
    * Goals: Approve/reject requests efficiently, maintain team coverage, oversee leave balances.
    * Pain Points: Managing international team from NZ timezone, ensuring UK coverage.
    * Technical Comfort: High, manages multiple business systems.
* **Secondary: Technical Admin (Ian Vincent)**
    * Goals: System maintenance, user management, troubleshooting.
    * Pain Points: Security management, data integrity.
    * Technical Comfort: Expert level.

---

## 2. Information Architecture

### Navigation Structure
* Dashboard (Role-based home)
    * `├──` My Leave Balance
    * `├──` My Leave Requests
    * `├──` Team Calendar
    * `├──` Submit Leave Request
    * `├──` [Admin] Pending Requests
    * `├──` [Admin] All Employee Balances  
    * `├──` [Admin] User Management
    * `└──` User Profile & Settings
### Content Hierarchy
* **Dashboard Priority Order**: Current leave balance (prominent display), pending request status (if any), quick actions (Submit Request, View Calendar), [Admin] pending approvals requiring attention, recent activity summary.
### URL Structure
* `/login`, `/register`, `/forgot-password`, `/reset-password`, `/dashboard`, `/leave/balance`, `/leave/requests`, `/leave/submit`, `/leave/calendar`, `/admin/pending`, `/admin/employees`, `/admin/users`, `/profile`

---

## 3. User Flows & Interaction Patterns

* **Critical User Journey: Submit Leave Request**: User reviews team calendar for conflicts, the system shows available days before submission, calendar picker with UK holidays marked and weekends excluded, a warning is displayed if a conflict exists, a clear confirmation page appears before final submission, and the user receives immediate confirmation with a tracking reference.
* **Admin Approval Workflow**: A new request appears in the pending queue, the admin reviews employee details and team impact, they can approve or reject with a mandatory comment for rejections, the balance updates instantly upon approval, and the user's status updates immediately in their view.
* **Error Recovery Patterns**: Inline form validation with specific guidance, retry mechanism with clear status for network errors, and auto-save draft with a login prompt for session expiry.

---

## 4. Visual Design System

### Color Palette
* **Primary**: Navy Blue (`#1B365D`), Charcoal (`#2D3748`).
* **Accent**: Teal (`#00B5A5`), Orange (`#ED8936`), Red (`#E53E3E`).
* **Neutral**: White (`#FFFFFF`), Light Gray (`#F7FAFC`), Medium Gray (`#E2E8F0`), Dark Gray (`#4A5568`).
### Typography Scale
* **Headings**: `H1` (32px), `H2` (24px), `H3` (20px), `H4` (16px).
* **Body Text**: Large (18px), Regular (16px), Small (14px), Micro (12px).
* **Font Family**: "Inter" or system fallback.
### Component Library
* **Buttons**: Primary, Secondary, and Danger buttons with defined colors and states.
* **Cards**: Standard and Request cards with status indicators.
* **Form Elements**: Input fields with validation states, a date picker with holiday marking, and clear validation.
### Data Visualization
* **Leave Balance Display**: A circular progress ring with textual breakdown.
* **Calendar View**: A monthly grid with holidays, approved, and pending leave clearly marked.
* **Status Indicators**: Colored dots and labels for request and coverage statuses.

---

## 5. Content Strategy

### Messaging Guidelines
* **Confirmation Messages**: Clear, concise messages for submission, approval, and rejection.
* **Error Messages**: User-friendly messages for form validation, balance exceeded, and network issues.
* **Empty States**: Engaging messages for when no data is present.
### Help Text & Guidance
* Help text for leave balance, UK coverage, and admin notes.

---

## 6. Responsive Design Strategy

* **Breakpoints**: Mobile (320-767px), Tablet (768-1023px), Desktop (1024px+).
* **Adaptation Patterns**: Single column on mobile, multi-column on desktop, and collapsible navigation for smaller screens.
* **Touch Considerations**: Minimum 44px touch targets and increased spacing for easy mobile use.

---

## 7. Accessibility Requirements

* **WCAG AA Compliance**: Adherence to WCAG AA standards.
* **Keyboard Navigation**: Full keyboard navigation support.
* **Focus Management**: Visible focus indicators and focus traps for modals.
* **Screen Reader Support**: Semantic HTML and ARIA attributes for screen reader compatibility.
* **Color & Contrast**: Minimum contrast ratios for text and non-text elements.
* **Testing Requirements**: Manual and automated accessibility testing.

---

## 8. Performance Requirements

* **Loading States**: Skeleton screens, progressive loading, and inline indicators.
* **Data Refresh**: Real-time updates for approval statuses and auto-refresh for balances.
* **Error Handling**: Graceful handling of network, form, and system errors.
### Development Handoff Specifications
* **Asset Requirements**: SVG icons, high-resolution images, and component state variations.
* **Animation Specifications**: Defined transition standards and common animations.
* **Browser Support**: Specified modern browser support.
* **Testing Checklist**: A checklist to ensure all features and non-functional requirements are met.