// PROVIDED: This mock API is complete. Implement the React behavior in useBooking.ts.
// All data is in memory and resets on page reload. No real patient data is used.
import type { Booking, Doctor, Scenario, Slot } from "./types";

export const doctors: Doctor[] = [
  {
    id: "chen",
    name: "Dr. Maya Chen",
    specialty: "Primary care",
    initials: "MC",
  },
  {
    id: "rivera",
    name: "Dr. Alex Rivera",
    specialty: "Cardiology",
    initials: "AR",
  },
  {
    id: "patel",
    name: "Dr. Priya Patel",
    specialty: "Dermatology",
    initials: "PP",
  },
];
export const scenarios: { value: Scenario; label: string }[] = [
  { value: "normal", label: "Normal booking" },
  { value: "slow", label: "Slow network (2.5 seconds)" },
  { value: "empty", label: "No available appointments" },
  { value: "availability-error", label: "Availability request fails" },
  { value: "booking-error", label: "Next confirmation fails" },
  { value: "slot-taken", label: "Next selected slot is taken" },
];
export type ApiErrorCode = "NETWORK" | "SLOT_UNAVAILABLE" | "INVALID_REQUEST";
export class ApiError extends Error {
  readonly code: ApiErrorCode;
  constructor(code: ApiErrorCode, message: string) {
    super(message);
    this.name = "ApiError";
    this.code = code;
  }
}

// Pure date helpers are provided so the interview focuses on React state.
export function getBookingDates(now = new Date()): string[] {
  return Array.from({ length: 7 }, (_, offset) => {
    const day = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + offset + 1,
      12
    );
    return `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`;
  });
}
export function formatDate(date: string): string {
  if (!date) return "Choose a date";
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(new Date(`${date}T12:00:00`));
}
export function makeSlots(doctorId: string, date: string): Slot[] {
  return ["09:00", "09:30", "10:00", "10:30", "13:00", "13:30"].map((time) => ({
    id: `${doctorId}|${date}|${time}`,
    doctorId,
    date,
    time,
  }));
}
export function formatTime(time: string): string {
  const [hour, minute] = time.split(":").map(Number);
  return `${hour % 12 || 12}:${String(minute).padStart(2, "0")} ${hour < 12 ? "AM" : "PM"}`;
}

type MockOptions = { delayMs?: number; slowDelayMs?: number };
export function createMockApi({
  delayMs = 650,
  slowDelayMs = 2500,
}: MockOptions = {}) {
  let scenario: Scenario = "normal";
  let nextBookingFailure = false;
  let nextConflict = false;
  const taken = new Set<string>();
  const bookingsByKey = new Map<string, Booking>();
  let confirmationRequests = 0;
  let bookingSequence = 0;

  function setScenario(value: Scenario) {
    scenario = value;
    nextBookingFailure = value === "booking-error";
    nextConflict = value === "slot-taken";
  }
  async function wait(mode: Scenario, signal?: AbortSignal) {
    if (signal?.aborted)
      throw new DOMException("Request aborted", "AbortError");
    await new Promise<void>((resolve, reject) => {
      const onAbort = () => {
        clearTimeout(timer);
        signal?.removeEventListener("abort", onAbort);
        reject(new DOMException("Request aborted", "AbortError"));
      };
      const timer = setTimeout(
        () => {
          signal?.removeEventListener("abort", onAbort);
          resolve();
        },
        mode === "slow" ? slowDelayMs : delayMs
      );
      signal?.addEventListener("abort", onAbort, { once: true });
    });
  }
  function validate(doctorId: string, date: string) {
    if (
      !doctors.some((doctor) => doctor.id === doctorId) ||
      !getBookingDates().includes(date)
    ) {
      throw new ApiError(
        "INVALID_REQUEST",
        "Select a doctor and one of the offered dates."
      );
    }
  }
  async function getSlots(
    doctorId: string,
    date: string,
    signal?: AbortSignal
  ): Promise<Slot[]> {
    const requestedScenario = scenario;
    validate(doctorId, date);
    await wait(requestedScenario, signal);
    if (requestedScenario === "availability-error")
      throw new ApiError(
        "NETWORK",
        "We could not load appointments. Please try again."
      );
    if (requestedScenario === "empty") return [];
    return makeSlots(doctorId, date).filter((slot) => !taken.has(slot.id));
  }
  async function confirmBooking(input: {
    doctorId: string;
    date: string;
    slotId: string;
    idempotencyKey: string;
  }): Promise<Booking> {
    confirmationRequests += 1;
    const requestedScenario = scenario;
    validate(input.doctorId, input.date);
    const slot = makeSlots(input.doctorId, input.date).find(
      (item) => item.id === input.slotId
    );
    if (!slot || !input.idempotencyKey.trim())
      throw new ApiError(
        "INVALID_REQUEST",
        "Choose an available time before confirming."
      );
    await wait(requestedScenario);
    const prior = bookingsByKey.get(input.idempotencyKey);
    if (prior) {
      if (prior.slot.id !== input.slotId)
        throw new ApiError(
          "INVALID_REQUEST",
          "This request key belongs to a different appointment."
        );
      return prior;
    }
    if (nextBookingFailure) {
      nextBookingFailure = false;
      throw new ApiError(
        "NETWORK",
        "The confirmation failed. Your selection is saved; please retry."
      );
    }
    if (nextConflict) {
      nextConflict = false;
      taken.add(slot.id);
    }
    if (taken.has(slot.id))
      throw new ApiError(
        "SLOT_UNAVAILABLE",
        "Someone just booked this time. Choose another available appointment."
      );
    taken.add(slot.id);
    const booking = {
      id: `APT-${String(++bookingSequence).padStart(4, "0")}`,
      slot,
      doctor: doctors.find((doctor) => doctor.id === input.doctorId)!,
    };
    bookingsByKey.set(input.idempotencyKey, booking);
    return booking;
  }
  function reset() {
    taken.clear();
    bookingsByKey.clear();
    confirmationRequests = 0;
    bookingSequence = 0;
    setScenario("normal");
  }
  return {
    getSlots,
    confirmBooking,
    setScenario,
    reset,
    getConfirmationRequestCount: () => confirmationRequests,
  };
}
export const mockApi = createMockApi();
