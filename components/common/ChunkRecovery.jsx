'use client'

import { useEffect } from 'react'

const RELOAD_KEY = 'nexahr_chunk_recovery_reloaded'

function isChunkLoadFailure(error) {
  const message = String(error?.message || error?.reason?.message || error?.target?.src || error?.filename || '')
  return message.includes('ChunkLoadError')
    || message.includes('/_next/static/')
    || message.includes('Loading chunk')
    || message.includes('Loading CSS chunk')
}

export function ChunkRecovery() {
  useEffect(() => {
    function recover(error) {
      if (!isChunkLoadFailure(error)) return
      if (sessionStorage.getItem(RELOAD_KEY) === '1') return
      sessionStorage.setItem(RELOAD_KEY, '1')
      window.location.reload()
    }

    function handleError(event) {
      recover(event.error || event)
    }

    function handleUnhandledRejection(event) {
      recover(event.reason || event)
    }

    window.addEventListener('error', handleError, true)
    window.addEventListener('unhandledrejection', handleUnhandledRejection)
    const clearRecoveryFlag = window.setTimeout(() => sessionStorage.removeItem(RELOAD_KEY), 10000)

    return () => {
      window.removeEventListener('error', handleError, true)
      window.removeEventListener('unhandledrejection', handleUnhandledRejection)
      window.clearTimeout(clearRecoveryFlag)
    }
  }, [])

  return null
}
