import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { uploadImage, apiGet } from '../api'
import { img, STATUS } from '../utils'
import QuoteDocument from './QuoteDocument'

export function Modal({ title, onClose, children, footer, wide }) {
  useEffect(() => {
    const k = e => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', k)
    document.body.style.overflow = 'hidden'
    return () => { window.removeEventListener('keydown', k); document.body.style.overflow = '' }
  }, [onClose])
  return (
    <div className="modal-bg" onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <div className={'modal' + (wide ? ' modal-wide' : '')}>
        <div className="modal-h"><h3>{title}</h3><button className="icon-btn" onClick={onClose}>✕</button></div>
        <div className="modal-b">{children}</div>
        {footer && <div className="modal-f">{footer}</div>}
      </div>
    </div>
  )
}

export function ImageInput({ value, onChange, size = 72, label = 'Upload' }) {
  const ref = useRef()
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const pick = async e => {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    setBusy(true); setErr('')
    try { onChange(await uploadImage(f)) } catch (x) { setErr(x.message) } finally { setBusy(false) }
  }
  return (
    <div className="imgin" style={{ width: size }}>
      <div className="imgin-box" style={{ width: size, height: size }} onClick={() => ref.current.click()} title="Click to upload image">
        {busy ? <div className="spinner sm" /> : value ? <img src={img(value)} alt="" /> : <span>+ {label}</span>}
      </div>
      {value && !busy && <button type="button" className="imgin-x" onClick={() => onChange('')} title="Remove">✕</button>}
      <input ref={ref} type="file" accept="image/*" hidden onChange={pick} />
      {err && <small className="err">{err}</small>}
    </div>
  )
}

export function StatusBadge({ s }) {
  const st = STATUS[s] || STATUS.draft
  return <span className={'badge ' + st.cls}>{st.label}</span>
}

/** Shows the 794px wide quotation scaled to fit its container. */
export function ScaledDoc({ q, company }) {
  const wrap = useRef(), inner = useRef()
  const [scale, setScale] = useState(1)
  const [h, setH] = useState(0)
  useLayoutEffect(() => {
    const fit = () => {
      if (!wrap.current || !inner.current) return
      const s = Math.min(1, wrap.current.clientWidth / 794)
      setScale(s)
      setH(inner.current.offsetHeight * s)
    }
    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(wrap.current); ro.observe(inner.current)
    return () => ro.disconnect()
  }, [])
  return (
    <div className="scaled" ref={wrap} style={{ height: h || undefined }}>
      <div ref={inner} className="scaled-in" style={{ transform: `scale(${scale})` }}>
        <QuoteDocument q={q} company={company} />
      </div>
    </div>
  )
}

export function ItemPicker({ onClose, onAdd, existingIds = [] }) {
  const [items, setItems] = useState(null)
  const [q, setQ] = useState('')
  const [sel, setSel] = useState([])
  useEffect(() => { apiGet('items.list', { active: '1' }).then(d => setItems(d.items)) }, [])
  const list = (items || []).filter(i => !q || (i.name + ' ' + (i.category || '') + ' ' + (i.description || '')).toLowerCase().includes(q.toLowerCase()))
  const toggle = id => setSel(s => (s.includes(id) ? s.filter(x => x !== id) : [...s, id]))
  const add = () => { onAdd((items || []).filter(i => sel.includes(i.id))); onClose() }
  return (
    <Modal title="Select items" onClose={onClose} wide
      footer={<>
        <span className="muted">{sel.length} selected</span>
        <div className="row gap">
          <button className="btn ghost" onClick={() => setSel(list.map(i => i.id))}>Select all shown</button>
          <button className="btn" disabled={!sel.length} onClick={add}>Add {sel.length || ''} item{sel.length === 1 ? '' : 's'}</button>
        </div>
      </>}>
      <input className="input" autoFocus placeholder="Search items…" value={q} onChange={e => setQ(e.target.value)} />
      {!items ? <div className="center pad"><div className="spinner" /></div> : (
        <div className="pick-grid">
          {list.map(i => (
            <label key={i.id} className={'pick' + (sel.includes(i.id) ? ' on' : '')}>
              <input type="checkbox" checked={sel.includes(i.id)} onChange={() => toggle(i.id)} />
              <div className="pick-img">{i.image ? <img src={img(i.image)} alt="" /> : null}</div>
              <div className="pick-t">
                <b>{i.name}</b>
                <small>{[i.category, i.default_qty && `Qty: ${i.default_qty}`].filter(Boolean).join(' · ')}</small>
                {existingIds.includes(i.id) && <em>Already added</em>}
              </div>
            </label>
          ))}
          {!list.length && <p className="muted">No items found. Add items from Item Master.</p>}
        </div>
      )}
    </Modal>
  )
}

export function Confirm({ text, onYes, onClose, yes = 'Delete' }) {
  return (
    <Modal title="Please confirm" onClose={onClose}
      footer={<><span /><div className="row gap"><button className="btn ghost" onClick={onClose}>Cancel</button><button className="btn danger" onClick={() => { onYes(); onClose() }}>{yes}</button></div></>}>
      <p>{text}</p>
    </Modal>
  )
}
