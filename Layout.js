import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { getUser, logout } from '../lib/api'

const BOT_NAME = process.env.NEXT_PUBLIC_BOT_NAME || 'WANNA-CRY THANXIEE'
const BOT_AVATAR = process.env.NEXT_PUBLIC_BOT_AVATAR_URL || 'https://raw.githubusercontent.com/Codezerox145/wanna-crythanxie-v4145/main/bot-avatar.jpg'
const CHANNEL_LINK = process.env.NEXT_PUBLIC_CHANNEL_LINK || 'https://whatsapp.com/channel/0029VbE9KJvJkK73C7RNvP2z'
const GITHUB_REPO = process.env.NEXT_PUBLIC_GITHUB_REPO || 'https://github.com/Codezerox145/wanna-crythanxie-v4145'
const NAV = [
  { href: '/overview', label: 'Overview', icon: 'overview' },
  { href: '/pair', label: 'Connect', icon: 'connect' },
  { href: '/sessions', label: 'Sessions', icon: 'sessions' },
  { href: '/servers', label: 'Servers', icon: 'servers' },
  { href: '/tools', label: 'Advanced tools', icon: 'tools' },
  { href: '/settings', label: 'Settings', icon: 'settings' }
]

function NavIcon({ name }) {
  const shapes = {
    overview: <><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></>,
    connect: <><path d="M10 13.5 8.5 15a4 4 0 0 1-5.7-5.7l3-3a4 4 0 0 1 5.7 0" /><path d="m14 10.5 1.5-1.5a4 4 0 0 1 5.7 5.7l-3 3a4 4 0 0 1-5.7 0" /><path d="m8.5 15 7-7" /></>,
    sessions: <><rect x="4" y="3" width="16" height="18" rx="2" /><path d="M8 8h8M8 12h8M8 16h5" /></>,
    tools: <><path d="M4 7h16M4 12h16M4 17h16" /><circle cx="8" cy="7" r="1.5" fill="currentColor" stroke="none" /><circle cx="15" cy="12" r="1.5" fill="currentColor" stroke="none" /><circle cx="10" cy="17" r="1.5" fill="currentColor" stroke="none" /></>,
    servers: <><rect x="3" y="4" width="18" height="6" rx="1.5" /><rect x="3" y="14" width="18" height="6" rx="1.5" /><path d="M7 7h.01M7 17h.01M11 7h7M11 17h7" /></>,
    settings: <><circle cx="12" cy="12" r="3" /><path d="m19.4 15 .1.1a1.7 1.7 0 0 1-2.4 2.4l-.1-.1a1.7 1.7 0 0 0-2.9 1.2v.2a1.7 1.7 0 0 1-3.4 0v-.2a1.7 1.7 0 0 0-2.9-1.2l-.1.1a1.7 1.7 0 0 1-2.4-2.4l.1-.1a1.7 1.7 0 0 0-1.2-2.9H4a1.7 1.7 0 0 1 0-3.4h.2a1.7 1.7 0 0 0 1.2-2.9l-.1-.1a1.7 1.7 0 0 1 2.4-2.4l.1.1a1.7 1.7 0 0 0 2.9-1.2V2a1.7 1.7 0 0 1 3.4 0v.2a1.7 1.7 0 0 0 2.9 1.2l.1-.1a1.7 1.7 0 0 1 2.4 2.4l-.1.1a1.7 1.7 0 0 0 1.2 2.9h.2a1.7 1.7 0 0 1 0 3.4h-.2a1.7 1.7 0 0 0-1.2 2.9Z" /></>
  }
  return <svg viewBox="0 0 24 24" aria-hidden="true" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{shapes[name]}</svg>
}

function SocialIcon({ type }) {
  if (type === 'whatsapp') return <img src="https://cdn.simpleicons.org/whatsapp/25D366" alt="" aria-hidden="true" className="h-4 w-4" />
  return <img src="https://cdn.simpleicons.org/github/FFFFFF" alt="" aria-hidden="true" className="h-4 w-4" />
}

function BrandMark({ small = false }) {
  return <div className={(small ? 'h-10 w-10' : 'h-12 w-12') + ' shrink-0 overflow-hidden rounded-2xl border border-white/15 bg-white/10 flex items-center justify-center'}>
    <img src={BOT_AVATAR} alt={BOT_NAME} className="h-full w-full object-cover" onError={event => { event.currentTarget.style.display = 'none' }} />
  </div>
}

export default function Layout({ children, title }) {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [dark, setDark] = useState(false)
  useEffect(() => {
    setUser(getUser())
    const saved = localStorage.getItem('theme') === 'dark'
    setDark(saved)
    document.documentElement.classList.toggle('dark', saved)
  }, [])
  function toggleTheme() {
    const next = !dark
    setDark(next)
    document.documentElement.classList.toggle('dark', next)
    localStorage.setItem('theme', next ? 'dark' : 'light')
  }
  function handleLogout() { logout(); router.replace('/login') }
  const active = href => router.pathname === href || router.pathname.startsWith(href + '/')
  const navLink = item => 'group flex min-w-0 items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition ' + (active(item.href) ? 'bg-white/15 text-white shadow-inner' : 'text-white/60 hover:bg-white/10 hover:text-white')
  return <div className="min-h-screen bg-[#f5f7fb] text-slate-900 dark:bg-slate-950 dark:text-slate-100 md:flex">
    <aside className="hidden md:fixed md:inset-y-0 md:flex md:w-[260px] md:flex-col bg-gradient-to-b from-[#080d1d] via-slate-950 to-indigo-950 p-5 text-white">
      <div className="mb-10 flex min-w-0 items-center gap-3"><BrandMark /><div className="min-w-0"><p className="truncate text-sm font-bold tracking-wide">{BOT_NAME}</p><p className="mt-1 text-[10px] tracking-[.2em] text-indigo-200/70">PREMIUM CONTROL</p></div></div>
      <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[.22em] text-white/35">Workspace</p>
      <nav aria-label="Main navigation" className="flex flex-col gap-1">{NAV.map(item => <Link key={item.href} href={item.href} aria-current={active(item.href) ? 'page' : undefined} className={navLink(item)}><span className="grid h-9 w-9 place-items-center rounded-xl bg-white/5 text-white/75 transition group-hover:bg-white/10"><NavIcon name={item.icon} /></span>{item.label}{active(item.href) && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-cyan-300" />}</Link>)}</nav>
      <div className="mt-auto rounded-2xl border border-white/10 bg-white/[.04] p-4"><p className="text-xs font-semibold text-white">Need a hand?</p><p className="mt-1 text-[11px] leading-5 text-white/45">Visit the official channel for project updates and support.</p><a href={CHANNEL_LINK} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-2 text-xs font-semibold text-cyan-200 hover:text-white"><SocialIcon type="whatsapp" /> Official WhatsApp channel</a></div>
      <div className="mt-4 space-y-3 border-t border-white/10 pt-4 text-xs text-white/50"><a href={GITHUB_REPO} target="_blank" rel="noreferrer" className="flex items-center gap-2 hover:text-white"><SocialIcon type="github" /> GitHub repository</a><button onClick={handleLogout} className="block hover:text-white">↩ Log out</button></div>
    </aside>
    <div className="min-w-0 flex-1 md:ml-[260px]">
      <header className="sticky top-0 z-30 flex min-h-[76px] items-center justify-between gap-3 border-b border-slate-200/80 bg-white/90 px-4 py-3 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/90 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-3"><div className="md:hidden"><BrandMark small /></div><div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-[.2em] text-indigo-600">Workspace</p><h1 className="truncate text-base font-bold tracking-tight sm:text-lg">{title || 'Dashboard'}</h1></div></div>
        <div className="flex shrink-0 items-center gap-2"><button onClick={toggleTheme} className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:border-indigo-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200" title="Toggle theme" aria-label="Toggle theme">{dark ? '☀' : '☾'}</button><div className="hidden min-w-0 items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 dark:bg-slate-800 sm:flex"><div className="grid h-7 w-7 place-items-center rounded-lg bg-indigo-600 text-xs font-bold text-white">{user?.email?.charAt(0)?.toUpperCase() || '?'}</div><span className="max-w-[180px] truncate text-xs font-semibold text-slate-600 dark:text-slate-300">{user?.email || 'Account'}</span></div></div>
      </header>
      <nav aria-label="Mobile navigation" className="sticky top-[76px] z-20 grid grid-cols-6 gap-1 border-b border-slate-200/80 bg-white/95 px-2 py-2 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/95 md:hidden">{NAV.map(item => <Link key={item.href} href={item.href} aria-current={active(item.href) ? 'page' : undefined} className={'flex min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-1 py-2 text-[10px] font-semibold transition ' + (active(item.href) ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300' : 'text-slate-500 dark:text-slate-400')}><NavIcon name={item.icon} /><span className="truncate">{item.label}</span></Link>)}</nav>
      <main className="mx-auto min-h-[calc(100vh-160px)] w-full min-w-0 max-w-[1600px] p-4 sm:p-6 lg:p-8">
        <section aria-label="Support this open-source project" className="mb-5 flex flex-col gap-3 rounded-2xl border border-indigo-100 bg-gradient-to-r from-indigo-50 via-white to-violet-50 p-4 dark:border-indigo-900/60 dark:from-indigo-950/40 dark:via-slate-900 dark:to-violet-950/30 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0"><p className="text-sm font-bold text-slate-900 dark:text-white">Enjoying WANNA-CRY THANXIEE?</p><p className="mt-1 text-xs leading-5 text-slate-600 dark:text-slate-300">Help more people discover it — fork the source and star the GitHub repository.</p></div>
          <div className="flex shrink-0 flex-wrap gap-2"><a href={`${GITHUB_REPO}/fork`} target="_blank" rel="noopener noreferrer" className="rounded-xl border border-indigo-200 bg-white px-3 py-2 text-xs font-bold text-indigo-700 hover:bg-indigo-100 dark:border-indigo-800 dark:bg-slate-900 dark:text-indigo-300">⑂ Fork project</a><a href={GITHUB_REPO} target="_blank" rel="noopener noreferrer" className="rounded-xl bg-indigo-600 px-3 py-2 text-xs font-bold text-white hover:bg-indigo-700">★ Star on GitHub</a></div>
        </section>
        {children}
      </main>
      <footer className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 border-t border-slate-200/80 px-4 py-5 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400"><a href={CHANNEL_LINK} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 hover:text-indigo-600"><SocialIcon type="whatsapp" /> Official WhatsApp</a><a href={GITHUB_REPO} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 hover:text-indigo-600"><SocialIcon type="github" /> GitHub</a><button onClick={handleLogout} className="hover:text-indigo-600">Log out</button></footer>
    </div>
  </div>
}
