# Contributing

We welcome contributions to the DSA Allowance Service.

This project follows the [GOV.UK Service Manual](https://www.gov.uk/service-manual) and the [GDS Way](https://gds-way.digital.cabinet-office.gov.uk/).

## How to contribute

1. Check the [issue tracker](../../issues) for open issues or create a new one describing the change you'd like to make.
2. Fork the repository and create a branch from `main`.
3. Make your changes, ensuring they follow the coding standards below.
4. Add or update tests for any changed behaviour.
5. Run the full test suite with `npm test` and confirm all tests pass.
6. Submit a pull request with a clear description of the change.

## Coding standards

- TypeScript strict mode — no `any` types without justification
- Follow [GOV.UK Design System](https://design-system.service.gov.uk/) patterns for all UI components
- GOV.UK-style error messages — specific, actionable, linked to the field
- One question per page for form flows
- All form fields must have programmatically associated labels
- Write property-based tests for business logic using fast-check
- Keep functions small and focused — prefer pure functions where possible

## Commit messages

Write clear, concise commit messages. Use the imperative mood:

- "Add postcode validation" not "Added postcode validation"
- "Fix session timeout check" not "Fixes session timeout check"

## Reporting security issues

See [SECURITY.md](SECURITY.md) for how to report vulnerabilities.

## Licence

By contributing, you agree that your contributions will be licensed under the [MIT Licence](LICENSE).

All code produced by civil servants is automatically covered by Crown Copyright.
