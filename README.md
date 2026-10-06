# Appointment booking — React + TypeScript mock interview

A runnable interview **starter**, not a completed solution. The visual interface,
all state presentations, typed API and deterministic failure scenarios are provided.
You implement the booking behavior where the code says `TODO(interview)`.

## Start

Requires Node.js 22.12 or newer.

```bash
cd /Users/craiglink/appointment-booking-interview
npm install
npm run dev
```

Open the local URL printed by Vite. The first screen is intentionally idle: choosing
a doctor and date will not load slots until you implement TODO 1. The confirmation
and retry handlers are also intentional stubs. Use **Preview provided UI states**
to inspect the supplied design; previews disable booking and never call the API.
Return to **Live exercise** to test your code.

## Your prompt

Build a React and TypeScript interface where patients select a doctor, date and
available time, then confirm a booking through a mock API. Include loading, empty,
error and success states, keyboard accessibility, duplicate submission prevention,
and recovery when a slot is no longer available.

## Where to code

Implement these in numbered order. TODO 1 loads slots so you can select a time;
TODO 2 then clears that selection when you switch doctor/date.

| Task | File | Work |
| --- | --- | --- |
| TODO 1 | `src/useBooking.ts` | Load availability, cleanup and stale response handling |
| TODO 2 | `src/useBooking.ts` | Selection changes: clear stale time and feedback |
| TODO 3 | `src/useBooking.ts` | Retry failed availability |
| TODO 4 | `src/useBooking.ts` | Validate and confirm, preserve selection on error |
| TODO 5 | `src/useBooking.ts` | Synchronous duplicate guard and stable retry key |
| TODO 6 | `src/useBooking.ts` | Recover from `SLOT_UNAVAILABLE`, refresh and reselect |
| TODO 7 | `src/useBooking.ts` | Start another booking and invalidate old requests |
| TODO 8 | `src/App.tsx` | Focus after confirmation and slot conflicts |
| TODO 9 | `src/booking.acceptance.test.ts` | Extend the supplied acceptance tests with more edge cases |

`src/mockApi.ts`, `src/types.ts`, the basic UI and styling are supplied. You may
refactor the shell as needed. There is deliberately no solution implementation.
The state setters in the hook are retained for your work; remove their temporary
`void` statements when you use them.

## API contract

```ts
mockApi.getSlots(doctorId: string, date: string, signal?: AbortSignal): Promise<Slot[]>
mockApi.confirmBooking({ doctorId, date, slotId, idempotencyKey }): Promise<Booking>
```

- Select a doctor from the supplied list and a date from `getBookingDates()`.
- Slots have a stable ID and `doctorId`, `date` (`YYYY-MM-DD`), `time` (`HH:mm`).
- Times represent clinic wall-clock time in **America/New_York**; dates are offered
  as the next seven days relative to the browser's local calendar. This fixture
  deliberately avoids converting appointment timestamps between time zones.
- `getSlots` returns `[]` for an empty day. Its optional AbortSignal is supported.
- `ApiError.code` is `NETWORK`, `SLOT_UNAVAILABLE`, or `INVALID_REQUEST`.
- A successful confirmation removes the slot from future availability requests.
- Reusing an idempotency key with the same slot returns the original booking.
  Reusing a key with a different slot is rejected. The UI must also prevent duplicate
  API calls: server idempotency does not replace the client submission guard.
- `getConfirmationRequestCount()` can help verify that two rapid clicks make one call.
- `reset()` resets the server; use it for tests, not for patient “Book another”.
- Mock data lives in memory and resets on browser reload. There is no backend or
  real booking. The mock does not persist bookings across tabs or reloads.

## Deterministic scenarios

Choose **Mock API scenario** before triggering a request. After implementing the
hook, change doctor/date or use retry to issue a fresh request. The control itself
does not trigger a fetch.

| Scenario | Result |
| --- | --- |
| Normal booking | Availability and booking succeed after about 650ms |
| Slow network | Future calls wait about 2.5 seconds; switch dates quickly to test stale responses |
| No available appointments | Availability resolves with `[]` |
| Availability request fails | Availability throws `NETWORK` until scenario changes |
| Next confirmation fails | One confirmation throws `NETWORK`; retry can succeed |
| Next selected slot is taken | One confirmation throws `SLOT_UNAVAILABLE`; refresh excludes that slot |

Switch away and back to a one-shot scenario to re-arm it. Change availability-error
to normal before retrying to demonstrate recovery. All samples are labeled previews;
seeing a preview is not evidence your candidate implementation works.

## Acceptance checklist

- [ ] Doctor, date and time have understandable labels and selection state.
- [ ] Fetch starts only when doctor and date are both valid.
- [ ] Loading does not leave a stale time available for confirmation.
- [ ] Old requests cannot overwrite newer results or update an unmounted view.
- [ ] Empty availability offers a clear path to another date or doctor.
- [ ] Availability failures can be retried without losing doctor/date.
- [ ] Invalid/incomplete or already submitting selections cannot be confirmed.
- [ ] Two synchronous confirmations create just one API call.
- [ ] Booking network errors preserve selection and support retry.
- [ ] A taken slot clears the selection and disappears after refresh; doctor/date remain.
- [ ] Conflict plus a failing refresh still explains what happened and permits retry.
- [ ] Success shows doctor, date, time and booking ID from the confirmed snapshot.
- [ ] “Book another” resets the UI while previously booked slots stay unavailable.
- [ ] Tab, arrow keys, Space and Enter can complete the flow; focus remains visible.
- [ ] Errors are announced, async changes are announced and success gets focus.
- [ ] Controls adapt to mobile widths and respect reduced motion.

## Interview pacing and discussion

For 45–60 minutes: 5 minutes clarify assumptions, 20 minutes availability/selection,
15 minutes confirmation and recovery, then 10–20 minutes keyboard checks and tests.

Explain how you avoid stale state, why you separate server state from selection,
and how retries differ from new attempts. Discuss what would change with real
server validation, durable idempotency, authentication and patient time zones.

## Checks

```bash
npm run typecheck
npm run build
npm test              # all tests; EXPECTED TO FAIL until you implement the TODOs
npm run test:api      # supplied mock API only; expected to pass
npm run test:acceptance  # your hook/UI behavior; expected to fail initially
```

The **10 provided API tests** should pass immediately. The **9 real acceptance
tests** exercise your actual hook and live interface; they should fail until you
implement the booking TODOs. There are no skipped or `it.todo` cases.

Each acceptance test names the relevant TODO numbers. Tests use an isolated mock
server with zero delay and controlled promises for loading and race conditions.
They do not mock your hook or use visual previews. Native select choices are set
with user-event because jsdom cannot operate the OS select popup; time selection
and confirmation are exercised with Tab, Space and Enter. Still test the full
keyboard flow and focus appearance in a real browser.

Start with **TODO 1**. To run its first check while you work:

```bash
npm run test:acceptance -- -t "loads availability"
```

After it loads slots, check stale response handling with:

```bash
npm run test:acceptance -- -t "ignores an old slow response"
```

Then implement **TODO 2** and run:

```bash
npm run test:acceptance -- -t "clears stale slot selections"
```

Continue with TODOs 3–8 in order. Existing booking error/conflict feedback is reset
in TODO 2, but you will see those states once TODOs 4 and 6 can produce them.
Later tests need availability before they can reach confirmation and recovery
assertions. Add further tests at TODO 9.
The build verifies the starter compiles; it does not imply the TODOs are complete.
