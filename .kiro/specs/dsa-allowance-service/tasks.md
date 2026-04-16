# Implementation Plan: DSA Allowance Service

## Overview

This plan implements the DSA Allowance Service as a Next.js 14 (App Router) full-stack application with TypeScript, GOV.UK Frontend styling, JSON file-based data storage, and mocked notification/AI services. Tasks are ordered to build foundational data models and services first, then the student-facing application form, then the caseworker dashboard, and finally integration wiring.

## Tasks

- [x] 1. Set up project structure, dependencies, and core data models
  - [x] 1.1 Initialise Next.js 14 project with TypeScript, install dependencies (`govuk-frontend`, `iron-session`, `bcrypt`, `uuid`), and configure SCSS for GOV.UK Frontend
    - Create `next.config.js` with SCSS support
    - Set up `src/app/layout.tsx` with GOV.UK template markup (header, footer, skip link)
    - Import GOV.UK Frontend SCSS in global stylesheet
    - _Requirements: 3.5, 3.6, 10.1, 10.4_

  - [x] 1.2 Define all TypeScript interfaces and types for data models
    - Create `src/types/index.ts` with `Case`, `Applicant`, `Address`, `CostItem`, `ApplicationFormData`, `TimelineEntry`, `TimelineEventType`, `WorkflowStateDefinition`, `WorkflowTransition`, `WorkflowStateName`, `CaseType`, `PolicyExtract`, `User`, `AISummaryRequest`, `AISummaryResponse`
    - _Requirements: 4.1, 4.2, 6.1, 7.1, 8.1_

  - [x] 1.3 Create JSON seed data files in `data/` directory
    - Create `data/cases.json` (empty array initially)
    - Create `data/workflow-states.json` with the full state machine definition (states, transitions, display names, required actions, escalation thresholds)
    - Create `data/policy-extracts.json` with sample policy extracts keyed by case type and relevant states
    - Create `data/users.json` with seed caseworker and team leader accounts (bcrypt-hashed passwords)
    - _Requirements: 4.2, 7.3, 7.4, 7.5, 8.1, 11.5_

  - [x] 1.4 Implement JSON file data access layer
    - Create `src/lib/data-store.ts` with read/write helpers for each JSON file (cases, users, workflow states, policy extracts)
    - Ensure atomic writes (write to temp file then rename) to prevent corruption
    - _Requirements: 4.2, 6.1_

- [x] 2. Implement core backend services
  - [x] 2.1 Implement the Workflow Engine
    - Create `src/services/workflow/workflow-engine.ts` implementing `WorkflowEngine` interface
    - `getPermittedTransitions(currentState)` reads `workflow-states.json` and returns allowed transitions
    - `applyTransition(caseId, toState, note, caseworkerId, decisionReason?)` validates the transition is permitted, updates case state, appends timeline entry with actor and timestamp, updates `last_updated`, and requires `decisionReason` for `approved`/`rejected`
    - Return 400-style error if transition is not permitted; case record must remain unchanged on invalid transition
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.6_

  - [ ]* 2.2 Write property tests for Workflow Engine
    - **Property 21: Permitted transitions match state machine** — for any WorkflowState, the set of transitions returned by `getPermittedTransitions` exactly matches `allowed_transitions` in `workflow-states.json`
    - **Validates: Requirements 8.1**
    - **Property 22: Valid transition updates state and appends timeline entry** — for any valid transition, the resulting case has the new state, a new timeline entry with caseworker username/timestamp/note, and updated `last_updated`
    - **Validates: Requirements 8.3**
    - **Property 24: Invalid transition leaves case unchanged** — for any invalid transition attempt, the case record remains completely unchanged
    - **Validates: Requirements 8.6**

  - [x] 2.3 Implement the Policy Engine
    - Create `src/services/policy/policy-engine.ts` implementing `PolicyEngine` interface
    - `getPoliciesForCase(caseType)` returns all policy extracts where `applicable_case_types` includes the given case type
    - `getRelevantClauses(caseType, currentState)` returns policies matching both case type and `relevant_states`
    - _Requirements: 7.3, 7.4_

  - [ ]* 2.4 Write property test for Policy Engine
    - **Property 19: Policy engine returns all and only matching policies** — for any case, the engine returns all extracts where the case type appears in `applicable_case_types` and none where it does not
    - **Validates: Requirements 7.3**

  - [x] 2.5 Implement the Notification Service (mock)
    - Create `src/services/notifications/types.ts` with `NotificationService` interface
    - Create `src/services/notifications/mock-notification.service.ts` implementing the interface
    - `sendConfirmation`, `sendOutcome`, `sendReminder` methods log to console and record in `sent` array
    - Select channel based on `applicant.notification_channel` (email or SMS)
    - _Requirements: 4.5, 8.5_

  - [ ]* 2.6 Write property test for Notification Service
    - **Property 10: Notification sent on submission with correct channel** — for any submission with a selected notification channel, the service is called once with the correct channel and the message contains the Case_Reference
    - **Validates: Requirements 4.5**

  - [x] 2.7 Implement the AI Summary Service (mock)
    - Create `src/services/ai-summary/types.ts` with `AISummaryRequest`, `AISummaryResponse`, `AISummaryService` interfaces
    - Create `src/services/ai-summary/mock-ai-summary.service.ts` with `MockAISummaryService`
    - Create `MOCK_SUMMARIES` map keyed by `caseType + currentState` with realistic pre-written summaries
    - Create `src/services/ai-summary/index.ts` exporting the mock (DI swap point)
    - _Requirements: 12.1, 12.2, 12.3, 12.4_

- [x] 3. Checkpoint — Core services
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Implement form validation utilities
  - [x] 4.1 Create shared validation functions
    - Create `src/lib/validation.ts` with validators for: required fields, date of birth (real calendar date in DD/MM/YYYY, age ≥ 16), UK postcode format, cost amount (positive, ≤ 2 decimal places), email format, UK phone number format
    - Each validator returns a GOV.UK-style error object `{ field, message }` or null
    - _Requirements: 1.4, 1.5, 1.6, 2.3_

  - [ ]* 4.2 Write property tests for validation functions
    - **Property 3: Date of birth validation** — for any date string, the validator accepts iff it is a real DD/MM/YYYY date with age ≥ 16
    - **Validates: Requirements 1.5**
    - **Property 4: Postcode format validation** — for any string, the validator accepts iff it matches the UK postcode regex
    - **Validates: Requirements 1.6**
    - **Property 6: Cost amount validation** — for any numeric string, the validator accepts iff it is positive with ≤ 2 decimal places
    - **Validates: Requirements 2.3**

  - [ ]* 4.3 Write property test for notification channel conditional validation
    - **Property 1: Notification channel conditional validation** — for any channel selection (email/SMS), the corresponding contact field is required and the other is not
    - **Validates: Requirements 1.3**

- [x] 5. Implement student-facing application form pages
  - [x] 5.1 Create form state management and navigation
    - Create `src/lib/form-context.ts` with a React context or server-side session store to hold form data across pages
    - Implement back-navigation that preserves data on subsequent pages
    - _Requirements: 1.7_

  - [x] 5.2 Implement Personal Details page (`/apply/personal-details`)
    - Create `src/app/apply/personal-details/page.tsx` with GOV.UK form components
    - Fields: Customer_Reference_Number (optional), Forename(s), Surname, Sex (radio group), Date of Birth (day/month/year inputs)
    - Server-side validation on submit; display GOV.UK error summary + inline errors on failure
    - _Requirements: 1.1, 1.2, 1.4, 1.5_

  - [x] 5.3 Implement Address page (`/apply/address`)
    - Create `src/app/apply/address/page.tsx`
    - Fields: Address line 1, line 2, line 3, Postcode
    - Postcode validation on submit
    - _Requirements: 1.1, 1.2, 1.6_

  - [x] 5.4 Implement University page (`/apply/university`)
    - Create `src/app/apply/university/page.tsx`
    - Fields: University name, Course name
    - _Requirements: 1.1, 1.2_

  - [x] 5.5 Implement Contact Preferences page (`/apply/contact`)
    - Create `src/app/apply/contact/page.tsx`
    - Radio group for notification channel (email / SMS)
    - Conditionally show email or phone field based on selection
    - Validate that the corresponding field is provided
    - _Requirements: 1.3_

  - [x] 5.6 Implement Costs page (`/apply/costs`)
    - Create `src/app/apply/costs/page.tsx`
    - Allow adding/removing cost line items (description, amount, supplier) up to 10
    - Validate cost amounts (positive, ≤ 2 decimal places)
    - Display running total of all cost amounts
    - Error if zero cost items on proceed
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

  - [ ]* 5.7 Write property test for running total correctness
    - **Property 7: Running total correctness** — for any list of valid cost items, the running total equals the arithmetic sum rounded to 2 decimal places
    - **Validates: Requirements 2.4**

  - [x] 5.8 Implement Check Your Answers page (`/apply/check-answers`)
    - Create `src/app/apply/check-answers/page.tsx` using GOV.UK summary list pattern
    - Display all entered data with change links that navigate back to the relevant page
    - Include declaration checkbox; error if not confirmed on submit
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

  - [ ]* 5.9 Write property test for check-your-answers completeness
    - **Property 8: Check-your-answers completeness** — for any set of form inputs, every entered value appears on the check-your-answers page
    - **Validates: Requirements 3.1**

- [x] 6. Implement Submission Service and Confirmation
  - [x] 6.1 Create the Submission API route (`POST /api/submit`)
    - Create `src/app/api/submit/route.ts`
    - Validate the full payload server-side
    - Generate a unique Case_Reference in format `DSA-YYYY-NNNNN`
    - Create a Case record with `status: awaiting_evidence`, populate applicant data, application data, and initial timeline entry (`case_created`)
    - Persist to `data/cases.json`
    - Call `NotificationService.sendConfirmation` with applicant and case reference
    - Return 201 with `{ caseReference }` on success; return error response on failure
    - _Requirements: 4.1, 4.2, 4.5, 4.6_

  - [ ]* 6.2 Write property test for case reference generation
    - **Property 9: Case reference format and uniqueness** — for any number of submissions, each Case_Reference matches `DSA-YYYY-NNNNN` and is distinct from all others
    - **Validates: Requirements 4.1, 4.6**

  - [x] 6.3 Implement Confirmation page (`/apply/confirmation`)
    - Create `src/app/apply/confirmation/page.tsx` with GOV.UK confirmation banner
    - Display Case_Reference and next steps summary
    - On submission failure, display GOV.UK error page instead
    - _Requirements: 4.3, 4.4_

- [x] 7. Implement Status Check page
  - [x] 7.1 Create the Status Check API route (`GET /api/cases/:ref`)
    - Create `src/app/api/cases/[ref]/route.ts`
    - Look up case by Case_Reference; return current `status`, `last_updated`, and `decision_reason` if applicable
    - Return 404 if no case found
    - _Requirements: 5.1, 5.2, 5.3_

  - [x] 7.2 Implement Status Check page (`/apply/status`)
    - Create `src/app/apply/status/page.tsx`
    - Input field for Case_Reference; display current Workflow_State in plain English, last updated date
    - For `approved`/`rejected` cases, display outcome and decision date
    - Display error if reference not found
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

  - [ ]* 7.3 Write property tests for status lookup
    - **Property 11: Status lookup returns correct state and date** — for any case in the store, looking it up by reference returns the correct state and last_updated
    - **Validates: Requirements 5.2**
    - **Property 12: Workflow_State display names are plain English** — for any valid state code, the display function returns a non-empty human-readable string different from the raw code
    - **Validates: Requirements 5.4**

- [x] 8. Checkpoint — Student journey complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 9. Implement authentication and session management
  - [x] 9.1 Implement Auth API routes
    - Create `src/app/api/auth/login/route.ts` — look up user by username, `bcrypt.compare` password, set encrypted `iron-session` cookie with `{ username, role, team, lastActivity }`
    - Create `src/app/api/auth/logout/route.ts` — destroy session cookie
    - Return GOV.UK-style error on invalid credentials (no indication of which field is wrong)
    - _Requirements: 11.1, 11.2, 11.4, 11.5_

  - [x] 9.2 Implement auth middleware for dashboard routes
    - Create `src/middleware.ts` or `src/lib/auth-middleware.ts`
    - On every `/dashboard` request (except `/dashboard/login`), read session cookie, check `lastActivity`; if > 8 hours elapsed, clear session and redirect to `/dashboard/login?reason=session_expired`
    - Update `lastActivity` on each valid request
    - _Requirements: 11.3_

  - [x] 9.3 Implement Login page (`/dashboard/login`)
    - Create `src/app/dashboard/login/page.tsx` with GOV.UK form
    - Display session expired message if `?reason=session_expired` query param present
    - _Requirements: 11.1, 11.4_

  - [ ]* 9.4 Write property test for password storage
    - **Property 28: Passwords are not stored in plain text** — for any password string, the stored value is not equal to the plain text and is a valid bcrypt hash (starts with `$2b$`)
    - **Validates: Requirements 11.5**

- [x] 10. Implement Caseworker Dashboard — Case List
  - [x] 10.1 Create Dashboard Case List API route (`GET /api/dashboard/cases`)
    - Create `src/app/api/dashboard/cases/route.ts`
    - Return cases where `assigned_to` matches the authenticated caseworker's username
    - Support query params for filtering by `status` and sorting by `created_date` or `last_updated`
    - Calculate and include evidence deadline flags (28-day reminder, 56-day escalation) based on `evidence_requested_date`
    - Include total case count and escalation flag count in response
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_

  - [ ]* 10.2 Write property tests for case list
    - **Property 13: Case list shows only assigned cases** — for any caseworker, the list contains exactly their assigned cases
    - **Validates: Requirements 6.1**
    - **Property 14: Case list filter correctness** — for any state filter, every result has that state and no other states appear
    - **Validates: Requirements 6.2**
    - **Property 15: Case list sort correctness** — for any sort field and direction, the list is monotonically ordered
    - **Validates: Requirements 6.3**
    - **Property 16: Evidence deadline flag accuracy** — for any case with evidence_requested_date, flags appear iff elapsed days exceed thresholds
    - **Validates: Requirements 6.4, 6.5, 7.6**
    - **Property 17: Case list counts are accurate** — total and escalation counts match actual data
    - **Validates: Requirements 6.6**

  - [x] 10.3 Implement Case List page (`/dashboard`)
    - Create `src/app/dashboard/page.tsx`
    - Display case list table with: Case_Reference, Applicant name, case type, Workflow_State, date created, date last updated
    - Filter dropdown by Workflow_State; sort controls for date created and last updated
    - Visual flags for 28-day reminder (amber) and 56-day escalation (red)
    - Display total case count and escalation count
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_

- [x] 11. Implement Caseworker Dashboard — Case Detail View
  - [x] 11.1 Create Case Detail API route (`GET /api/dashboard/cases/:id`)
    - Create `src/app/api/dashboard/cases/[id]/route.ts`
    - Return full case record including applicant details, application data, timeline, case notes
    - Include policy extracts from Policy Engine and relevant clauses for current state
    - Include permitted transitions from Workflow Engine
    - Include required action for current state
    - Include evidence days outstanding and flag status if applicable
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_

  - [x] 11.2 Create AI Summary API route (`GET /api/dashboard/cases/:id/ai-summary`)
    - Create `src/app/api/dashboard/cases/[id]/ai-summary/route.ts`
    - Call `AISummaryService.getSummary` with case data
    - Return the AI summary response
    - _Requirements: 12.1, 12.3_

  - [x] 11.3 Implement Case Detail page (`/dashboard/cases/:id`)
    - Create `src/app/dashboard/cases/[id]/page.tsx`
    - Display: applicant details, all submitted application data, case timeline (chronological), case notes, current Workflow_State, available transitions as buttons
    - Display policy extracts sidebar with highlighted clauses for current state
    - Display required action for current state
    - Display evidence days outstanding and reminder/escalation indicators
    - Display AI Summary section clearly labelled as "AI-generated"
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 12.1, 12.2_

  - [ ]* 11.4 Write property tests for case detail
    - **Property 18: Timeline is chronologically ordered** — for any case with 2+ timeline entries, entries are sorted by date ascending
    - **Validates: Requirements 7.2**
    - **Property 20: Required action matches state machine definition** — for any state, the displayed required action matches `required_action` in workflow-states.json
    - **Validates: Requirements 7.5**

- [x] 12. Implement Caseworker Workflow Actions
  - [x] 12.1 Create Workflow Transition API route (`POST /api/dashboard/cases/:id/transition`)
    - Create `src/app/api/dashboard/cases/[id]/transition/route.ts`
    - Accept `{ toState, note, decisionReason? }` in request body
    - Call `WorkflowEngine.applyTransition`; return updated case on success, 400 on invalid transition
    - If transition is to `approved` or `rejected`, require `decisionReason` and call `NotificationService.sendOutcome`
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6_

  - [x] 12.2 Add transition UI to Case Detail page
    - Display only permitted transitions as action buttons
    - Show note textarea (required before confirming)
    - Show decision reason textarea when transitioning to `approved` or `rejected`
    - Display inline errors if note or decision reason is missing
    - Display error notification if transition is invalid
    - _Requirements: 8.1, 8.2, 8.4, 8.6_

  - [ ]* 12.3 Write property test for outcome notifications
    - **Property 23: Outcome notification sent on terminal state transition** — for any case transitioned to approved/rejected, the notification service is called once with the correct channel and outcome message
    - **Validates: Requirements 8.5**

- [x] 13. Checkpoint — Caseworker dashboard core complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 14. Implement Team Leader View
  - [x] 14.1 Create Team Leader API routes
    - Extend `GET /api/dashboard/cases` to support `?view=team` query param for team leaders, returning all cases where `assigned_to` is any caseworker in the team
    - Create `POST /api/dashboard/cases/:id/reassign` route accepting `{ newAssignee }`, updating `assigned_to`, and appending a timeline entry with previous assignee, new assignee, and timestamp
    - Include summary counts by Workflow_State across the team
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

  - [x] 14.2 Implement Team Leader page (`/dashboard/team`)
    - Create `src/app/dashboard/team/page.tsx`
    - Display all team cases with same filters and flags as caseworker view
    - Display summary count of cases by Workflow_State
    - Prominently display escalated cases (56+ days) with assigned caseworker name
    - Provide reassign action on each case
    - _Requirements: 9.1, 9.2, 9.3, 9.4_

  - [ ]* 14.3 Write property tests for Team Leader view
    - **Property 25: Team leader view contains all team cases** — for any team, the view contains every case assigned to any team caseworker and no cases from outside the team
    - **Validates: Requirements 9.1**
    - **Property 26: Team leader state counts are accurate** — for any set of team cases, the count per state matches the actual data
    - **Validates: Requirements 9.2**
    - **Property 27: Reassignment appends correct timeline entry** — for any reassignment, the timeline contains an entry with previous assignee, new assignee, and timestamp
    - **Validates: Requirements 9.5**

- [x] 15. Accessibility and responsive design pass
  - [x] 15.1 Ensure all form pages are keyboard navigable and screen-reader accessible
    - Audit all form fields for programmatically associated labels (`<label for>` or `aria-label`)
    - Link all error messages to fields via `aria-describedby`
    - Ensure all interactive elements are reachable and operable via keyboard alone
    - Ensure no information is conveyed by colour alone
    - _Requirements: 3.5, 3.6, 10.2, 10.3_

  - [x] 15.2 Ensure responsive layout
    - Application form: operable from 320px to 1920px without horizontal scrolling
    - Dashboard: operable from 768px to 1920px
    - Test GOV.UK Frontend responsive grid and typography at breakpoints
    - _Requirements: 10.1, 10.4_

- [x] 16. Final checkpoint — Full integration
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The JSON file data store is sufficient for the hackathon prototype; no database setup required
- GOV.UK Frontend provides all UI components — no custom CSS framework needed
- Mocked services (notifications, AI summary) have clean interface boundaries for future swap
