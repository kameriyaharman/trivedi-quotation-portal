import { useEffect, useState } from 'react'
import { apiGet, apiPost } from '../api'
import { ImageInput } from '../components/ui'
import WoodEditor from '../components/WoodEditor'
import { useApp } from '../App'

export default function Settings() {
  const { notify, setSettings, user } = useApp()
  const [s, setS] = useState(null)
  const [busy, setBusy] = useState(false)
  const [pw, setPw] = useState({ username: user?.username || '', current: '', new: '' })
  const [pwErr, setPwErr] = useState('')

  useEffect(() => { apiGet('settings.get').then(d => setS(d.settings)) }, [])
  if (!s) return <div className="center pad"><div className="spinner" /></div>
  const v = k => ({ value: s[k] ?? '', onChange: e => setS({ ...s, [k]: e.target.value }) })
  let wood = null
  try { wood = JSON.parse(s.default_wood_json || 'null') } catch { /* ignore */ }

  const save = async () => {
    setBusy(true)
    try { const d = await apiPost('settings.save', s); setS(d.settings); setSettings(d.settings); notify('Settings saved') }
    catch (e) { notify(e.message, 'err') } finally { setBusy(false) }
  }
  const changePw = async () => {
    setPwErr('')
    try { await apiPost('auth.password', pw); setPw({ ...pw, current: '', new: '' }); notify('Login details updated') } catch (e) { setPwErr(e.message) }
  }

  return (
    <div className="page settings">
      <div className="page-h sticky-h">
        <div><h1>Settings</h1><p className="muted">Company details and default content for new quotations</p></div>
        <button className="btn" onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Save settings'}</button>
      </div>

      <div className="card">
        <h3>Company / letterhead</h3>
        <div className="brand-imgs">
          <div><span className="lbl">Logo</span><ImageInput value={s.logo} onChange={logo => setS({ ...s, logo })} size={100} /></div>
          <div><span className="lbl">Header photo</span><ImageInput value={s.header_image} onChange={header_image => setS({ ...s, header_image })} size={100} /></div>
        </div>
        <div className="fgrid">
          <label className="fld">Company name (line 1)<input className="input" {...v('company_name')} /></label>
          <label className="fld">Company name (line 2)<input className="input" {...v('company_name2')} /></label>
          <label className="fld span2">Tagline<input className="input" {...v('tagline')} /></label>
          <label className="fld">Phone numbers<input className="input" {...v('phones')} /></label>
          <label className="fld">Locations<input className="input" {...v('locations')} /></label>
          <label className="fld">Signature label<input className="input" {...v('signature_label')} /></label>
          <label className="fld">Footer text<input className="input" {...v('footer_text')} /></label>
        </div>
      </div>

      <div className="card">
        <h3>Quotation numbering</h3>
        <div className="fgrid three">
          <label className="fld">Prefix<input className="input" {...v('quote_prefix')} /></label>
          <label className="fld">Next number<input className="input" type="number" min="1" {...v('next_number')} /></label>
          <label className="fld">Digits<input className="input" type="number" min="1" max="8" {...v('number_padding')} /></label>
        </div>
        <p className="muted small">Next quotation will be <b>{(s.quote_prefix || '') + String(s.next_number || 1).padStart(+s.number_padding || 1, '0')}</b></p>
      </div>

      <div className="card">
        <h3>Default content for new quotations</h3>
        <div className="fgrid">
          <label className="fld span2">Title<input className="input" {...v('default_title')} /></label>
          <label className="fld span2">Intro line <small className="muted">— {'{location}'} = site location</small><textarea className="input" rows={2} {...v('default_intro')} /></label>
          <label className="fld">Items section heading<input className="input" {...v('default_acc_heading')} /></label>
          <label className="fld">Amount label<textarea className="input" rows={2} {...v('default_amount_label')} /></label>
        </div>
        <h4>Default wooden work section</h4>
        <WoodEditor value={wood} onChange={w => setS({ ...s, default_wood_json: JSON.stringify(w) })} />
        <p className="muted small" style={{ marginTop: 14 }}>One point per line. Use <code>**text**</code> for bold.</p>
        <label className="fld">Note<textarea className="input" rows={4} {...v('default_notes')} /></label>
        <label className="fld">Terms and condition<textarea className="input" rows={7} {...v('default_terms')} /></label>
        <label className="fld">Payment terms<textarea className="input" rows={3} {...v('default_payment_terms')} /></label>
        <label className="fld">Closing lines<textarea className="input" rows={2} {...v('default_closing')} /></label>
      </div>

      <div className="card">
        <h3>WhatsApp message</h3>
        <p className="muted small">Variables: {'{client} {quote_no} {title} {amount} {date} {link}'}</p>
        <textarea className="input" rows={7} {...v('whatsapp_template')} />
      </div>

      <div className="card">
        <h3>Login details</h3>
        <div className="fgrid three">
          <label className="fld">Username<input className="input" value={pw.username} onChange={e => setPw({ ...pw, username: e.target.value })} /></label>
          <label className="fld">Current password<input className="input" type="password" value={pw.current} onChange={e => setPw({ ...pw, current: e.target.value })} /></label>
          <label className="fld">New password<input className="input" type="password" value={pw.new} onChange={e => setPw({ ...pw, new: e.target.value })} /></label>
        </div>
        {pwErr && <div className="alert">{pwErr}</div>}
        <button className="btn ghost" onClick={changePw}>Update login</button>
      </div>
    </div>
  )
}
