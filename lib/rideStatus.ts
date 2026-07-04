// lib/rideStatus.ts
// Single source of truth for whether a ride is still "active" (should appear on
// the rider search map / list) or "expired" (its time has passed).
//
// Rules:
//   • Completed / cancelled / already-expired rides  → expired.
//   • Recurring ride                                 → expired once its
//     recurringEndDate passes; open-ended (no end date) never expires.
//   • One-time ride                                  → expired once its
//     departureTime is in the past.
//
// Field names are read in both camelCase (frontend/API JSON) and PascalCase
// (raw C# model) forms so it works regardless of the serializer casing.

export function isRideExpired(ride: any, now: number = Date.now()): boolean {
  if (!ride) return true

  const status = String(ride.status ?? ride.Status ?? '').toLowerCase()
  if (status === 'completed' || status === 'cancelled' || status === 'canceled' || status === 'expired') {
    return true
  }

  const isRecurring = ride.isRecurring ?? ride.IsRecurring ?? false
  if (isRecurring) {
    const end = ride.recurringEndDate ?? ride.RecurringEndDate
    if (!end) return false                          // open-ended recurring ride
    const t = new Date(end).getTime()
    return Number.isFinite(t) && t < now
  }

  const dep = ride.departureTime ?? ride.DepartureTime
  if (!dep) return false                            // no date info — don't hide it
  const t = new Date(dep).getTime()
  return Number.isFinite(t) && t < now
}

export const isRideActive = (ride: any, now: number = Date.now()): boolean =>
  !isRideExpired(ride, now)
