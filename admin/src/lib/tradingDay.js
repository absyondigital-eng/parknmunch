// The business day starts at 4pm (16:00) and ends at close (1am or 2am next calendar day).
// Subtracting 16 hours from any timestamp gives the "trading date" — the calendar date
// of the session that order belongs to.
//   e.g. Wednesday 00:30 − 16h = Tuesday 08:30  → counted as Tuesday's sales
//   e.g. Wednesday 16:30 − 16h = Wednesday 00:30 → counted as Wednesday's sales

export const TRADING_OFFSET_MS = 16 * 60 * 60 * 1000

export function tradingDate(timestamp) {
  return new Date(new Date(timestamp).getTime() - TRADING_OFFSET_MS)
}
