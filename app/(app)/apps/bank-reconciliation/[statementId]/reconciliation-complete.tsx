"use client"

import { useEffect, useRef } from "react"
import { toast } from "sonner"

export function ReconciliationComplete() {
  const hasShown = useRef(false)

  useEffect(() => {
    if (!hasShown.current) {
      hasShown.current = true
      toast.success("กระทบยอดเสร็จสิ้น")
    }
  }, [])

  return null
}
