'use client'

import dynamic from 'next/dynamic'
import { PageLoader } from '@/components/common/LoadingSpinner'

const EmployeeExpensesWorkspace = dynamic(
  () => import('@/components/pages/EmployeeExpensesWorkspace').then((mod) => mod.EmployeeExpensesWorkspace),
  { ssr: false, loading: () => <PageLoader /> }
)

export default function ManagerExpensesPage() {
  return (
    <EmployeeExpensesWorkspace />
  )
}
