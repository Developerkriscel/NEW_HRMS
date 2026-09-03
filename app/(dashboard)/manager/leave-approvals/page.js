'use client'

import dynamic from 'next/dynamic'
import { PageLoader } from '@/components/common/LoadingSpinner'

const ManagerApprovalsWorkspace = dynamic(
  () => import('@/components/pages/ManagerApprovalsWorkspace').then((mod) => mod.ManagerApprovalsWorkspace),
  { ssr: false, loading: () => <PageLoader /> }
)

export default function ManagerLeaveApprovalsPage() {
  return <ManagerApprovalsWorkspace />
}
