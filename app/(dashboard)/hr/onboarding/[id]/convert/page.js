import { EmployeeConversionPage } from '@/components/pages/recruitment/onboarding/EmployeeConversionPage'

export default function EmployeeConversionRoute({ params }) {
  return <EmployeeConversionPage id={params.id} />
}
