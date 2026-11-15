import { useState } from 'react'
import { apiPost } from '../api'

export default function Login({ onLogin }) {
  const [f, setF] = useState({ username: '', password: '' })
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const submit = async e => {
    e.preventDefault(); setBusy(true); setErr('')
    try { const d = await apiPost('auth.login', f); onLogin(d.user) } catch (x) { setErr(x.message) } finally { setBusy(false) }
  }
  return (
    <div className="login">
      <form className="login-card" onSubmit={submit}>
        <img src="seed/logo.png" alt="" className="login-logo" />
        <h1>Quotation Portal</h1>
        <p className="muted">Trivedi Metamodular · Admin login</p>
        <label>Username<input className="input" autoFocus value={f.username} onChange={e => setF({ ...f, username: e.target.value })} /></label>
        <label>Password<input className="input" type="password" value={f.password} onChange={e => setF({ ...f, password: e.target.value })} /></label>
        {err && <div className="alert">{err}</div>}
        <button className="btn block" disabled={busy}>{busy ? 'Signing in…' : 'Login'}</button>
      </form>
    </div>
  )
}
