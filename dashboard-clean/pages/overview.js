import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import Layout from '../components/Layout'
import { useAuthGuard } from '../lib/useAuthGuard'
import { api } from '../lib/api'

function Card({ label, value, note, icon, accent = 'violet', href }) {
  const colors = { violet: 'text-violet-300 bg-violet-500/15 ring-violet-400/15', blue: 'text-sky-300 bg-sky-500/15 ring-sky-400/15', green: 'text-emerald-300 bg-emerald-500/15 ring-emerald-400/15', amber: 'text-amber-300 bg-amber-500/15 ring-amber-400/15' }
  const inner = <div className="flex min-h-[118px] items-center justify-between gap-3 rounded-2xl border border-white/[.07] bg-[#10182b] p-4 shadow-lg shadow-black/10 transition hover:border-violet-400/25 sm:p-5"><div className="min-w-0"><p className="text-xs font-medium text-slate-400">{label}</p><p className="mt-2 text-2xl font-bold tracking-tight text-white sm:text-[28px]">{value}</p><p className="mt-1 truncate text-[10px] text-slate-500">{note}</p></div><span className={'grid h-11 w-11 shrink-0 place-items-center rounded-2xl text-xl ring-1 ' + colors[accent]}>{icon}</span></div>
  return href ? <Link href={href}>{inner}</Link> : inner
}
function Panel({ title, subtitle, children, action }) {
  return <section className="min-w-0 rounded-2xl border border-white/[.07] bg-[#10182b] p-4 shadow-lg shadow-black/10 sm:p-5"><div className="mb-4 flex flex-wrap items-start justify-between gap-3"><div><h3 className="text-sm font-bold text-white">{title}</h3>{subtitle && <p className="mt-1 text-xs text-slate-500">{subtitle}</p>}</div>{action}</div>{children}</section>
}
export default function Overview() {
  const user = useAuthGuard()
  const [sessions, setSessions] = useState(null)
  const [runtime, setRuntime] = useState(null)
  const [analytics, setAnalytics] = useState(null)
  const [health, setHealth] = useState('checking')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const load = useCallback(async () => {
    setBusy(true); setError('')
    const results = await Promise.allSettled([api.listSessions(), api.runtime(), api.health(), api.analytics()])
    if (results[0].status === 'fulfilled') setSessions(results[0].value.sessions || [])
    else setError(results[0].reason?.message || 'Could not load sessions.')
    if (results[1].status === 'fulfilled') setRuntime(results[1].value)
    if (results[2].status === 'fulfilled') setHealth('online'); else setHealth('offline')
    if (results[3].status === 'fulfilled') setAnalytics(results[3].value)
    setBusy(false)
  }, [])
  useEffect(() => { if (!user) return; load(); const t = setInterval(load, 30000); return () => clearInterval(t) }, [user, load])
  if (!user) return null
  const list = sessions || []
  const online = list.filter(x => x.status === 'online').length
  const pairing = list.filter(x => x.status === 'pairing').length
  const connected = list.filter(x => ['online','connecting','reconnecting','pairing'].includes(x.status)).length
  const firstName = user.email?.split('@')[0] || 'there'
  const fmt = value => value == null ? '—' : Number(value).toLocaleString()
  return <Layout title="Dashboard">
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div><p className="text-[10px] font-bold uppercase tracking-[.22em] text-violet-400">Command centre · v20.2.2</p><h2 className="mt-2 text-2xl font-bold tracking-tight text-white sm:text-3xl">Welcome back, {firstName}.</h2><p className="mt-1 text-sm text-slate-400">Here’s the live status of your WhatsApp workspace.</p></div>
      <button onClick={load} disabled={busy} className="rounded-xl border border-white/10 bg-white/[.04] px-4 py-2.5 text-xs font-bold text-slate-200 hover:border-violet-400/40 disabled:opacity-50">{busy ? 'Refreshing…' : '↻ Refresh data'}</button>
    </div>
    <section className="relative mb-5 overflow-hidden rounded-2xl border border-violet-400/20 bg-gradient-to-r from-[#20104b] via-[#19143d] to-[#101d3a] p-5 sm:p-6">
      <div className="pointer-events-none absolute -right-10 -top-20 h-64 w-64 rounded-full border-[38px] border-violet-300/[.06]" />
      <div className="relative flex flex-col items-start justify-between gap-5 sm:flex-row sm:items-center"><div className="max-w-2xl"><div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.2em] text-violet-200"><span className="h-2 w-2 rounded-full bg-violet-400" /> Workspace ready</div><h3 className="mt-3 text-xl font-bold text-white sm:text-2xl">Your WhatsApp operations, in one place.</h3><p className="mt-2 max-w-xl text-sm leading-6 text-indigo-100/70">Connect a device, monitor session health and manage your bot infrastructure from this control centre.</p></div><Link href="/pair" className="shrink-0 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-violet-950/40 hover:brightness-110">＋ Pair a new bot</Link></div>
    </section>
    {error && <div role="alert" className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-400/20 bg-rose-500/10 p-4 text-sm text-rose-200"><span>{error}</span><button onClick={load} className="font-bold underline">Retry</button></div>}
    <div className="mb-5 grid grid-cols-2 gap-3 xl:grid-cols-4">
      <Card label="Paired sessions" value={sessions === null ? '—' : fmt(list.length)} note="Your registered WhatsApp devices" icon="▣" href="/sessions" />
      <Card label="Bots online" value={sessions === null ? '—' : fmt(online)} note="Currently connected" icon="●" accent="green" href="/sessions" />
      <Card label="Pairing in progress" value={sessions === null ? '—' : fmt(pairing)} note="Waiting for device linking" icon="⌁" accent="amber" href="/sessions" />
      <Card label="API service" value={health === 'checking' ? '…' : health === 'online' ? 'Online' : 'Offline'} note={runtime?.platform ? runtime.platform + ' · Node ' + runtime.node : 'Live health endpoint'} icon="▤" accent={health === 'online' ? 'green' : 'blue'} href="/servers" />
    </div>
    <div className="mb-5 grid gap-4 xl:grid-cols-[1.45fr_1fr]">
      <Panel title="Bot status" subtitle="Live connection summary from your account">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-white/[.06] bg-[#0b1222] p-4"><p className="text-[10px] text-slate-500">Connected</p><p className="mt-2 text-2xl font-bold text-emerald-300">{sessions === null ? '—' : online}</p></div>
          <div className="rounded-xl border border-white/[.06] bg-[#0b1222] p-4"><p className="text-[10px] text-slate-500">Other states</p><p className="mt-2 text-2xl font-bold text-amber-200">{sessions === null ? '—' : Math.max(0, list.length - online)}</p></div>
          <div className="col-span-2 rounded-xl border border-white/[.06] bg-[#0b1222] p-4 sm:col-span-1"><p className="text-[10px] text-slate-500">Session capacity</p><p className="mt-2 text-2xl font-bold text-white">{sessions === null ? '—' : list.length + ' / ' + (runtime?.max_sessions_per_account || '—')}</p></div>
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-[#0b1222] px-4 py-3"><div className="flex items-center gap-2"><span className={'h-2 w-2 rounded-full ' + (health === 'online' ? 'bg-emerald-400' : health === 'offline' ? 'bg-rose-400' : 'bg-amber-300')} /><span className="text-xs font-semibold text-slate-200">API {health === 'online' ? 'operational' : health === 'offline' ? 'unavailable' : 'checking'}</span></div><span className="text-[10px] text-slate-500">{runtime ? 'Uptime ' + Math.floor(runtime.uptime_seconds / 3600) + 'h ' + Math.floor(runtime.uptime_seconds % 3600 / 60) + 'm' : 'Runtime details pending'}</span></div>
      </Panel>
      <Panel title="Quick actions" subtitle="Shortcuts to working dashboard tools">
        <div className="grid grid-cols-2 gap-2">
          {[['Pair new bot','/pair','⌁'],['Manage sessions','/sessions','▣'],['Chat Centre','/chat','▣'],['Server status','/servers','▤'],['Account settings','/settings','⚙']].map(([label,href,icon]) => <Link key={href} href={href} className="flex min-h-[88px] flex-col justify-between rounded-xl border border-white/[.07] bg-[#0b1222] p-3 transition hover:border-violet-400/40 hover:bg-violet-500/[.07]"><span className="text-xl text-violet-300">{icon}</span><span className="text-xs font-bold text-slate-200">{label} <span className="text-violet-300">↗</span></span></Link>)}
        </div>
      </Panel>
    </div>
    <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
      <Panel title="Your connected devices" subtitle="Real sessions returned by the API" action={<Link href="/sessions" className="text-xs font-bold text-violet-300 hover:text-white">View all →</Link>}>
        {sessions === null ? <p className="py-8 text-center text-xs text-slate-500">Loading session data…</p> : list.length ? <div className="divide-y divide-white/[.06]">{list.slice(0,5).map(s => <Link key={s.id} href={'/sessions/' + s.id} className="flex items-center justify-between gap-3 py-3 hover:bg-white/[.02]"><div className="flex min-w-0 items-center gap-3"><div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-violet-500/15 text-violet-300">▣</div><div className="min-w-0"><p className="truncate text-xs font-bold text-white">{s.label || '+' + s.phone_number}</p><p className="truncate text-[10px] text-slate-500">+{s.phone_number || 'Number pending'}</p></div></div><span className={'shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold capitalize ' + (s.status === 'online' ? 'bg-emerald-500/10 text-emerald-300' : 'bg-amber-500/10 text-amber-200')}>{s.status}</span></Link>)}</div> : <div className="rounded-xl border border-dashed border-white/10 px-4 py-8 text-center"><p className="text-sm font-bold text-white">No bots connected yet</p><p className="mt-1 text-xs text-slate-500">Start by pairing your WhatsApp number.</p><Link href="/pair" className="mt-4 inline-flex rounded-lg bg-violet-600 px-4 py-2 text-xs font-bold text-white">Connect WhatsApp</Link></div>}
      </Panel>
      <Panel title="Platform modules" subtitle="Feature availability from this deployment">
        <div className="space-y-2">
          {[['WhatsApp pairing','Available','/pair',true],['Session management','Available','/sessions',true],['Server telemetry','Available','/servers',true],['Chat Centre','Available','/chat',true],['Advertising campaigns','Coming Soon','/features/advertising',false],['Payments & billing','Coming Soon','/features/payments',false],['Polls & Channels','Coming Soon','/features/polls',false]].map(([label,status,href,ready]) => <Link key={label} href={href} className="flex items-center justify-between gap-3 rounded-lg bg-[#0b1222] px-3 py-2.5"><span className="text-xs font-medium text-slate-300">{label}</span><span className={'text-[10px] font-bold ' + (ready ? 'text-emerald-300' : 'text-amber-300')}>{status}</span></Link>)}
        </div>
      </Panel>
    </div>
    <div id="statistics" className="mt-5 rounded-2xl border border-white/[.07] bg-[#10182b] p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="text-sm font-bold text-white">Statistics</h3><p className="mt-1 text-xs text-slate-500">Only account metrics currently returned by the API are shown.</p></div><span className="rounded-lg bg-violet-500/10 px-3 py-1.5 text-[10px] font-bold text-violet-200">Account view</span></div><div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">{[['Total sessions',analytics?.sessions_total],['Connected sessions',analytics?.sessions_connected],['Active workers',runtime?.active_bot_processes],['Configured servers',runtime?.configured_server_count]].map(([k,v]) => <div key={k} className="rounded-xl bg-[#0b1222] p-3"><p className="text-[10px] text-slate-500">{k}</p><p className="mt-2 text-xl font-bold text-white">{fmt(v)}</p></div>)}</div><p className="mt-3 text-[10px] leading-5 text-slate-600">Command volume, revenue, VIP counts and advertising performance are not yet exposed by the connected API, so they are intentionally not estimated.</p></div>
  </Layout>
}
