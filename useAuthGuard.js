import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { getUser } from './api'

// A dashboard identity is valid only when both the user profile and bearer
// token are present. The API remains authoritative and redirects on 401.
export function useAuthGuard() {
  const router = useRouter()
  const [user, setUserState] = useState(undefined)

  useEffect(() => {
    const currentUser = getUser()
    if (!currentUser) {
      setUserState(null)
      router.replace('/login')
    } else {
      setUserState(currentUser)
    }
  }, [router])

  return user
}
