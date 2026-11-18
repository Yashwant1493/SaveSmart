# SaveSmart Security Specification (Payload-First TDD)

## 1. Data Invariants
1. **Strict Ownership Isolation**: Every financial subcollection (`expenses`, `income`, `budgets`, `goals`, `notifications`, `preferences`) and `private` PII profile resides under `/users/{uid}/...` and requires `request.auth != null`, `request.auth.uid == uid`, `request.auth.token.email_verified == true`, and `incoming().uid == uid`.
2. **No Cross-User or Blanket Reads**: No authenticated user may read or list another user's profile, PII, expenses, income, budgets, goals, or notifications.
3. **Zero PII Exposure to Admins**: Administrators can only read non-PII aggregate usage documents in `/users/{uid}` (counters, plan tier, `lastActiveAt`) and may NEVER read `private`, `expenses`, `income`, `budgets`, `goals`, `notifications`, or `preferences`.
4. **Role & Privilege Lock**: Users cannot self-assign `role: "admin"` or arbitrary fields in `/users/{uid}`. `role` is strictly fixed to `"user"` on client writes, and admin privileges require either the bootstrapped verified admin email or a trusted `/admins/{uid}` document.
5. **Server Timestamp & Immutability**: `createdAt` and `updatedAt` must strictly equal `request.time` on create; `createdAt` and `uid` are immutable on update; `updatedAt` must equal `request.time` on update.
6. **Terminal State Protection**: Completed savings goals (`status == "completed"`) cannot be modified by standard client updates.
7. **Strict Boundaries & No Shadow Fields**: Every document write validates exact allowed keys (`hasOnly`) and strict string `.size()` / numeric range limits.

## 2. The "Dirty Dozen" Adversarial Payloads (Must All Return PERMISSION_DENIED)
1. **Unauthenticated Expense Read**: `GET /users/userA/expenses/exp1` with `auth == null`.
2. **Cross-User Expense Read**: `GET /users/userA/expenses/exp1` authenticated as `userB`.
3. **Cross-User Expense List**: `LIST /users/userA/expenses` authenticated as `userB`.
4. **UID Spoofing on Create**: `CREATE /users/userA/expenses/exp1` authenticated as `userA` with `{ uid: "userB", ... }`.
5. **Shadow Field Injection**: `CREATE /users/userA/expenses/exp1` with `{ ..., isAdmin: true }`.
6. **Privilege Escalation on User Doc**: `CREATE /users/userA` with `{ ..., role: "admin" }`.
7. **Unverified Email Write**: `CREATE /users/userA/expenses/exp1` with `email_verified: false`.
8. **Invalid ID Poisoning**: `CREATE /users/userA/expenses/bad$id..` (fails `^[a-zA-Z0-9_-]+$`).
9. **Resource Exhaustion (10KB Description)**: `CREATE /users/userA/expenses/exp1` with `description.length == 10000`.
10. **Negative Amount Poisoning**: `CREATE /users/userA/expenses/exp1` with `{ amount: -500 }`.
11. **Client-Forged Timestamp**: `CREATE /users/userA/expenses/exp1` with `{ createdAt: "2020-01-01T00:00:00Z" }` instead of `request.time`.
12. **Admin Reading Private Financial Record**: `GET /users/userA/expenses/exp1` authenticated as verified admin (must be denied).
