const API_BASE = (process.env.NEXT_PUBLIC_API_BASE || '').trim().replace(/\/+$/, '')
const REQUEST_TIMEOUT_MS = 60000

function getToken() {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('token') || sessionStorage.getItem('token')
}
export function setToken(token, remember = true) {
  if (typeof window === 'undefined') return
  localStorage.removeItem('token')
  sessionStorage.removeItem('token')
  if (token) (remember ? localStorage : sessionStorage).setItem('token', token)
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
}
export function getApiBase() { return API_BASE }

function resolveApiUrl(path) {
  if (!API_BASE) throw new Error('Dashboard API is not configured. Add NEXT_PUBLIC_API_BASE to your dashboard host environment using the public HTTPS URL of your API service, then rebuild/redeploy.')
  let base
  try { base = new URL(API_BASE) } catch {
    throw new Error('The API address is invalid. Set NEXT_PUBLIC_API_BASE to the full public API URL, including https://.')
  }
  if (!['http:', 'https:'].includes(base.protocol) || !base.host) throw new Error('The API address must use http:// or https:// and include a hostname.')
  if (typeof window !== 'undefined' && window.location.protocol === 'https:' && base.protocol !== 'https:') throw new Error('The dashboard is using HTTPS but the API address is not. Set NEXT_PUBLIC_API_BASE to your HTTPS Render URL.')
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
    if (error && error.name === 'AbortError') throw new Error('The API did not respond within 60 seconds. Check the API service and /health endpoint, then retry.')
    if (typeof navigator !== 'undefined' && !navigator.onLine) throw new Error('Your device appears to be offline. Reconnect to the internet and try again.')
    throw new Error('Cannot reach the API at ' + API_BASE + '. Confirm the API service is running and DASHBOARD_ORIGIN includes this exact dashboard domain. Browser detail: ' + ((error && error.message) || 'Network request blocked'))
  } finally { clearTimeout(timer) }
  const contentType = response.headers.get('content-type') || ''
  const data = contentType.includes('application/json') ? await response.json().catch(() => ({})) : {}
  if (!response.ok) {
    if (response.status === 401 && auth) {
      logout()
      if (typeof window !== 'undefined' && window.location.pathname !== '/login') window.location.assign('/login')
    }
    throw new Error(data.error || 'The API returned HTTP ' + response.status + '.')
  }
  if (!contentType.includes('application/json')) throw new Error('The API returned a non-JSON response. NEXT_PUBLIC_API_BASE must point to the API service, not the dashboard website.')
  return data
}

export const api = {
  health: () => request('/health', { auth: false }),
  signup: (email, password) => request('/auth/signup', { method: 'POST', body: { email, password }, auth: false }),
  login: (email, password) => request('/auth/login', { method: 'POST', body: { email, password }, auth: false }),
  listSessions: () => request('/sessions'),
  getSession: id => request('/sessions/' + encodeURIComponent(id)),
  createSession: (phoneNumber, region, label, communitySupportConfirmed = false) => request('/sessions', { method: 'POST', body: { phoneNumber, region, label, communitySupportConfirmed } }),
  deleteSession: id => request('/sessions/' + encodeURIComponent(id), { method: 'DELETE' }),
  restartSession: id => request('/sessions/' + encodeURIComponent(id) + '/restart', { method: 'POST' }),
  runtime: () => request('/runtime'),
  analytics: () => request('/analytics'),
  servers: () => request('/servers'),
  groups: sessionId => request('/groups?sessionId=' + encodeURIComponent(sessionId)),
  createPoll: (sessionId, groupJid, question, options, selectableCount = 1) => request('/polls/create', { method: 'POST', body: { sessionId, groupJid, question, options, selectableCount } }),
  chatConversations: () => request('/chat/conversations'),
  chatMessages: (sessionId, chatJid) => request('/chat/messages?sessionId=' + encodeURIComponent(sessionId) + '&chatJid=' + encodeURIComponent(chatJid)),
  sendChatMessage: (sessionId, chatJid, message) => request('/chat/send', { method: 'POST', body: { sessionId, chatJid, message } }),
  verifySupporter: githubUsername => request('/supporter/verify', { method: 'POST', body: { githubUsername } }),
  ownerOverview: () => request('/owner/overview'),
  ownerUsers: () => request('/owner/users'),
}
export function logout() { setToken(null); setUser(null); if (typeof window !== 'undefined') { sessionStorage.removeItem('token'); sessionStorage.removeItem('user') } }
