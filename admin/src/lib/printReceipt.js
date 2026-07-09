import { parseItemNote } from './parseItemNote'

export function printReceipt(order) {
  const tz = 'Europe/London'
  const created = new Date(order.created_at)
  const displayDate = created.toLocaleDateString('en-GB', { timeZone: tz })
  const displayTime = created.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: tz })

  // If running inside the Park N Munch Android app, use the native USB print bridge
  if (window.AndroidPrint) {
    window.AndroidPrint.printReceipt(JSON.stringify({
      id:                  order.id,
      created_at:          order.created_at,
      display_date:        displayDate,
      display_time:        displayTime,
      customer_name:       order.customer_name,
      customer_phone:      order.customer_phone,
      car_registration:    order.car_registration,
      bay_number:          order.bay_number || '',
      order_items:         order.order_items,
      total:               order.total,
      subtotal:            order.subtotal || order.total,
      discount_code:       order.discount_code || '',
      discount_amount:     order.discount_amount || 0,
      notes:               order.notes || '',
    }))
    return
  }

  // Fallback: browser print window (used when running in a regular browser)
  const items = Array.isArray(order.order_items) ? order.order_items : []
  const dateStr = displayDate
  const timeStr = displayTime
  const orderId = String(order.id).slice(-6).toUpperCase()

  const itemRows = items.map(item => {
    const lineTotal = (Number(item.price) * Number(item.quantity)).toFixed(2)
    const { name: displayName, note } = parseItemNote(item.name)
    const label = `${item.quantity}x ${displayName}`
    const noteRow = note ? `<div class="item-note">* ${note}</div>` : ''
    return `<div class="row"><span class="item-name">${label}</span><span>£${lineTotal}</span></div>${noteRow}`
  }).join('')

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Receipt #${orderId}</title>
<style>
  @page { size: 80mm auto; margin: 3mm 4mm; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: 'Courier New', Courier, monospace;
    font-size: 9pt;
    color: #000;
    background: #fff;
    width: 72mm;
  }
  .center { text-align: center; }
  .bold { font-weight: bold; }
  .large { font-size: 13pt; }
  .med { font-size: 11pt; }
  .dashes { border-top: 1px dashed #000; margin: 5px 0; }
  .row { display: flex; justify-content: space-between; align-items: baseline; margin: 1px 0; }
  .item-name { flex: 1; padding-right: 6px; }
  .item-note { font-size: 8pt; padding-left: 10px; margin-bottom: 3px; }
  .total-row { font-weight: bold; font-size: 12pt; margin-top: 3px; }
  .section { margin: 4px 0; }
  .mono-box {
    border: 1px solid #000;
    display: inline-block;
    padding: 1px 4px;
    font-size: 8pt;
    letter-spacing: 0.05em;
  }
</style>
</head>
<body>
<div class="center bold large" style="margin-bottom:2px;">PARK N MUNCH</div>
<div class="center" style="font-size:8pt;margin-bottom:6px;">Unit 5-10 Choir St, Salford M7 1ZD</div>

<div class="dashes"></div>

<div class="row section">
  <span class="bold">ORDER</span>
  <span class="bold">#${orderId}</span>
</div>
<div class="row">
  <span>${dateStr}</span>
  <span>${timeStr}</span>
</div>

<div class="dashes"></div>

<div class="bold" style="margin-bottom:3px;">CUSTOMER</div>
<div>${order.customer_name || 'N/A'}</div>
${order.customer_phone ? `<div>${order.customer_phone}</div>` : ''}
<div class="row" style="margin-top:2px;">
  <span>Car Reg:</span>
  <span class="mono-box">${order.car_registration || 'N/A'}</span>
</div>
${order.bay_number ? `<div class="row"><span>Bay:</span><span>${order.bay_number}</span></div>` : ''}

<div class="dashes"></div>

<div class="bold" style="margin-bottom:4px;">ITEMS</div>
${itemRows}

<div class="dashes"></div>

<div class="row total-row">
  <span>TOTAL</span>
  <span>£${Number(order.total).toFixed(2)}</span>
</div>

${order.notes ? `<div class="dashes"></div><div class="bold">NOTES</div><div>${order.notes}</div>` : ''}

<div class="dashes"></div>
<div class="center" style="margin-top:6px;font-size:8pt;">Thank you! Enjoy your meal 🍔</div>
<div class="center" style="font-size:7pt;color:#555;margin-top:2px;">parknmunch.com</div>
</body>
</html>`

  const w = window.open('', '_blank', 'width=340,height=600,toolbar=0,menubar=0')
  if (!w) {
    alert('Pop-up blocked — please allow pop-ups for this site to print receipts.')
    return
  }
  w.document.open()
  w.document.write(html)
  w.document.close()
  // Give the browser a moment to render before calling print
  setTimeout(() => {
    w.focus()
    w.print()
    w.close()
  }, 400)
}
