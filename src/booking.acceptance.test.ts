// @vitest-environment jsdom
import { createElement } from 'react';
import { act, cleanup, render, renderHook, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { MockInstance } from 'vitest';
import App from './App';
import { ApiError, createMockApi, doctors, getBookingDates, makeSlots, mockApi } from './mockApi';
import type { Booking, Slot } from './types';
import { useBooking } from './useBooking';

// PROVIDED acceptance tests: these exercise your real hook and live interface.
// They should fail until you implement the TODOs in numbered order.
// Start with the [TODO 1] availability checks; the hook is never mocked.
// TODO(interview)-9: Add further tests, e.g. conflict followed by a failing refresh,
// reset while a request is pending, and stale errors after a doctor/date change.
// Tests use a fresh real mock server with zero delay for speed and isolation;
// controlled promises are used when request ordering or loading matters.
const dates = getBookingDates();
const slots = makeSlots('chen', dates[0]);
const timeout = { timeout: 600 };

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
function setup() {
  return renderHook(() => useBooking());
}
type Hook = ReturnType<typeof setup>;
async function selectDoctorAndDate(hook: Hook, date = dates[0]) {
  act(() => {
    hook.result.current.chooseDoctor('chen');
    hook.result.current.chooseDate(date);
  });
  await waitFor(() => expect(hook.result.current.availability.status).toBe('ready'), timeout);
}
async function selectFirstSlot(hook: Hook) {
  await selectDoctorAndDate(hook);
  act(() => hook.result.current.chooseSlot(slots[0].id));
}
function expectReadySlots(hook: Hook, expected: Slot[]) {
  expect(hook.result.current.availability).toEqual({ status: 'ready', slots: expected });
}
async function chooseUiInputs(user: ReturnType<typeof userEvent.setup>) {
  // jsdom cannot operate the OS's native select popup. Set those two choices
  // through user-event; keyboard navigation of time selection/submit is tested below.
  await user.selectOptions(screen.getByRole('combobox', { name: /choose your doctor/i }), 'chen');
  await user.selectOptions(screen.getByRole('combobox', { name: /choose a date/i }), dates[0]);
}

let server: ReturnType<typeof createMockApi>;
let getSlotsSpy: MockInstance<typeof mockApi.getSlots>;
let confirmSpy: MockInstance<typeof mockApi.confirmBooking>;
let resetSpy: MockInstance<typeof mockApi.reset>;
beforeEach(() => {
  server = createMockApi({ delayMs: 0, slowDelayMs: 0 });
  getSlotsSpy = vi.spyOn(mockApi, 'getSlots').mockImplementation(server.getSlots);
  confirmSpy = vi.spyOn(mockApi, 'confirmBooking').mockImplementation(server.confirmBooking);
  resetSpy = vi.spyOn(mockApi, 'reset').mockImplementation(server.reset);
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('candidate implementation acceptance (implement the TODOs to pass)', () => {
  it('loads availability only after both doctor and date are selected [TODO 1]', async () => {
    const hook = setup();
    expect(getSlotsSpy).not.toHaveBeenCalled();
    act(() => hook.result.current.chooseDoctor('chen'));
    expect(getSlotsSpy).not.toHaveBeenCalled();
    expect(hook.result.current.availability.status).toBe('idle');
    act(() => hook.result.current.chooseDate(dates[0]));
    await waitFor(() => expect(getSlotsSpy).toHaveBeenCalled(), timeout);
    await waitFor(() => expectReadySlots(hook, slots), timeout);
    expect(getSlotsSpy.mock.calls.every(([doctor, date]) => doctor === 'chen' && date === dates[0])).toBe(true);
  });

  it('ignores an old slow response after switching dates [TODO 1]', async () => {
    const oldRequest = deferred<Slot[]>();
    const newRequest = deferred<Slot[]>();
    getSlotsSpy.mockImplementation((_doctor, date) => date === dates[0] ? oldRequest.promise : newRequest.promise);
    const hook = setup();
    act(() => { hook.result.current.chooseDoctor('chen'); hook.result.current.chooseDate(dates[0]); });
    await waitFor(() => expect(getSlotsSpy).toHaveBeenCalled(), timeout);
    act(() => hook.result.current.chooseDate(dates[1]));
    await waitFor(() => expect(getSlotsSpy.mock.calls.some(([, date]) => date === dates[1])).toBe(true), timeout);
    const newerSlots = makeSlots('chen', dates[1]);
    await act(async () => newRequest.resolve(newerSlots));
    await waitFor(() => expectReadySlots(hook, newerSlots), timeout);
    // Intentionally ignore AbortSignal here to prove the hook also ignores stale results.
    await act(async () => oldRequest.resolve(slots));
    expectReadySlots(hook, newerSlots);
  });

  it('clears stale slot selections on both date and doctor changes [TODO 2]', async () => {
    const hook = setup();
    await selectFirstSlot(hook);
    expect(hook.result.current.selection.slotId).toBe(slots[0].id);
    act(() => hook.result.current.chooseDate(dates[1]));
    expect(hook.result.current.selection.slotId).toBe('');
    await waitFor(() => expectReadySlots(hook, makeSlots('chen', dates[1])), timeout);
    const newSlot = makeSlots('chen', dates[1])[0];
    act(() => hook.result.current.chooseSlot(newSlot.id));
    expect(hook.result.current.selection.slotId).toBe(newSlot.id);
    act(() => hook.result.current.chooseDoctor('rivera'));
    expect(hook.result.current.selection.slotId).toBe('');
  });

  it('handles loading, empty, error and availability retry [TODO 1, 3]', async () => {
    const request = deferred<Slot[]>();
    getSlotsSpy.mockReturnValueOnce(request.promise);
    const hook = setup();
    act(() => { hook.result.current.chooseDoctor('chen'); hook.result.current.chooseDate(dates[0]); });
    expect(hook.result.current.availability.status).toBe('loading');
    await act(async () => request.resolve([]));
    await waitFor(() => expectReadySlots(hook, []), timeout);
    getSlotsSpy.mockRejectedValueOnce(new ApiError('NETWORK', 'Availability is offline.'));
    act(() => hook.result.current.chooseDate(dates[1]));
    await waitFor(() => expect(hook.result.current.availability.status).toBe('error'), timeout);
    expect(hook.result.current.selection).toMatchObject({ doctorId: 'chen', date: dates[1] });
    act(() => { void hook.result.current.retryAvailability(); });
    await waitFor(() => expectReadySlots(hook, makeSlots('chen', dates[1])), timeout);
  });

  it('preserves selection after a network error and then confirms [TODO 4]', async () => {
    server.setScenario('booking-error');
    const hook = setup();
    await selectFirstSlot(hook);
    const selection = { ...hook.result.current.selection };
    await act(async () => { await hook.result.current.confirm(); });
    expect(hook.result.current.bookingState.status).toBe('error');
    expect(hook.result.current.selection).toEqual(selection);
    await act(async () => { await hook.result.current.confirm(); });
    expect(hook.result.current.bookingState).toMatchObject({ status: 'success', booking: { slot: slots[0], doctor: doctors[0] } });
    expect(confirmSpy).toHaveBeenCalledTimes(2);
  });

  it('blocks same-tick duplicate submissions and reuses the key on retry [TODO 4, 5]', async () => {
    const hook = setup();
    await selectFirstSlot(hook);
    const request = deferred<Booking>();
    confirmSpy.mockReturnValueOnce(request.promise);
    act(() => { void hook.result.current.confirm(); void hook.result.current.confirm(); });
    expect(confirmSpy).toHaveBeenCalledTimes(1);
    expect(hook.result.current.bookingState.status).toBe('submitting');
    const firstKey = confirmSpy.mock.calls[0][0].idempotencyKey;
    expect(firstKey.trim().length).toBeGreaterThan(0);
    await act(async () => request.reject(new ApiError('NETWORK', 'Please retry.')));
    await waitFor(() => expect(hook.result.current.bookingState.status).toBe('error'), timeout);
    await act(async () => { await hook.result.current.confirm(); });
    expect(confirmSpy).toHaveBeenCalledTimes(2);
    expect(confirmSpy.mock.calls[1][0].idempotencyKey).toBe(firstKey);
    expect(hook.result.current.bookingState.status).toBe('success');
  });

  it('refreshes a conflicting slot, preserves doctor/date and books an alternative [TODO 6]', async () => {
    server.setScenario('slot-taken');
    const hook = setup();
    await selectFirstSlot(hook);
    await act(async () => { await hook.result.current.confirm(); });
    await waitFor(() => expectReadySlots(hook, slots.slice(1)), timeout);
    expect(hook.result.current.bookingState.status).toBe('conflict');
    expect(hook.result.current.selection).toEqual({ doctorId: 'chen', date: dates[0], slotId: '' });
    act(() => hook.result.current.chooseSlot(slots[1].id));
    await act(async () => { await hook.result.current.confirm(); });
    expect(hook.result.current.bookingState).toMatchObject({ status: 'success', booking: { slot: slots[1] } });
    expect(confirmSpy.mock.calls[1][0].idempotencyKey).not.toBe(confirmSpy.mock.calls[0][0].idempotencyKey);
  });

  it('announces async states and supports keyboard time selection and confirmation [TODO 1, 4, 8]', async () => {
    const availabilityRequest = deferred<Slot[]>();
    const bookingRequest = deferred<Booking>();
    getSlotsSpy.mockReturnValueOnce(availabilityRequest.promise);
    confirmSpy.mockReturnValueOnce(bookingRequest.promise);
    const user = userEvent.setup();
    render(createElement(App));
    await chooseUiInputs(user);
    const loading = screen.getByText('Finding available times…');
    expect(loading.closest('[aria-live]')?.getAttribute('aria-live')).toBe('polite');
    await act(async () => availabilityRequest.resolve(slots));
    const firstTime = await screen.findByRole('radio', { name: '9:00 AM' }, timeout);
    screen.getByRole('combobox', { name: /choose your doctor/i }).focus();
    await user.tab();
    expect(document.activeElement).toBe(screen.getByRole('combobox', { name: /choose a date/i }));
    await user.tab();
    expect(document.activeElement).toBe(firstTime);
    await user.keyboard(' ');
    expect((firstTime as HTMLInputElement).checked).toBe(true);
    const confirm = screen.getByRole('button', { name: /confirm appointment/i });
    // Tab through any additional focusable controls added by the candidate.
    for (let step = 0; step < 8 && document.activeElement !== confirm; step++) await user.tab();
    expect(document.activeElement).toBe(confirm);
    await user.keyboard('{Enter}');
    expect(confirmSpy).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Please wait while we confirm your appointment.').getAttribute('role')).toBe('status');
    expect((screen.getByRole('button', { name: /confirming/i }) as HTMLButtonElement).disabled).toBe(true);
    await act(async () => bookingRequest.resolve({ id: 'APT-KEYBOARD', slot: slots[0], doctor: doctors[0] }));
    expect(await screen.findByRole('heading', { name: 'You’re booked.' }, timeout)).toBeTruthy();
  });

  it('focuses confirmation and starts another booking without reviving a taken slot [TODO 7, 8]', async () => {
    const user = userEvent.setup();
    render(createElement(App));
    await chooseUiInputs(user);
    await user.click(await screen.findByRole('radio', { name: '9:00 AM' }, timeout));
    await user.click(screen.getByRole('button', { name: /confirm appointment/i }));
    const heading = await screen.findByRole('heading', { name: 'You’re booked.' }, timeout);
    await waitFor(() => expect(document.activeElement).toBe(heading), timeout);
    expect(screen.getByText('APT-0001')).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Book another appointment' }));
    expect(screen.queryByRole('heading', { name: 'You’re booked.' })).toBeNull();
    expect(resetSpy).not.toHaveBeenCalled();
    await chooseUiInputs(user);
    expect(await screen.findByRole('radio', { name: '9:30 AM' }, timeout)).toBeTruthy();
    expect(screen.queryByRole('radio', { name: '9:00 AM' })).toBeNull();
    expect(screen.queryAllByRole('radio').every(input => !(input as HTMLInputElement).checked)).toBe(true);
  });
});
