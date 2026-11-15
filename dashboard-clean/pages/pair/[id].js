import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/router'
import Layout from '../../components/Layout'
import { useAuthGuard } from '../../lib/useAuthGuard'
import { api } from '../../lib/api'

const BOT_NAME = process.env.NEXT_PUBLIC_BOT_NAME || 'WANNA-CRY THANXIEE'
const BOT_AVATAR = process.env.NEXT_PUBLIC_BOT_AVATAR_URL || 'https://raw.githubusercontent.com/Codezerox145/wanna-crythanxie-v4145/main/bot-avatar.jpg'
const POLL_MS = 2000

export default function PairingCode() {
  const user = useAuthGuard()
  const router = useRouter()
  const { id } = router.query
  const [session, setSession] = useState(null)
  const [error, setError] = useState('')
  const [refreshing, setRefreshing] = useState(false)
  const refreshLock = useRef(false)

  useEffect(() => {
    if (!user || !id) return
    let alive = true
    let timer
    async function poll() {
      try {
        const data = await api.getSession(id)
        if (!alive) return
        setSession(data)
        setError('')
        if (data.status === 'online') {
          clearInterval(timer)
          setTimeout(() => router.push(`/sessions/${id}`), 900)
        }
      } catch (err) {
        if (alive) setError(err.message || 'Could not check pairing status.')
      }
    }
    poll()
    timer = setInterval(poll, POLL_MS)
    return () => { alive = false; clearInterval(timer) }
  }, [user, id, router])

  async function refreshCode() {
    if (!id || refreshLock.current || refreshing || session?.status === 'online') return
    refreshLock.current = true
    setRefreshing(true)
    setError('')
    try {
      const result = await api.refreshPairingCode(id)
      if (result.session) setSession(result.session)
      else await api.getSession(id).then(setSession)
    } catch (err) {
      setError(err.message || 'Could not refresh the pairing code. Try again shortly.')
    } finally {
      refreshLock.current = false
      setRefreshing(false)
    }
  }

  if (!user) return null
  const code = session?.pairing_code
  const isStarting = !session || ['starting', 'restarting', 'reconnecting'].includes(session.status)

  return (
    <Layout title="Pairing code">
      <div className="mx-auto max-w-md rounded-2xl border border-slate-100 bg-white p-6 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <img src={BOT_AVATAR} alt={BOT_NAME} className="mx-auto mb-3 h-16 w-16 rounded-2xl border border-slate-200 object-cover shadow-sm dark:border-slate-700" />
        <p className="mb-1 text-sm text-slate-400">WhatsApp linking code</p>
        {error && <p role="alert" className="mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-950/30">{error}</p>}
        {session?.error && <p role="alert" className="mb-3 text-sm text-red-500">{session.error}</p>}
        {code ? (
          <>
            <p className="my-4 text-4xl font-bold tracking-[0.3em] text-brand-600">{code}</p>
            <p className="mb-4 text-xs text-slate-400">Enter this code in WhatsApp now. If WhatsApp rejects it or it expires, request a fresh code below.</p>
            <button type="button" onClick={refreshCode} disabled={refreshing || session?.status === 'online'} className="mb-5 w-full rounded-xl border border-brand-600/30 px-4 py-2.5 text-sm font-semibold text-brand-600 disabled:opacity-50">
              {refreshing ? 'Refreshing code…' : 'Get a fresh code'}
            </button>
          </>
        ) : (
          <div className="my-6">
            <p className="text-sm font-semibold text-slate-200">{isStarting ? 'Connecting to WhatsApp…' : 'Waiting for a pairing code…'}</p>
            <p className="mt-2 text-xs text-slate-400">This page updates automatically. You do not need to restart the session.</p>
          </div>
        )}
        {session?.status === 'online' && <p className="mb-4 text-sm font-semibold text-emerald-500">Connected. Opening Bot Management…</p>}
        {session?.status === 'error' && <button type="button" onClick={refreshCode} disabled={refreshing} className="mb-4 w-full rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{refreshing ? 'Retrying…' : 'Retry pairing code'}</button>}
        <div className="space-y-2 rounded-xl bg-slate-50 p-4 text-left text-sm dark:bg-slate-800/50">
          <p className="font-semibold">Link your device</p>
          <ol className="list-inside list-decimal space-y-1 text-slate-500 dark:text-slate-400">
            <li>Open WhatsApp → Settings → Linked Devices.</li>
            <li>Choose Link a Device → Link with phone number instead.</li>
            <li>Enter the code shown above.</li>
          </ol>
          <p className="pt-1 text-xs text-slate-400">Keep this page open until the status changes to Connected.</p>
        </div>
      </div>
    </Layout>
  )
}
