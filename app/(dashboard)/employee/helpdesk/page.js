'use client'

import dynamic from 'next/dynamic'
import { PageLoader } from '@/components/common/LoadingSpinner'

const HelpdeskWorkspace = dynamic(
  () => import('@/components/pages/HelpdeskWorkspace').then((mod) => mod.HelpdeskWorkspace),
  { ssr: false, loading: () => <PageLoader /> }
)

export default function EmployeeHelpdeskPage() {
  return (
    <HelpdeskWorkspace
      title="Helpdesk"
      subtitle="Raise tickets and track your support requests"
      canRaise
    />
  )
}
