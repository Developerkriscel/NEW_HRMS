'use client'

import { useState, useEffect } from 'react'
import { Sidebar } from '@/components/common/Sidebar'
import { Navbar } from '@/components/common/Navbar'
import { Breadcrumbs } from '@/components/common/Breadcrumbs'
import { PageLoader } from '@/components/common/LoadingSpinner'
import { useUIStore } from '@/store/uiStore'
import { useAuthStore } from '@/store/authStore'

export function DashboardShell({ children }) {
  const { theme } = useUIStore()
  const { hydrated, isLoading, fetchMe } = useAuthStore()
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [theme])

  useEffect(() => {
    if (!hydrated) fetchMe()
  }, [hydrated, fetchMe])

  if (isLoading && !hydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <PageLoader />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <Sidebar mobileOpen={mobileOpen} onMobileClose={() => setMobileOpen(false)} />

      {/* lg:pl-[96px] = SIDEBAR_COLLAPSED_WIDTH (64) + 32 — Tailwind can't
          read the JS constant here, so this must stay in sync by hand. */}
      <div className="min-h-screen flex flex-col lg:pl-[96px]">
        <div className="lg:hidden" />
        <Navbar onMobileMenuToggle={() => setMobileOpen(true)} />

        <main className="flex-1 p-4 lg:p-6">
          <Breadcrumbs />
          <div className="animate-fade-in">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
