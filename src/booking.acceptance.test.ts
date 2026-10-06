import { describe, it } from "vitest";

// TODO(interview)-9: Replace these pending cases with meaningful hook/UI tests.
// Add your preferred React testing tools if needed. The API tests already run.
// Do not change the provided API to make incomplete booking behavior pass.
describe("candidate implementation acceptance", () => {
  it.todo("loads availability only after both doctor and date are selected");
  it.todo("ignores an old slow response after switching doctor/date");
  it.todo("clears stale slot selections on doctor/date changes");
  it.todo("shows loading, empty and error states, and retries availability");
  it.todo("blocks same-tick double confirmation and uses a stable retry key");
  it.todo(
    "preserves selection after network error, then confirms successfully"
  );
  it.todo(
    "removes a conflicting slot, preserves doctor/date and books a different slot"
  );
  it.todo(
    "announces async status and supports completing the flow with only a keyboard"
  );
  it.todo(
    "focuses confirmation and starts another booking without reviving a taken slot"
  );
});
