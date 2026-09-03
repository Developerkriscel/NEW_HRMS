'use client'

import dynamic from 'next/dynamic'
import { PageLoader } from '@/components/common/LoadingSpinner'

const EmployeesList = dynamic(
  () => import('@/components/pages/EmployeesList').then((mod) => mod.EmployeesList),
  { ssr: false, loading: () => <PageLoader /> }
)

export default function HREmployeesPage() {
  return <EmployeesList basePath="/hr/employees" />
}
