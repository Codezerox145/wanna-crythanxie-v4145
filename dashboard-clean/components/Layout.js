import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { getUser } from '../lib/api'

const BOT_NAME = process.env.NEXT_PUBLIC_BOT_NAME || 'WANNA-CRY THANXIEE'
const AVATAR = process.env.NEXT_PUBLIC_BOT_AVATAR_URL || 'https://raw.githubusercontent.com/Codezerox145/wanna-crythanxie-v4145/main/bot-avatar.jpg'
const NAV = [
  { href: '/overview', label: 'Dashboard', icon: '⌂' },
  { href: '/sessions', label: 'Sessions', icon: '▣' },
  { href: '/pair', label: 'Pairing', icon: '↗' },
  { href: '/chat', label: 'Chat centre', icon: '☏' },
  { href: '/users', label: 'Find users', icon: '⌕' },
  { href: '/feedback', label: 'Feedback', icon: '✎' },
  { href: '/rate', label: 'Rate us', icon: '★' },
  { href: '/settings', label: 'Settings', icon: '⚙' },
  { href: '/owner', label: 'Owner panel', icon: '♛', ownerOnly: true }
]

export default function Layout({ children, title }) {
  const router = useRouter()
  const [user, setUser] = useState(null)
  useEffect(() => { setUser(getUser()) }, [])
  const visibleNav = NAV.filter(item => !item.ownerOnly || user?.is_owner)
  const active = href => router.pathname === href || router.pathname.startsWith(href + '/')
  return <div className="min-h-screen bg-[#f4f7f6] text-slate-900 md:flex">
    <aside className="hidden w-[248px] shrink-0 flex-col bg-[#073b30] px-4 py-5 text-white md:flex">
      <Link href="/overview" className="mb-9 flex items-center gap-3 px-2">
        <div className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-xl bg-white/10 ring-1 ring-white/15">
          <img src={AVATAR} alt="" className="h-full w-full object-cover" onError={e => { e.currentTarget.style.display='none' }} />
          <span className="text-lg font-black text-emerald-200">W</span>
        </div>
        <span className="min-w-0"><span className="block truncate text-[13px] font-extrabold tracking-wide text-white">{BOT_NAME}</span><span className="mt-1 block text-[9px] font-bold tracking-[.18em] text-emerald-200">WHATSAPP BOT</span></span>
      </Link>
      <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[.18em] text-emerald-200/65">Workspace</p>
      <nav className="space-y-1">{visibleNav.map(item => <Link key={item.href} href={item.href} className={'flex items-center gap-3 rounded-xl px-3 py-3 text-[13px] font-semibold transition ' + (active(item.href) ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-950/20' : 'text-emerald-50/75 hover:bg-white/10 hover:text-white')}><span className="w-5 text-center text-lg">{item.icon}</span>{item.label}</Link>)}</nav>
      <div className="mt-auto rounded-xl border border-emerald-200/15 bg-emerald-950/30 p-3"><div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-emerald-300"/><span className="text-xs font-semibold text-emerald-50">Workspace open</span></div><p className="mt-1 text-[10px] text-emerald-100/60">No account creation required</p></div>
      <p className="mt-4 px-2 text-[9px] text-emerald-100/40">THANXIE DEV · BOT CONTROL</p>
    </aside>
    <div className="min-w-0 flex-1">
      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/95 px-4 py-3 backdrop-blur sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3 md:hidden"><div className="grid h-9 w-9 place-items-center overflow-hidden rounded-xl bg-emerald-100"><img src={AVATAR} alt="" className="h-full w-full object-cover" onError={e=>{e.currentTarget.style.display='none'}}/><span className="font-black text-emerald-800">W</span></div><div className="min-w-0"><p className="truncate text-xs font-extrabold text-slate-900">{BOT_NAME}</p><p className="text-[9px] font-bold tracking-[.15em] text-emerald-700">BOT CONTROL CENTRE</p></div></div>
          <div className="hidden md:block"><p className="text-[10px] font-bold uppercase tracking-[.18em] text-emerald-700">Workspace</p><h1 className="mt-0.5 text-base font-bold text-slate-900">{title || 'Dashboard'}</h1></div>
          <div className="flex items-center gap-3"><div className="hidden text-right sm:block"><p className="text-xs font-semibold text-slate-800">{user?.email || 'Guest workspace'}</p><p className="text-[10px] text-slate-500">WhatsApp management</p></div><div className="grid h-9 w-9 place-items-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-800">{user?.is_owner ? 'AD' : 'G'}</div></div>
        </div>
        <nav className="mt-3 flex gap-1 overflow-x-auto md:hidden">{visibleNav.map(item => <Link key={item.href} href={item.href} className={'shrink-0 rounded-lg px-3 py-2 text-xs font-semibold ' + (active(item.href) ? 'bg-emerald-700 text-white' : 'text-slate-600 hover:bg-emerald-50')}><span className="mr-1.5">{item.icon}</span>{item.label}</Link>)}</nav>
      </header>
      <main className="mx-auto min-h-[calc(100vh-110px)] w-full max-w-[1500px] px-4 py-5 sm:px-6 sm:py-7 lg:px-8">{children}</main>
      <footer className="border-t border-slate-200 bg-white px-6 py-4 text-center text-[10px] text-slate-400">© {new Date().getFullYear()} {BOT_NAME} · THANXIE DEV</footer>
    </div>
  </div>
}
