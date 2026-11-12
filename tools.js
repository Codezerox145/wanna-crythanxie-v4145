import { useCallback, useEffect, useState } from 'react'
import Layout from '../components/Layout'
import { useAuthGuard } from '../lib/useAuthGuard'
import { api, getApiBase } from '../lib/api'

function Metric({ label, value, detail }) {
  return <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
    <p className="mt-2 text-2xl font-bold tracking-tight">{value ?? '—'}</p>
    {detail && <p className="mt-1 text-xs text-slate-500">{detail}</p>}
  </div>
}

export default function AdvancedTools() {
  const user = useAuthGuard()
  const [health, setHealth] = useState(null)
  const [runtime, setRuntime] = useState(null)
  const [sessions, setSessions] = useState([])
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const refresh = useCallback(async () => {
    if (!user) return
    setBusy(true); setError(''); setMessage('')
    try {
      const [h, r, s] = await Promise.all([api.health(), api.runtime(), api.listSessions()])
      setHealth(h); setRuntime(r); setSessions(s.sessions || [])
      setMessage('Live diagnostics refreshed successfully.')
    } catch (e) { setError(e.message) }
    finally { setBusy(false) }
  }, [user])

  useEffect(() => { refresh() }, [refresh])
  if (!user) return null

  async function copyDiagnostics() {
    const report = {
      apiBase: getApiBase(), health, runtime,
      sessions: sessions.map(s => ({ id: s.id, status: s.status, region: s.region })),
      checkedAt: new Date().toISOString()
    }
    try {
      await navigator.clipboard.writeText(JSON.stringify(report, null, 2))
      setMessage('Sanitized diagnostics copied. No password or access token is included.')
    } catch { setError('Clipboard access was blocked by your browser. Use the visible diagnostics below instead.') }
  }

  const memory = runtime?.memory || {}
  const total = runtime?.total_memory_bytes || 0
  const usedPercent = total ? Math.min(100, Math.round(memory.rss / total * 100)) : 0

  return <Layout title="Advanced tools">
    <div className="space-y-6">
      <section className="rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 p-6 text-white sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div><p className="text-xs font-semibold uppercase tracking-[.2em] text-indigo-200">Operations workspace</p><h2 className="mt-2 text-2xl font-bold">Advanced tools & diagnostics</h2><p className="mt-2 max-w-2xl text-sm text-slate-300">Inspect API health, host resources and connected sessions. Actions below call the live API; unavailable controls are not simulated.</p></div>
          <button onClick={refresh} disabled={busy} className="rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 disabled:opacity-60">{busy ? 'Checking…' : '↻ Refresh diagnostics'}</button>
        </div>
      </section>

      {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">{error}</div>}
      {message && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300">{message}</div>}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Metric label="API status" value={health?.ok ? 'Healthy' : 'Unknown'} detail={health?.service || 'Run diagnostics to check'} />
        <Metric label="Bot workers" value={runtime?.active_bot_processes} detail="Active child processes" />
        <Metric label="CPU cores" value={runtime?.cpu_cores} detail={runtime?.architecture || 'Host architecture'} />
        <Metric label="Sessions online" value={sessions.filter(s => s.status === 'online').length} detail={sessions.length + ' total sessions'} />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between gap-3"><div><h3 className="font-semibold">Host performance</h3><p className="mt-1 text-xs text-slate-500">Live process metrics from the API host</p></div><span className="rounded-full bg-slate-100 px-3 py-1 text-xs dark:bg-slate-800">{runtime?.platform || 'Waiting'}</span></div>
          <div className="mt-5 space-y-4">
            <div><div className="mb-1 flex justify-between text-sm"><span>Process RSS</span><strong>{Math.round((memory.rss || 0) / 1048576)} MB</strong></div><div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"><div className="h-full rounded-full bg-brand-600" style={{ width: usedPercent + '%' }} /></div><p className="mt-1 text-xs text-slate-500">{usedPercent}% of host memory (approximate)</p></div>
            <div className="grid grid-cols-2 gap-3">
              <Metric label="Heap used" value={Math.round((memory.heapUsed || 0) / 1048576) + ' MB'} />
              <Metric label="Heap total" value={Math.round((memory.heapTotal || 0) / 1048576) + ' MB'} />
              <Metric label="Load average" value={(runtime?.load_average || []).join(' / ') || '—'} />
              <Metric label="Uptime" value={runtime ? Math.floor(runtime.uptime_seconds / 3600) + 'h ' + Math.floor(runtime.uptime_seconds % 3600 / 60) + 'm' : '—'} />
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <h3 className="font-semibold">Connection diagnostics</h3><p className="mt-1 text-xs text-slate-500">Use this to investigate sign-in and “Failed to fetch” errors.</p>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex flex-wrap justify-between gap-2 border-b border-slate-100 pb-3 dark:border-slate-800"><dt className="text-slate-500">API base URL</dt><dd className="max-w-[65%] break-all text-right font-medium">{getApiBase() || 'Not configured'}</dd></div>
            <div className="flex justify-between gap-2 border-b border-slate-100 pb-3 dark:border-slate-800"><dt className="text-slate-500">Health endpoint</dt><dd className="font-medium">{health?.ok ? 'Reachable' : 'Not verified'}</dd></div>
            <div className="flex justify-between gap-2 border-b border-slate-100 pb-3 dark:border-slate-800"><dt className="text-slate-500">Dashboard account</dt><dd className="max-w-[65%] break-all text-right font-medium">{user.email}</dd></div>
            <div className="flex justify-between gap-2"><dt className="text-slate-500">Last check</dt><dd className="font-medium">{health ? new Date().toLocaleTimeString() : '—'}</dd></div>
          </dl>
          <button onClick={copyDiagnostics} className="mt-5 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold hover:border-brand-500 dark:border-slate-700">Copy sanitized diagnostics</button>
        </section>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-semibold">Session monitor</h3><p className="mt-1 text-xs text-slate-500">Read-only connection overview from the API.</p></div><span className="text-xs text-slate-500">{sessions.length} registered</span></div>
        <div className="mt-4 divide-y divide-slate-100 dark:divide-slate-800">
          {sessions.map(s => <div key={s.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
            <div className="min-w-0"><p className="truncate text-sm font-semibold">{s.label || s.phone_number}</p><p className="text-xs text-slate-500">{s.phone_number} · {s.region || 'auto'} · <span className="capitalize">{s.status}</span></p></div>
            <span className="rounded-full bg-slate-100 px-3 py-2 text-xs font-semibold capitalize dark:bg-slate-800">{s.status}</span>
          </div>)}
          {!sessions.length && <p className="py-6 text-center text-sm text-slate-500">No sessions available. Connect a session first.</p>}
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div><p className="text-xs font-bold uppercase tracking-[.18em] text-indigo-600">Infrastructure directory</p><h3 className="mt-1 text-lg font-bold">Server & service categories</h3><p className="mt-1 text-sm text-slate-500">Operational roles grouped by responsibility.</p></div>
          <span className="rounded-full bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300">1 configured host</span>
        </div>
        <p className="mt-4 rounded-xl bg-amber-50 p-3 text-xs leading-5 text-amber-800 dark:bg-amber-950/30 dark:text-amber-300">These are logical service categories, not separate physical servers. The current Render deployment runs them on one configured host; region labels do not create additional server instances.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {[
            { title: 'Application & API', detail: runtime?.platform || 'Primary Render web service', status: health?.ok ? 'Operational' : 'Not verified' },
            { title: 'WhatsApp session workers', detail: (runtime?.active_bot_processes ?? 0) + ' active worker process(es)', status: runtime ? 'Live telemetry' : 'Waiting' },
            { title: 'Pairing & device linking', detail: 'International phone-number intake and Baileys pairing-code flow', status: 'Available through API' },
            { title: 'Session & credential storage', detail: 'Per-account session records and isolated auth directories', status: 'Host storage' },
            { title: 'Security & rate controls', detail: 'Command throttling, outbound pacing and permission checks', status: 'Enabled in bot runtime' },
            { title: 'Health & monitoring', detail: 'Health endpoint, uptime, process memory and worker counts', status: health?.ok ? 'Operational' : 'Not verified' },
            { title: 'Background scheduling', detail: 'Scheduled group tasks and in-process scheduler', status: 'Runtime-managed' }
          ].map((item) => <article key={item.title} className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-800/50">
            <div className="flex items-start justify-between gap-2"><h4 className="text-sm font-bold">{item.title}</h4><span className="shrink-0 rounded-full bg-white px-2 py-1 text-[10px] font-semibold text-slate-600 dark:bg-slate-900 dark:text-slate-300">{item.status}</span></div>
            <p className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">{item.detail}</p>
          </article>)}
        </div>
      </section>

      <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 dark:border-amber-900 dark:bg-amber-950/20">
        <h3 className="font-semibold text-amber-900 dark:text-amber-200">Configuration status</h3>
        <p className="mt-2 text-sm text-amber-800 dark:text-amber-300">Command permissions, automation rules, welcome messages, anti-spam thresholds and module toggles require matching backend storage and bot-runtime handlers. This page currently exposes only live diagnostics and read-only monitoring, not simulated settings.</p>
        <p className="mt-2 text-sm text-amber-800 dark:text-amber-300">The current repository still starts a Baileys / WhatsApp Web bot. Your earlier requirement was to use only the official Meta WhatsApp Cloud API and webhooks. Interactive WhatsApp controls must wait until that messaging layer is migrated and verified.</p>
      </section>
    </div>
  </Layout>
}
