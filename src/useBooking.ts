import { useState } from "react";
import type { Availability, BookingState, Selection } from "./types";

/** YOUR INTERVIEW WORK LIVES HERE.
 * Search for TODO(interview) across src/. The mock API and visual shell are provided.
 * The starter intentionally does not fetch or confirm bookings yet.
 * Import mockApi / ApiError from './mockApi' when you start implementing.
 */
export function useBooking() {
  const [selection, setSelection] = useState<Selection>({
    doctorId: "",
    date: "",
    slotId: "",
  });
  const [availability, setAvailability] = useState<Availability>({
    status: "idle",
  });
  const [bookingState, setBookingState] = useState<BookingState>({
    status: "idle",
  });

  // TODO(interview)-1: When doctor/date change, clear the previous slot and booking
  // feedback. Keep a successful booking's immutable snapshot until "Book another".
  function chooseDoctor(doctorId: string) {
    setSelection((current) => ({ ...current, doctorId }));
  }
  function chooseDate(date: string) {
    setSelection((current) => ({ ...current, date }));
  }
  function chooseSlot(slotId: string) {
    setSelection((current) => ({ ...current, slotId }));
  }

  // TODO(interview)-2: Add an effect to call mockApi.getSlots when BOTH doctor and
  // date exist. Set loading -> ready (including []) or error. Return to idle when
  // inputs are incomplete. Cancel/ignore stale requests and handle StrictMode cleanup.
  // mockApi.getSlots(doctorId, date, optionalAbortSignal) supports AbortController.

  // TODO(interview)-3: Retry availability without forcing the patient to reselect.
  // Only the newest request may update availability. Consider sharing a loader with #2.
  function retryAvailability() {
    // Write your retry logic here.
  }

  // TODO(interview)-4: Validate the current slot against current availability;
  // call mockApi.confirmBooking({ doctorId, date, slotId, idempotencyKey }).
  // Set submitting -> success/error. Preserve selection after a network failure.
  // TODO(interview)-5: Block duplicate calls synchronously, including same-tick calls.
  // A disabled button alone is insufficient. Keep an idempotency key for retrying
  // the same attempt; use a new key for a new selection/booking.
  async function confirm() {
    // Write your booking logic here.
  }

  // TODO(interview)-6: For ApiError code SLOT_UNAVAILABLE, clear the selected slot,
  // show conflict feedback, and refresh slots so the taken time disappears. Keep
  // doctor/date. Keep the conflict message if refresh itself fails; allow retry.

  // TODO(interview)-7: Reset UI state for "Book another" without resetting the mock
  // server's taken slots. Clean up/invalidate pending requests on reset/unmount.
  function resetBooking() {
    // Write your reset logic here.
  }

  // State setters are intentionally retained for your implementation above.
  void setAvailability;
  void setBookingState;
  return {
    selection,
    availability,
    bookingState,
    chooseDoctor,
    chooseDate,
    chooseSlot,
    retryAvailability,
    confirm,
    resetBooking,
  };
}
