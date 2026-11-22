import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { getUser } from '../lib/api'

const BOT_NAME = process.env.NEXT_PUBLIC_BOT_NAME || 'WANNA-CRY THANXIEE'
const AVATAR = process.env.NEXT_PUBLIC_BOT_AVATAR_URL || 'https://raw.githubusercontent.com/Codezerox145/wanna-crythanxie-v4145/main/bot-avatar.jpg'
const NAV = [
  { href: '/overview', label: 'Overview', icon: '⌂' },
  { href: '/sessions', label: 'Bot sessions', icon: '▣' },
  { href: '/settings', label: 'Settings', icon: '⚙' },
  { href: '/owner', label: 'Owner panel', icon: '♛', ownerOnly: true }
]

export default function Layout({ children, title }) {
  const router = useRouter()
  const [user, setUser] = useState(null)
  useEffect(() => { setUser(getUser()) }, [])
  const visibleNav = NAV.filter(item => !item.ownerOnly || user?.is_owner)
  const active = href => router.pathname === href || router.pathname.startsWith(href + '/')
  return <div className="min-h-screen bg-[#080b16] text-slate-100 md:flex">
    <aside className="hidden w-60 shrink-0 flex-col border-r border-white/[.07] bg-[#0b1020] p-5 md:flex">
      <Link href="/overview" className="mb-9 flex items-center gap-3">
        <img src={AVATAR} alt="" className="h-10 w-10 rounded-xl object-cover" onError={e => { e.currentTarget.style.visibility = 'hidden' }} />
        <span className="min-w-0"><span className="block truncate text-xs font-extrabold tracking-wide text-white">{BOT_NAME}</span><span className="mt-1 block text-[9px] font-bold tracking-[.2em] text-violet-300">BOT DASHBOARD</span></span>
      </Link>
      <p className="mb-3 px-2 text-[10px] font-bold uppercase tracking-[.18em] text-slate-500">Workspace</p>
      <nav className="space-y-1">{visibleNav.map(item => <Link key={item.href} href={item.href} className={'flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition ' + (active(item.href) ? 'bg-violet-600 text-white' : 'text-slate-400 hover:bg-white/[.05] hover:text-white')}><span className="w-5 text-center text-base">{item.icon}</span>{item.label}</Link>)}</nav>
      <div className="mt-auto rounded-xl border border-white/[.07] bg-white/[.03] p-3"><div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-emerald-400"/><span className="text-xs font-semibold text-slate-300">Open dashboard</span></div><p className="mt-1 text-[10px] text-slate-500">No account required</p></div>
    </aside>
    <div className="min-w-0 flex-1">
      <header className="sticky top-0 z-30 border-b border-white/[.07] bg-[#0b1020]/95 px-4 py-3 backdrop-blur sm:px-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3 md:hidden"><img src={AVATAR} alt="" className="h-9 w-9 rounded-xl object-cover" /><div className="min-w-0"><p className="truncate text-xs font-extrabold text-white">{BOT_NAME}</p><p className="text-[9px] font-bold tracking-[.18em] text-violet-300">BOT DASHBOARD</p></div></div>
          <div className="hidden md:block"><p className="text-[10px] font-bold uppercase tracking-[.18em] text-violet-300">Workspace</p><h1 className="mt-0.5 text-base font-bold text-white">{title || 'Overview'}</h1></div>
        </div>
        <nav className="mt-3 flex gap-1 overflow-x-auto md:hidden">{visibleNav.map(item => <Link key={item.href} href={item.href} className={'shrink-0 rounded-lg px-3 py-2 text-xs font-semibold ' + (active(item.href) ? 'bg-violet-600 text-white' : 'text-slate-400 hover:bg-white/5')}><span className="mr-1.5">{item.icon}</span>{item.label}</Link>)}</nav>
      </header>
      <main className="mx-auto min-h-[calc(100vh-110px)] w-full max-w-7xl px-4 py-5 sm:px-6 sm:py-7 lg:px-8">{children}</main>
      <footer className="border-t border-white/[.06] px-6 py-4 text-center text-[10px] text-slate-600">© {new Date().getFullYear()} {BOT_NAME} · THANXIE DEV</footer>
    </div>
  </div>
}
