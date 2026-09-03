'use client'

import { useEffect } from 'react'

export default function Error({ error, reset }) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 p-4 text-center">
      <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-2">Something went wrong</h2>
      <p className="text-sm text-slate-500 max-w-sm mb-6">{error?.message || 'An unexpected error occurred.'}</p>
      <button onClick={() => reset()} className="btn-primary">
        Try again
      </button>
    </div>
  )
}
