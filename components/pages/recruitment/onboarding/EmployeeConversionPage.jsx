'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, CheckCircle2, Loader2, ShieldAlert, UserPlus } from 'lucide-react'
import { Badge } from '@/components/common/Badge'
import { PageLoader } from '@/components/common/LoadingSpinner'
import { preboardingApi } from '@/services/preboardingApi'
import { formatDate } from '@/lib/utils'

function money(value) {
  if (value == null || value === '') return '-'
  return `INR ${Number(value).toLocaleString('en-IN')}`
}

function Row({ label, value }) {
  return (
    <div className="flex items-start justify-between gap-4 text-sm py-1.5 border-b border-slate-50 dark:border-slate-800/60 last:border-0">
      <span className="text-slate-400">{label}</span>
      <span className="text-slate-700 dark:text-slate-200 font-medium text-right">{value ?? '-'}</span>
    </div>
  )
}

function SectionCard({ title, children }) {
  return (
    <div className="stat-card space-y-3">
      <h3 className="font-semibold text-slate-800 dark:text-slate-100">{title}</h3>
      {children}
    </div>
  )
}

export function EmployeeConversionPage({ id }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [overrideDuplicate, setOverrideDuplicate] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

  function load() {
    setLoading(true)
    preboardingApi.conversionPreview(id)
      .then((res) => setData(res.data.data))
      .finally(() => setLoading(false))
  }
  useEffect(load, [id])

  async function createEmployee() {
    setBusy(true)
    setError(null)
    try {
      const res = await preboardingApi.convertToEmployee(id, { overrideDuplicate })
      setResult(res.data.data)
      load()
    } catch (err) {
      setError(err.response?.data || { message: 'Employee creation failed' })
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <PageLoader />
  if (!data) return <div className="stat-card text-center py-16">Conversion preview was not found.</div>

  const { candidate, application, offer, job, preboarding, master, checklist, duplicates } = data
  const ready = checklist.readyToCreateEmployee

  if (result?.employee) {
    return (
      <div className="animate-fade-in space-y-6 max-w-4xl">
        <Link href={`/hr/recruitment/onboarding/${id}/joining`} className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Joining Readiness
        </Link>
        <div className="stat-card text-center py-12">
          <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Employee Created Successfully</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">{result.employee.employeeCode} - {result.employee.firstName} {result.employee.lastName}</p>
          {result.tempPassword && (
            <div className="mt-4 mx-auto max-w-sm rounded-lg bg-slate-50 dark:bg-slate-800 p-3 text-left">
              <p className="text-xs text-slate-400">Temporary password</p>
              <p className="font-mono text-sm text-slate-800 dark:text-slate-100">{result.tempPassword}</p>
            </div>
          )}
          {result.vacancy?.canMarkJobFilled && (
            <div className="mt-4 mx-auto max-w-md rounded-lg bg-amber-50 dark:bg-amber-900/20 p-3 text-left">
              <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">All vacancies for this job are now filled.</p>
              <p className="text-xs text-amber-700 dark:text-amber-300/80 mt-0.5">Filled {result.vacancy.filledOpenings} of {result.vacancy.totalOpenings}. Mark the job FILLED from the job workspace when ready.</p>
            </div>
          )}
          <div className="mt-6 flex justify-center gap-2 flex-wrap">
            <Link href={`/company/employees/${result.employee._id}`} className="btn-primary">View Employee</Link>
            <Link href="/hr/recruitment/onboarding" className="btn-secondary">Back to Onboarding</Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="animate-fade-in space-y-6 max-w-5xl">
      <Link href={`/hr/recruitment/onboarding/${id}/joining`} className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
        <ArrowLeft className="w-3.5 h-3.5" /> Back to Joining Readiness
      </Link>

      <div className="page-header">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Create Employee</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">{master.name} - {master.designation || job?.jobTitle}</p>
          <p className="text-xs text-slate-400 mt-1">Candidate: {candidate?.candidateCode} | Application: {application?.applicationCode}</p>
        </div>
        <Badge variant={ready ? 'COMPLETE' : 'PENDING'}>{ready ? 'Ready for Employee Creation' : 'Not Ready'}</Badge>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <SectionCard title="Conversion Summary">
          <Row label="Offer" value={offer?.status || '-'} />
          <Row label="Joining" value={master.joiningDate ? formatDate(master.joiningDate, 'dd MMM yyyy') : '-'} />
          <Row label="Readiness" value={`${checklist.readinessPercentage}%`} />
          <Row label="Joining Status" value={preboarding?.status} />
          <Row label="Conversion Status" value={data.conversionStatus} />
        </SectionCard>

        <SectionCard title="Employee Master Target">
          <Row label="Employee Code" value={master.employeeCode} />
          <Row label="Company" value={master.companyName} />
          <Row label="Department" value={master.department} />
          <Row label="Designation" value={master.designation} />
          <Row label="Reporting To" value={master.reportingManager} />
          <Row label="Annual CTC" value={money(master.ctc)} />
        </SectionCard>
      </div>

      {!ready && (
        <div className="stat-card border border-amber-200 dark:border-amber-900/60 bg-amber-50/70 dark:bg-amber-900/20">
          <p className="font-semibold text-amber-800 dark:text-amber-300">Employee creation is blocked by mandatory readiness gaps.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {checklist.missingRequired.map((row) => (
              <Badge key={row.key} variant="PENDING">{row.label}</Badge>
            ))}
          </div>
        </div>
      )}

      {duplicates?.length > 0 && (
        <div className="stat-card border border-red-200 dark:border-red-900/60 bg-red-50/70 dark:bg-red-900/20 space-y-3">
          <div className="flex gap-3">
            <ShieldAlert className="w-5 h-5 text-red-500 flex-shrink-0" />
            <div>
              <p className="font-semibold text-red-800 dark:text-red-300">Possible existing employee</p>
              <p className="text-sm text-red-700 dark:text-red-300/80">Review the match before creating another Employee Master record.</p>
            </div>
          </div>
          {duplicates.map((dup) => (
            <div key={dup.employee._id} className="rounded-lg bg-white/70 dark:bg-slate-950/30 p-3 text-sm">
              <p className="font-medium text-slate-800 dark:text-slate-100">{dup.employee.employeeCode} - {dup.employee.firstName} {dup.employee.lastName}</p>
              <p className="text-xs text-slate-500 mt-0.5">Matches: {dup.matches.join(', ')}</p>
            </div>
          ))}
          <label className="inline-flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
            <input type="checkbox" className="rounded border-slate-300" checked={overrideDuplicate} onChange={(e) => setOverrideDuplicate(e.target.checked)} />
            Authorized override
          </label>
        </div>
      )}

      {error && (
        <div className="stat-card border border-red-200 dark:border-red-900/60 bg-red-50/70 dark:bg-red-900/20">
          <p className="font-semibold text-red-800 dark:text-red-300">Employee creation failed</p>
          <p className="text-sm text-red-700 dark:text-red-300/80 mt-1">{error.message}</p>
        </div>
      )}

      <div className="stat-card !p-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Final conversion</p>
          <p className="text-xs text-slate-400 mt-0.5">This creates the Employee Master record and assigns the EMPLOYEE base role.</p>
        </div>
        <button
          onClick={createEmployee}
          disabled={busy || !ready || (duplicates?.length > 0 && !overrideDuplicate)}
          className="btn-primary"
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
          Create Employee
        </button>
      </div>
    </div>
  )
}
