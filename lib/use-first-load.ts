"use client"

import { useEffect, useState } from "react"

/** True for 400ms after mount, so the team sees the loading pattern. */
export function useFirstLoad(ms = 400) {
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    const t = setTimeout(() => setLoading(false), ms)
    return () => clearTimeout(t)
  }, [ms])
  return loading
}
