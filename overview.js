import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import Layout from '../components/Layout'
import StatCard from '../components/StatCard'
import StatusBadge from '../components/StatusBadge'
import { useAuthGuard } from '../lib/useAuthGuard'
import { api } from '../lib/api'

export default function Overview() {
  const user = useAuthGuard()
  const [sessions, setSessions] = useState(null)
  const [error, setError] = useState('')
  const [runtime, setRuntime] = useState(null)
  const [analytics, setAnalytics] = useState(null)
  const [apiHealth, setApiHealth] = useState('checking')
  const [refreshing, setRefreshing] = useState(false)

  const loadDashboard = useCallback(async () => {
    setRefreshing(true)
    setError('')
    setApiHealth('checking')
    const results = await Promise.allSettled([api.listSessions(), api.runtime(), api.health(), api.analytics()])
    if (results[0].status === 'fulfilled') setSessions(results[0].value.sessions || [])
    else setError(results[0].reason?.message || 'Could not load your sessions.')
    if (results[1].status === 'fulfilled') setRuntime(results[1].value)
    if (results[3].status === 'fulfilled') setAnalytics(results[3].value)
    if (results[2].status === 'fulfilled') setApiHealth('online')
    else setApiHealth('offline')
    setRefreshing(false)
  }, [])

  useEffect(() => { if (!user) return; loadDashboard(); const timer = setInterval(loadDashboard, 30000); return () => clearInterval(timer) }, [user, loadDashboard])
  if (!user) return null

  const total = sessions?.length || 0
  const online = sessions?.filter(s => s.status === 'online').length || 0
  const pairing = sessions?.filter(s => s.status === 'pairing').length || 0
  const offline = sessions === null ? 0 : total - online - pairing

  return (
    <Layout title="Overview">
      <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div><p className="text-xs font-bold uppercase tracking-[.2em] text-indigo-600">Command overview</p><h2 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">Your workspace at a glance</h2><p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Monitor your WhatsApp sessions and platform health.</p></div>
        <button onClick={loadDashboard} disabled={refreshing} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-indigo-300 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">{refreshing ? 'Refreshing…' : '↻ Refresh data'}</button>
      </div>

      <section className="relative mb-6 overflow-hidden rounded-[1.7rem] bg-gradient-to-br from-[#0a1023] via-indigo-950 to-blue-800 p-6 text-white shadow-xl shadow-indigo-950/10 sm:p-8">
        <div className="pointer-events-none absolute -right-10 -top-24 h-72 w-72 rounded-full border-[42px] border-white/5" /><div className="pointer-events-none absolute bottom-[-7rem] right-36 h-56 w-56 rounded-full bg-cyan-400/10 blur-3xl" />
        <div className="relative flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
          <div className="max-w-xl"><p className="text-xs font-bold uppercase tracking-[.22em] text-cyan-200">Ready when you are</p><h3 className="mt-3 text-2xl font-bold leading-tight sm:text-3xl">Bring your WhatsApp workspace together.</h3><p className="mt-2 text-sm leading-6 text-indigo-100/75">Pair a number, track connection health and manage your bot sessions from one place.</p></div>
          <Link href="/pair" className="shrink-0 rounded-xl bg-white px-5 py-3 text-sm font-bold text-indigo-800 shadow-lg transition hover:-translate-y-0.5 hover:bg-indigo-50">＋ Connect WhatsApp</Link>
        </div>
      </section>

      {error && <div role="alert" className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300"><span>{error}</span><button onClick={loadDashboard} className="font-bold underline">Try again</button></div>}

      <div className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard label="Total sessions" value={sessions === null ? '—' : total} icon="▣" tint="brand" />
        <StatCard label="Online" value={sessions === null ? '—' : online} icon="●" tint="blue" />
        <StatCard label="Offline" value={sessions === null ? '—' : offline} icon="○" tint="purple" />
        <StatCard label="Pairing" value={sessions === null ? '—' : pairing} icon="⌁" tint="pink" />
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Commands today" value={analytics ? analytics.commands_today : '—'} icon="⚡" tint="brand" />
        <StatCard label="Commands this week" value={analytics ? analytics.commands_week : '—'} icon="↗" tint="blue" />
        <StatCard label="Paired users" value={analytics ? analytics.paired_users : '—'} icon="◉" tint="purple" />
        <StatCard label="Configured servers" value={runtime ? runtime.configured_server_count : '—'} icon="▤" tint="pink" />
      </div>
      <section className="mb-6 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[.18em] text-indigo-600">Usage analytics</p><h3 className="mt-1 text-lg font-bold">Command activity · last 7 days</h3><p className="mt-1 text-xs text-slate-500">Based on commands received by connected bot workers.</p></div><span className="rounded-lg bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300">{analytics?.scope === 'platform' ? 'Platform view' : 'Account view'}</span></div>
        <div className="mt-5 grid grid-cols-7 items-end gap-2">{(analytics?.daily_commands || []).map(d => { const max = Math.max(1, ...(analytics?.daily_commands || []).map(x => x.count)); const height = Math.max(5, Math.round(d.count / max * 100)); return <div key={d.date} className="flex min-w-0 flex-col items-center gap-2"><span className="text-[10px] font-semibold tabular-nums text-slate-500">{d.count}</span><div className="flex h-24 w-full items-end rounded-lg bg-slate-100 p-1 dark:bg-slate-800"><div className="w-full rounded-md bg-gradient-to-t from-indigo-700 to-cyan-400" style={{height: height + '%'}} /></div><span className="text-[10px] text-slate-500">{d.label}</span></div> })}</div>
        <p className="mt-4 text-xs text-slate-500">{analytics?.note || 'Analytics will appear when the API is reachable.'} Revenue and advertising metrics are not reported until payment and advertising integrations are configured.</p>
      </section>

      <div className="mb-6 grid gap-5 xl:grid-cols-[1.5fr_1fr]">
        <section className="min-w-0 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
          <div className="mb-5 flex items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[.18em] text-indigo-600">Your devices</p><h3 className="mt-1 text-lg font-bold">WhatsApp sessions</h3></div><Link href="/sessions" className="text-xs font-bold text-indigo-600 hover:text-indigo-800">View all →</Link></div>
          {sessions === null && <div className="space-y-3"><div className="h-14 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" /><div className="h-14 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" /></div>}
          {sessions?.length === 0 && <div className="rounded-xl border border-dashed border-slate-300 px-4 py-9 text-center dark:border-slate-700"><div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-indigo-50 text-xl text-indigo-600 dark:bg-indigo-900/30">⌁</div><p className="mt-3 font-semibold">No sessions connected yet</p><p className="mt-1 text-sm text-slate-500">Connect your first WhatsApp number to get started.</p><Link href="/pair" className="mt-4 inline-flex rounded-lg bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white">Start pairing</Link></div>}
          <div className="divide-y divide-slate-100 dark:divide-slate-800">{sessions?.slice(0, 5).map(s => <Link key={s.id} href={`/sessions/${s.id}`} className="flex min-w-0 items-center justify-between gap-3 rounded-lg px-2 py-3 transition hover:bg-slate-50 dark:hover:bg-slate-800/60"><div className="flex min-w-0 items-center gap-3"><div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300">▣</div><div className="min-w-0"><p className="truncate text-sm font-semibold">{s.label || s.phone_number}</p><p className="truncate text-xs text-slate-500">{s.phone_number}</p></div></div><StatusBadge status={s.status} /></Link>)}</div>
        </section>

        <section className="min-w-0 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
          <p className="text-xs font-bold uppercase tracking-[.18em] text-indigo-600">Infrastructure</p><h3 className="mt-1 text-lg font-bold">API status</h3>
          <div className={'mt-5 flex items-center gap-3 rounded-xl p-4 ' + (apiHealth === 'online' ? 'bg-emerald-50 dark:bg-emerald-900/20' : apiHealth === 'offline' ? 'bg-rose-50 dark:bg-rose-900/20' : 'bg-amber-50 dark:bg-amber-900/20')}><span className={'h-2.5 w-2.5 rounded-full ' + (apiHealth === 'online' ? 'bg-emerald-500' : apiHealth === 'offline' ? 'bg-rose-500' : 'bg-amber-500')} /><div><p className={'text-sm font-bold ' + (apiHealth === 'online' ? 'text-emerald-800 dark:text-emerald-300' : apiHealth === 'offline' ? 'text-rose-800 dark:text-rose-300' : 'text-amber-800 dark:text-amber-300')}>{apiHealth === 'online' ? 'Operational' : apiHealth === 'offline' ? 'Unavailable' : 'Checking connection'}</p><p className="text-xs text-slate-600 dark:text-slate-300">{runtime ? runtime.platform + ' · ' + runtime.node : apiHealth === 'offline' ? 'Health check failed. Check the Render service.' : 'Waiting for API health check'}</p></div></div>
          {runtime && <div className="mt-4 grid grid-cols-2 gap-3"><div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800"><p className="text-xs text-slate-500">API uptime</p><p className="mt-1 text-lg font-bold">{Math.floor(runtime.uptime_seconds / 3600)}h {Math.floor(runtime.uptime_seconds % 3600 / 60)}m</p></div><div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800"><p className="text-xs text-slate-500">Active workers</p><p className="mt-1 text-lg font-bold">{runtime.active_bot_processes}</p></div></div>}
          <p className="mt-4 text-xs leading-5 text-slate-500">{runtime?.note || 'Runtime information appears when the API is reachable.'}</p>
        </section>
      </div>
    </Layout>
  )
}
