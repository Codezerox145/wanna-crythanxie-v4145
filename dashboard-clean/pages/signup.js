import { useState } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import { api, setToken, setUser } from '../lib/api'

const BOT_NAME = process.env.NEXT_PUBLIC_BOT_NAME || 'WANNA-CRY THANXIEE'
const BOT_AVATAR = process.env.NEXT_PUBLIC_BOT_AVATAR_URL || 'https://raw.githubusercontent.com/Codezerox145/wanna-crythanxie-v4145/main/bot-avatar.jpg'

export default function Signup() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  async function handleSubmit(e) {
    e.preventDefault(); setError('')
    if (password.length < 8) return setError('Choose a password with at least 8 characters.')
    if (password !== confirm) return setError('Your passwords do not match.')
    setLoading(true)
    try {
      const result = await api.signup(email.trim(), password)
      setToken(result.token); setUser(result.user)
      await router.replace('/overview')
    } catch (err) { setError(err.message || 'Account creation failed. Please try again.') }
    finally { setLoading(false) }
  }
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#080d1d] px-4 py-10">
      <div className="pointer-events-none absolute -left-24 -top-24 h-80 w-80 rounded-full bg-indigo-600/30 blur-3xl" /><div className="pointer-events-none absolute -bottom-32 -right-20 h-96 w-96 rounded-full bg-cyan-500/20 blur-3xl" />
      <section className="relative grid w-full max-w-5xl overflow-hidden rounded-[2rem] border border-white/10 bg-[#0b1020] shadow-[0_30px_100px_-35px_rgba(0,0,0,.85)] lg:grid-cols-[.95fr_1.05fr]">
        <aside className="hidden flex-col justify-between bg-gradient-to-br from-slate-950 via-indigo-950 to-blue-900 p-10 text-white lg:flex"><div><div className="mb-12 flex items-center gap-3"><img src={BOT_AVATAR} alt="" className="h-12 w-12 rounded-2xl object-cover" /><div><p className="font-bold tracking-wide">{BOT_NAME}</p><p className="text-[10px] tracking-[.25em] text-indigo-200">CONTROL CENTER</p></div></div><p className="text-xs font-semibold uppercase tracking-[.24em] text-cyan-200">Built for control</p><h1 className="mt-4 text-4xl font-bold leading-tight">Set up your workspace. Take control.</h1><p className="mt-5 max-w-sm text-sm leading-7 text-slate-300">Create your own account to manage WhatsApp sessions and platform tools in one place.</p></div><p className="text-xs text-slate-400">Your account is created only when you submit this form.</p></aside>
        <div className="p-7 sm:p-10 lg:p-12"><div className="mb-8"><img src={BOT_AVATAR} alt="" className="mb-5 h-12 w-12 rounded-2xl object-cover lg:hidden" /><p className="text-sm font-semibold text-violet-300">GET STARTED</p><h2 className="mt-2 text-3xl font-bold tracking-tight text-white">Create your account</h2><p className="mt-2 text-sm leading-6 text-slate-500">Set up your secure dashboard login in a few steps.</p></div>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div><label htmlFor="email" className="text-sm font-semibold text-slate-200">Email address</label><input id="email" type="email" required autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" className="mt-2 w-full rounded-xl border border-white/10 bg-[#090e1d] px-4 py-3.5 text-sm outline-none transition focus:border-indigo-500 focus:bg-[#10182b] focus:ring-4 focus:ring-indigo-500/10" /></div>
            <div><label htmlFor="password" className="text-sm font-semibold text-slate-700">Create password</label><div className="relative mt-2"><input id="password" type={showPassword ? 'text' : 'password'} required minLength={8} autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} placeholder="At least 8 characters" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 pr-16 text-sm outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10" /><button type="button" onClick={() => setShowPassword(v => !v)} className="absolute inset-y-0 right-4 text-xs font-semibold text-indigo-600">{showPassword ? 'Hide' : 'Show'}</button></div><p className="mt-2 text-xs text-slate-400">Use at least 8 characters.</p></div>
            <div><label htmlFor="confirm" className="text-sm font-semibold text-slate-700">Confirm password</label><input id="confirm" type="password" required autoComplete="new-password" value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Re-enter your password" className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10" /></div>
            {error && <div role="alert" className="rounded-xl border border-rose-400/20 bg-rose-500/10 p-3.5 text-sm leading-6 text-rose-200">{error}</div>}
            <button type="submit" disabled={loading} className="w-full rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 py-3.5 text-sm font-bold text-white shadow-lg shadow-indigo-600/20 transition hover:-translate-y-0.5 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-60">{loading ? 'Creating secure account…' : 'Create account'}</button>
          </form>
          <p className="mt-8 text-center text-sm text-slate-400">Already registered? <Link href="/login" className="font-bold text-indigo-600 hover:text-indigo-800">Sign in</Link></p><p className="mt-8 border-t border-white/10 pt-5 text-center text-[11px] text-slate-400">Secure account creation · No pre-created accounts</p>
        </div>
      </section>
    </main>
  )
}
