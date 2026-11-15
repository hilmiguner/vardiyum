# Configurable Pay Period — Issue #22

Status (2026-11-15): domain, persisted 1–28 preference and separate custom-break audit are in main; actual custom-period salary reports remain pending.

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

## 2026-11-15 — Custom-period break audit, additive v8 approach

A separate `earnings_custom_pay_break_v1:<day>:<workId>` app_settings namespace saves **one INSERT-only, numbered canonical-JSON event per correction** and a revision `head` in one exclusive transaction, preserving schema v8 and the 18-table AES backup/restore contract. First period minutes and the remainder are checked against real elapsed UTC segments and original source timestamps before any write. A stale screen revision, altered work, wrong start day, missing audit event, malformed reason or bad allocation stops the write/read (fail-closed). The key query uses `substr` rather than LIKE because work IDs may contain `_`.

A separate TR/EN earnings panel enables explicit break declarations while keeping **calendar-month earnings and exports unchanged**. These custom records will not be consumed by salary math until effective profile transitions and fixed-pay/adjustments policies are safely implemented. The audit is application-level append-only, not a cryptographic protection against direct SQLite edits. Native device/backup roundtrip acceptance is pending.

## 2026-11-15 — Implementation checkpoint (PR #23–#25 main)

The domain UTC split and local start-day preference from PR #23/#24 are now in main; PR #25 added independently recorded custom-period break allocation event keys and head under SQLite v8 `app_settings`, atomically validated with source work and revision. [main Actions #43732513262](https://github.com/hilmiguner/vardiyum/actions/runs/43732513262) SUCCESS (150 tests, both platform JS exports). The existing v8 encrypted 18-table snapshot and clean-target restore contract are unchanged. This app-level append-only audit is **not a cryptographically tamper-proof SQLite journal**.

**Still not wired:** custom-period earnings/CSV/JSON, profile changes effective mid-period, fixed-pay period assumptions and adjustments. Calendar-month reports remain as before. Native acceptance is deferred (Issues #2/#20). Issue #22 stays open.

## 2026-11-15 — Effective-month profile transition policy (feature PR)

The custom-period profile preview uses latest validated immutable monthly profile revisions (`earnings_profiles` v6 and `earnings_profile_revisions` v8). Example 2026-10 period at startDay=26 contains 26–31 October (old profile) and 1–25 November (new profile). Both source identifiers and rate revisions are disclosed; a second effective profile **always requires review**, even if values are equal. A lone fixed-pay profile requires the user's full/partial custom-period assumption. No profile at the opening boundary returns needs_profile. Missing/duplicated revisions and malformed IANA midnight boundaries fail closed.

Displayed UTC segment boundaries use **the schedule IANA zone only for preview**; actual work compensation must use each source work's own saved IANA zone. This change does not yet price actual work, apply overtime thresholds, combine currencies, attribute calendar adjustments or export custom-period CSV/JSON. No new database migration: SQLite v8 18-table AES-GCM/restore inventory remains unchanged; only SELECTs of existing tables. Expo JS QA is not real device validation.

## 2026-11-15 — PR #26 verified merge and rate-policy status

[PR #26](https://github.com/hilmiguner/vardiyum/pull/26) is **merged** in main SHA `b4cd8c9cda15040fb3b7d7206d91c38cd35ea1ed`; [main CI #43747264298](https://github.com/hilmiguner/vardiyum/actions/runs/43747264298) **SUCCESS**, 163/163 Node + Android/iOS JS export. Read-only hourly/fixed profile transitions and immutable revisions are visible in the Earnings preparation UI; no custom pay calculation is enabled.

The preview's schedule IANA zone must NOT replace an actual work record's stored IANA zone in money computations. Fixed pay, mixed rates, segment-specific break ambiguity, overtime reset, period adjustment attribution and real custom CSV/JSON remain separate decisions. The v8 18-table encrypted snapshot and clean-target restore contract remain unchanged, with no native validation yet.
