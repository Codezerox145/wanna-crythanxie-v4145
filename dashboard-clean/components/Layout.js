import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { getUser, logout } from '../lib/api'

const BOT_NAME = process.env.NEXT_PUBLIC_BOT_NAME || 'WANNA-CRY THANXIEE'
const AVATAR = process.env.NEXT_PUBLIC_BOT_AVATAR_URL || 'https://raw.githubusercontent.com/Codezerox145/wanna-crythanxie-v4145/main/bot-avatar.jpg'
const CHANNEL = process.env.NEXT_PUBLIC_CHANNEL_LINK || 'https://whatsapp.com/channel/0029VbE9KJvJkK73C7RNvP2z'
const REPO = process.env.NEXT_PUBLIC_GITHUB_REPO || 'https://github.com/Codezerox145/wanna-crythanxie-v4145'

const NAV = [
  { href: '/overview', label: 'Dashboard', icon: '▦', group: 'Workspace' },
  { href: '/sessions', label: 'Bot Management', icon: '▣' },
  { href: '/servers', label: 'Servers', icon: '▤' },
  { href: '/overview#statistics', label: 'Statistics', icon: '▥' },
  { href: '/features/advertising', label: 'Advertising', icon: '◈', tag: 'Setup' },
  { href: '/features/chat', label: 'Chat Centre', icon: '◌' },
  { href: '/features/polls', label: 'Polls & Channels', icon: '▤' },
  { href: '/settings', label: 'Bot Settings', icon: '⚙' },
  { href: '/features/vip', label: 'VIP Centre', icon: '♛' },
  { href: '/features/media', label: 'Media Tools', icon: '▧' },
  { href: '/features/help', label: 'FAQ & Help', icon: '?' },
  { href: '/features/payments', label: 'Payments', icon: '$' },
  { href: '/features/owner', label: 'Owner Panel', icon: '♜', tag: 'Owner' }
]
function Brand({ compact = false }) {
  return <div className="flex min-w-0 items-center gap-3">
    <img src={AVATAR} alt="" className={compact ? 'h-9 w-9 rounded-xl object-cover' : 'h-11 w-11 rounded-2xl object-cover'} onError={e => { e.currentTarget.style.visibility = 'hidden' }} />
    <div className="min-w-0"><p className="truncate text-sm font-extrabold tracking-wide text-white">{BOT_NAME}</p><p className="text-[10px] font-bold tracking-[.24em] text-violet-300">PREMIUM CONTROL</p></div>
  </div>
}
function NavLink({ item, active, onClick }) {
  return <Link href={item.href} onClick={onClick} className={'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-semibold transition ' + (active ? 'bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-lg shadow-violet-950/30' : 'text-slate-400 hover:bg-white/[.06] hover:text-white')}>
    <span className={'grid h-8 w-8 shrink-0 place-items-center rounded-lg text-base ' + (active ? 'bg-white/15 text-white' : 'bg-white/[.04] text-violet-300 group-hover:bg-violet-500/15')}>{item.icon}</span>
    <span className="min-w-0 flex-1 truncate">{item.label}</span>
    {item.tag && <span className="rounded-md bg-violet-500/20 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-violet-200">{item.tag}</span>}
  </Link>
}
export default function Layout({ children, title }) {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [mobileMore, setMobileMore] = useState(false)
  useEffect(() => { document.documentElement.classList.add('dark'); setUser(getUser()) }, [])
  function signOut() { logout(); router.replace('/login') }
  const isActive = item => router.pathname === item.href || (item.href !== '/overview#statistics' && router.pathname.startsWith(item.href + '/')) || (item.href === '/overview#statistics' && router.asPath.includes('#statistics'))
  const mobileItems = NAV.filter(x => ['/overview','/sessions','/servers','/settings'].includes(x.href))
  const moreItems = NAV.filter(x => !mobileItems.includes(x))
  return <div className="min-h-screen bg-[#070b18] text-slate-100 md:flex">
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-[252px] flex-col border-r border-white/[.07] bg-[#090d1c] px-4 py-5 md:flex">
      <div className="mb-8 px-2"><Brand /></div>
      <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[.2em] text-slate-600">Main menu</p>
      <nav className="flex-1 space-y-1 overflow-y-auto">{NAV.map(item => <NavLink key={item.href} item={item} active={isActive(item)} />)}</nav>
      <div className="mt-4 rounded-2xl border border-white/[.08] bg-white/[.035] p-3">
        <div className="flex items-center gap-2"><div className="grid h-8 w-8 place-items-center rounded-xl bg-violet-500/15 text-violet-300">{user?.email?.[0]?.toUpperCase() || 'U'}</div><div className="min-w-0"><p className="truncate text-xs font-bold text-white">{user?.email || 'Your account'}</p><p className="text-[10px] text-slate-500">Workspace account</p></div></div>
        <button onClick={signOut} className="mt-3 w-full rounded-lg border border-white/10 px-3 py-2 text-left text-xs font-semibold text-slate-400 hover:bg-white/5 hover:text-white">↪ Sign out</button>
      </div>
    </aside>
    <div className="min-w-0 flex-1 md:ml-[252px]">
      <header className="sticky top-0 z-30 flex min-h-[70px] items-center justify-between gap-3 border-b border-white/[.07] bg-[#090d1c]/90 px-4 backdrop-blur-xl sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-3 md:hidden"><Brand compact /></div>
        <div className="hidden min-w-0 md:block"><p className="text-[10px] font-bold uppercase tracking-[.2em] text-violet-400">Workspace</p><h1 className="truncate text-lg font-bold text-white">{title || 'Dashboard'}</h1></div>
        <div className="ml-auto flex items-center gap-2">
          <span className="hidden rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-[11px] font-semibold text-emerald-300 sm:inline-flex"><i className="mr-2 mt-1 h-1.5 w-1.5 rounded-full bg-emerald-400" /> API status is checked live</span>

          <a href={CHANNEL} target="_blank" rel="noreferrer" className="hidden rounded-xl border border-white/10 px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-white/5 sm:block">Support ↗</a>
          <button onClick={signOut} className="rounded-xl border border-white/10 px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-white/5 md:hidden">Exit</button>
        </div>
      </header>
      <main className="mx-auto min-h-[calc(100vh-70px)] w-full max-w-[1600px] px-4 pb-28 pt-5 sm:px-6 sm:pt-7 lg:px-8 md:pb-8">{children}</main>
      <footer className="hidden items-center justify-between border-t border-white/[.07] px-8 py-4 text-[11px] text-slate-600 md:flex"><span>© {new Date().getFullYear()} {BOT_NAME}. Built for WhatsApp automation.</span><div className="flex gap-5"><a href={REPO} target="_blank" rel="noreferrer" className="hover:text-violet-300">GitHub</a><a href={CHANNEL} target="_blank" rel="noreferrer" className="hover:text-violet-300">WhatsApp Channel</a><span>THANXIE DEV</span></div></footer>
    </div>
    <nav className="fixed inset-x-0 bottom-0 z-50 grid grid-cols-5 border-t border-white/10 bg-[#090d1c]/95 px-2 pb-[max(env(safe-area-inset-bottom),8px)] pt-2 backdrop-blur-xl md:hidden">
      {mobileItems.slice(0,4).map(item => <Link key={item.href} href={item.href} className={'flex min-w-0 flex-col items-center justify-center gap-1 rounded-xl py-2 text-[10px] font-semibold ' + (isActive(item) ? 'text-violet-300' : 'text-slate-500')}><span className="text-lg leading-none">{item.icon}</span><span className="max-w-full truncate">{item.label === 'Dashboard' ? 'Home' : item.label === 'Bot Management' ? 'Bots' : item.label}</span></Link>)}
      <button onClick={() => setMobileMore(v => !v)} className={'flex flex-col items-center justify-center gap-1 rounded-xl py-2 text-[10px] font-semibold ' + (mobileMore ? 'text-violet-300' : 'text-slate-400')}><span className="text-lg">☷</span>More</button>
    </nav>
    {mobileMore && <div className="fixed inset-x-3 bottom-20 z-[60] max-h-[65vh] overflow-y-auto rounded-2xl border border-white/10 bg-[#101629] p-3 shadow-2xl md:hidden"><div className="mb-2 flex items-center justify-between px-2"><p className="text-xs font-bold uppercase tracking-widest text-slate-500">More features</p><button onClick={() => setMobileMore(false)} className="text-slate-400">✕</button></div>{moreItems.map(item => <NavLink key={item.href} item={item} active={isActive(item)} onClick={() => setMobileMore(false)} />)}</div>}
  </div>
}
