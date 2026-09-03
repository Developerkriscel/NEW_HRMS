'use client'

import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 p-4 text-center">
      <h1 className="text-6xl font-extrabold text-slate-800 dark:text-slate-100 mb-2">404</h1>
      <h2 className="text-xl font-semibold text-slate-700 dark:text-slate-200 mb-2">Page Not Found</h2>
      <p className="text-sm text-slate-500 max-w-sm mb-6">The page you are looking for does not exist or has been moved.</p>
      <Link href="/" className="btn-primary">
        Return to Dashboard
      </Link>
    </div>
  )
}
