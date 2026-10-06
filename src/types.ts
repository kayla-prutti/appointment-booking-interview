export type Doctor = {
  id: string;
  name: string;
  specialty: string;
  initials: string;
};
export type Slot = { id: string; doctorId: string; date: string; time: string };
export type Booking = { id: string; slot: Slot; doctor: Doctor };
export type Selection = { doctorId: string; date: string; slotId: string };
export type Availability =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; slots: Slot[] }
  | { status: "error"; message: string };
export type BookingState =
  | { status: "idle" }
  | { status: "submitting" }
  | { status: "error"; message: string }
  | { status: "conflict"; message: string }
  | { status: "success"; booking: Booking };
export type Scenario =
  | "normal"
  | "slow"
  | "empty"
  | "availability-error"
  | "booking-error"
  | "slot-taken";
