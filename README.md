# ServeRest API Tests

![API tests](https://github.com/patrick-aguiar-qa/serverest-api-tests/actions/workflows/api-tests.yml/badge.svg)

Automated REST API tests for [ServeRest](https://github.com/ServeRest/ServeRest), an open-source
e-commerce API (users, login, products and carts) built for testing practice.

**53 automated tests** covering business rules, authentication/authorization, data validation,
error handling and unsupported verbs, plus **3 bugs found and documented** in
[BUG_REPORTS.md](BUG_REPORTS.md).

## Stack

| Tool | Purpose |
|---|---|
| [Mocha](https://mochajs.org/) | Test runner and structure (`describe`, `it`, hooks) |
| [Supertest](https://github.com/ladjs/supertest) | HTTP requests |
| [Chai](https://www.chaijs.com/) | Assertions |
| [dotenv](https://github.com/motdotla/dotenv) | Environment variables (`BASE_URL`) |
| [Mochawesome](https://github.com/adamgibbons/mochawesome) | HTML report |
| GitHub Actions | Runs the suite on every push and pull request |

## Test strategy

The API rules come from the [ServeRest documentation](https://serverest.dev). Test cases were
designed with:

- **Equivalence partitioning and boundary value analysis** — product price (`0 / 1 / 2`),
  stock quantity (`-1 / 0 / 1`) and cart quantity against available stock (`= stock / stock + 1`).
- **VADER heuristic** for the API layer:

| | What is checked | Examples |
|---|---|---|
| **V**erbs | Each verb does what it promises; unsupported verbs return `405` | `PUT` updates every field (confirmed with `GET`); `PATCH /usuarios` → `405` |
| **A**uthentication / Authorization | Missing, tampered and orphan tokens; non-admin access | `401` without token, `401` for a deleted user's token, `403` for non-admin |
| **D**ata | Required fields, types, unknown fields, response types, data persisted | Price must be an integer; stock is reduced after a cart is created |
| **E**rrors | Every documented error message and status | Duplicate email, duplicate product, product in a cart cannot be deleted |
| **R**esponsiveness | Covered in the [k6 performance project](https://github.com/patrick-aguiar-qa/serverest-k6-performance) | p(95)/p(99) thresholds under load, stress and spike |

Each test creates its own data (unique emails and product names), so the suite is
**repeatable** and can run in any order.

## Project structure

```
├── .github/workflows/api-tests.yml   # CI pipeline
├── fixtures/                         # Request bodies (cloned and changed per test)
│   ├── product.json
│   └── user.json
├── helpers/
│   ├── auth.js                       # getToken(email, password)
│   ├── config.js                     # BASE_URL from .env
│   └── data.js                       # Builders and setup: createUser, createProduct, createCart
├── test/                             # Regression suite (npm test)
│   ├── carts.test.js
│   ├── login.test.js
│   ├── products.test.js
│   └── users.test.js
├── test-known-issues/                # Tests for open bugs, expected to fail
├── BUG_REPORTS.md
└── .env.example
```

## Getting started

**Requirements:** Node.js 22 or later.

```bash
git clone https://github.com/patrick-aguiar-qa/serverest-api-tests.git
cd serverest-api-tests
npm install
cp .env.example .env
```

Start ServeRest locally (keep this terminal open):

```bash
npm run api
```

In another terminal, run the tests:

| Command | What it does |
|---|---|
| `npm test` | Runs the regression suite |
| `npm run test:report` | Runs the suite and creates `mochawesome-report/mochawesome.html` |
| `npm run test:known-issues` | Runs the tests for the open bugs (they fail on purpose) |

### Environment variables

| Variable | Default | Description |
|---|---|---|
| `BASE_URL` | `http://localhost:3000` | ServeRest base URL |

## Known issues

| ID | Summary | Severity |
|---|---|---|
| [BUG-01](BUG_REPORTS.md#bug-01--login-token-exposes-the-users-password-in-plain-text) | Login token exposes the password in plain text | High |
| [BUG-02](BUG_REPORTS.md#bug-02--get-usuarios-returns-every-users-password-without-authentication) | `GET /usuarios` returns passwords without authentication | High |
| [BUG-03](BUG_REPORTS.md#bug-03--post-produtos-accepts-the-price-as-a-string) | Price accepted as a string | Low |

## Author

**Patrick Aguiar** — QA Engineer · [LinkedIn](https://www.linkedin.com/in/patrick-aguiar-qa) · [GitHub](https://github.com/patrick-aguiar-qa)
