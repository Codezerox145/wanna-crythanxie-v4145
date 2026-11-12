import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Layout from '../../components/Layout'
import StatusBadge from '../../components/StatusBadge'
import { useAuthGuard } from '../../lib/useAuthGuard'
import { api } from '../../lib/api'

const BOT_NAME = process.env.NEXT_PUBLIC_BOT_NAME || 'WANNA-CRY THANXIEE'
const BOT_AVATAR = process.env.NEXT_PUBLIC_BOT_AVATAR_URL || 'https://raw.githubusercontent.com/Codezerox145/wanna-crythanxie-v4145/main/bot-avatar.jpg'
const POLL_MS = 3000
const EXPIRY_SECONDS = 5 * 60

export default function PairingCode() {
  const user = useAuthGuard()
  const router = useRouter()
  const { id } = router.query
  const [session, setSession] = useState(null)
  const [error, setError] = useState('')
  const [secondsLeft, setSecondsLeft] = useState(EXPIRY_SECONDS)

  useEffect(() => {
    if (!user || !id) return
    let timer
    let countdown

    async function poll() {
      try {
        const data = await api.getSession(id)
        setSession(data)
        if (data.status === 'online') {
          clearInterval(timer)
          clearInterval(countdown)
          setTimeout(() => router.push(`/sessions/${id}`), 1200)
        }
      } catch (err) {
        setError(err.message)
      }
    }

    poll()
    timer = setInterval(poll, POLL_MS)
    countdown = setInterval(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000)

    return () => {
      clearInterval(timer)
      clearInterval(countdown)
    }
  }, [user, id, router])

  if (!user) return null

  const code = session?.pairing_code
  const mins = String(Math.floor(secondsLeft / 60)).padStart(2, '0')
  const secs = String(secondsLeft % 60).padStart(2, '0')

  return (
    <Layout title="Pairing code">
      <div className="max-w-md mx-auto rounded-xl2 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-6 text-center">
        <div className="w-14 h-14 mx-auto rounded-full bg-brand-600 text-white flex items-center justify-center text-2xl font-bold mb-3">
          {BOT_NAME.charAt(0)}
        </div>
        <p className="text-sm text-slate-400 mb-1">Your Pairing Code</p>

        {error && <p className="text-sm text-red-500 mb-3">{error}</p>}
        {session?.error && <p className="text-sm text-red-500 mb-3">{session.error}</p>}

        {!session && <p className="text-sm text-slate-400">Requesting code…</p>}

        {session && !code && session.status !== 'online' && (
          <p className="text-sm text-slate-400">Requesting code from WhatsApp…</p>
        )}

        {code && (
          <>
            <p className="text-4xl font-bold tracking-[0.3em] text-brand-600 my-4">{code}</p>
            <p className="text-xs text-slate-400 mb-5">
              Expires in {mins}:{secs}
            </p>
          </>
        )}

        {session?.status === 'online' && (
          <p className="text-brand-600 font-medium text-sm mb-4">✅ Connected! Redirecting…</p>
        )}

        <div className="text-left bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4 text-sm space-y-2">
          <p className="font-medium">How to link your WhatsApp</p>
          <ol className="list-decimal list-inside text-slate-500 dark:text-slate-400 space-y-1">
            <li>Open WhatsApp → Settings → Linked Devices</li>
            <li>Tap "Link a Device" → "Link with phone number instead"</li>
            <li>Enter the 8-digit code above</li>
          </ol>
          <p className="text-xs text-slate-400 pt-1">
            Once connected, your session will appear on the dashboard and be ready to use.
          </p>
        </div>
      </div>
    </Layout>
  )
}
