import { useState } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import { api, setToken, setUser } from '../lib/api'

const NAME = process.env.NEXT_PUBLIC_BOT_NAME || 'WANNA-CRY THANXIEE'
const AVATAR = process.env.NEXT_PUBLIC_BOT_AVATAR_URL || 'https://raw.githubusercontent.com/Codezerox145/wanna-crythanxie-v4145/main/bot-avatar.jpg'

export default function Login() {
  const router = useRouter()
  const [email,setEmail] = useState('')
  const [password,setPassword] = useState('')
  const [show,setShow] = useState(false)
  const [remember,setRemember] = useState(true)
  const [error,setError] = useState('')
  const [loading,setLoading] = useState(false)
  async function submit(e) {
    e.preventDefault(); setError(''); setLoading(true)
    try {
      const result = await api.login(email.trim(), password)
      setToken(result.token); setUser(result.user)
      await router.replace('/overview')
    } catch(err) { setError(err.message || 'Sign in failed. Please try again.') }
    finally { setLoading(false) }
  }
  return <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#050713] px-4 py-8 text-white">
    <div className="pointer-events-none absolute -left-36 -top-32 h-96 w-96 rounded-full bg-violet-700/20 blur-3xl" /><div className="pointer-events-none absolute -bottom-40 -right-20 h-[30rem] w-[30rem] rounded-full bg-fuchsia-700/15 blur-3xl" />
    <div className="relative grid w-full max-w-[1180px] overflow-hidden rounded-[24px] border border-violet-300/15 bg-[#0b1020]/95 shadow-[0_30px_100px_-35px_rgba(0,0,0,.9)] lg:grid-cols-[1.05fr_.95fr]">
      <aside className="relative hidden min-h-[720px] flex-col justify-between overflow-hidden bg-gradient-to-br from-[#100b2b] via-[#0b1024] to-[#080b18] p-10 lg:flex">
        <div className="pointer-events-none absolute -right-24 top-20 h-80 w-80 rounded-full border-[48px] border-violet-400/[.05]" />
        <div className="relative">
          <div className="mb-14 flex items-center gap-3"><img src={AVATAR} alt="" className="h-14 w-14 rounded-2xl object-cover" /><div><p className="text-lg font-extrabold tracking-wide">{NAME}</p><p className="text-xs font-bold tracking-[.25em] text-violet-400">PREMIUM</p></div><span className="ml-auto rounded-full border border-violet-400/20 bg-violet-500/10 px-3 py-1.5 text-[10px] font-bold text-violet-200">✦ v20.2.2</span></div>
          <p className="text-xs font-bold uppercase tracking-[.22em] text-violet-300">Your control centre</p><h1 className="mt-3 text-4xl font-extrabold leading-tight">Welcome <span className="text-violet-400">Back!</span></h1><p className="mt-4 max-w-sm text-sm leading-7 text-slate-300">Sign in to your account and manage your powerful WhatsApp bot workspace.</p>
          <div className="mt-12 space-y-6">{[['⬡','Secure & Reliable','Your account is protected with encrypted authentication.'],['✦','Powerful Features','Manage connected WhatsApp sessions and bot operations.'],['▤','Live Infrastructure','Monitor the API and connected worker status.'],['◉','Support','Find verified project support and updates.']].map(([icon,title,desc]) => <div key={title} className="flex items-center gap-4"><span className="grid h-12 w-12 place-items-center rounded-2xl border border-violet-400/15 bg-violet-500/10 text-xl text-violet-300">{icon}</span><div><p className="text-sm font-bold text-white">{title}</p><p className="mt-1 text-xs text-slate-400">{desc}</p></div></div>)}</div>
        </div>
        <div className="relative grid grid-cols-3 gap-3 border-t border-white/[.07] pt-6">{[['⬡','Protected sign-in'],['⚡','Live status'],['◎','Mobile ready']].map(([i,t])=><div key={t} className="flex items-center gap-2 text-xs text-slate-400"><span className="text-lg text-violet-300">{i}</span>{t}</div>)}</div>
      </aside>
      <section className="flex min-h-[650px] items-center justify-center p-6 sm:p-10 lg:p-12">
        <div className="w-full max-w-[440px]">
          <div className="mb-8 flex flex-col items-center text-center lg:hidden"><img src={AVATAR} alt={NAME} className="h-20 w-20 rounded-3xl object-cover shadow-xl shadow-violet-950/40" /><p className="mt-3 text-xl font-extrabold">{NAME}</p><p className="text-xs font-bold tracking-[.25em] text-violet-400">PREMIUM</p><h1 className="mt-7 text-3xl font-extrabold">Welcome <span className="text-violet-400">Back!</span></h1><p className="mt-2 text-sm text-slate-400">Sign in to manage your WhatsApp bot.</p></div>
          <div className="mb-8 hidden lg:block"><p className="text-xs font-bold uppercase tracking-[.2em] text-violet-400">Account access</p><h2 className="mt-2 text-3xl font-extrabold">Sign In</h2><p className="mt-2 text-sm text-slate-400">Enter your credentials to continue.</p></div>
          <form onSubmit={submit} className="space-y-5 rounded-2xl border border-white/[.08] bg-white/[.025] p-5 sm:p-7">
            <div><label htmlFor="email" className="text-xs font-semibold text-slate-200">Email Address</label><div className="mt-2 flex items-center gap-3 rounded-xl border border-white/10 bg-[#090e1d] px-3"><span className="text-violet-400">✉</span><input id="email" type="email" autoComplete="username" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="Enter your email" className="h-12 min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-slate-600" /></div></div>
            <div><label htmlFor="password" className="text-xs font-semibold text-slate-200">Password</label><div className="mt-2 flex items-center gap-3 rounded-xl border border-white/10 bg-[#090e1d] px-3"><span className="text-violet-400">♙</span><input id="password" type={show?'text':'password'} autoComplete="current-password" required value={password} onChange={e=>setPassword(e.target.value)} placeholder="Enter your password" className="h-12 min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-slate-600" /><button type="button" onClick={()=>setShow(v=>!v)} className="text-xs font-semibold text-violet-300">{show?'Hide':'Show'}</button></div></div>
            <div className="flex flex-wrap items-center justify-between gap-3 text-xs"><label className="flex cursor-pointer items-center gap-2 text-slate-400"><input type="checkbox" checked={remember} onChange={e=>setRemember(e.target.checked)} className="h-4 w-4 accent-violet-500" />Remember me</label><Link href="/features/help" className="font-semibold text-violet-300 hover:text-violet-200">Forgot password?</Link></div>
            {error && <p role="alert" className="rounded-xl border border-rose-400/20 bg-rose-500/10 p-3 text-xs leading-5 text-rose-200">{error}</p>}
            <button type="submit" disabled={loading} className="flex h-12 w-full items-center justify-center gap-3 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-sm font-bold text-white shadow-lg shadow-violet-950/40 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60">{loading?'Signing in securely…':'Sign In'} <span>→</span></button>
            <div className="flex items-center gap-3 text-[10px] text-slate-600"><span className="h-px flex-1 bg-white/10" />SECURE ACCOUNT ACCESS<span className="h-px flex-1 bg-white/10" /></div>
            <p className="text-center text-xs text-slate-400">Don’t have an account? <Link href="/signup" className="ml-1 font-bold text-violet-300 hover:text-violet-200">Sign Up</Link></p>
          </form>
          <p className="mt-6 text-center text-[10px] text-slate-600">THANXIE DEV · {NAME} · v20.2.2</p>
        </div>
      </section>
    </div>
  </main>
}
