import { describe, expect, it } from "vitest";
import { ApiError, createMockApi, getBookingDates, makeSlots } from "./mockApi";

const date = getBookingDates()[0];
const input = {
  doctorId: "chen",
  date,
  slotId: makeSlots("chen", date)[0].id,
  idempotencyKey: "attempt-1",
};
const api = () => createMockApi({ delayMs: 0, slowDelayMs: 0 });

describe("provided mock API", () => {
  it("returns slots scoped to doctor and date", async () => {
    const slots = await api().getSlots("chen", date);
    expect(slots).toHaveLength(6);
    expect(
      slots.every((slot) => slot.doctorId === "chen" && slot.date === date)
    ).toBe(true);
  });
  it("can return an empty day or availability error", async () => {
    const server = api();
    server.setScenario("empty");
    expect(await server.getSlots("chen", date)).toEqual([]);
    server.setScenario("availability-error");
    await expect(server.getSlots("chen", date)).rejects.toMatchObject({
      code: "NETWORK",
    });
  });
  it("supports aborting a pending availability request", async () => {
    const server = createMockApi({ delayMs: 100 });
    const controller = new AbortController();
    const request = server.getSlots("chen", date, controller.signal);
    controller.abort();
    await expect(request).rejects.toMatchObject({ name: "AbortError" });
  });
  it("rejects invalid doctors, dates and mismatched slots", async () => {
    const server = api();
    await expect(server.getSlots("missing", date)).rejects.toBeInstanceOf(
      ApiError
    );
    await expect(server.getSlots("chen", "1900-01-01")).rejects.toMatchObject({
      code: "INVALID_REQUEST",
    });
    await expect(
      server.confirmBooking({ ...input, slotId: "invalid" })
    ).rejects.toMatchObject({ code: "INVALID_REQUEST" });
  });
  it("confirms and removes the booked slot", async () => {
    const server = api();
    expect((await server.confirmBooking(input)).id).toBe("APT-0001");
    expect(
      (await server.getSlots("chen", date)).some(
        (slot) => slot.id === input.slotId
      )
    ).toBe(false);
  });
  it("deduplicates simultaneous confirmations with the same idempotency key", async () => {
    const server = api();
    const results = await Promise.all([
      server.confirmBooking(input),
      server.confirmBooking(input),
    ]);
    expect(results[0]).toEqual(results[1]);
    expect(server.getConfirmationRequestCount()).toBe(2);
    expect(await server.getSlots("chen", date)).toHaveLength(5);
  });
  it("does not reuse a key for another slot", async () => {
    const server = api();
    await server.confirmBooking(input);
    await expect(
      server.confirmBooking({ ...input, slotId: makeSlots("chen", date)[1].id })
    ).rejects.toMatchObject({ code: "INVALID_REQUEST" });
  });
  it("lets the patient retry after one network failure", async () => {
    const server = api();
    server.setScenario("booking-error");
    await expect(server.confirmBooking(input)).rejects.toMatchObject({
      code: "NETWORK",
    });
    expect(await server.getSlots("chen", date)).toHaveLength(6);
    await expect(server.confirmBooking(input)).resolves.toMatchObject({
      id: "APT-0001",
    });
  });
  it("returns a conflict once, refreshes slots and allows an alternative", async () => {
    const server = api();
    server.setScenario("slot-taken");
    await expect(server.confirmBooking(input)).rejects.toMatchObject({
      code: "SLOT_UNAVAILABLE",
    });
    const remaining = await server.getSlots("chen", date);
    expect(remaining).toHaveLength(5);
    await expect(
      server.confirmBooking({
        ...input,
        slotId: remaining[0].id,
        idempotencyKey: "attempt-2",
      })
    ).resolves.toMatchObject({ id: "APT-0001" });
  });
  it("permits only one booking when callers use different keys for the same time", async () => {
    const server = api();
    const results = await Promise.allSettled([
      server.confirmBooking(input),
      server.confirmBooking({ ...input, idempotencyKey: "attempt-2" }),
    ]);
    expect(
      results.filter((result) => result.status === "fulfilled")
    ).toHaveLength(1);
    expect(
      results.filter((result) => result.status === "rejected")
    ).toHaveLength(1);
  });
});
