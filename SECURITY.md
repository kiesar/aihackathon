# Security

## Reporting a vulnerability

If you discover a security vulnerability in this project, please report it responsibly.

Do not open a public issue. Instead, email the maintainers directly with:

- A description of the vulnerability
- Steps to reproduce
- The potential impact

We will acknowledge your report within 3 working days and aim to provide a fix or mitigation plan within 10 working days.

## Security practices in this project

- Passwords are stored as bcrypt hashes (cost factor 12), never in plain text
- Session cookies are encrypted using `iron-session` with a secret from environment variables
- The `SESSION_SECRET` must never be committed to source control
- Cookie flags: `httpOnly`, `sameSite: lax`, `secure` in production
- 8-hour inactivity timeout with automatic session expiry
- Generic login error messages — no indication of which field is wrong
- Case reference input validated against format regex before database lookup
- Input length limits on notes and decision reasons (2000 characters)
- Reassignment restricted to team leader role only

## What must stay closed

Following [GOV.UK guidance on when code should be closed](https://www.gov.uk/government/publications/open-source-guidance/when-code-should-be-open-or-closed):

- Secret keys and credentials must never be stored in source code
- The `SESSION_SECRET` environment variable must be injected at runtime
- Production configuration values must not be committed to the repository
