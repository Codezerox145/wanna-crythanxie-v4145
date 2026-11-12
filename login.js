import { useState } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import { api, setToken, setUser } from '../lib/api'

const BOT_NAME = process.env.NEXT_PUBLIC_BOT_NAME || 'WANNA-CRY THANXIEE'

export default function Login() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  async function handleSubmit(e) {
    e.preventDefault(); setError(''); setLoading(true)
    try {
      const result = await api.login(email.trim(), password)
      setToken(result.token); setUser(result.user)
      await router.replace('/overview')
    } catch (err) { setError(err.message || 'Sign in failed. Please try again.') }
    finally { setLoading(false) }
  }
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#080d1d] px-4 py-10 text-slate-900">
      <div className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-indigo-600/30 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -right-24 h-[30rem] w-[30rem] rounded-full bg-cyan-500/20 blur-3xl" />
      <section className="relative grid w-full max-w-5xl overflow-hidden rounded-[2rem] border border-white/10 bg-white shadow-[0_30px_100px_-35px_rgba(0,0,0,.65)] lg:grid-cols-[1.05fr_.95fr]">
        <aside className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-slate-950 via-indigo-950 to-blue-900 p-10 text-white lg:flex">
          <div className="absolute -right-24 top-24 h-72 w-72 rounded-full border-[42px] border-white/5" />
          <div className="relative"><div className="mb-12 flex items-center gap-3"><div className="grid h-12 w-12 place-items-center rounded-2xl border border-white/15 bg-white/10 text-xl font-black">W</div><div><p className="font-bold tracking-wide">{BOT_NAME}</p><p className="text-[10px] tracking-[.25em] text-indigo-200">CONTROL CENTER</p></div></div><p className="text-xs font-semibold uppercase tracking-[.24em] text-cyan-200">Your operations, in control</p><h1 className="mt-4 max-w-md text-4xl font-bold leading-tight">A smarter way to manage your WhatsApp platform.</h1><p className="mt-5 max-w-sm text-sm leading-7 text-slate-300">Connect sessions, monitor activity and manage your bot tools from one secure workspace.</p></div>
          <div className="relative grid grid-cols-2 gap-3"><div className="rounded-2xl border border-white/10 bg-white/5 p-4"><p className="text-2xl font-bold">01</p><p className="mt-1 text-xs text-slate-300">Secure workspace</p></div><div className="rounded-2xl border border-white/10 bg-white/5 p-4"><p className="text-2xl font-bold">24/7</p><p className="mt-1 text-xs text-slate-300">Session visibility</p></div></div>
        </aside>
        <div className="p-7 sm:p-10 lg:p-12">
          <div className="mb-10 lg:hidden"><div className="mb-5 grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-indigo-700 to-blue-500 text-xl font-black text-white">W</div><p className="text-xs font-bold uppercase tracking-[.2em] text-indigo-600">Control center</p></div>
          <div className="mb-8"><p className="text-sm font-semibold text-indigo-600">WELCOME BACK</p><h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">Sign in to your account</h2><p className="mt-2 text-sm leading-6 text-slate-500">Enter your dashboard credentials to continue.</p></div>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div><label htmlFor="email" className="text-sm font-semibold text-slate-700">Email address</label><input id="email" type="email" autoComplete="username" required value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10" /></div>
            <div><div className="flex items-center justify-between gap-3"><label htmlFor="password" className="text-sm font-semibold text-slate-700">Password</label><span className="text-xs text-slate-400">Keep it private</span></div><div className="relative mt-2"><input id="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" required value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter your password" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 pr-16 text-sm outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10" /><button type="button" onClick={() => setShowPassword(v => !v)} className="absolute inset-y-0 right-4 text-xs font-semibold text-indigo-600">{showPassword ? 'Hide' : 'Show'}</button></div></div>
            {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-sm leading-6 text-rose-700">{error}</div>}
            <button type="submit" disabled={loading} className="w-full rounded-xl bg-gradient-to-r from-indigo-700 to-blue-600 py-3.5 text-sm font-bold text-white shadow-lg shadow-indigo-600/20 transition hover:-translate-y-0.5 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-60">{loading ? 'Connecting securely…' : 'Sign in to dashboard'}</button>
          </form>
          <p className="mt-8 text-center text-sm text-slate-500">New to the platform? <Link href="/signup" className="font-bold text-indigo-600 hover:text-indigo-800">Create an account</Link></p>
          <p className="mt-8 border-t border-slate-100 pt-5 text-center text-[11px] text-slate-400">Protected dashboard · Secure API authentication</p>
        </div>
      </section>
    </main>
  )
}
