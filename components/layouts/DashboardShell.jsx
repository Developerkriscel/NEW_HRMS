'use client'

import { useState, useEffect } from 'react'
import { PageLoader } from '@/components/common/LoadingSpinner'
import { Navbar } from '@/components/common/Navbar'
import { Sidebar } from '@/components/common/Sidebar'
import { useUIStore } from '@/store/uiStore'
import { useAuthStore } from '@/store/authStore'

export function DashboardShell({ children }) {
  const { theme } = useUIStore()
  const { hydrated, isLoading, fetchMe, isAuthenticated, logout } = useAuthStore()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [sidebarHovered, setSidebarHovered] = useState(false)

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

  useEffect(() => {
    if (hydrated && !isAuthenticated) {
      logout()
    }
  }, [hydrated, isAuthenticated, logout])

  if (!hydrated || isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <PageLoader />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <Sidebar
        mobileOpen={mobileOpen}
        onDesktopHoverChange={setSidebarHovered}
        onMobileClose={() => setMobileOpen(false)}
      />

      {/* Desktop padding tracks hover-expanded sidebar width so it never overlays content. */}
      <div
        className={`min-h-screen flex flex-col transition-[padding-left] duration-300 ${
          sidebarHovered ? 'lg:pl-[240px]' : 'lg:pl-[96px]'
        }`}
      >
        <div className="lg:hidden" />
        <Navbar onMobileMenuToggle={() => setMobileOpen(true)} />

        <main className="flex-1 p-4 lg:p-6 lg:pt-4">
          <div className="animate-fade-in">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
