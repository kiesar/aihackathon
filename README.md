# DSA Allowance Service

A digital replacement for the paper-based Disabled Students Allowance (DSA) application process, built with [Next.js](https://nextjs.org/), TypeScript, and the [GOV.UK Design System](https://design-system.service.gov.uk/).

> **Prototype** — this is a hackathon prototype, not a production service.

## What this is

This prototype covers two user journeys:

**Student application form** — a multi-step, accessible web form following the GOV.UK "one thing per page" pattern. Students enter personal details, address, university, contact preferences, and cost items. They review answers on a summary page, submit, and receive a unique case reference (e.g. `DSA-2026-00042`). They can check application status at any time.

**Caseworker dashboard** — an authenticated case management interface. Caseworkers see assigned cases with status flags, filter and sort by workflow state, view case details with matched policy extracts, apply workflow transitions with notes, and view AI-generated case summaries (mocked). Team leaders see all team cases, escalation flags for overdue evidence, and can reassign cases.

## Getting started

### Prerequisites

- [Node.js](https://nodejs.org/) 18 or later (see `.nvmrc`)
- npm (included with Node.js)

If you use [nvm](https://github.com/nvm-sh/nvm):

```bash
nvm use
```

### Install dependencies

```bash
npm install
```

### Set up environment variables

Copy the example environment file and fill in the values:

```bash
cp .env.example .env
```

The `SESSION_SECRET` must be at least 32 characters. In development, a fallback is used if unset. In production, it is required.

### Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Run tests

```bash
npm test
```


## Project structure

```
src/
├── app/
│   ├── apply/              Student-facing form pages
│   ├── dashboard/          Caseworker dashboard pages
│   └── api/                API routes (submit, cases, auth, dashboard)
├── components/             Shared React components
├── lib/                    Utilities (validation, data store, session, form context)
├── services/               Backend services
│   ├── workflow/            Workflow state machine engine
│   ├── policy/              Policy matching engine
│   ├── notifications/       Notification service (mocked for GOV.UK Notify)
│   └── ai-summary/          AI summary service (mocked for LLM swap)
└── types/                  TypeScript interfaces
data/                       JSON seed data (cases, users, workflow states, policy extracts)
```

## Security

See [SECURITY.md](SECURITY.md) for full details.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## Licence

This project is licensed under the [MIT Licence](LICENSE).

All code produced by civil servants is automatically covered by [Crown Copyright](https://www.nationalarchives.gov.uk/information-management/re-using-public-sector-information/uk-government-licensing-framework/crown-copyright/).

Published following the [GOV.UK Service Manual guidance on making source code open and reusable](https://www.gov.uk/service-manual/technology/making-source-code-open-and-reusable).
