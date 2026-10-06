import { useRef, useState } from "react";
import type { FormEvent } from "react";
import {
  doctors,
  formatDate,
  formatTime,
  getBookingDates,
  makeSlots,
  mockApi,
  scenarios,
} from "./mockApi";
import type { Availability, BookingState, Scenario } from "./types";
import { useBooking } from "./useBooking";

const previews = [
  "live",
  "loading",
  "slots",
  "empty",
  "availability-error",
  "submitting",
  "booking-error",
  "conflict",
  "success",
] as const;
type Preview = (typeof previews)[number];
const previewLabels: Record<Preview, string> = {
  live: "Live exercise (your code)",
  loading: "Loading availability",
  slots: "Available times",
  empty: "No times available",
  "availability-error": "Availability error",
  submitting: "Submitting booking",
  "booking-error": "Booking error",
  conflict: "Slot no longer available",
  success: "Booking confirmed",
};

export default function App() {
  const flow = useBooking();
  const [scenario, setScenario] = useState<Scenario>("normal");
  const [preview, setPreview] = useState<Preview>("live");
  const [dates] = useState(getBookingDates);
  const successHeading = useRef<HTMLHeadingElement>(null);
  const previewing = preview !== "live";
  const sampleSlots = makeSlots(doctors[0].id, dates[0]);
  const availability: Availability =
    preview === "loading"
      ? { status: "loading" }
      : preview === "empty"
        ? { status: "ready", slots: [] }
        : preview === "availability-error"
          ? {
              status: "error",
              message: "We could not load appointments. Please try again.",
            }
          : previewing
            ? {
                status: "ready",
                slots:
                  preview === "conflict" ? sampleSlots.slice(1) : sampleSlots,
              }
            : flow.availability;
  const bookingState: BookingState =
    preview === "submitting"
      ? { status: "submitting" }
      : preview === "booking-error"
        ? {
            status: "error",
            message:
              "The confirmation failed. Your selection is saved; please retry.",
          }
        : preview === "conflict"
          ? {
              status: "conflict",
              message:
                "Someone just booked this time. Choose another available appointment.",
            }
          : preview === "success"
            ? {
                status: "success",
                booking: {
                  id: "APT-PREVIEW",
                  doctor: doctors[0],
                  slot: sampleSlots[0],
                },
              }
            : previewing
              ? { status: "idle" }
              : flow.bookingState;
  const busy = bookingState.status === "submitting";
  const doctor = doctors.find((item) => item.id === flow.selection.doctorId);
  const selectedSlot =
    availability.status === "ready"
      ? availability.slots.find((item) => item.id === flow.selection.slotId)
      : undefined;
  const canConfirm = Boolean(
    doctor &&
    flow.selection.date &&
    selectedSlot &&
    !busy &&
    bookingState.status !== "success"
  );

  // TODO(interview)-8: When LIVE booking succeeds, focus successHeading.current.
  // After a conflict/refresh, move focus to the time choices or their heading.
  // Preserve sensible focus on retries. Native selects/radios already support keys.
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!previewing) void flow.confirm();
  }
  return (
    <div className="page">
      <header className="topbar">
        <a className="brand" href="#booking">
          <span className="brand-mark" aria-hidden="true">
            +
          </span>{" "}
          Wellbook
        </a>
        <span className="exercise-tag">REACT + TYPESCRIPT · PRACTICE</span>
      </header>
      <main>
        <section className="intro">
          <p className="eyebrow">PATIENT APPOINTMENTS</p>
          <h1>
            A little time.
            <br />
            Better care.
          </h1>
          <p>Select a doctor, find a time, and confirm your visit.</p>
        </section>
        <div className="layout">
          <section
            id="booking"
            className="booking-panel"
            aria-labelledby="booking-title"
          >
            <div className="panel-heading">
              <div>
                <p className="eyebrow">YOUR NEXT VISIT</p>
                <h2 id="booking-title">Book an appointment</h2>
              </div>
              <span className="pill">30 min · In person</span>
            </div>
            {previewing && (
              <p className="preview-notice" role="status">
                Visual preview: {previewLabels[preview]}. Return to “Live
                exercise” to test your implementation.
              </p>
            )}
            {bookingState.status === "success" ? (
              <div className="success" role="status">
                <span className="success-icon" aria-hidden="true">
                  ✓
                </span>
                <h3 ref={successHeading} tabIndex={-1}>
                  You’re booked.
                </h3>
                <p>
                  Your appointment with {bookingState.booking.doctor.name} is
                  confirmed.
                </p>
                <dl>
                  <div>
                    <dt>Date</dt>
                    <dd>{formatDate(bookingState.booking.slot.date)}</dd>
                  </div>
                  <div>
                    <dt>Time</dt>
                    <dd>
                      {formatTime(bookingState.booking.slot.time)} · New York
                      time
                    </dd>
                  </div>
                  <div>
                    <dt>Confirmation</dt>
                    <dd>{bookingState.booking.id}</dd>
                  </div>
                </dl>
                <button
                  className="primary"
                  disabled={previewing}
                  onClick={flow.resetBooking}
                >
                  Book another appointment
                </button>
              </div>
            ) : (
              <form onSubmit={submit} aria-busy={busy}>
                <fieldset
                  className="selection-fields"
                  disabled={busy || previewing}
                >
                  <legend className="sr-only">Doctor and date</legend>
                  <div className="field">
                    <label htmlFor="doctor">
                      <span className="step">1</span>Choose your doctor
                    </label>
                    <select
                      id="doctor"
                      value={flow.selection.doctorId}
                      onChange={(event) =>
                        flow.chooseDoctor(event.target.value)
                      }
                      required
                    >
                      <option value="">Select a doctor</option>
                      {doctors.map((item) => (
                        <option value={item.id} key={item.id}>
                          {item.name} · {item.specialty}
                        </option>
                      ))}
                    </select>
                    {doctor && (
                      <div className="doctor-detail">
                        <span className="avatar" aria-hidden="true">
                          {doctor.initials}
                        </span>
                        <span>
                          <strong>{doctor.name}</strong>
                          <small>{doctor.specialty} · Wellbook clinic</small>
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="field">
                    <label htmlFor="date">
                      <span className="step">2</span>Choose a date
                    </label>
                    <select
                      id="date"
                      value={flow.selection.date}
                      onChange={(event) => flow.chooseDate(event.target.value)}
                      required
                    >
                      <option value="">Select a date</option>
                      {dates.map((date) => (
                        <option key={date} value={date}>
                          {formatDate(date)}
                        </option>
                      ))}
                    </select>
                  </div>
                </fieldset>
                <fieldset
                  className="time-field"
                  disabled={
                    busy || previewing || availability.status !== "ready"
                  }
                >
                  <legend>
                    <span className="step">3</span>Choose an available time
                  </legend>
                  <p className="hint">
                    All appointments use New York time (America/New_York).
                  </p>
                  <div aria-live="polite" aria-atomic="true">
                    {availability.status === "idle" && (
                      <div className="status-box">
                        <span aria-hidden="true">◷</span>
                        <p>
                          Select a doctor and date to see available
                          appointments.
                        </p>
                      </div>
                    )}
                    {availability.status === "loading" && (
                      <div className="status-box">
                        <span className="spinner" aria-hidden="true" />
                        <p>Finding available times…</p>
                      </div>
                    )}
                    {availability.status === "ready" &&
                      availability.slots.length === 0 && (
                        <div className="status-box">
                          <span aria-hidden="true">◷</span>
                          <p>
                            No appointments available.
                            <br />
                            <small>Try another date or doctor.</small>
                          </p>
                        </div>
                      )}
                  </div>
                  {availability.status === "ready" &&
                    availability.slots.length > 0 && (
                      <div className="slots">
                        {availability.slots.map((slot) => (
                          <label className="slot" key={slot.id}>
                            <input
                              type="radio"
                              name="time"
                              value={slot.id}
                              checked={flow.selection.slotId === slot.id}
                              onChange={() => flow.chooseSlot(slot.id)}
                              required
                            />
                            <span>{formatTime(slot.time)}</span>
                          </label>
                        ))}
                      </div>
                    )}
                </fieldset>
                {availability.status === "error" && (
                  <div className="feedback error" role="alert">
                    <p>{availability.message}</p>
                    <button
                      type="button"
                      disabled={busy || previewing}
                      onClick={flow.retryAvailability}
                    >
                      Retry availability
                    </button>
                  </div>
                )}
                {(bookingState.status === "error" ||
                  bookingState.status === "conflict") && (
                  <div className="feedback error" role="alert">
                    {bookingState.message}
                  </div>
                )}
                <div className="summary">
                  <span>Your appointment</span>
                  <strong>{doctor?.name ?? "Doctor not selected"}</strong>
                  <p>
                    {flow.selection.date
                      ? formatDate(flow.selection.date)
                      : "Date not selected"}
                    {selectedSlot ? ` · ${formatTime(selectedSlot.time)}` : ""}
                  </p>
                </div>
                <button
                  className="primary"
                  type="submit"
                  disabled={!canConfirm || previewing}
                >
                  {busy
                    ? "Confirming…"
                    : bookingState.status === "error"
                      ? "Retry confirmation"
                      : "Confirm appointment"}
                  <span aria-hidden="true"> →</span>
                </button>
                <p className="footnote" role="status">
                  {busy
                    ? "Please wait while we confirm your appointment."
                    : "Demo appointments only. No real booking will be made."}
                </p>
              </form>
            )}
          </section>
          <aside className="practice-panel" aria-labelledby="practice-title">
            <p className="eyebrow">YOUR INTERVIEW WORKSPACE</p>
            <h2 id="practice-title">Make the flow work.</h2>
            <p>
              The UI and mock API are ready. Implement the booking logic in the
              numbered code comments.
            </p>
            <div className="code-location">
              <span>START HERE</span>
              <code>src/useBooking.ts</code>
              <small>TODO(interview)-1 through -7</small>
            </div>
            <ol className="checklist">
              <li>Connect availability & handle stale requests</li>
              <li>Render loading, empty & error states</li>
              <li>Confirm once & allow safe retry</li>
              <li>Recover when a slot is taken</li>
              <li>Finish keyboard focus in App.tsx</li>
            </ol>
            <div className="practice-controls">
              <label htmlFor="scenario">Mock API scenario</label>
              <select
                id="scenario"
                value={scenario}
                disabled={busy}
                onChange={(event) => {
                  const value = event.target.value as Scenario;
                  setScenario(value);
                  mockApi.setScenario(value);
                }}
              >
                {scenarios.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
              <p>
                Applies to future requests. After implementing the hook, change
                doctor/date or retry to exercise it. Booking failures and
                conflicts happen once per selection of that scenario.
              </p>
              <label htmlFor="preview">Preview provided UI states</label>
              <select
                id="preview"
                value={preview}
                onChange={(event) => setPreview(event.target.value as Preview)}
              >
                {previews.map((value) => (
                  <option key={value} value={value}>
                    {previewLabels[value]}
                  </option>
                ))}
              </select>
              <p>
                Previews are static examples; they do not call the API or
                complete your TODOs.
              </p>
            </div>
            <div className="time-note">
              <strong>45–60 minutes</strong>
              <span>Talk through your choices as you code.</span>
            </div>
          </aside>
        </div>
        <footer>
          Wellbook · Interview starter
          <span>Patient care, thoughtfully scheduled.</span>
        </footer>
      </main>
    </div>
  );
}
