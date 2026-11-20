import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import Layout from '../components/Layout'
import { useAuthGuard } from '../lib/useAuthGuard'
import { api } from '../lib/api'

function Metric({ label, value, note, accent = 'violet' }) {
  const styles = { violet: 'text-violet-300 bg-violet-500/10', green: 'text-emerald-300 bg-emerald-500/10', amber: 'text-amber-300 bg-amber-500/10' }
  return <div className="rounded-2xl border border-white/[.07] bg-[#101729] p-4 sm:p-5"><p className="text-xs text-slate-400">{label}</p><p className="mt-2 text-3xl font-bold tracking-tight text-white">{value}</p><span className={'mt-3 inline-flex rounded-lg px-2.5 py-1 text-[10px] font-semibold ' + styles[accent]}>{note}</span></div>
}

export default function Overview() {
  const user = useAuthGuard()
  const [sessions, setSessions] = useState(null)
  const [health, setHealth] = useState('checking')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const load = useCallback(async () => {
    setBusy(true); setError('')
    const [sessionResult, healthResult] = await Promise.allSettled([api.listSessions(), api.health()])
    if (sessionResult.status === 'fulfilled') setSessions(sessionResult.value.sessions || [])
    else setError(sessionResult.reason?.message || 'Could not load bot sessions.')
    setHealth(healthResult.status === 'fulfilled' ? 'online' : 'offline')
    setBusy(false)
  }, [])
  useEffect(() => { if (!user) return; load(); const timer = setInterval(load, 30000); return () => clearInterval(timer) }, [user, load])
  if (!user) return <Layout title="Overview"><p className="text-sm text-slate-400">Opening workspace…</p></Layout>
  const list = sessions || []
  const online = list.filter(item => item.status === 'online').length
  const pairing = list.filter(item => item.status === 'pairing').length
  return <Layout title="Overview">
    <section className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div><p className="text-[10px] font-bold uppercase tracking-[.2em] text-violet-300">CONTROL CENTRE</p><h2 className="mt-2 text-2xl font-bold text-white sm:text-3xl">Your bot workspace</h2><p className="mt-1 text-sm text-slate-400">Manage WhatsApp connections from one place.</p></div>
      <button onClick={load} disabled={busy} className="rounded-xl border border-white/10 px-4 py-2.5 text-xs font-bold text-slate-200 hover:border-violet-400/40 disabled:opacity-50">{busy ? 'Refreshing…' : 'Refresh status'}</button>
    </section>
    <section className="mb-5 flex flex-col justify-between gap-4 rounded-2xl border border-violet-400/15 bg-gradient-to-r from-[#211347] via-[#171735] to-[#101b31] p-5 sm:flex-row sm:items-center sm:p-6">
      <div><p className="text-[10px] font-bold tracking-[.18em] text-violet-200">WHATSAPP</p><h3 className="mt-2 text-xl font-bold text-white">Connect a device</h3><p className="mt-1 text-sm text-slate-300">Generate a pairing code and link your WhatsApp account.</p></div>
      <Link href="/pair" className="inline-flex items-center justify-center rounded-xl bg-violet-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-violet-500">＋ Generate pairing code</Link>
    </section>
    {error && <div role="alert" className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-400/20 bg-rose-500/10 p-4 text-sm text-rose-200"><span>{error}</span><button onClick={load} className="font-bold underline">Retry</button></div>}
    <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
      <Metric label="Total sessions" value={sessions === null ? '—' : list.length} note="All connections"/>
      <Metric label="Bots online" value={sessions === null ? '—' : online} note="Connected" accent="green"/>
      <Metric label="Pairing" value={sessions === null ? '—' : pairing} note="In progress" accent="amber"/>
    </div>
    <section className="rounded-2xl border border-white/[.07] bg-[#101729] p-4 sm:p-5">
      <div className="mb-4 flex items-center justify-between gap-3"><div><h3 className="text-sm font-bold text-white">Recent sessions</h3><p className="mt-1 text-xs text-slate-500">Your connected WhatsApp devices</p></div><Link href="/sessions" className="text-xs font-bold text-violet-300 hover:text-white">View all →</Link></div>
      {sessions === null ? <p className="py-8 text-center text-sm text-slate-500">Loading sessions…</p> : list.length ? <div className="divide-y divide-white/[.06]">{list.slice(0,5).map(session => <Link key={session.id} href={'/sessions/' + encodeURIComponent(session.id)} className="flex items-center justify-between gap-3 py-3"><div className="flex min-w-0 items-center gap-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-violet-500/10 text-violet-200">▣</span><div className="min-w-0"><p className="truncate text-sm font-semibold text-white">{session.label || '+' + session.phone_number}</p><p className="text-xs text-slate-500">+{session.phone_number || 'Number pending'}</p></div></div><span className={'rounded-full px-2.5 py-1 text-[10px] font-bold capitalize ' + (session.status === 'online' ? 'bg-emerald-500/10 text-emerald-200' : 'bg-amber-500/10 text-amber-200')}>{session.status}</span></Link>)}</div> : <div className="rounded-xl border border-dashed border-white/10 px-4 py-9 text-center"><p className="text-sm font-bold text-white">No devices connected</p><p className="mt-1 text-xs text-slate-500">Connect your first WhatsApp device to get started.</p><Link href="/pair" className="mt-4 inline-flex rounded-lg bg-violet-600 px-4 py-2.5 text-xs font-bold text-white">Connect WhatsApp</Link></div>}
      <div className="mt-4 flex items-center gap-2 border-t border-white/[.06] pt-4 text-xs"><span className={'h-2 w-2 rounded-full ' + (health === 'online' ? 'bg-emerald-400' : health === 'offline' ? 'bg-rose-400' : 'bg-amber-300')}/><span className="text-slate-400">API {health}</span></div>
    </section>
  </Layout>
}
