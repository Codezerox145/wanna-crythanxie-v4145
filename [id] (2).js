import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Layout from '../../components/Layout'
import StatusBadge from '../../components/StatusBadge'
import { useAuthGuard } from '../../lib/useAuthGuard'
import { api } from '../../lib/api'

function fmt(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleString()
}

export default function SessionDetail() {
  const user = useAuthGuard()
  const router = useRouter()
  const { id } = router.query
  const [session, setSession] = useState(null)
  const [error, setError] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [restarting, setRestarting] = useState(false)

  useEffect(() => {
    if (!user || !id) return
    api
      .getSession(id)
      .then(setSession)
      .catch((e) => setError(e.message))
  }, [user, id])

  if (!user) return null

  async function handleRestart() {
    setError(''); setRestarting(true)
    try { await api.restartSession(id); setSession(await api.getSession(id)) }
    catch (err) { setError(err.message) }
    finally { setRestarting(false) }
  }

  async function handleUnlink() {
    if (!confirm('Unlink this WhatsApp session? You will need to pair again to reconnect.')) return
    setDeleting(true)
    try {
      await api.deleteSession(id)
      router.push('/overview')
    } catch (err) {
      setError(err.message)
      setDeleting(false)
    }
  }

  return (
    <Layout title="Session">
      <div className="max-w-md mx-auto rounded-xl2 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-6">
        {!session && !error && <p className="text-sm text-slate-400">Loading…</p>}
        {error && <p className="text-sm text-red-500">{error}</p>}

        {session && (
          <>
            <div className="flex items-center justify-between mb-5">
              <div>
                <p className="font-semibold">{session.label || session.phone_number}</p>
                <p className="text-xs text-slate-400">Session ID: {session.id}</p>
              </div>
              <StatusBadge status={session.status} />
            </div>

            <dl className="space-y-3 text-sm mb-6">
              <div className="flex justify-between">
                <dt className="text-slate-400">WhatsApp number</dt>
                <dd className="font-medium">+{session.phone_number}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-400">Region</dt>
                <dd className="font-medium capitalize">{session.region}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-400">Connected since</dt>
                <dd className="font-medium">{fmt(session.connected_at)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-400">Last seen</dt>
                <dd className="font-medium">{fmt(session.last_seen_at)}</dd>
              </div>
            </dl>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button onClick={handleRestart} disabled={restarting || deleting} className="w-full bg-brand-600 hover:bg-brand-700 text-white rounded-lg py-2.5 text-sm font-medium transition disabled:opacity-60">
              {restarting ? 'Restarting…' : '↻ Restart bot'}
            </button>
            <button
              onClick={handleUnlink}
              disabled={deleting}
              className="w-full border border-red-200 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg py-2.5 text-sm font-medium transition disabled:opacity-60"
            >
              {deleting ? 'Unlinking…' : '🗑 Unlink session'}
            </button>
            </div>
          </>
        )}
      </div>
    </Layout>
  )
}
