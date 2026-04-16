# DSA Allowance Service

A full-stack digital replacement for the paper-based Disabled Students Allowance (DSA) application process, built with Next.js 14, TypeScript, and the GOV.UK Design System.

## What we built

This prototype covers two complete user journeys:

**Student application form** — a multi-step, accessible web form that replaces the PDF download-print-scan-email process. Students enter personal details, address, university, contact preferences, and cost items across individual pages following the GOV.UK "one thing per page" pattern. They review answers on a summary page, submit, and receive a unique case reference number (e.g. `DSA-2026-00042`). They can check their application status at any time using that reference.

**Caseworker dashboard** — an authenticated case management interface where caseworkers see their assigned cases with status flags, filter and sort by workflow state, open case details with matched policy extracts, apply workflow transitions with notes, and view AI-generated case summaries (mocked). Team leaders get an additional view showing all team cases, escalation flags for overdue evidence (28-day reminder, 56-day escalation), and the ability to reassign cases between caseworkers.

## Key features

- GOV.UK Design System styling and interaction patterns throughout
- Multi-step form with validation, error summaries, and back-navigation that preserves data
- Workflow state machine with enforced transitions and timeline tracking
- Policy engine matching relevant policy extracts to case type and current state
- Evidence deadline flags (28-day amber reminder, 56-day red escalation)
- Mocked notification service (email/SMS) with clean interface for GOV.UK Notify swap
- Mocked AI summary service with clean interface for LLM swap
- Encrypted session-based authentication with 8-hour inactivity timeout
- Property-based test suite (28 correctness properties, 100+ iterations each)

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| UI | GOV.UK Frontend (SCSS) |
| Data store | JSON files (`data/` directory) |
| Sessions | iron-session (encrypted cookies) |
| Testing | Vitest + fast-check (property-based testing) |

## Getting started

### Prerequisites

- Node.js 18+
- npm

### Install dependencies

```bash
npm install
```

### Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Run tests

```bash
npm test
```

## Demo walkthrough

### Student journey

1. Go to [http://localhost:3000/apply/personal-details](http://localhost:3000/apply/personal-details)
2. Fill in personal details, address, university, contact preferences, and costs
3. Review on the "Check your answers" page and submit
4. Note the case reference on the confirmation page
5. Check status at [http://localhost:3000/apply/status](http://localhost:3000/apply/status)

### Caseworker dashboard

1. Go to [http://localhost:3000/dashboard/login](http://localhost:3000/dashboard/login)
2. Log in with one of these accounts:

| Username | Password | Role |
|---|---|---|
| `jsmith` | `Password1` | Caseworker |
| `mbrown` | `Password1` | Caseworker |
| `awilson` | `Password1` | Team Leader |

3. Browse the case list, filter by status, sort by date
4. Open a case to see full details, policy extracts, workflow actions, and AI summary
5. Apply a workflow transition (e.g. "Evidence received") with a note
6. Log in as `awilson` to see the team leader view with escalation flags and reassignment

## Project structure

```
src/
├── app/
│   ├── apply/          # Student-facing form pages
│   ├── dashboard/      # Caseworker dashboard pages
│   └── api/            # API routes (submit, cases, auth, dashboard)
├── lib/                # Shared utilities (validation, data store, session, form context)
├── services/           # Backend services (workflow, policy, notifications, AI summary)
└── types/              # TypeScript interfaces
data/                   # JSON data files (cases, users, workflow states, policy extracts)
```

## Architecture decisions

- **JSON file data store** — zero infrastructure, easy to inspect and edit, sufficient for a prototype
- **Mocked services with clean interfaces** — notification and AI summary services can be swapped for real implementations (GOV.UK Notify, OpenAI) by changing a single export
- **Property-based testing** — 28 formal correctness properties validated with fast-check, covering validation, workflow transitions, policy matching, notifications, and more
- **Spec-driven development** — requirements, design, and implementation tasks documented in `.kiro/specs/`
