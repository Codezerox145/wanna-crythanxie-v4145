import { useEffect, useState } from 'react'
import Layout from '../components/Layout'
import { useAuthGuard } from '../lib/useAuthGuard'
import { api } from '../lib/api'

const BOT_NAME = process.env.NEXT_PUBLIC_BOT_NAME || 'WANNA-CRY THANXIEE'
const BOT_AVATAR = process.env.NEXT_PUBLIC_BOT_AVATAR_URL || 'https://raw.githubusercontent.com/Codezerox145/wanna-crythanxie-v4145/main/bot-avatar.jpg'
const CHANNEL_LINK = process.env.NEXT_PUBLIC_CHANNEL_LINK || 'https://whatsapp.com/channel/0029VbE9KJvJkK73C7RNvP2z'
const GITHUB_REPO = process.env.NEXT_PUBLIC_GITHUB_REPO || 'https://github.com/Codezerox145/wanna-crythanxie-v4145'

function Panel({ title, subtitle, children }) {
  return <section className="min-w-0 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-sm">
    <div className="mb-4"><h2 className="font-semibold">{title}</h2>{subtitle && <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>}</div>
    {children}
  </section>
}

export default function Settings() {
  const user = useAuthGuard()
  const [dark, setDark] = useState(false)
  const [runtime, setRuntime] = useState(null)
  const [sessions, setSessions] = useState([])
  const [error, setError] = useState('')

  useEffect(() => {
    setDark(localStorage.getItem('theme') === 'dark')
    if (!user) return
    Promise.all([api.runtime(), api.listSessions()])
      .then(([r, s]) => { setRuntime(r); setSessions(s.sessions || []) })
      .catch(e => setError(e.message))
  }, [user])

  function toggleTheme() {
    const next = !dark
    setDark(next)
    document.documentElement.classList.toggle('dark', next)
    localStorage.setItem('theme', next ? 'dark' : 'light')
  }

  if (!user) return null
  const bytes = runtime?.memory || {}
  const mb = n => Math.round((n || 0) / 1024 / 1024)

  return <Layout title="Control Center">
    <div className="mx-auto max-w-5xl space-y-5">
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 p-5 sm:p-7 text-white">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          {BOT_AVATAR ? <img src={BOT_AVATAR} alt={BOT_NAME} className="h-16 w-16 rounded-2xl object-cover ring-2 ring-white/20" /> : <div className="h-16 w-16 rounded-2xl bg-white/10 grid place-items-center text-2xl font-black">W</div>}
          <div className="min-w-0"><p className="text-xs uppercase tracking-[.2em] text-indigo-200">Bot identity</p><h2 className="mt-1 text-xl sm:text-2xl font-bold">{BOT_NAME}</h2><p className="text-sm text-slate-300">Account controls, runtime information and official resources</p></div>
        </div>
      </section>

      {error && <p role="alert" className="rounded-xl bg-red-50 dark:bg-red-950/30 p-3 text-sm text-red-600">{error}</p>}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Panel title="Account" subtitle="Your dashboard login">
          <p className="text-xs uppercase tracking-wide text-slate-400">Signed in as</p>
          <p className="mt-1 break-all font-medium">{user.email}</p>
          <p className="mt-4 text-xs text-slate-500">Your account controls the WhatsApp sessions listed in this dashboard.</p>
        </Panel>

        <Panel title="Appearance" subtitle="Consistent layout across desktop and mobile">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div><p className="font-medium">{dark ? 'Dark theme' : 'Light theme'}</p><p className="text-xs text-slate-500">Preference is saved on this device.</p></div>
            <button onClick={toggleTheme} className="rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white">{dark ? 'Switch to light' : 'Switch to dark'}</button>
          </div>
        </Panel>

        <Panel title="Runtime server" subtitle="Live details reported by the API host">
          {runtime ? <div className="grid grid-cols-2 gap-3">
            {[
              ['Provider', runtime.platform], ['Node.js', runtime.node],
              ['Host OS', runtime.operating_system], ['Architecture', runtime.architecture],
              ['CPU cores', runtime.cpu_cores], ['Load average', (runtime.load_average || []).join(' · ')],
              ['Process uptime', `${Math.floor(runtime.uptime_seconds / 3600)}h ${Math.floor(runtime.uptime_seconds % 3600 / 60)}m`],
              ['Bot workers', runtime.active_bot_processes],
              ['RAM in use', `${mb(bytes.rss)} MB RSS`], ['Heap used', `${mb(bytes.heapUsed)} MB`],
              ['Host RAM', `${mb(runtime.total_memory_bytes)} MB total`], ['Free RAM', `${mb(runtime.free_memory_bytes)} MB`],
              ['Configured servers', runtime.configured_server_count], ['Sessions / account', runtime.max_sessions_per_account], ['Connected sessions', sessions.filter(s => s.status === 'online').length]
            ].map(([label, value]) => <div key={label} className="min-w-0 rounded-xl bg-slate-50 dark:bg-slate-800/70 p-3"><p className="text-xs text-slate-500">{label}</p><p className="mt-1 break-words text-sm font-semibold">{value ?? '—'}</p></div>)}
          </div> : <p className="text-sm text-slate-500">Loading server telemetry…</p>}
          <p className="mt-4 text-xs text-slate-500">{runtime?.note || 'Server details are supplied by the connected API.'}</p>
          <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">Only the currently connected host is provisioned in this deployment. Region labels are routing preferences, not separate physical servers.</p>
        </Panel>

        <Panel title="WhatsApp sessions" subtitle="Select a connected bot to manage or restart it">
          {sessions.length ? <div className="space-y-2">{sessions.map(s => <a key={s.id} href={`/sessions/${s.id}`} className="flex min-w-0 items-center justify-between gap-3 rounded-xl border border-slate-200 dark:border-slate-700 p-3 hover:border-brand-500">
            <div className="min-w-0"><p className="truncate text-sm font-semibold">{s.label || '+' + s.phone_number}</p><p className="text-xs text-slate-500">+{s.phone_number}</p></div>
            <span className="shrink-0 rounded-full bg-slate-100 dark:bg-slate-800 px-2.5 py-1 text-xs capitalize">{s.status}</span>
          </a>)}</div> : <p className="text-sm text-slate-500">No WhatsApp sessions found.</p>}
        </Panel>

        <Panel title="Official resources" subtitle="Verified project destinations">
          <div className="flex flex-col gap-3">
            <a href={CHANNEL_LINK} target="_blank" rel="noreferrer" className="flex items-center justify-between rounded-xl bg-slate-50 dark:bg-slate-800 p-3 text-sm font-medium hover:text-brand-600"><span>📢 Official WhatsApp channel</span><span>↗</span></a>
            <a href={GITHUB_REPO} target="_blank" rel="noreferrer" className="flex items-center justify-between rounded-xl bg-slate-50 dark:bg-slate-800 p-3 text-sm font-medium hover:text-brand-600"><span>⌘ GitHub repository</span><span>↗</span></a>
          </div>
        </Panel>
      </div>
    </div>
  </Layout>
}
