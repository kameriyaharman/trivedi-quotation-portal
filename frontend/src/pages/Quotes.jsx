import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { apiGet, apiPost } from '../api'
import { inr, fmtDate, whatsappUrl, shareLink } from '../utils'
import { StatusBadge, Confirm } from '../components/ui'
import { useApp } from '../App'
import { buildPdf } from '../pdf'

export default function Quotes() {
  const { settings, notify } = useApp()
  const [sp, setSp] = useSearchParams()
  const nav = useNavigate()
  const [f, setF] = useState({ q: sp.get('q') || '', status: sp.get('status') || '', from: sp.get('from') || '', to: sp.get('to') || '' })
  const page = +(sp.get('page') || 1)
  const [data, setData] = useState(null)
  const [del, setDel] = useState(null)
  const [busyId, setBusyId] = useState(null)

  const load = () => {
    const p = { page, per: 20 }
    for (const k of ['q', 'status', 'from', 'to']) if (sp.get(k)) p[k] = sp.get(k)
    apiGet('quotes.list', p).then(setData)
  }
  useEffect(load, [sp])

  // live search (debounced)
  useEffect(() => {
    const t = setTimeout(() => {
      const next = {}
      for (const [k, v] of Object.entries(f)) if (v) next[k] = v
      const cur = Object.fromEntries([...sp.entries()].filter(([k]) => k !== 'page'))
      if (JSON.stringify(next) !== JSON.stringify(cur)) setSp(next)
    }, 300)
    return () => clearTimeout(t)
  }, [f])

  const pages = data ? Math.max(1, Math.ceil(data.total / data.per)) : 1
  const goPage = p => { const n = Object.fromEntries(sp.entries()); n.page = p; setSp(n) }

  const download = async r => {
    setBusyId(r.id)
    try { const d = await apiGet('quotes.get', { id: r.id }); await buildPdf(d.quote, settings) } catch (e) { notify(e.message, 'err') } finally { setBusyId(null) }
  }
  const dup = async r => { const d = await apiPost('quotes.duplicate', { id: r.id }); notify('Copy created'); nav(`/quotes/${d.id}/edit`) }
  const remove = async r => { await apiPost('quotes.delete', { id: r.id }); notify('Quotation deleted'); load() }
  const copy = r => { navigator.clipboard?.writeText(shareLink(r)); notify('Client link copied') }
  const wa = async r => {
    window.open(whatsappUrl(r, settings?.whatsapp_template), '_blank')
    if (r.status === 'draft') { await apiPost('quotes.status', { id: r.id, status: 'sent' }); load() }
  }

  return (
    <div className="page">
      <div className="page-h">
        <div><h1>Quotations</h1><p className="muted">{data ? `${data.total} quotation${data.total === 1 ? '' : 's'} · ₹ ${inr(data.sum)}` : ' '}</p></div>
        <Link to="/quotes/new" className="btn">+ New Quotation</Link>
      </div>

      <div className="filters card">
        <input className="input grow" placeholder="Search by client name, phone, quote no. or site…" value={f.q} onChange={e => setF({ ...f, q: e.target.value })} />
        <select className="input" value={f.status} onChange={e => setF({ ...f, status: e.target.value })}>
          <option value="">All status</option><option value="draft">Draft</option><option value="sent">Sent</option>
          <option value="accepted">Accepted</option><option value="rejected">Rejected</option>
        </select>
        <label className="lbl-inline">From<input className="input" type="date" value={f.from} onChange={e => setF({ ...f, from: e.target.value })} /></label>
        <label className="lbl-inline">To<input className="input" type="date" value={f.to} onChange={e => setF({ ...f, to: e.target.value })} /></label>
        {(f.q || f.status || f.from || f.to) && <button className="btn ghost" onClick={() => setF({ q: '', status: '', from: '', to: '' })}>Clear</button>}
      </div>

      <div className="card nopad">
        {!data ? <div className="center pad"><div className="spinner" /></div> : data.rows.length === 0 ? (
          <p className="muted pad">No quotations found.</p>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Quote No.</th><th>Date</th><th>Client</th><th>Site</th><th className="num">Amount</th><th>Status</th><th className="actions-h">Actions</th></tr></thead>
              <tbody>
                {data.rows.map(r => (
                  <tr key={r.id}>
                    <td><Link to={`/quotes/${r.id}`}><b>{r.quote_no}</b></Link></td>
                    <td>{fmtDate(r.quote_date, '/')}</td>
                    <td>{r.client_name}<small className="block muted">{r.client_phone}</small></td>
                    <td>{r.site_location}</td>
                    <td className="num">₹ {inr(r.amount)}</td>
                    <td><StatusBadge s={r.status} /></td>
                    <td>
                      <div className="actions">
                        <Link className="act" to={`/quotes/${r.id}`} title="Preview">View</Link>
                        <Link className="act" to={`/quotes/${r.id}/edit`} title="Edit">Edit</Link>
                        <button className="act" onClick={() => download(r)} disabled={busyId === r.id}>{busyId === r.id ? '…' : 'PDF'}</button>
                        <button className="act wa" onClick={() => wa(r)} title="Send on WhatsApp">WhatsApp</button>
                        <button className="act" onClick={() => copy(r)} title="Copy client link">Link</button>
                        <button className="act" onClick={() => dup(r)} title="Duplicate">Copy</button>
                        <button className="act del" onClick={() => setDel(r)} title="Delete">✕</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {pages > 1 && (
        <div className="pager">
          <button className="btn ghost" disabled={page <= 1} onClick={() => goPage(page - 1)}>← Prev</button>
          <span>Page {page} of {pages}</span>
          <button className="btn ghost" disabled={page >= pages} onClick={() => goPage(page + 1)}>Next →</button>
        </div>
      )}
      {del && <Confirm text={`Delete quotation ${del.quote_no} for ${del.client_name}? This cannot be undone.`} onYes={() => remove(del)} onClose={() => setDel(null)} />}
    </div>
  )
}
