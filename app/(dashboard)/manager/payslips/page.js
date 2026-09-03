'use client'

import dynamic from 'next/dynamic'
import { PageLoader } from '@/components/common/LoadingSpinner'

const EmployeePayslipsWorkspace = dynamic(
  () => import('@/components/pages/EmployeePayslipsWorkspace').then((mod) => mod.EmployeePayslipsWorkspace),
  { ssr: false, loading: () => <PageLoader /> }
)

export default function ManagerPayslipsPage() {
  return <EmployeePayslipsWorkspace />
}
