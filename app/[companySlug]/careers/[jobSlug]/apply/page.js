import { ApplicationForm } from '@/components/pages/careers/ApplicationForm'

export default function ApplyPage({ params, searchParams }) {
  return (
    <ApplicationForm
      companySlug={params.companySlug}
      jobSlug={params.jobSlug}
      source={searchParams?.source}
      ref={searchParams?.ref}
    />
  )
}
