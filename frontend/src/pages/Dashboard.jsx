import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { apiGet } from '../api'
import { inr, fmtDate, fmtDateShort } from '../utils'
import { StatusBadge } from '../components/ui'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export default function Dashboard() {
  const [d, setD] = useState(null)
  const nav = useNavigate()
  useEffect(() => { apiGet('dashboard.stats').then(setD) }, [])
  if (!d) return <div className="center pad"><div className="spinner" /></div>
  const max = Math.max(1, ...d.series.map(s => s.count))
  const st = k => d.status[k] || { count: 0, amount: 0 }
  return (
    <div className="page">
      <div className="page-h">
        <div><h1>Dashboard</h1><p className="muted">Overview of all quotations</p></div>
        <Link to="/quotes/new" className="btn">+ New Quotation</Link>
      </div>

      <div className="stats">
        <div className="stat"><span>Total Quotations</span><b>{d.total.count}</b><small>₹ {inr(d.total.amount)} total value</small></div>
        <div className="stat"><span>This Month</span><b>{d.month.count}</b><small>₹ {inr(d.month.amount)}</small></div>
        <div className="stat"><span>Created Today</span><b>{d.today}</b><small>{fmtDateShort(new Date().toISOString().slice(0, 10))}</small></div>
        <div className="stat"><span>Accepted</span><b>{st('accepted').count}</b><small>₹ {inr(st('accepted').amount)}</small></div>
        <div className="stat"><span>Items in Master</span><b>{d.items}</b><small><Link to="/items">Manage items →</Link></small></div>
      </div>

      <div className="grid2">
        <div className="card">
          <h3>Quotations · last 6 months</h3>
          <div className="bars">
            {d.series.map(s => (
              <div key={s.month} className="bar-col" title={`${s.count} quotations · ₹ ${inr(s.amount)}`}>
                <em>{s.count}</em>
                <div className="bar" style={{ height: `${(s.count / max) * 100}%` }} />
                <span>{MONTHS[+s.month.slice(5) - 1]}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="card">
          <h3>By status</h3>
          <div className="status-list">
            {['draft', 'sent', 'accepted', 'rejected'].map(k => (
              <Link key={k} to={`/quotes?status=${k}`} className="status-row">
                <StatusBadge s={k} /><b>{st(k).count}</b><span>₹ {inr(st(k).amount)}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-h"><h3>Recent quotations</h3><Link to="/quotes">View all →</Link></div>
        {d.recent.length === 0 ? <p className="muted pad">No quotations yet. <Link to="/quotes/new">Create the first one</Link>.</p> : (
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Quote No.</th><th>Date</th><th>Client</th><th>Site</th><th className="num">Amount</th><th>Status</th><th>Created</th></tr></thead>
              <tbody>
                {d.recent.map(r => (
                  <tr key={r.id} className="click" onClick={() => nav(`/quotes/${r.id}`)}>
                    <td><b>{r.quote_no}</b></td><td>{fmtDate(r.quote_date, '/')}</td><td>{r.client_name}<small className="block muted">{r.client_phone}</small></td>
                    <td>{r.site_location}</td><td className="num">₹ {inr(r.amount)}</td><td><StatusBadge s={r.status} /></td><td className="muted">{fmtDateShort(r.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
