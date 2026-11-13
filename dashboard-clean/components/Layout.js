import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { api, getUser, logout } from '../lib/api'

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
  { href: '/chat', label: 'Chat Centre', icon: '▣' },
  { href: '/features/polls', label: 'Polls & Channels', icon: '▤' },
  { href: '/settings', label: 'Bot Settings', icon: '⚙' },
  { href: '/features/vip', label: 'VIP Centre', icon: '♛' },
  { href: '/features/media', label: 'Media Tools', icon: '▧' },
  { href: '/features/help', label: 'FAQ & Help', icon: '?' },
  { href: '/owner', label: 'Owner Panel', icon: '♛', tag: 'Owner', ownerOnly: true }
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
  const [apiState, setApiState] = useState('checking')
  useEffect(() => {
    document.documentElement.classList.toggle('dark', localStorage.getItem('theme') !== 'light')
    setUser(getUser())
    let alive = true
    const check = async () => {
      try { await api.health(); if (alive) setApiState('online') }
      catch (_) { if (alive) setApiState('offline') }
    }
    check()
    const timer = setInterval(check, 30000)
    return () => { alive = false; clearInterval(timer) }
  }, [])
  function signOut() { logout(); router.replace('/login') }
  const isActive = item => router.pathname === item.href || (item.href !== '/overview#statistics' && router.pathname.startsWith(item.href + '/')) || (item.href === '/overview#statistics' && router.asPath.includes('#statistics'))
  const visibleNav = NAV.filter(x => !x.ownerOnly || user?.is_owner)
  return <div className="min-h-screen bg-[#070b18] text-slate-100 md:flex">
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-[252px] flex-col border-r border-white/[.07] bg-[#090d1c] px-4 py-5 md:flex">
      <div className="mb-8 px-2"><Brand /></div>
      <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[.2em] text-slate-600">Main menu</p>
      <nav className="flex-1 space-y-1 overflow-y-auto">{visibleNav.map(item => <NavLink key={item.href} item={item} active={isActive(item)} />)}</nav>
      <div className="mt-4 rounded-2xl border border-white/[.08] bg-white/[.035] p-3">
        <div className="flex items-center gap-2"><div className="grid h-8 w-8 place-items-center rounded-xl bg-violet-500/15 text-violet-300">{user?.email?.[0]?.toUpperCase() || 'U'}</div><div className="min-w-0"><p className="truncate text-xs font-bold text-white">{user?.email || 'Your account'}</p><p className="text-[10px] text-slate-500">Workspace account</p></div></div>
        <button onClick={signOut} className="mt-3 w-full rounded-lg border border-white/10 px-3 py-2 text-left text-xs font-semibold text-slate-400 hover:bg-white/5 hover:text-white">↪ Sign out</button>
      </div>
    </aside>
    <aside aria-label="Compact navigation" className="fixed inset-y-0 left-0 z-40 flex w-[58px] flex-col items-center gap-2 overflow-y-auto border-r border-white/[.07] bg-[#090d1c] px-1.5 py-3 md:hidden">{visibleNav.map(item => <Link key={item.href} href={item.href} title={item.label} aria-label={item.label} className={"grid h-10 w-10 shrink-0 place-items-center rounded-xl text-lg transition " + (isActive(item) ? "bg-gradient-to-r from-violet-600 to-purple-600 text-white" : "text-violet-300 hover:bg-white/[.06]")}>{item.icon}</Link>)}<button onClick={signOut} title="Sign out" aria-label="Sign out" className="mt-auto grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-white/10 text-slate-400">↪</button></aside>
    <div className="ml-[58px] min-w-0 flex-1 md:ml-[252px]">
      <header className="sticky top-0 z-30 flex min-h-[70px] items-center justify-between gap-3 border-b border-white/[.07] bg-[#090d1c]/90 px-4 backdrop-blur-xl sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-3 md:hidden"><Brand compact /></div>
        <div className="hidden min-w-0 md:block"><p className="text-[10px] font-bold uppercase tracking-[.2em] text-violet-400">Workspace</p><h1 className="truncate text-lg font-bold text-white">{title || 'Dashboard'}</h1></div>
        <div className="ml-auto flex items-center gap-2">
          <span className={'hidden rounded-full border px-3 py-1.5 text-[11px] font-semibold sm:inline-flex ' + (apiState === 'online' ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300' : apiState === 'offline' ? 'border-rose-500/20 bg-rose-500/10 text-rose-300' : 'border-amber-500/20 bg-amber-500/10 text-amber-200')}><i className={'mr-2 mt-1 h-1.5 w-1.5 rounded-full ' + (apiState === 'online' ? 'bg-emerald-400' : apiState === 'offline' ? 'bg-rose-400' : 'bg-amber-300')} /> API {apiState === 'online' ? 'Online' : apiState === 'offline' ? 'Offline' : 'Checking'}</span>

          <a href={REPO + '/fork'} target="_blank" rel="noreferrer" className="hidden rounded-xl border border-white/10 px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-white/5 sm:block">Fork ↗</a><a href={REPO + '/stargazers'} target="_blank" rel="noreferrer" className="hidden rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-3 py-2 text-xs font-bold text-white hover:brightness-110 sm:block">★ Star repo</a>
          <button onClick={signOut} className="rounded-xl border border-white/10 px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-white/5 md:hidden">Exit</button>
        </div>
      </header>
      <main className="mx-auto min-h-[calc(100vh-70px)] w-full max-w-[1600px] px-2 pb-5 pt-3 sm:px-4 sm:pt-5 lg:px-8 md:pb-8">{children}</main>
      <footer className="hidden items-center justify-between border-t border-white/[.07] px-8 py-4 text-[11px] text-slate-600 md:flex"><span>© {new Date().getFullYear()} {BOT_NAME}. Built for WhatsApp automation.</span><div className="flex items-center gap-4">
        <a href={REPO} target="_blank" rel="noreferrer" aria-label="GitHub repository" title="GitHub repository" className="text-slate-400 transition hover:text-white"><svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true"><path d="M12 .9a11.1 11.1 0 0 0-3.51 21.63c.56.1.76-.24.76-.54v-2.08c-3.1.67-3.76-1.32-3.76-1.32-.5-1.28-1.24-1.62-1.24-1.62-1.01-.69.08-.68.08-.68 1.12.08 1.71 1.15 1.71 1.15.99 1.7 2.6 1.21 3.23.93.1-.72.39-1.21.7-1.49-2.48-.28-5.09-1.24-5.09-5.53 0-1.22.44-2.22 1.15-3-.12-.28-.5-1.42.11-2.96 0 0 .94-.3 3.05 1.14a10.6 10.6 0 0 1 5.55 0c2.11-1.44 3.05-1.14 3.05-1.14.61 1.54.23 2.68.11 2.96.72.78 1.15 1.78 1.15 3 0 4.3-2.61 5.24-5.1 5.52.4.35.75 1.03.75 2.08v3.1c0 .3.2.65.77.54A11.1 11.1 0 0 0 12 .9Z"/></svg></a>
        <a href={CHANNEL} target="_blank" rel="noreferrer" aria-label="WhatsApp channel" title="WhatsApp channel" className="text-slate-400 transition hover:text-emerald-400"><svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true"><path d="M20.52 3.48A11.8 11.8 0 0 0 12.1 0C5.55 0 .22 5.33.22 11.88c0 2.1.55 4.15 1.6 5.96L.12 24l6.32-1.66a11.9 11.9 0 0 0 5.66 1.44h.01c6.55 0 11.88-5.33 11.88-11.88 0-3.17-1.24-6.15-3.47-8.42ZM12.1 21.76a9.9 9.9 0 0 1-5.04-1.38l-.36-.21-3.75.98 1-3.65-.24-.38a9.84 9.84 0 1 1 8.39 4.64Zm5.4-7.38c-.3-.15-1.77-.87-2.05-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.95 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.47-.89-.79-1.49-1.77-1.67-2.07-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.18.2-.3.3-.5.1-.2.05-.38-.02-.53-.08-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.49s1.07 2.89 1.22 3.09c.15.2 2.1 3.21 5.1 4.5.71.31 1.27.5 1.7.64.72.23 1.37.2 1.88.12.57-.08 1.77-.72 2.02-1.42.25-.7.25-1.3.18-1.42-.08-.13-.28-.2-.58-.35Z"/></svg></a>
        <div className="flex items-center gap-3"><a href={REPO + '/stargazers'} target="_blank" rel="noreferrer" className="text-slate-400 hover:text-violet-300">Star</a><a href={REPO + '/fork'} target="_blank" rel="noreferrer" className="text-slate-400 hover:text-violet-300">Fork</a><a href={CHANNEL} target="_blank" rel="noreferrer" className="text-slate-400 hover:text-emerald-300">WhatsApp</a><span>THANXIE DEV</span></div>
      </div></footer>
    </div>

  </div>
}
