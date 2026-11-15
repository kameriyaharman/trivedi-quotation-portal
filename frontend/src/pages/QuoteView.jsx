import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { apiGet, apiPost } from '../api'
import { inr, fmtDateShort, shareLink, whatsappUrl } from '../utils'
import { ScaledDoc, StatusBadge, Confirm } from '../components/ui'
import { buildPdf, sharePdf } from '../pdf'
import { useApp } from '../App'

export default function QuoteView() {
  const { id } = useParams()
  const nav = useNavigate()
  const { settings, notify } = useApp()
  const [q, setQ] = useState(null)
  const [busy, setBusy] = useState('')
  const [del, setDel] = useState(false)
  const [err, setErr] = useState('')

  useEffect(() => { apiGet('quotes.get', { id }).then(d => setQ(d.quote)).catch(e => setErr(e.message)) }, [id])
  if (err) return <div className="page"><div className="alert">{err}</div></div>
  if (!q || !settings) return <div className="center pad"><div className="spinner" /></div>

  const setStatus = async status => { await apiPost('quotes.status', { id: q.id, status }); setQ({ ...q, status }); notify('Status updated') }
  const download = async () => { setBusy('pdf'); try { await buildPdf(q, settings) } catch (e) { notify(e.message, 'err') } finally { setBusy('') } }
  const wa = () => { window.open(whatsappUrl(q, settings.whatsapp_template), '_blank'); if (q.status === 'draft') setStatus('sent') }
  const sharePdfFile = async () => {
    setBusy('share')
    try { const ok = await sharePdf(q, settings); if (!ok) { await buildPdf(q, settings); notify('PDF downloaded — attach it in WhatsApp') } }
    catch (e) { if (e.name !== 'AbortError') notify(e.message, 'err') } finally { setBusy('') }
  }
  const copy = () => { navigator.clipboard?.writeText(shareLink(q)); notify('Client link copied') }
  const dup = async () => { const d = await apiPost('quotes.duplicate', { id: q.id }); notify('Copy created'); nav(`/quotes/${d.id}/edit`) }
  const remove = async () => { await apiPost('quotes.delete', { id: q.id }); notify('Quotation deleted'); nav('/quotes') }

  return (
    <div className="page">
      <div className="page-h">
        <div>
          <h1>{q.quote_no} <StatusBadge s={q.status} /></h1>
          <p className="muted">{q.client_name}{q.client_phone ? ` · ${q.client_phone}` : ''} · ₹ {inr(q.amount)} · created {fmtDateShort(q.created_at)}</p>
        </div>
        <div className="row gap wrap">
          <Link className="btn ghost" to={`/quotes/${q.id}/edit`}>Edit</Link>
          <button className="btn ghost" onClick={download} disabled={!!busy}>{busy === 'pdf' ? 'Preparing PDF…' : 'Download PDF'}</button>
          <button className="btn wa" onClick={wa}>Send on WhatsApp</button>
        </div>
      </div>

      <div className="view">
        <div className="view-doc"><ScaledDoc q={q} company={settings} /></div>
        <div className="view-side">
          <div className="card">
            <h3>Share with client</h3>
            <p className="muted small">WhatsApp message goes with a link where the client can see this quotation and download the PDF.</p>
            <div className="linkbox"><input className="input" readOnly value={shareLink(q)} onFocus={e => e.target.select()} /><button className="btn ghost sm" onClick={copy}>Copy</button></div>
            <div className="stack">
              <button className="btn wa block" onClick={wa}>WhatsApp {q.client_phone ? `to ${q.client_phone}` : '(choose contact)'}</button>
              <button className="btn ghost block" onClick={sharePdfFile} disabled={!!busy}>{busy === 'share' ? 'Preparing…' : 'Share PDF file (mobile)'}</button>
              <a className="btn ghost block" href={`#/q/${q.share_token}`} target="_blank" rel="noreferrer">Open client view</a>
            </div>
          </div>
          <div className="card">
            <h3>Status</h3>
            <div className="seg full">
              {['draft', 'sent', 'accepted', 'rejected'].map(s => (
                <button key={s} className={q.status === s ? 'on' : ''} onClick={() => setStatus(s)}>{s[0].toUpperCase() + s.slice(1)}</button>
              ))}
            </div>
          </div>
          <div className="card">
            <h3>More</h3>
            <div className="stack">
              <button className="btn ghost block" onClick={dup}>Duplicate as new quotation</button>
              <button className="btn ghost danger-t block" onClick={() => setDel(true)}>Delete quotation</button>
            </div>
          </div>
        </div>
      </div>
      {del && <Confirm text={`Delete quotation ${q.quote_no}? This cannot be undone.`} onYes={remove} onClose={() => setDel(false)} />}
    </div>
  )
}
