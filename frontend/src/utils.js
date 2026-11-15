export function inr(n, { decimals = false } = {}) {
  const v = Number(n || 0)
  return v.toLocaleString('en-IN', { minimumFractionDigits: decimals ? 2 : 0, maximumFractionDigits: decimals ? 2 : 2 })
}

export function fmtDate(d, sep = ' / ') {
  if (!d) return ''
  const [y, m, day] = String(d).slice(0, 10).split('-')
  return [day, m, y].join(sep)
}

export function fmtDateShort(d) {
  if (!d) return ''
  const dt = new Date(String(d).replace(' ', 'T'))
  if (isNaN(dt)) return d
  return dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function img(path) {
  if (!path) return ''
  if (/^(https?:|data:|blob:)/.test(path)) return path
  return path.replace(/^\/+/, '')
}

export function lines(text) {
  return String(text || '').split('\n').map(s => s.trim()).filter(Boolean)
}

/** Renders "**bold**" markers inside a line as <b>. Returns array of React-ready parts. */
export function richParts(line) {
  const out = []
  const re = /\*\*(.+?)\*\*/g
  let last = 0, m, k = 0
  while ((m = re.exec(line))) {
    if (m.index > last) out.push({ t: line.slice(last, m.index), b: false, k: k++ })
    out.push({ t: m[1], b: true, k: k++ })
    last = m.index + m[0].length
  }
  if (last < line.length) out.push({ t: line.slice(last), b: false, k: k++ })
  return out
}

export function fillVars(text, q) {
  return String(text || '')
    .replaceAll('{location}', q.site_location || '________')
    .replaceAll('{client}', q.client_name || '')
}

export function appBase() {
  return location.origin + location.pathname.replace(/[^/]*$/, '')
}

export function shareLink(q) {
  return `${appBase()}q.php?t=${q.share_token}`
}

export function waPhone(phone) {
  let d = String(phone || '').replace(/\D/g, '')
  if (d.length === 11 && d.startsWith('0')) d = d.slice(1)
  if (d.length === 10) d = '91' + d
  return d
}

export function whatsappUrl(q, template) {
  const tpl = template || 'Namaste {client},\nPlease find your quotation {quote_no}:\n{link}'
  const msg = tpl
    .replaceAll('{client}', q.client_name || '')
    .replaceAll('{quote_no}', q.quote_no || '')
    .replaceAll('{title}', (q.title || 'Quotation').toLowerCase().replace(/(^|\s)\S/g, s => s.toUpperCase()))
    .replaceAll('{amount}', inr(q.amount))
    .replaceAll('{date}', fmtDate(q.quote_date, '/'))
    .replaceAll('{link}', shareLink(q))
  const p = waPhone(q.client_phone)
  return `https://wa.me/${p}?text=${encodeURIComponent(msg)}`
}

export const STATUS = {
  draft: { label: 'Draft', cls: 'st-draft' },
  sent: { label: 'Sent', cls: 'st-sent' },
  accepted: { label: 'Accepted', cls: 'st-accepted' },
  rejected: { label: 'Rejected', cls: 'st-rejected' },
}

export function fileToName(file) {
  return file.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim()
    .replace(/(^|\s)\S/g, s => s.toUpperCase())
}
