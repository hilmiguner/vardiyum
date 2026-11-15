# Configurable Pay Period — Issue #22

Status: **domain foundation only** (non-native), not yet connected to Settings, SQLite or the user-facing earnings report.

## First increment: explicit day-of-month boundaries

A user-selected payroll-period start day is an **integer 1–28**. A closing day of 25 means a start day of 26. Dates 29–31 are deliberately unsupported in this first increment, rather than silently clamping in short months.

- \`periodKey=YYYY-MM\` is the month in which **the starting day** occurs.
- Example: \`2026-10\` + start day \`26\` means **2026-10-26 00:00 to 2026-11-26 00:00 (end exclusive)**, or **26 October–25 November** on screen.
- The same rule survives February 28/29, December–January and any month length. A period with start day 1 is precisely the existing calendar month.
- Civil dates are derived without using the phone's local time zone.
- Every UTC endpoint is resolved independently in the work record's **persisted IANA zone**. An ambiguous or nonexistent boundary midnight raises an error; neither a DST fold nor a gap is guessed.
- The original \`actual_work_sessions\` UTC interval, source, and original dates are never modified. End instants are exclusive. Partition sums must equal the original gross interval.
- If a shift crosses the new period boundary and has a nonzero break, a **new source-bound custom-period allocation** is required for both pieces; calendar-month allocations cannot be reused. The two break values must sum to the original and each must fit its UTC segment. There is no assumed break clock.
- Invalid dates, work/source mismatch, non-UTC timestamps, unknown IANA zones and unresolvable boundaries stop calculation.

## Pending integration decisions (NOT implemented)

1. **Persisted settings and migration:** Design a durable user-selected day and a separate custom-period break allocation/audit trail. Migration must preserve SQLite v1–v8 history and the v8 encrypted backup/restore contract; do not silently change the 18-table backup format or declare v9 restore compatible.
2. **Rate effective-date policy:** Existing pay profiles take effect on first-of-calendar-month dates. A custom payroll period can cross two effective profiles. **Fail closed** on that crossing until the UI offers an explicit, reviewable policy for segment rates and overtime. No implicit use of the beginning profile for the entire window.
3. **Fixed monthly salary:** Never prorate or infer a partial-period amount automatically. Require explicit user assumption for full vs partial-period treatment.
4. **Manual adjustments:** Existing adjustments are keyed by calendar month. They must not be copied or reassigned silently to a custom period. Preserve append-only history and require explicit custom-period attribution after migration.
5. **Reports:** Use each pay period's own overtime threshold and exact BigInt/minor-unit arithmetic. Show period labels, source UTC segments, per-line revisions, CSV/JSON and the pre-tax self-reported disclaimer. The current report remains calendar-month-based until integration.
6. **Native acceptance:** Expo JS export and Node tests do not prove SQLite, DST/tzdb, AES backup or process-kill behavior on real phones. Issue #2 and Issue #20 remain open.

## Verification

\`tests/pay-period.test.mjs\` exercises 26→25, February leap/non-leap, year boundaries, UTC end-exclusivity, 30/45-minute zones, DST elapsed time, break allocation, stale/source mismatch, and compatibility at start day 1.

This first increment intentionally does **not** close Issue #22 or claim that custom periods are visible or usable in the app. Next PR should add migration-safe persistence and the reviewed profile/adjustment/UX policy before enabling a custom-period report.

## 2026-11-15 — Next increment: v8 preferences without new tables

The new `earnings_pay_period_start_day_v1` canonical string setting is stored in the already-inventoried SQLite v8 `app_settings` table. An absent key is day 1; an invalid/corrupt key fails closed (not silently reset). On a normal save, only this key is UPSERTed. It is already included in the encrypted v8 18-table snapshot; current clean-target restore remains schema-compatible, subject to real-device acceptance.

Settings shows a `1..28` numeric choice and civil-date preview in the stored schedule IANA zone. It clearly labels this as **not yet affecting the Earnings calculation or exports**. New domain tests verify migrations and preservation; a separate custom break audit and profile/adjustment policy must be implemented before enabling actual pay-period financial reports. No SDK/native runtime was tested by these Node tests.
