import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { NavLink, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { apiGet, apiPost } from './api'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Quotes from './pages/Quotes'
import QuoteEditor from './pages/QuoteEditor'
import QuoteView from './pages/QuoteView'
import PublicQuote from './pages/PublicQuote'
import Items from './pages/Items'
import Settings from './pages/Settings'

const Ctx = createContext(null)
export const useApp = () => useContext(Ctx)

const Icon = ({ d }) => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>
)
const ICONS = {
  dash: 'M3 13h8V3H3zm10 8h8V11h-8zM3 21h8v-6H3zm10-18v6h8V3z',
  quotes: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M8 13h8M8 17h5',
  plus: 'M12 5v14M5 12h14',
  items: 'M21 16V8a2 2 0 0 0-1-1.7l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.7l7 4a2 2 0 0 0 2 0l7-4a2 2 0 0 0 1-1.7zM3.3 7 12 12l8.7-5M12 22V12',
  settings: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z',
  logout: 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9',
  menu: 'M3 12h18M3 6h18M3 18h18',
}
export { Icon, ICONS }

function Shell({ children }) {
  const { user, settings, logout } = useApp()
  const [open, setOpen] = useState(false)
  const loc = useLocation()
  useEffect(() => setOpen(false), [loc.pathname])
  const nav = [
    ['/', 'Dashboard', 'dash'],
    ['/quotes', 'Quotations', 'quotes'],
    ['/quotes/new', 'New Quotation', 'plus'],
    ['/items', 'Item Master', 'items'],
    ['/settings', 'Settings', 'settings'],
  ]
  return (
    <div className={'shell' + (open ? ' nav-open' : '')}>
      <aside className="side">
        <div className="side-brand">
          {settings?.logo && <img src={settings.logo} alt="" />}
          <div><b>{settings?.company_name || 'TRIVEDI'}</b><span>{settings?.company_name2 || 'METAMODULAR'}</span></div>
        </div>
        <nav>
          {nav.map(([to, label, ic]) => (
            <NavLink key={to} to={to} end={to === '/' || to === '/quotes'}><Icon d={ICONS[ic]} />{label}</NavLink>
          ))}
        </nav>
        <div className="side-user">
          <div><b>{user?.name}</b><span>@{user?.username}</span></div>
          <button className="icon-btn" title="Logout" onClick={logout}><Icon d={ICONS.logout} /></button>
        </div>
      </aside>
      <div className="side-mask" onClick={() => setOpen(false)} />
      <main className="main">
        <div className="topbar-m">
          <button className="icon-btn" onClick={() => setOpen(true)}><Icon d={ICONS.menu} /></button>
          <b>Quotation Portal</b>
        </div>
        {children}
      </main>
    </div>
  )
}

export default function App() {
  const [user, setUser] = useState(undefined)
  const [settings, setSettings] = useState(null)
  const [toast, setToast] = useState(null)
  const navigate = useNavigate()
  const loc = useLocation()
  const isPublic = loc.pathname.startsWith('/q/')

  const notify = useCallback((msg, type = 'ok') => {
    setToast({ msg, type, id: Date.now() })
    setTimeout(() => setToast(t => (t && Date.now() - t.id > 2800 ? null : t)), 3000)
  }, [])

  const loadSettings = useCallback(() => apiGet('settings.get').then(d => setSettings(d.settings)).catch(() => {}), [])

  useEffect(() => {
    if (isPublic) return
    apiGet('auth.me').then(d => { setUser(d.user); loadSettings() }).catch(() => setUser(null))
  }, [isPublic, loadSettings])

  const logout = async () => { await apiPost('auth.logout').catch(() => {}); setUser(null); navigate('/login') }
  const onLogin = (u) => { setUser(u); loadSettings(); navigate('/') }

  const ctx = { user, settings, setSettings, loadSettings, notify, logout }

  let content
  if (isPublic) {
    content = <Routes><Route path="/q/:token" element={<PublicQuote />} /></Routes>
  } else if (user === undefined) {
    content = <div className="boot"><div className="spinner" /></div>
  } else if (!user) {
    content = <Routes><Route path="*" element={<Login onLogin={onLogin} />} /></Routes>
  } else {
    content = (
      <Shell>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/quotes" element={<Quotes />} />
          <Route path="/quotes/new" element={<QuoteEditor />} />
          <Route path="/quotes/:id/edit" element={<QuoteEditor />} />
          <Route path="/quotes/:id" element={<QuoteView />} />
          <Route path="/items" element={<Items />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Shell>
    )
  }

  return (
    <Ctx.Provider value={ctx}>
      {content}
      {toast && <div className={'toast toast-' + toast.type} key={toast.id}>{toast.msg}</div>}
    </Ctx.Provider>
  )
}
