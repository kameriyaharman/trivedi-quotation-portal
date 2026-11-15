import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { apiGet } from '../api'
import { ScaledDoc } from '../components/ui'
import { buildPdf } from '../pdf'

export default function PublicQuote() {
  const { token } = useParams()
  const [d, setD] = useState(null)
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    apiGet('public.quote', { t: token }).then(r => { setD(r); document.title = `${r.quote.quote_no} · ${r.company.company_name || ''} ${r.company.company_name2 || ''}` }).catch(e => setErr(e.message))
  }, [token])
  if (err) return <div className="pub"><div className="alert">{err}</div></div>
  if (!d) return <div className="boot"><div className="spinner" /></div>
  const dl = async () => { setBusy(true); try { await buildPdf(d.quote, d.company) } finally { setBusy(false) } }
  return (
    <div className="pub">
      <div className="pub-bar">
        <div><b>{d.quote.title}</b><span>{d.quote.quote_no} · {d.quote.client_name}</span></div>
        <button className="btn" onClick={dl} disabled={busy}>{busy ? 'Preparing…' : 'Download PDF'}</button>
      </div>
      <div className="pub-doc"><ScaledDoc q={d.quote} company={d.company} /></div>
    </div>
  )
}
