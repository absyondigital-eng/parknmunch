// Per-item notes are embedded as a trailing "[Note: ...]" in the cart item's
// name (see buildItemName/redirectToStripe in js/order.js) rather than stored
// as a separate field, so every place that displays order items needs to pull
// it back out instead of showing the raw bracket syntax.
const NOTE_REGEX = /\[Note:\s*(.+?)\]\s*$/

export function parseItemNote(rawName) {
  const match = NOTE_REGEX.exec(rawName || '')
  if (!match) return { name: rawName || '', note: '' }
  return { name: rawName.slice(0, match.index).trim(), note: match[1].trim() }
}
