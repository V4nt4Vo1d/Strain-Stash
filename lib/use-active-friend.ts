"use client"

import { useCallback, useEffect, useState } from "react"

const KEY = "strain-stash:active-friend"

// Tracks which friend profile "you" are using on this device.
// This is UI identity state (not app data), so localStorage is appropriate.
export function useActiveFriend() {
  const [activeFriendId, setActiveFriendId] = useState<string | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    try {
      // Hydrate UI identity from localStorage after mount.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setActiveFriendId(localStorage.getItem(KEY))
    } catch {
      // ignore
    }
    setReady(true)
  }, [])

  const setActive = useCallback((id: string | null) => {
    setActiveFriendId(id)
    try {
      if (id) localStorage.setItem(KEY, id)
      else localStorage.removeItem(KEY)
    } catch {
      // ignore
    }
  }, [])

  return { activeFriendId, setActive, ready }
}
