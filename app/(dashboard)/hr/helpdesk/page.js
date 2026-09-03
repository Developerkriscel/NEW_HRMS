'use client'

import dynamic from 'next/dynamic'
import { PageLoader } from '@/components/common/LoadingSpinner'

const HelpdeskWorkspace = dynamic(
  () => import('@/components/pages/HelpdeskWorkspace').then((mod) => mod.HelpdeskWorkspace),
  { ssr: false, loading: () => <PageLoader /> }
)

export default function HRHelpdeskPage() {
  return (
    <HelpdeskWorkspace
      title="Helpdesk"
      subtitle="Track employee tickets and update their status"
      canManage
    />
  )
}
