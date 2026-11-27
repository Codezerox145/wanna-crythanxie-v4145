const API_BASE = (process.env.NEXT_PUBLIC_API_BASE || '').trim().replace(/\/+$/, '')
const REQUEST_TIMEOUT_MS = 15000

function getToken() {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('token') || sessionStorage.getItem('token')
}
export function setToken(token, remember = true) {
  if (typeof window === 'undefined') return
  localStorage.removeItem('token')
  sessionStorage.removeItem('token')
  if (token) (remember ? localStorage : sessionStorage).setItem('token', token)
  if (typeof window !== 'undefined') window.dispatchEvent(new Event('auth:changed'))
}
export function getUser() {
  if (typeof window === 'undefined' || !getToken()) return null
  try {
    const raw = localStorage.getItem('user') || sessionStorage.getItem('user')
    return raw ? JSON.parse(raw) : null
  } catch {
    localStorage.removeItem('user')
    sessionStorage.removeItem('user')
    return null
  }
}
export function setUser(user) {
  if (typeof window === 'undefined') return
  localStorage.removeItem('user')
  sessionStorage.removeItem('user')
  if (user) {
    const storage = getToken() && sessionStorage.getItem('token') ? sessionStorage : localStorage
    storage.setItem('user', JSON.stringify(user))
  }
  window.dispatchEvent(new Event('auth:changed'))
}
export function getApiBase() { return API_BASE }

function resolveApiUrl(path) {
  if (!API_BASE) throw new Error('The workspace is reconnecting. Please try again shortly.')
  let base
  try { base = new URL(API_BASE) } catch {
    throw new Error('The workspace is temporarily unavailable. Please try again shortly.')
  }
  if (!['http:', 'https:'].includes(base.protocol) || !base.host) throw new Error('The workspace is temporarily unavailable. Please try again shortly.')
  if (typeof window !== 'undefined' && window.location.protocol === 'https:' && base.protocol !== 'https:') throw new Error('The workspace is temporarily unavailable. Please try again shortly.')
  return new URL(path, base.origin + '/')
}

async function request(path, { method = 'GET', body, auth = true } = {}) {
  const url = resolveApiUrl(path)
  const headers = { Accept: 'application/json' }
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  if (auth) {
    const token = getToken()
    if (token) headers.Authorization = 'Bearer ' + token
  }
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  let response
  try {
    response = await fetch(url.toString(), { method, headers, body: body !== undefined ? JSON.stringify(body) : undefined, signal: controller.signal, mode: 'cors', cache: 'no-store', credentials: 'omit' })
  } catch (error) {
    if (error && error.name === 'AbortError') throw new Error('This is taking longer than expected. Please try again.')
    if (typeof navigator !== 'undefined' && !navigator.onLine) throw new Error('You appear to be offline. Reconnect and your workspace will resume automatically.')
    throw new Error('Connection interrupted. We are trying to restore your workspace. Please try again shortly.')
  } finally { clearTimeout(timer) }
  const contentType = response.headers.get('content-type') || ''
  const data = contentType.includes('application/json') ? await response.json().catch(() => ({})) : {}
  if (!response.ok) {
    if (response.status === 401 && auth) {
      const hadToken = Boolean(getToken())
      logout()
      if (hadToken && typeof window !== 'undefined') window.location.replace('/overview')
      throw new Error('Your workspace connection has expired. Reconnecting now…')
    }
    throw new Error(response.status >= 500 ? 'This feature is temporarily unavailable. Please try again shortly.' : (data.error && !/stack|exception|internal server|ECONN|ENOENT|TypeError|ReferenceError/i.test(data.error) ? data.error : 'Your request could not be completed. Please check your details and try again.'))
  }
  if (!contentType.includes('application/json')) throw new Error('This feature is temporarily unavailable. Please try again later.')
  return data
}

export const api = {
  health: () => request('/health', { auth: false }),
  guest: () => request('/auth/guest', { method: 'POST', body: {}, auth: false }),
  signup: (email, password) => request('/auth/signup', { method: 'POST', body: { email, password }, auth: false }),
  login: (email, password) => request('/auth/login', { method: 'POST', body: { email, password }, auth: false }),
  listSessions: () => request('/sessions'),
  getSession: id => request('/sessions/' + encodeURIComponent(id)),
  createSession: (phoneNumber, region, label) => request('/sessions', { method: 'POST', body: { phoneNumber, region, label } }),
  deleteSession: id => request('/sessions/' + encodeURIComponent(id), { method: 'DELETE' }),
  restartSession: id => request('/sessions/' + encodeURIComponent(id) + '/restart', { method: 'POST' }),
  refreshPairingCode: id => request('/sessions/' + encodeURIComponent(id) + '/pairing-code', { method: 'POST', body: {} }),
  runtime: () => request('/runtime'),
  analytics: () => request('/analytics'),
  dashboardMetrics: () => request('/dashboard/metrics'),
  servers: () => request('/servers'),
  groups: sessionId => request('/groups?sessionId=' + encodeURIComponent(sessionId)),
  groupInvite: (sessionId, groupJid) => request('/groups/invite', { method: 'POST', body: { sessionId, groupJid } }),
  createPoll: (sessionId, groupJid, question, options, selectableCount = 1) => request('/polls/create', { method: 'POST', body: { sessionId, groupJid, question, options, selectableCount } }),
  communityUsers: query => request('/community/users?q=' + encodeURIComponent(query || '')),
  submitFeedback: (category, message) => request('/feedback', { method: 'POST', body: { category, message } }),
  submitRating: (rating, review) => request('/ratings', { method: 'POST', body: { rating, review } }),
  chatConversations: () => request('/chat/conversations'),
  chatMessages: (sessionId, chatJid) => request('/chat/messages?sessionId=' + encodeURIComponent(sessionId) + '&chatJid=' + encodeURIComponent(chatJid)),
  sendChatMessage: (sessionId, chatJid, message) => request('/chat/send', { method: 'POST', body: { sessionId, chatJid, message } }),
  ownerOverview: () => request('/owner/overview'),
  ownerUsers: () => request('/owner/users'),
  safetyMe: () => request('/safety/me'),
  updateSafety: settings => request('/safety/me', { method: 'PATCH', body: settings }),
  pauseSafety: () => request('/safety/pause', { method: 'POST', body: {} }),
  resumeSafety: () => request('/safety/resume', { method: 'POST', body: {} }),
  ownerSafety: () => request('/owner/safety'),
  ownerSetAccountPause: (userId, paused) => request('/owner/safety/accounts/' + encodeURIComponent(userId), { method: 'PATCH', body: { paused } }),
  ownerSetGlobalPause: paused => request('/owner/safety/global', { method: 'POST', body: { paused } }),
}
export function logout() { setToken(null); setUser(null); if (typeof window !== 'undefined') { sessionStorage.removeItem('token'); sessionStorage.removeItem('user') } }
