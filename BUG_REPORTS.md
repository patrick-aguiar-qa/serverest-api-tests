# Bug reports

Defects found while testing ServeRest v3.2.2 running locally (`npm run api`).
Each one was reproduced at least twice with the same data. The tests in
[`test-known-issues/`](test-known-issues/known-issues.test.js) assert the **expected** behavior,
so they fail until the bug is fixed (`npm run test:known-issues`).

> ServeRest is a study API, so some of these behaviors may be intentional for teaching purposes.
> They are reported here the way I would report them in a real product.

---

## BUG-01 — Login token exposes the user's password in plain text

| Field | Value |
|---|---|
| Type | Bug (security) |
| Severity | High — anyone holding the token can read the password; there is no workaround on the client side |
| Priority | High |
| Endpoint | `POST /login` |

**Steps to reproduce**
1. `POST /usuarios` with `{"nome":"QA","email":"qa.bug01@qa.com","password":"Test@1234","administrador":"false"}`
2. `POST /login` with `{"email":"qa.bug01@qa.com","password":"Test@1234"}`
3. Decode the JWT returned in `authorization` (e.g. on jwt.io)

**Expected result:** the payload carries only non-sensitive claims (user id, expiry).
**Actual result:** the payload contains `"password":"Test@1234"` in plain text.

---

## BUG-02 — `GET /usuarios` returns every user's password without authentication

| Field | Value |
|---|---|
| Type | Bug (security) |
| Severity | High — passwords of all users are exposed |
| Priority | High |
| Endpoint | `GET /usuarios`, `GET /usuarios/{_id}` |

**Steps to reproduce**
1. Create any user with `POST /usuarios`
2. Without an `Authorization` header, call `GET /usuarios?email=<that email>`

**Expected result:** passwords are never returned (and the list requires authentication).
**Actual result:** `200 OK` with the `password` field in plain text for each user.

---

## BUG-03 — `POST /produtos` accepts the price as a string

| Field | Value |
|---|---|
| Type | Bug (data validation) |
| Severity | Low — the value is converted and saved as a number, but the contract is not enforced |
| Priority | Low |
| Endpoint | `POST /produtos` |

**Steps to reproduce**
1. Log in as an admin user
2. `POST /produtos` with `{"nome":"QA Bug 03","preco":"100","descricao":"d","quantidade":1}`

**Expected result:** `400 Bad Request` — `preco` is documented as an integer, and a decimal number is already rejected with `preco deve ser um inteiro`.
**Actual result:** `201 Created`; the string is silently converted.
