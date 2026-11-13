import { useCallback, useEffect, useMemo, useState } from 'react'
import Layout from '../components/Layout'
import { useAuthGuard } from '../lib/useAuthGuard'
import { api } from '../lib/api'

function initials(value) { return String(value || 'WA').replace(/@.*/, '').slice(-2).toUpperCase() }
function chatName(jid) {
  if (!jid) return 'Conversation'
  return jid.endsWith('@g.us') ? 'WhatsApp group · ' + jid.split('@')[0] : '+' + jid.split('@')[0]
}
function stamp(value) {
  if (!value) return ''
  return new Date(Number(value)).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}
export default function ChatCentre() {
  const user = useAuthGuard()
  const [sessions, setSessions] = useState([])
  const [conversations, setConversations] = useState([])
  const [selected, setSelected] = useState(null)
  const [messages, setMessages] = useState([])
  const [draft, setDraft] = useState('')
  const [search, setSearch] = useState('')
  const [newChat, setNewChat] = useState(false)
  const [newPhone, setNewPhone] = useState('')
  const [newSession, setNewSession] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const activeSession = sessions.find(item => item.id === selected?.session_id)
  const loadInbox = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true)
    try {
      const [sessionResult, inboxResult] = await Promise.all([api.listSessions(), api.chatConversations()])
      setSessions(sessionResult.sessions || [])
      setConversations(inboxResult.conversations || [])
      setError('')
    } catch (e) { setError(e.message || 'Unable to load your WhatsApp inbox.') }
    finally { if (!quiet) setLoading(false) }
  }, [])
  const loadMessages = useCallback(async (quiet = false) => {
    if (!selected) return
    try {
      const result = await api.chatMessages(selected.session_id, selected.chat_jid)
      setMessages(result.messages || [])
    } catch (e) { if (!quiet) setError(e.message || 'Unable to load conversation messages.') }
  }, [selected])
  useEffect(() => { if (user) loadInbox(); }, [user, loadInbox])
  useEffect(() => {
    if (!user) return
    const timer = setInterval(() => loadInbox(true), 12000)
    return () => clearInterval(timer)
  }, [user, loadInbox])
  useEffect(() => {
    if (!selected) { setMessages([]); return }
    loadMessages()
    const timer = setInterval(() => loadMessages(true), 5000)
    return () => clearInterval(timer)
  }, [selected, loadMessages])
  const filtered = useMemo(() => conversations.filter(item => chatName(item.chat_jid).toLowerCase().includes(search.toLowerCase()) || String(item.last_message || '').toLowerCase().includes(search.toLowerCase())), [conversations, search])
  function openNewChat(e) {
    e.preventDefault()
    const phone = newPhone.replace(/\\D/g, '')
    if (!newSession || phone.length < 8 || phone.length > 15) { setError('Choose a connected account and enter an international number with 8–15 digits.'); return }
    setSelected({ session_id: newSession, chat_jid: phone + '@s.whatsapp.net', last_message: '', timestamp: Date.now(), direction: 'outbound' })
    setMessages([]); setDraft(''); setError(''); setNewChat(false); setNewPhone('')
  }
  async function send(e) {
    e.preventDefault()
    if (!selected || !draft.trim() || sending) return
    setSending(true); setError('')
    try {
      await api.sendChatMessage(selected.session_id, selected.chat_jid, draft.trim())
      setDraft('')
      await Promise.all([loadMessages(true), loadInbox(true)])
    } catch (e) { setError(e.message || 'Message could not be sent.') }
    finally { setSending(false) }
  }
  if (!user) return null
  return <Layout title="Chat Centre">
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div><p className="text-[10px] font-bold uppercase tracking-[.2em] text-violet-400">Live WhatsApp inbox</p><h2 className="mt-1 text-2xl font-black text-white sm:text-3xl">Chat Centre</h2><p className="mt-1 text-xs text-slate-400">Read and reply through your connected WhatsApp sessions.</p></div>
      <div className="flex gap-2"><button onClick={() => setNewChat(v => !v)} className="rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-3 py-2 text-xs font-bold text-white">＋ New chat</button><button onClick={() => loadInbox()} disabled={loading} className="rounded-xl border border-white/10 px-3 py-2 text-xs font-bold text-slate-200 disabled:opacity-50">{loading ? 'Refreshing…' : '↻ Refresh'}</button></div>
    </div>
    <div className="mb-4 rounded-xl border border-emerald-400/15 bg-emerald-500/[.06] p-3">
      <div className="flex items-center gap-2 text-xs font-bold text-emerald-200"><span>🔒</span> WhatsApp end-to-end encrypted transport</div>
      <p className="mt-1 text-[11px] leading-5 text-slate-400">WhatsApp encrypts messages between WhatsApp endpoints. The dashboard message cache is encrypted at rest with AES-256-GCM, but it is not an independent end-to-end encrypted vault because the API must process replies before forwarding them. Use trusted devices and protect your dashboard login.</p>
    </div>
    {error && <div role="alert" className="mb-3 rounded-xl border border-rose-400/20 bg-rose-500/10 p-3 text-xs text-rose-200">{error}</div>}
    {newChat && <form onSubmit={openNewChat} className="mb-4 grid gap-2 rounded-2xl border border-violet-400/20 bg-[#10182b] p-3 sm:grid-cols-[1fr_1fr_auto]"><select required value={newSession || sessions[0]?.id || ''} onChange={e=>setNewSession(e.target.value)} className="min-w-0 rounded-xl border border-white/10 bg-[#0b1222] px-3 py-2.5 text-xs text-white"><option value="">Select connected WhatsApp account</option>{sessions.map(s=><option key={s.id} value={s.id}>{s.label || '+'+s.phone_number} · {s.status}</option>)}</select><input required value={newPhone} onChange={e=>setNewPhone(e.target.value)} inputMode="tel" placeholder="International number e.g. 2637…" className="min-w-0 rounded-xl border border-white/10 bg-[#0b1222] px-3 py-2.5 text-xs text-white placeholder:text-slate-600"/><button type="submit" disabled={!sessions.length} className="rounded-xl border border-violet-400/20 px-4 py-2.5 text-xs font-bold text-violet-200 disabled:opacity-40">Open conversation</button></form>}
    <section className="grid min-h-[620px] overflow-hidden rounded-2xl border border-white/[.08] bg-[#10182b] shadow-xl shadow-black/10 lg:grid-cols-[300px_minmax(0,1fr)]">
      <aside className="flex min-w-0 flex-col border-b border-white/[.07] lg:border-b-0 lg:border-r">
        <div className="border-b border-white/[.07] p-3">
          <div className="flex items-center justify-between"><h3 className="text-sm font-bold text-white">Conversations</h3><span className="rounded-full bg-violet-500/15 px-2 py-1 text-[10px] font-bold text-violet-200">{conversations.length}</span></div>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search chats or messages…" className="mt-3 w-full rounded-xl border border-white/10 bg-[#0b1222] px-3 py-2.5 text-xs text-white outline-none placeholder:text-slate-600 focus:border-violet-400" />
        </div>
        {sessions.length > 0 && <div className="border-b border-white/[.07] p-3"><label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-slate-500">Connected account</label><select className="w-full rounded-lg border border-white/10 bg-[#0b1222] px-2 py-2 text-xs text-white" value={selected?.session_id || ''} onChange={e => { const match=conversations.find(x=>x.session_id===e.target.value); setSelected(match || null) }}><option value="">Choose a session</option>{sessions.map(s=><option key={s.id} value={s.id}>{s.label || '+'+s.phone_number} · {s.status}</option>)}</select></div>}
        <div className="max-h-[250px] min-h-[150px] flex-1 overflow-y-auto lg:max-h-none">
          {loading ? <p className="p-5 text-xs text-slate-500">Loading conversations…</p> : filtered.length ? filtered.map(item => <button key={item.session_id+':'+item.chat_jid} onClick={() => setSelected(item)} className={'flex w-full items-start gap-3 border-b border-white/[.04] p-3 text-left transition hover:bg-white/[.03] '+(selected?.session_id===item.session_id && selected?.chat_jid===item.chat_jid?'bg-violet-500/10':'')}>
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-violet-600/30 to-fuchsia-600/20 text-xs font-black text-violet-100">{initials(item.chat_jid)}</span>
            <span className="min-w-0 flex-1"><span className="flex items-center justify-between gap-2"><span className="truncate text-xs font-bold text-white">{chatName(item.chat_jid)}</span><span className="shrink-0 text-[9px] text-slate-600">{stamp(item.timestamp)}</span></span><span className="mt-1 block truncate text-[10px] text-slate-500">{item.last_message || 'Media or attachment'}</span><span className="mt-1 block truncate text-[9px] text-violet-300/70">{sessions.find(s=>s.id===item.session_id)?.label || '+'+(sessions.find(s=>s.id===item.session_id)?.phone_number || '')}</span></span>
          </button>) : <div className="p-5"><p className="text-xs font-semibold text-slate-300">No conversations yet</p><p className="mt-1 text-[10px] leading-5 text-slate-500">Connect a WhatsApp session and receive a message to populate your inbox.</p></div>}
        </div>
      </aside>
      <div className="flex min-w-0 flex-col bg-[#0b1222]">
        {selected ? <>
          <header className="flex items-center justify-between gap-3 border-b border-white/[.07] bg-[#10182b] p-3 sm:p-4"><div className="flex min-w-0 items-center gap-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-violet-500/15 text-xs font-bold text-violet-200">{initials(selected.chat_jid)}</span><div className="min-w-0"><h3 className="truncate text-xs font-bold text-white">{chatName(selected.chat_jid)}</h3><p className="mt-0.5 text-[10px] text-slate-500">{activeSession?.label || '+'+(activeSession?.phone_number || '')} · {activeSession?.status || 'session'}</p></div></div><span className="rounded-full bg-emerald-500/10 px-2 py-1 text-[9px] font-bold text-emerald-300">WHATSAPP</span></header>
          <div className="flex-1 space-y-3 overflow-y-auto p-3 sm:p-5">
            {messages.length ? messages.map((message,i)=><div key={message.id || i} className={'flex '+(message.direction==='outbound'?'justify-end':'justify-start')}><div className={'max-w-[88%] rounded-2xl px-3 py-2.5 '+(message.direction==='outbound'?'rounded-br-md bg-violet-600/30 text-violet-50':'rounded-bl-md border border-white/[.07] bg-[#172137] text-slate-100')}><p className="whitespace-pre-wrap break-words text-xs leading-5">{message.text || 'Media message'}</p><p className="mt-1 text-right text-[9px] text-slate-500">{message.direction==='outbound'?'You':'WhatsApp'} · {stamp(message.timestamp)}</p></div></div>) : <p className="py-12 text-center text-xs text-slate-500">No cached messages in this conversation.</p>}
          </div>
          <form onSubmit={send} className="border-t border-white/[.07] bg-[#10182b] p-3"><div className="flex items-end gap-2"><textarea value={draft} onChange={e=>setDraft(e.target.value)} rows={2} maxLength={4000} placeholder={activeSession?.status==='online'?'Write a WhatsApp message…':'Session must be online to reply'} disabled={activeSession?.status!=='online' || sending} className="min-h-[44px] min-w-0 flex-1 resize-y rounded-xl border border-white/10 bg-[#0b1222] px-3 py-2.5 text-xs text-white outline-none placeholder:text-slate-600 focus:border-violet-400 disabled:opacity-50" /><button type="submit" disabled={!draft.trim() || sending || activeSession?.status!=='online'} className="rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-4 py-3 text-xs font-bold text-white disabled:opacity-40">{sending?'Sending…':'Send'}</button></div><p className="mt-2 text-[9px] text-slate-600">Replies are sent by the selected WhatsApp account. Do not send sensitive credentials.</p></form>
        </> : <div className="flex flex-1 flex-col items-center justify-center p-8 text-center"><span className="grid h-16 w-16 place-items-center rounded-2xl border border-violet-400/20 bg-violet-500/10 text-3xl text-violet-300">▣</span><h3 className="mt-4 text-sm font-bold text-white">Select a conversation</h3><p className="mt-2 max-w-xs text-xs leading-5 text-slate-500">Choose a chat from the inbox to view messages and send replies through your connected WhatsApp session.</p></div>}
      </div>
    </section>
  </Layout>
}
