const BASE = 'api/index.php'

async function handle(res) {
  let data = null
  try { data = await res.json() } catch { /* ignore */ }
  if (!res.ok) {
    const err = new Error((data && data.error) || `Request failed (${res.status})`)
    err.status = res.status
    if (res.status === 401 && !location.hash.startsWith('#/login') && !location.hash.startsWith('#/q/')) {
      location.hash = '#/login'
    }
    throw err
  }
  return data
}

export function apiGet(route, params = {}) {
  const qs = new URLSearchParams({ r: route, ...params })
  return fetch(`${BASE}?${qs}`, { credentials: 'same-origin' }).then(handle)
}

export function apiPost(route, body = {}) {
  return fetch(`${BASE}?r=${route}`, {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }).then(handle)
}

export async function uploadImage(file) {
  const fd = new FormData()
  fd.append('file', file)
  const res = await fetch(`${BASE}?r=upload`, { method: 'POST', credentials: 'same-origin', body: fd })
  const data = await handle(res)
  return data.path
}
