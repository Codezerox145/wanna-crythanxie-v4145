import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import Layout from '../components/Layout'
import { useAuthGuard } from '../lib/useAuthGuard'
import { api } from '../lib/api'

function Metric({ label, value, note, icon, tone }) {
  const tones = {
    green: 'bg-emerald-50 text-emerald-700',
    blue: 'bg-blue-50 text-blue-700',
    purple: 'bg-violet-50 text-violet-700',
    pink: 'bg-pink-50 text-pink-700'
  }
  return <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-5">
    <div className="flex items-center justify-between gap-2"><p className="text-xs font-medium text-slate-500">{label}</p><span className={'grid h-9 w-9 place-items-center rounded-xl text-lg ' + tones[tone]}>{icon}</span></div>
    <p className="mt-3 text-3xl font-bold tracking-tight text-slate-900">{value}</p>
    <p className="mt-1 text-[11px] text-slate-500">{note}</p>
  </div>
}

export default function Overview() {
  const user = useAuthGuard()
  const [sessions, setSessions] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const load = useCallback(async () => {
    setBusy(true)
    setError('')
    try {
      const result = await api.listSessions()
      setSessions(Array.isArray(result.sessions) ? result.sessions : [])
    } catch (err) {
      setError(err.message || 'Could not load WhatsApp sessions. Please try again.')
    } finally { setBusy(false) }
  }, [])
  useEffect(() => { if (!user) return; load(); const timer = setInterval(load, 30000); return () => clearInterval(timer) }, [user, load])
  const stats = useMemo(() => {
    const rows = sessions || []
    return {
      total: rows.length,
      online: rows.filter(s => s.status === 'online').length,
      pairing: rows.filter(s => s.status === 'pairing' || s.status === 'starting' || s.status === 'reconnecting').length,
      offline: rows.filter(s => !['online','pairing','starting','reconnecting'].includes(s.status)).length
    }
  }, [sessions])
  const pct = n => stats.total ? Math.round(n / stats.total * 100) : 0
  if (user === undefined) return <Layout title="Dashboard"><p className="text-sm text-slate-500">Opening your workspace…</p></Layout>
  return <Layout title="Dashboard">
    <section className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div><p className="text-[10px] font-bold uppercase tracking-[.2em] text-emerald-700">BOT CONTROL CENTRE</p><h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Good day, {user?.is_owner ? 'Admin' : 'Guest'} <span aria-hidden="true">👋</span></h2><p className="mt-1 text-sm text-slate-500">Your WhatsApp bot workspace at a glance.</p></div>
      <button onClick={load} disabled={busy} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 shadow-sm hover:border-emerald-400 disabled:opacity-50">{busy ? 'Refreshing…' : '↻ Refresh data'}</button>
    </section>
    <section className="mb-5 flex flex-col items-start justify-between gap-4 overflow-hidden rounded-2xl bg-gradient-to-r from-[#073b30] via-[#075b43] to-[#087d50] p-5 text-white shadow-sm sm:flex-row sm:items-center sm:p-6">
      <div className="max-w-xl"><p className="text-[10px] font-bold uppercase tracking-[.2em] text-emerald-200">WHATSAPP CONNECTION</p><h3 className="mt-2 text-xl font-bold sm:text-2xl">Connect a WhatsApp number</h3><p className="mt-1 text-sm text-emerald-50/80">Create a bot session and get a pairing code to link your device.</p><Link href="/pair" className="mt-4 inline-flex items-center gap-2 rounded-xl bg-emerald-400 px-5 py-3 text-sm font-bold text-emerald-950 shadow-sm transition hover:bg-emerald-300">↗ Start pairing <span>→</span></Link></div>
      <div className="hidden h-24 w-24 shrink-0 items-center justify-center rounded-3xl border border-white/20 bg-white/10 text-5xl sm:flex">☏</div>
    </section>
    {error && <div role="alert" aria-live="polite" className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800"><div><p className="font-bold">Dashboard data unavailable</p><p className="mt-1">{error}</p><p className="mt-1 text-xs text-rose-700">Your sessions have not been changed. Please retry.</p></div><button onClick={load} className="rounded-lg bg-rose-100 px-3 py-2 text-xs font-bold text-rose-800">Retry</button></div>}
    <div className="mb-5 grid grid-cols-2 gap-3 xl:grid-cols-4">
      <Metric label="Total sessions" value={sessions === null ? '—' : stats.total} note="All WhatsApp connections" icon="▣" tone="green"/>
      <Metric label="Online" value={sessions === null ? '—' : stats.online} note="Connected and running" icon="◉" tone="blue"/>
      <Metric label="Offline" value={sessions === null ? '—' : stats.offline} note="Not currently connected" icon="◌" tone="purple"/>
      <Metric label="Pairing" value={sessions === null ? '—' : stats.pairing} note="Connection in progress" icon="↗" tone="pink"/>
    </div>
    <div className="grid gap-5 xl:grid-cols-[1.05fr_1.2fr_1fr]">
      <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
        <h3 className="text-sm font-bold text-slate-900">Session overview</h3><p className="mt-1 text-xs text-slate-500">Current connection status</p>
        {sessions === null ? <p className="py-10 text-center text-sm text-slate-400">Loading session data…</p> : <div className="mt-5 flex flex-wrap items-center justify-center gap-5">
          <div className="relative grid h-36 w-36 shrink-0 place-items-center rounded-full" style={{background: stats.total ? 'conic-gradient(#16a34a 0% '+pct(stats.online)+'%, #2563eb '+pct(stats.online)+'% '+(pct(stats.online)+pct(stats.pairing))+'%, #a78bfa '+(pct(stats.online)+pct(stats.pairing))+'% 100%)' : '#e2e8f0'}}>
            <div className="grid h-24 w-24 place-items-center rounded-full bg-white"><div className="text-center"><p className="text-2xl font-bold text-slate-900">{stats.total}</p><p className="text-[10px] text-slate-500">Total</p></div></div>
          </div>
          <div className="space-y-3 text-xs">{[['Online',stats.online,'#16a34a'],['Pairing',stats.pairing,'#2563eb'],['Offline',stats.offline,'#a78bfa']].map(([label,value,color])=><div key={label} className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{background:color}}/><span className="text-slate-600">{label}</span><strong className="ml-auto text-slate-900">{value}</strong></div>)}</div>
        </div>}
      </section>
      <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-3"><div><h3 className="text-sm font-bold text-slate-900">Session activity</h3><p className="mt-1 text-xs text-slate-500">Latest updates reported by your bot</p></div><Link href="/sessions" className="text-xs font-bold text-emerald-700 hover:text-emerald-900">View all →</Link></div>
        {sessions === null ? <p className="py-8 text-center text-sm text-slate-400">Loading…</p> : sessions.length ? <div className="space-y-3">{sessions.slice(0,4).map(s=><div key={s.id} className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3 last:border-0"><div className="min-w-0"><p className="truncate text-xs font-semibold text-slate-800">{s.label || '+'+s.phone_number}</p><p className="mt-1 text-[10px] text-slate-500">{s.last_seen_at ? new Date(s.last_seen_at).toLocaleString() : 'No activity timestamp supplied'}</p></div><span className={'shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold capitalize '+(s.status==='online'?'bg-emerald-50 text-emerald-700':s.status==='pairing'?'bg-blue-50 text-blue-700':'bg-slate-100 text-slate-600')}>{s.status || 'unknown'}</span></div>)}</div> : <div className="py-8 text-center"><p className="text-sm font-semibold text-slate-800">No sessions yet</p><p className="mt-1 text-xs text-slate-500">Start by pairing your WhatsApp number.</p><Link href="/pair" className="mt-3 inline-flex rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white">Start pairing</Link></div>}
      </section>
      <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
        <h3 className="text-sm font-bold text-slate-900">Quick actions</h3><p className="mt-1 text-xs text-slate-500">Common bot controls</p>
        <div className="mt-4 space-y-2">{[{href:'/pair',icon:'↗',title:'Pair a WhatsApp number',desc:'Connect a new device'},{href:'/sessions',icon:'▣',title:'Manage sessions',desc:'View, restart or disconnect'},{href:'/chat',icon:'☏',title:'Chat centre',desc:'Open available conversations'},{href:'/settings',icon:'⚙',title:'Bot settings',desc:'Runtime and preferences'}].map(a=><Link key={a.href} href={a.href} className="flex items-center gap-3 rounded-xl border border-slate-100 p-3 transition hover:border-emerald-200 hover:bg-emerald-50/50"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-emerald-50 text-lg text-emerald-700">{a.icon}</span><span className="min-w-0"><span className="block text-xs font-semibold text-slate-800">{a.title}</span><span className="mt-0.5 block text-[10px] text-slate-500">{a.desc}</span></span><span className="ml-auto text-slate-400">›</span></Link>)}</div>
      </section>
    </div>
  </Layout>
}
