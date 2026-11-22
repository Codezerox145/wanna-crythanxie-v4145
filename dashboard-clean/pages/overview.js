import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import Layout from '../components/Layout'
import { useAuthGuard } from '../lib/useAuthGuard'
import { api } from '../lib/api'

function Metric({ label, value, note, icon, tone }) {
  const tones = { green:'bg-emerald-50 text-emerald-700', blue:'bg-blue-50 text-blue-700', purple:'bg-violet-50 text-violet-700', amber:'bg-amber-50 text-amber-700' }
  return <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
    <div className="flex items-center justify-between gap-2"><p className="text-xs font-semibold text-slate-500">{label}</p><span className={'grid h-10 w-10 shrink-0 place-items-center rounded-xl text-lg '+tones[tone]}>{icon}</span></div>
    <p className="mt-3 break-words text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">{value}</p><p className="mt-1 text-[10px] text-slate-400">{note}</p>
  </div>
}
function Panel({title,subtitle,action,children}) {
  return <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"><div className="mb-4 flex flex-wrap items-center justify-between gap-2"><div><h3 className="text-sm font-bold text-slate-900">{title}</h3>{subtitle&&<p className="mt-1 text-[11px] text-slate-400">{subtitle}</p>}</div>{action}</div>{children}</section>
}
function count(value) { return Number.isFinite(Number(value)) ? Number(value).toLocaleString() : '—' }

export default function Overview() {
  const user = useAuthGuard()
  const [metrics, setMetrics] = useState(null)
  const [runtime, setRuntime] = useState(null)
  const [busy, setBusy] = useState(false)
  const [available, setAvailable] = useState(true)
  const inFlight = useRef(false)
  const load = useCallback(async (quiet = false) => {
    if (inFlight.current) return
    inFlight.current = true
    if (!quiet) setBusy(true)
    try {
      const result = await api.dashboardMetrics()
      setMetrics(result)
      setAvailable(true)
    } catch (_) {
      setAvailable(false)
    } finally {
      inFlight.current = false
      if (!quiet) setBusy(false)
    }
  }, [])
  const loadRuntime = useCallback(async () => {
    try { setRuntime(await api.runtime()) } catch (_) { setRuntime(null) }
  }, [])
  useEffect(() => {
    if (!user) return
    load()
    loadRuntime()
    const liveTimer = setInterval(() => { if (document.visibilityState === 'visible') load(true) }, 1000)
    const runtimeTimer = setInterval(() => { if (document.visibilityState === 'visible') loadRuntime() }, 30000)
    return () => { clearInterval(liveTimer); clearInterval(runtimeTimer) }
  }, [user, load, loadRuntime])
  const stats = useMemo(() => ({
    users: metrics?.users_total ?? null,
    pairedUsers: metrics?.paired_users ?? null,
    sessions: metrics?.sessions_total ?? null,
    online: metrics?.sessions_online ?? null,
    pairing: metrics?.sessions_pairing ?? null,
    offline: metrics?.sessions_offline ?? null,
    messages: metrics?.messages_total ?? null,
    workers: metrics?.active_workers ?? null
  }), [metrics])
  const total = Number(stats.sessions || 0)
  const onlinePct = total ? Number(stats.online || 0) / total * 100 : 0
  const pairingPct = total ? Number(stats.pairing || 0) / total * 100 : 0
  const sessions = metrics?.my_sessions || []
  const uptime = runtime && Number.isFinite(Number(runtime.uptime_seconds)) ? Math.floor(runtime.uptime_seconds/3600)+'h '+Math.floor(runtime.uptime_seconds%3600/60)+'m' : '—'
  const updated = metrics?.updated_at ? new Date(metrics.updated_at).toLocaleTimeString() : 'Waiting for data'
  return <Layout title="Dashboard">
    <div className="mb-5 flex min-w-0 flex-wrap items-end justify-between gap-3">
      <div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-[.2em] text-emerald-700">WANNA-CRY THANXIEE · CONTROL CENTRE</p><h2 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">Live dashboard</h2><p className="mt-1 text-sm text-slate-500">Real platform activity and connected WhatsApp devices.</p></div>
      <div className="flex items-center gap-2"><span className={'inline-flex items-center gap-2 rounded-full px-3 py-2 text-[10px] font-bold '+(available?'bg-emerald-50 text-emerald-700':'bg-amber-50 text-amber-800')}><span className={'h-2 w-2 rounded-full '+(available?'bg-emerald-500':'bg-amber-500')}/>{available?'Live · 1 sec refresh':'Reconnecting'}</span><button onClick={()=>load()} disabled={busy} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-bold text-slate-700 shadow-sm disabled:opacity-50">{busy?'Updating…':'↻ Refresh'}</button></div>
    </div>
    <section className="relative mb-5 overflow-hidden rounded-2xl bg-gradient-to-r from-[#063b30] via-[#08734f] to-[#10a36a] p-5 text-white shadow-lg shadow-emerald-950/10 sm:p-6">
      <div className="relative z-10 flex min-w-0 flex-col justify-between gap-4 sm:flex-row sm:items-center"><div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-[.2em] text-emerald-100">WHATSAPP BOT · MULTI-SESSION CONTROL</p><h3 className="mt-2 break-words text-2xl font-extrabold tracking-tight sm:text-3xl">WANNA-CRY THANXIEE</h3><p className="mt-2 max-w-lg text-sm text-emerald-50/90">Monitor paired users, WhatsApp sessions and message activity from one workspace.</p><Link href="/pair" className="mt-4 inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-extrabold text-emerald-800 shadow-sm transition hover:bg-emerald-50">Start pairing <span>→</span></Link></div><div className="hidden h-20 w-20 shrink-0 items-center justify-center rounded-3xl border border-white/20 bg-white/10 text-4xl sm:flex">☏</div></div>
    </section>
    {!available && <div role="status" aria-live="polite" className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><div><p className="font-bold">Live information is temporarily unavailable</p><p className="mt-1 text-xs">Your workspace is still available. We are reconnecting automatically.</p></div><button onClick={()=>load()} className="rounded-lg border border-amber-200 bg-white px-3 py-2 text-xs font-bold">Try again</button></div>}
    <div className="mb-5 grid grid-cols-2 gap-3 xl:grid-cols-4">
      <Metric label="Platform users" value={count(stats.users)} note="Real dashboard visitors and users" icon="♙" tone="green"/>
      <Metric label="Paired users" value={count(stats.pairedUsers)} note="Users with an online WhatsApp session" icon="◉" tone="blue"/>
      <Metric label="WhatsApp sessions" value={count(stats.sessions)} note="All registered devices" icon="▣" tone="purple"/>
      <Metric label="Messages handled" value={count(stats.messages)} note="Messages in the live message store" icon="☏" tone="amber"/>
    </div>
    <div className="mb-5 grid min-w-0 gap-4 xl:grid-cols-[.95fr_1.25fr_.95fr]">
      <Panel title="Connection overview" subtitle="Live platform session status">
        {!metrics ? <p className="py-10 text-center text-xs text-slate-400">Waiting for live session data…</p> : <div className="flex min-w-0 flex-wrap items-center justify-center gap-5 py-2">
          <div className="relative grid h-32 w-32 shrink-0 place-items-center rounded-full sm:h-36 sm:w-36" style={{background:total?'conic-gradient(#16a34a 0 '+onlinePct+'%, #2563eb '+onlinePct+'% '+(onlinePct+pairingPct)+'%, #a78bfa '+(onlinePct+pairingPct)+'% 100%)':'#e2e8f0'}}><div className="grid h-24 w-24 place-items-center rounded-full bg-white"><div className="text-center"><p className="text-2xl font-extrabold text-slate-900">{count(stats.sessions)}</p><p className="text-[9px] font-semibold uppercase text-slate-400">Sessions</p></div></div></div>
          <div className="min-w-0 space-y-3 text-xs">{[['Online',stats.online,'bg-emerald-500'],['Pairing',stats.pairing,'bg-blue-500'],['Offline',stats.offline,'bg-violet-400']].map(([name,n,color])=><div key={name} className="flex items-center gap-2"><span className={'h-2.5 w-2.5 shrink-0 rounded-full '+color}/><span className="w-14 text-slate-500">{name}</span><strong className="text-slate-800">{count(n)}</strong></div>)}</div>
        </div>}
      </Panel>
      <Panel title="Your WhatsApp devices" subtitle="Session details belonging to this workspace" action={<Link href="/sessions" className="text-[11px] font-bold text-emerald-700">Manage →</Link>}>
        {!metrics ? <p className="py-8 text-center text-xs text-slate-400">Loading your devices…</p> : sessions.length ? <div className="divide-y divide-slate-100">{sessions.slice(0,6).map(s=><div key={s.id} className="flex min-w-0 items-center justify-between gap-3 py-3"><div className="min-w-0"><p className="truncate text-xs font-bold text-slate-800">{s.label||'+'+s.phone_number}</p><p className="mt-1 text-[10px] text-slate-400">{s.last_seen_at ? new Date(s.last_seen_at).toLocaleString() : 'Activity not reported'}</p></div><span className={'shrink-0 rounded-full px-2.5 py-1 text-[9px] font-bold capitalize '+(s.status==='online'?'bg-emerald-50 text-emerald-700':s.status==='pairing'?'bg-blue-50 text-blue-700':'bg-slate-100 text-slate-600')}>{s.status||'unknown'}</span></div>)}</div> : <div className="py-8 text-center"><p className="text-xs font-semibold text-slate-700">No WhatsApp devices yet</p><p className="mt-1 text-[10px] text-slate-400">Pair your first number to see live activity.</p><Link href="/pair" className="mt-3 inline-flex rounded-lg bg-emerald-700 px-4 py-2 text-xs font-bold text-white">Connect WhatsApp</Link></div>}
      </Panel>
      <Panel title="Quick actions" subtitle="Workspace shortcuts">
        <div className="space-y-2">{[{href:'/pair',icon:'↗',title:'Pair a number',desc:'Connect WhatsApp'},{href:'/sessions',icon:'▣',title:'Manage sessions',desc:'View connected devices'},{href:'/chat',icon:'☏',title:'Chat centre',desc:'Read and reply'},{href:'/users',icon:'⌕',title:'Find users',desc:'Discover community'},{href:'/feedback',icon:'✎',title:'Send feedback',desc:'Share a suggestion'}].map(a=><Link key={a.href} href={a.href} className="flex min-w-0 items-center gap-3 rounded-xl border border-slate-100 p-3 transition hover:border-emerald-200 hover:bg-emerald-50/60"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-emerald-50 text-lg text-emerald-700">{a.icon}</span><span className="min-w-0"><span className="block text-xs font-bold text-slate-800">{a.title}</span><span className="mt-0.5 block text-[10px] text-slate-500">{a.desc}</span></span><span className="ml-auto text-slate-300">›</span></Link>)}</div>
      </Panel>
    </div>
    <div className="grid min-w-0 gap-4 lg:grid-cols-[1.2fr_.8fr]">
      <Panel title="Live connection indicators" subtitle="Actual session counts from the API">
        <div className="space-y-4">{[['Online',stats.online,'bg-emerald-500'],['Pairing',stats.pairing,'bg-blue-500'],['Offline',stats.offline,'bg-violet-400']].map(([label,value,color])=><div key={label}><div className="mb-1.5 flex justify-between gap-3 text-xs"><span className="font-semibold text-slate-600">{label}</span><strong className="text-slate-800">{count(value)}</strong></div><div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className={'h-full rounded-full '+color} style={{width:total?Math.min(100,(Number(value||0)/total)*100)+'%':'0%'}}/></div></div>)}</div>
      </Panel>
      <Panel title="Bot service" subtitle="Backend-reported runtime details">
        <div className="flex items-center gap-3 rounded-xl bg-emerald-50 p-3"><span className={'h-2.5 w-2.5 rounded-full '+(runtime?'bg-emerald-500':'bg-amber-500')}/><div><p className="text-xs font-bold text-slate-800">{runtime?'Runtime information received':'Runtime information unavailable'}</p><p className="mt-1 text-[10px] text-slate-500">No estimated or sample figures are displayed.</p></div></div>
        {runtime&&<div className="mt-3 space-y-2 text-xs">{[['Platform',runtime.platform||runtime.provider||'—'],['Node.js',runtime.node||'—'],['Active workers',runtime.active_workers??runtime.active_bot_processes??'—'],['Process uptime',uptime],['Last data update',updated]].map(([k,v])=><div key={k} className="flex justify-between gap-3 border-b border-slate-100 py-2"><span className="text-slate-500">{k}</span><strong className="break-words text-right text-slate-800">{v}</strong></div>)}</div>}
        <p className="mt-3 text-[10px] text-slate-400">Live platform data refreshes every second while this page is open.</p>
        <Link href="/servers" className="mt-3 inline-flex text-[11px] font-bold text-emerald-700">View server details →</Link>
      </Panel>
    </div>
  </Layout>
}
