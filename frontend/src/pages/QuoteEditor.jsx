import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { apiGet, apiPost } from '../api'
import { ItemPicker, ImageInput, ScaledDoc } from '../components/ui'
import WoodEditor from '../components/WoodEditor'
import { useApp } from '../App'

function Section({ title, children, right, open: initial = true }) {
  const [open, setOpen] = useState(initial)
  return (
    <div className="card sec">
      <div className="sec-h" onClick={() => setOpen(!open)}>
        <h3>{title}</h3>
        <div className="row gap" onClick={e => e.stopPropagation()}>{right}</div>
        <span className={'chev' + (open ? ' up' : '')}>▾</span>
      </div>
      {open && <div className="sec-b">{children}</div>}
    </div>
  )
}

export default function QuoteEditor() {
  const { id } = useParams()
  const nav = useNavigate()
  const { settings, notify } = useApp()
  const [q, setQ] = useState(null)
  const [picker, setPicker] = useState(false)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  const [tab, setTab] = useState('form') // mobile: form | preview

  useEffect(() => {
    setQ(null)
    const p = id ? apiGet('quotes.get', { id }).then(d => d.quote) : apiGet('quotes.defaults')
    p.then(setQ).catch(e => setErr(e.message))
  }, [id])

  if (err && !q) return <div className="page"><div className="alert">{err}</div></div>
  if (!q) return <div className="center pad"><div className="spinner" /></div>

  const set = patch => setQ(v => ({ ...v, ...patch }))
  const f = k => ({ value: q[k] ?? '', onChange: e => set({ [k]: e.target.value }) })
  const setItem = (i, patch) => set({ items: q.items.map((it, j) => (j === i ? { ...it, ...patch } : it)) })
  const move = (i, d) => {
    const a = [...q.items]; const j = i + d
    if (j < 0 || j >= a.length) return
    ;[a[i], a[j]] = [a[j], a[i]]; set({ items: a })
  }
  const addItems = list => set({ items: [...q.items, ...list.map(i => ({ item_id: i.id, name: i.name, image: i.image || '', qty: i.default_qty || '', note: '' }))] })

  const save = async (after = 'view') => {
    setErr('')
    if (!q.client_name?.trim()) { setErr('Client name is required'); window.scrollTo({ top: 0, behavior: 'smooth' }); return }
    setSaving(true)
    try {
      const d = await apiPost('quotes.save', { ...q, id: id ? +id : 0 })
      notify('Quotation saved')
      if (after === 'view') nav(`/quotes/${d.quote.id}`)
      else if (!id) nav(`/quotes/${d.quote.id}/edit`, { replace: true })
      else setQ(d.quote)
    } catch (e) { setErr(e.message) } finally { setSaving(false) }
  }

  return (
    <div className="page editor-page">
      <div className="page-h sticky-h">
        <div><h1>{id ? `Edit ${q.quote_no}` : 'New Quotation'}</h1><p className="muted">Fill the details — preview updates live</p></div>
        <div className="row gap">
          <div className="seg only-m">
            <button className={tab === 'form' ? 'on' : ''} onClick={() => setTab('form')}>Form</button>
            <button className={tab === 'preview' ? 'on' : ''} onClick={() => setTab('preview')}>Preview</button>
          </div>
          <button className="btn ghost" onClick={() => nav(-1)}>Cancel</button>
          <button className="btn ghost" disabled={saving} onClick={() => save('stay')}>Save</button>
          <button className="btn" disabled={saving} onClick={() => save('view')}>{saving ? 'Saving…' : 'Save & Preview'}</button>
        </div>
      </div>
      {err && <div className="alert">{err}</div>}

      <div className="editor">
        <div className={'editor-form' + (tab === 'preview' ? ' hide-m' : '')}>
          <Section title="Client details">
            <div className="fgrid">
              <label className="fld">Client name *<input className="input" {...f('client_name')} placeholder="e.g. Mr. Rajesh Sharma" /></label>
              <label className="fld">WhatsApp / Phone<input className="input" {...f('client_phone')} placeholder="10 digit mobile" inputMode="tel" /></label>
              <label className="fld">Site location (city)<input className="input" {...f('site_location')} placeholder="e.g. Kurukshetra" /></label>
              <label className="fld">Email<input className="input" {...f('client_email')} type="email" /></label>
              <label className="fld span2">Address (optional, shows under client name)<input className="input" {...f('client_address')} /></label>
            </div>
          </Section>

          <Section title="Quotation info">
            <div className="fgrid">
              <label className="fld">Quotation no.<input className="input" {...f('quote_no')} placeholder="Auto" /></label>
              <label className="fld">Date<input className="input" type="date" {...f('quote_date')} /></label>
              <label className="fld">Status
                <select className="input" {...f('status')}>
                  <option value="draft">Draft</option><option value="sent">Sent</option><option value="accepted">Accepted</option><option value="rejected">Rejected</option>
                </select>
              </label>
              <label className="fld span2">Title<input className="input" {...f('title')} /></label>
              <label className="fld span2">Intro line <small className="muted">— {'{location}'} = site location</small><textarea className="input" rows={2} {...f('intro')} /></label>
            </div>
          </Section>

          <Section title="A. Wooden work" open={!!q.wood?.show}>
            <WoodEditor value={q.wood} onChange={wood => set({ wood })} />
          </Section>

          <Section title={`B. Items / Accessories (${q.items.length})`}
            right={<button className="btn sm" onClick={() => setPicker(true)}>+ Add items</button>}>
            <label className="fld">Section heading<input className="input" {...f('acc_heading')} /></label>
            {q.items.length === 0 && <p className="muted">No items yet. Click <b>+ Add items</b> to choose from Item Master.</p>}
            <div className="qitems">
              {q.items.map((it, i) => (
                <div key={i} className="qitem">
                  <ImageInput value={it.image} onChange={v => setItem(i, { image: v })} size={56} label="Img" />
                  <div className="qitem-f">
                    <input className="input" value={it.name} onChange={e => setItem(i, { name: e.target.value })} placeholder="Item name" />
                    <div className="row gap">
                      <input className="input qty" value={it.qty} onChange={e => setItem(i, { qty: e.target.value })} placeholder="Qty (e.g. 8 No's)" />
                      <input className="input grow" value={it.note} onChange={e => setItem(i, { note: e.target.value })} placeholder="Note (optional)" />
                    </div>
                  </div>
                  <div className="qitem-a">
                    <button className="icon-btn" title="Move up" onClick={() => move(i, -1)}>↑</button>
                    <button className="icon-btn" title="Move down" onClick={() => move(i, 1)}>↓</button>
                    <button className="icon-btn del" title="Remove" onClick={() => set({ items: q.items.filter((_, j) => j !== i) })}>✕</button>
                  </div>
                </div>
              ))}
            </div>
            <div className="row gap">
              <button className="btn ghost sm" onClick={() => setPicker(true)}>+ Add from Item Master</button>
              <button className="btn ghost sm" onClick={() => set({ items: [...q.items, { item_id: null, name: '', image: '', qty: '', note: '' }] })}>+ Custom item</button>
            </div>
          </Section>

          <Section title="Amount">
            <div className="fgrid">
              <label className="fld span2">Amount label (Enter for 2nd line)<textarea className="input" rows={2} {...f('amount_label')} /></label>
              <label className="fld">Total amount (₹)<input className="input big" type="number" min="0" step="1" value={q.amount || ''} onChange={e => set({ amount: e.target.value })} placeholder="445000" /></label>
            </div>
          </Section>

          <Section title="Notes, terms & payment" open={false}>
            <p className="muted small">One point per line. Wrap text in <code>**double stars**</code> to make it bold.</p>
            <label className="fld">Note<textarea className="input" rows={4} {...f('notes')} /></label>
            <label className="fld">Terms and condition<textarea className="input" rows={7} {...f('terms')} /></label>
            <label className="fld">Payment terms<textarea className="input" rows={3} {...f('payment_terms')} /></label>
            <label className="fld">Closing lines<textarea className="input" rows={2} {...f('closing')} /></label>
          </Section>
        </div>

        <div className={'editor-preview' + (tab === 'form' ? ' hide-m' : '')}>
          <div className="preview-sticky">
            <ScaledDoc q={q} company={settings} />
          </div>
        </div>
      </div>

      {picker && <ItemPicker onClose={() => setPicker(false)} onAdd={addItems} existingIds={q.items.map(i => i.item_id)} />}
    </div>
  )
}
