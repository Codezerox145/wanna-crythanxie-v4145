import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import Layout from '../components/Layout'
import { useAuthGuard } from '../lib/useAuthGuard'
import { api } from '../lib/api'

function Stat({ label, value, tone = 'violet' }) {
  const tones = { violet: 'bg-violet-500/15 text-violet-200', green: 'bg-emerald-500/15 text-emerald-200', amber: 'bg-amber-500/15 text-amber-200' }
  return <div className="rounded-2xl border border-white/[.08] bg-[#10182b] p-4">
    <p className="text-xs text-slate-400">{label}</p>
    <p className="mt-2 text-2xl font-bold text-white">{value}</p>
    <span className={'mt-3 inline-flex rounded-lg px-2.5 py-1 text-[10px] font-semibold ' + tones[tone]}>{label === 'Bots online' ? 'Connected' : label === 'Pairing' ? 'In progress' : 'Registered'}</span>
  </div>
}

export default function Overview() {
  const user = useAuthGuard()
  const [sessions, setSessions] = useState(null)
  const [health, setHealth] = useState('checking')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    setBusy(true)
    setError('')
    const [sessionResult, healthResult] = await Promise.allSettled([api.listSessions(), api.health()])
    if (sessionResult.status === 'fulfilled') setSessions(sessionResult.value.sessions || [])
    else setError(sessionResult.reason?.message || 'Could not load bot sessions.')
    setHealth(healthResult.status === 'fulfilled' ? 'online' : 'offline')
    setBusy(false)
  }, [])

  useEffect(() => {
    if (!user) return
    load()
    const timer = setInterval(load, 30000)
    return () => clearInterval(timer)
  }, [user, load])

  if (!user) return null
  const list = sessions || []
  const online = list.filter(item => item.status === 'online').length
  const pairing = list.filter(item => item.status === 'pairing').length
  const firstName = user.email?.split('@')[0] || 'there'

  return <Layout title="Dashboard">
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[.2em] text-violet-300">WANNA-CRY THANXIEE · v20.2.2</p>
        <h2 className="mt-2 text-2xl font-bold text-white sm:text-3xl">Welcome, {firstName}</h2>
        <p className="mt-1 text-sm text-slate-400">Your bot workspace at a glance.</p>
      </div>
      <button onClick={load} disabled={busy} className="rounded-xl border border-white/10 px-4 py-2.5 text-xs font-bold text-white hover:border-violet-400/40 disabled:opacity-50">{busy ? 'Refreshing…' : 'Refresh'}</button>
    </div>
    <section className="mb-5 flex flex-col items-start justify-between gap-4 rounded-2xl border border-violet-400/20 bg-gradient-to-r from-[#21104b] via-[#19143d] to-[#101d3a] p-5 sm:flex-row sm:items-center sm:p-6">
      <div>
        <p className="text-xs font-semibold text-violet-200">BOT CONTROL</p>
        <h3 className="mt-2 text-xl font-bold text-white">Manage your WhatsApp bot.</h3>
        <p className="mt-1 text-sm text-indigo-100/70">Pair a device and manage your active sessions.</p>
      </div>
      <Link href="/pair" className="rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-5 py-3 text-sm font-bold text-white">＋ Pair new bot</Link>
    </section>
    {error && <div role="alert" className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-400/20 bg-rose-500/10 p-4 text-sm text-rose-200"><span>{error}</span><button onClick={load} className="font-bold underline">Retry</button></div>}
    <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
      <Stat label="Paired sessions" value={sessions === null ? '—' : list.length} />
      <Stat label="Bots online" value={sessions === null ? '—' : online} tone="green" />
      <Stat label="Pairing" value={sessions === null ? '—' : pairing} tone="amber" />
    </div>
    <section className="rounded-2xl border border-white/[.08] bg-[#10182b] p-4 sm:p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div><h3 className="text-sm font-bold text-white">Your bot sessions</h3><p className="mt-1 text-xs text-slate-500">Live session information</p></div>
        <Link href="/sessions" className="text-xs font-bold text-violet-300 hover:text-white">Manage sessions →</Link>
      </div>
      {sessions === null ? <p className="py-8 text-center text-sm text-slate-500">Loading sessions…</p> : list.length ? <div className="divide-y divide-white/[.06]">
        {list.slice(0, 5).map(session => <Link key={session.id} href={'/sessions/' + encodeURIComponent(session.id)} className="flex items-center justify-between gap-3 py-3">
          <div className="flex min-w-0 items-center gap-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-violet-500/15 text-violet-200">▣</span><div className="min-w-0"><p className="truncate text-sm font-semibold text-white">{session.label || '+' + session.phone_number}</p><p className="text-xs text-slate-500">+{session.phone_number || 'Number pending'}</p></div></div>
          <span className={'rounded-full px-2.5 py-1 text-[10px] font-bold capitalize ' + (session.status === 'online' ? 'bg-emerald-500/10 text-emerald-200' : 'bg-amber-500/10 text-amber-200')}>{session.status}</span>
        </Link>)}
      </div> : <div className="rounded-xl border border-dashed border-white/10 px-4 py-9 text-center"><p className="text-sm font-bold text-white">No bots connected</p><p className="mt-1 text-xs text-slate-500">Pair your first WhatsApp device to get started.</p><Link href="/pair" className="mt-4 inline-flex rounded-lg bg-violet-600 px-4 py-2.5 text-xs font-bold text-white">Connect WhatsApp</Link></div>}
      <div className="mt-4 flex items-center gap-2 border-t border-white/[.06] pt-4 text-xs"><span className={'h-2 w-2 rounded-full ' + (health === 'online' ? 'bg-emerald-400' : health === 'offline' ? 'bg-rose-400' : 'bg-amber-300')} /><span className="text-slate-300">API {health === 'online' ? 'Online' : health === 'offline' ? 'Offline' : 'Checking'}</span></div>
    </section>
  </Layout>
}
