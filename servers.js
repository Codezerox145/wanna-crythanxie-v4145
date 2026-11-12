import { useEffect, useState } from 'react'
import Layout from '../components/Layout'
import { useAuthGuard } from '../lib/useAuthGuard'
import { api } from '../lib/api'

function ServerStatus({ status }) {
  const style = status === 'online' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
  return <span className={'rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ' + style}>{status}</span>
}
export default function Servers() {
  const user = useAuthGuard()
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  async function refresh() { setBusy(true); setError(''); try { setData(await api.servers()) } catch (e) { setError(e.message || 'Could not load server registry.') } finally { setBusy(false) } }
  useEffect(() => { if (user) refresh() }, [user])
  if (!user) return null
  return <Layout title="Server registry">
    <div className="mb-7 flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[.2em] text-indigo-600">Infrastructure</p><h2 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">Server registry</h2><p className="mt-2 max-w-2xl text-sm text-slate-500">Manage visibility for up to 244 server records. Only the current API host is confirmed live; registry entries are not proof of provisioned infrastructure.</p></div><button onClick={refresh} disabled={busy} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold shadow-sm disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900">{busy ? 'Refreshing…' : '↻ Refresh'}</button></div>
    {error && <div role="alert" className="mb-5 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300">{error}</div>}
    <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3"><div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"><p className="text-xs text-slate-500">Registry entries</p><p className="mt-1 text-2xl font-bold">{data?.total ?? '—'} <span className="text-sm font-medium text-slate-400">/ 244</span></p></div><div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"><p className="text-xs text-slate-500">Verified online</p><p className="mt-1 text-2xl font-bold text-emerald-600">{data?.verified ?? '—'}</p></div><div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"><p className="text-xs text-slate-500">Unverified records</p><p className="mt-1 text-2xl font-bold text-amber-600">{data ? data.total - data.verified : '—'}</p></div></div>
    <div className="grid gap-4 lg:grid-cols-2">{(data?.servers || []).map(server => <article key={server.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><h3 className="truncate font-bold">{server.name}</h3><p className="mt-1 text-xs text-slate-500">{server.provider} · {server.region}</p></div><ServerStatus status={server.status} /></div><div className="mt-4 grid grid-cols-2 gap-3 text-xs"><div><p className="text-slate-500">Country / location</p><p className="mt-1 font-semibold">{server.country} · {server.location}</p></div><div><p className="text-slate-500">CPU / RAM</p><p className="mt-1 font-semibold">{server.cpu} · {server.ram}</p></div><div><p className="text-slate-500">Storage</p><p className="mt-1 font-semibold">{server.storage}</p></div><div><p className="text-slate-500">Operating system</p><p className="mt-1 font-semibold">{server.operating_system}</p></div></div><p className="mt-4 border-t border-slate-100 pt-3 text-xs leading-5 text-slate-500 dark:border-slate-800">{server.note}</p></article>)}</div>
    {!data && !error && <div className="rounded-2xl border border-dashed border-slate-300 p-10 text-center text-sm text-slate-500 dark:border-slate-700">Loading server registry…</div>}
    <section className="mt-6 rounded-2xl border border-indigo-100 bg-indigo-50/70 p-5 text-sm leading-6 text-indigo-950 dark:border-indigo-900/50 dark:bg-indigo-950/30 dark:text-indigo-100"><h3 className="font-bold">Adding server records</h3><p className="mt-1">Set <code className="rounded bg-white/70 px-1 py-0.5 dark:bg-slate-900">SERVER_REGISTRY_JSON</code> on the API host to a JSON array of real server metadata. The API accepts up to 243 extra records (244 total including this host). Entries are marked unverified until a separate health-monitoring integration is configured.</p></section>
  </Layout>
}
