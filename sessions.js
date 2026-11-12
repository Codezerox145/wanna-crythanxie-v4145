import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import Layout from '../components/Layout'
import StatusBadge from '../components/StatusBadge'
import { useAuthGuard } from '../lib/useAuthGuard'
import { api } from '../lib/api'

export default function SessionsPage() {
  const user = useAuthGuard()
  const [sessions, setSessions] = useState(null)
  const [error, setError] = useState('')
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async () => {
    setRefreshing(true)
    setError('')
    try {
      const result = await api.listSessions()
      setSessions(Array.isArray(result.sessions) ? result.sessions : [])
    } catch (err) {
      setError(err.message || 'Unable to load sessions.')
    } finally {
      setRefreshing(false)
    }
  }, [])

  useEffect(() => { if (user) load() }, [user, load])
  if (!user) return null

  return (
    <Layout title="WhatsApp sessions">
      <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.2em] text-indigo-600">Device management</p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">Your WhatsApp sessions</h2>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">View pairing status and manage each connected bot.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} disabled={refreshing} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold dark:border-slate-700 dark:bg-slate-900">{refreshing ? 'Refreshing…' : 'Refresh'}</button>
          <Link href="/pair" className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white">＋ Pair a device</Link>
        </div>
      </div>
      {error && <div role="alert" className="mb-5 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300">{error}<button onClick={load} className="ml-3 font-bold underline">Retry</button></div>}
      {sessions === null && !error && <div className="rounded-2xl border border-slate-200 bg-white p-8 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900">Loading your sessions…</div>}
      {sessions && sessions.length === 0 && <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center dark:border-slate-700 dark:bg-slate-900"><div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-indigo-50 text-2xl text-indigo-700 dark:bg-indigo-900/30">⌁</div><h3 className="mt-4 text-lg font-bold">No WhatsApp sessions yet</h3><p className="mt-2 text-sm text-slate-500">Pair your first number to start managing your bot.</p><Link href="/pair" className="mt-5 inline-flex rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white">Connect WhatsApp</Link></div>}
      <div className="grid gap-4 lg:grid-cols-2">
        {sessions?.map(session => (
          <Link key={session.id} href={'/sessions/' + encodeURIComponent(session.id)} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate font-bold">{session.label || '+' + session.phone_number}</p><p className="mt-1 text-xs text-slate-500">+{session.phone_number}</p></div><StatusBadge status={session.status} /></div>
            <div className="mt-5 grid grid-cols-2 gap-3 text-xs"><div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800"><p className="text-slate-500">Region</p><p className="mt-1 font-semibold capitalize">{session.region || 'auto'}</p></div><div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800"><p className="text-slate-500">Last activity</p><p className="mt-1 font-semibold">{session.last_seen_at ? new Date(session.last_seen_at).toLocaleString() : '—'}</p></div></div>
            <p className="mt-4 text-sm font-semibold text-indigo-600">Manage session →</p>
          </Link>
        ))}
      </div>
    </Layout>
  )
}
