import { useEffect, useState } from 'react'
import { api, getUser, setToken, setUser } from './api'

// The dashboard stays navigable during outages. Guest access retries in the background.
export function useAuthGuard() {
  const [user, setUserState] = useState(undefined)

  useEffect(() => {
    let active = true
    let retryTimer
    const fallback = { id: null, email: 'Guest workspace', is_guest: true, offline: true }

    async function openWorkspace() {
      const existing = getUser()
      if (existing) {
        if (active) setUserState(existing)
        return
      }
      try {
        const result = await api.guest()
        if (!active) return
        setToken(result.token, true)
        setUser(result.user)
        setUserState(result.user)
      } catch (_) {
        if (!active) return
        setUserState(fallback)
        retryTimer = setTimeout(openWorkspace, 5000)
      }
    }

    openWorkspace()
    return () => { active = false; if (retryTimer) clearTimeout(retryTimer) }
  }, [])

  return user
}
