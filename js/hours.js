// Opening hours for Park N Munch (index 0 = Sunday … 6 = Saturday)
// close > 24 means the session runs into the early hours of the NEXT calendar day
// e.g. close: 26 = 2 am the following morning
const OPENING_HOURS = [
  { open: 16, close: 26 }, // Sunday    4 pm – 2 am
  null,                     // Monday    Closed
  { open: 16, close: 25 }, // Tuesday   4 pm – 1 am
  { open: 16, close: 25 }, // Wednesday 4 pm – 1 am
  { open: 16, close: 25 }, // Thursday  4 pm – 1 am
  { open: 16, close: 26 }, // Friday    4 pm – 2 am
  { open: 16, close: 26 }, // Saturday  4 pm – 2 am
];

function isOpen() {
  const now  = new Date();
  const day  = now.getDay();
  const mins = now.getHours() * 60 + now.getMinutes();

  // Are we inside today's open window? (4 pm onwards)
  const today = OPENING_HOURS[day];
  if (today && mins >= today.open * 60) return true;

  // Are we in yesterday's late-night extension? (after midnight, before yesterday's closing time)
  const yesterday = (day + 6) % 7;
  const yest = OPENING_HOURS[yesterday];
  if (yest && yest.close > 24) {
    const closeAfterMidnight = (yest.close - 24) * 60;
    if (mins < closeAfterMidnight) return true;
  }

  return false;
}
