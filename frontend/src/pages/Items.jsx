import { useEffect, useRef, useState } from 'react'
import { apiGet, apiPost, uploadImage } from '../api'
import { img, fileToName } from '../utils'
import { Modal, ImageInput, Confirm } from '../components/ui'
import { useApp } from '../App'

const blank = { name: '', image: '', description: '', default_qty: '', category: '', is_active: 1, sort_order: 0 }
const blankRow = () => ({ name: '', image: '', description: '', default_qty: '', category: '' })

function ItemForm({ item, onClose, onSaved }) {
  const [f, setF] = useState({ ...blank, ...item })
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const v = k => ({ value: f[k] ?? '', onChange: e => setF({ ...f, [k]: e.target.value }) })
  const save = async () => {
    setBusy(true); setErr('')
    try { await apiPost('items.save', f); onSaved(); onClose() } catch (e) { setErr(e.message) } finally { setBusy(false) }
  }
  return (
    <Modal title={f.id ? 'Edit item' : 'Add item'} onClose={onClose}
      footer={<><span /><div className="row gap"><button className="btn ghost" onClick={onClose}>Cancel</button><button className="btn" disabled={busy} onClick={save}>Save item</button></div></>}>
      <div className="item-form">
        <ImageInput value={f.image} onChange={image => setF({ ...f, image })} size={110} />
        <div className="grow">
          <label className="fld">Item name *<input className="input" autoFocus {...v('name')} /></label>
          <div className="fgrid">
            <label className="fld">Default qty<input className="input" {...v('default_qty')} placeholder="e.g. 1 set / 8 No's" /></label>
            <label className="fld">Category<input className="input" {...v('category')} placeholder="Accessories / Hardware" list="cats" /></label>
          </div>
        </div>
      </div>
      <label className="fld">Description / note<textarea className="input" rows={3} {...v('description')} /></label>
      <label className="check"><input type="checkbox" checked={!!+f.is_active} onChange={e => setF({ ...f, is_active: e.target.checked ? 1 : 0 })} /> Active (shows in item picker)</label>
      {err && <div className="alert">{err}</div>}
    </Modal>
  )
}

function BulkAdd({ onClose, onSaved }) {
  const [rows, setRows] = useState([blankRow(), blankRow(), blankRow()])
  const [busy, setBusy] = useState('')
  const [err, setErr] = useState('')
  const multi = useRef()
  const setRow = (i, p) => setRows(r => r.map((x, j) => (j === i ? { ...x, ...p } : x)))
  const fromImages = async e => {
    const files = [...e.target.files]; e.target.value = ''
    if (!files.length) return
    const keep = rows.filter(r => r.name || r.image)
    setBusy(`Uploading 0 / ${files.length}`)
    const added = []
    try {
      for (let i = 0; i < files.length; i++) {
        setBusy(`Uploading ${i + 1} / ${files.length}`)
        added.push({ ...blankRow(), name: fileToName(files[i]), image: await uploadImage(files[i]) })
      }
    } catch (x) { setErr(x.message) }
    setRows([...keep, ...added]); setBusy('')
  }
  const save = async () => {
    const items = rows.filter(r => r.name.trim())
    if (!items.length) { setErr('Enter at least one item name'); return }
    setBusy('Saving…'); setErr('')
    try { const d = await apiPost('items.bulk', { items }); onSaved(d.added); onClose() } catch (x) { setErr(x.message) } finally { setBusy('') }
  }
  return (
    <Modal title="Bulk add items" onClose={onClose} wide
      footer={<>
        <span className="muted">{rows.filter(r => r.name.trim()).length} item(s) ready</span>
        <div className="row gap"><button className="btn ghost" onClick={onClose}>Cancel</button><button className="btn" disabled={!!busy} onClick={save}>{busy || 'Save all items'}</button></div>
      </>}>
      <div className="bulk-top">
        <p className="muted small">Fill rows below, or pick many images at once — one item is created per image (name taken from file name, you can edit it).</p>
        <button className="btn ghost sm" disabled={!!busy} onClick={() => multi.current.click()}>📷 Select multiple images</button>
        <input ref={multi} type="file" accept="image/*" multiple hidden onChange={fromImages} />
      </div>
      {busy && <div className="note">{busy}</div>}
      <div className="bulk">
        <div className="bulk-h"><span>Image</span><span>Item name *</span><span>Default qty</span><span>Category</span><span>Description / note</span><span /></div>
        {rows.map((r, i) => (
          <div className="bulk-r" key={i}>
            <ImageInput value={r.image} onChange={image => setRow(i, { image })} size={48} label="" />
            <input className="input" value={r.name} onChange={e => setRow(i, { name: e.target.value })} placeholder="Item name" />
            <input className="input" value={r.default_qty} onChange={e => setRow(i, { default_qty: e.target.value })} placeholder="1 set" />
            <input className="input" value={r.category} onChange={e => setRow(i, { category: e.target.value })} placeholder="Accessories" list="cats" />
            <input className="input" value={r.description} onChange={e => setRow(i, { description: e.target.value })} placeholder="Optional" />
            <button className="icon-btn del" onClick={() => setRows(rows.filter((_, j) => j !== i))}>✕</button>
          </div>
        ))}
      </div>
      <button className="btn ghost sm" onClick={() => setRows([...rows, blankRow(), blankRow(), blankRow()])}>+ Add 3 more rows</button>
      {err && <div className="alert">{err}</div>}
    </Modal>
  )
}

export default function Items() {
  const { notify } = useApp()
  const [items, setItems] = useState(null)
  const [q, setQ] = useState('')
  const [edit, setEdit] = useState(null)
  const [bulk, setBulk] = useState(false)
  const [del, setDel] = useState(null)
  const load = () => apiGet('items.list').then(d => setItems(d.items))
  useEffect(() => { load() }, [])
  const list = (items || []).filter(i => !q || `${i.name} ${i.category || ''} ${i.description || ''}`.toLowerCase().includes(q.toLowerCase()))
  const cats = [...new Set((items || []).map(i => i.category).filter(Boolean))]
  const toggle = async i => { await apiPost('items.save', { ...i, is_active: i.is_active ? 0 : 1 }); load() }
  const remove = async i => { await apiPost('items.delete', { id: i.id }); notify('Item deleted'); load() }

  return (
    <div className="page">
      <div className="page-h">
        <div><h1>Item Master</h1><p className="muted">{items ? `${items.length} items` : ' '} · these show in "Add items" while making a quotation</p></div>
        <div className="row gap">
          <button className="btn ghost" onClick={() => setBulk(true)}>Bulk add</button>
          <button className="btn" onClick={() => setEdit({})}>+ Add item</button>
        </div>
      </div>
      <div className="filters card"><input className="input grow" placeholder="Search items…" value={q} onChange={e => setQ(e.target.value)} /></div>
      {!items ? <div className="center pad"><div className="spinner" /></div> : (
        <div className="item-grid">
          {list.map(i => (
            <div key={i.id} className={'item-card' + (i.is_active ? '' : ' off')}>
              <div className="item-img">{i.image ? <img src={img(i.image)} alt="" /> : <span>No image</span>}</div>
              <div className="item-b">
                <b>{i.name}</b>
                <small>{[i.category, i.default_qty && `Qty: ${i.default_qty}`].filter(Boolean).join(' · ') || ' '}</small>
                {i.description && <p>{i.description}</p>}
              </div>
              <div className="item-a">
                <label className="switch" title={i.is_active ? 'Active' : 'Hidden'}><input type="checkbox" checked={!!i.is_active} onChange={() => toggle(i)} /><span /></label>
                <button className="act" onClick={() => setEdit(i)}>Edit</button>
                <button className="act del" onClick={() => setDel(i)}>Delete</button>
              </div>
            </div>
          ))}
          {!list.length && <p className="muted pad">No items found.</p>}
        </div>
      )}
      <datalist id="cats">{cats.map(c => <option key={c} value={c} />)}</datalist>
      {edit && <ItemForm item={edit} onClose={() => setEdit(null)} onSaved={() => { notify('Item saved'); load() }} />}
      {bulk && <BulkAdd onClose={() => setBulk(false)} onSaved={n => { notify(`${n} item(s) added`); load() }} />}
      {del && <Confirm text={`Delete "${del.name}" from item master? Old quotations keep their copy.`} onYes={() => remove(del)} onClose={() => setDel(null)} />}
    </div>
  )
}
