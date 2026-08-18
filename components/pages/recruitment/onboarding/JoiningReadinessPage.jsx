'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, CheckCircle2, Circle, Loader2, UserPlus } from 'lucide-react'
import { Badge } from '@/components/common/Badge'
import { PageLoader } from '@/components/common/LoadingSpinner'
import { preboardingApi } from '@/services/preboardingApi'
import { cn, formatDate } from '@/lib/utils'

const TABS = [
  'Joining Details',
  'Employment Details',
  'Personal Details',
  'Contact Details',
  'Bank & Statutory',
  'Compensation',
  'Documents',
  'Employee Master Preview',
]

function money(value) {
  if (value == null || value === '') return null
  return `INR ${Number(value).toLocaleString('en-IN')}`
}

function valueText(value) {
  if (value == null || value === '') return '-'
  if (String(value).match(/^\d{4}-\d{2}-\d{2}T/)) return formatDate(value, 'dd MMM yyyy')
  return String(value)
}

function SectionCard({ title, children, action }) {
  return (
    <div className="stat-card space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-semibold text-slate-800 dark:text-slate-100">{title}</h3>
        {action}
      </div>
      {children}
    </div>
  )
}

function Row({ label, value }) {
  return (
    <div className="flex items-start justify-between gap-4 text-sm py-1.5 border-b border-slate-50 dark:border-slate-800/60 last:border-0">
      <span className="text-slate-400">{label}</span>
      <span className="text-slate-700 dark:text-slate-200 font-medium text-right">{valueText(value)}</span>
    </div>
  )
}

function Checklist({ rows }) {
  return (
    <div className="space-y-2">
      {rows.map((row) => (
        <div key={row.key} className="flex items-center gap-3 text-sm">
          {row.ready ? <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" /> : <Circle className="w-4 h-4 text-slate-300 flex-shrink-0" />}
          <span className="flex-1 text-slate-700 dark:text-slate-200">{row.label}</span>
          <Badge variant={row.ready ? 'COMPLETE' : row.status}>{row.ready ? 'Ready' : row.status?.replace(/_/g, ' ')}</Badge>
        </div>
      ))}
    </div>
  )
}

function MasterPreviewTable({ master }) {
  const rows = [
    ['EMP Code', master.employeeCode],
    ['Company Name', master.companyName],
    ['Status', master.status],
    ['Company Code', master.companyCode],
    ['Name', master.name],
    ['COLOR CODE', master.colorCode],
    ['DISC TEST', master.discTest],
    ['COUNTRY', master.country],
    ['International / Domestic', master.workClassification],
    ['MOTHER HEAD', master.motherHead],
    ['Department', master.department],
    ['Designation', master.designation],
    ['Date of Joining', master.joiningDate],
    ['Working Hours', master.workingHours],
    ['In Timing', master.inTiming],
    ['Area Zone', master.areaZone],
    ['State', master.state],
    ['Location', master.location],
    ['Week Off', master.weekOff],
    ['Reporting To', master.reportingManager],
    ['Gender', master.gender],
    ['Marital Status', master.maritalStatus],
    ['Date of Birth', master.dateOfBirth],
    ['Anniversary Date', master.anniversaryDate],
    ['Blood Group', master.bloodGroup],
    ['Father Name', master.fatherName],
    ['Mother Name', master.motherName],
    ['Spouse Name', master.spouseName],
    ['Current Address', master.currentAddress],
    ['Permanent Address', master.permanentAddress],
    ['Phone No', master.phone],
    ['Emergency Contact No.', master.emergencyContactNumber],
    ['Emergency Person Name', master.emergencyPersonName],
    ['Official Phone Number', master.officialPhoneNumber],
    ['Personal Email ID', master.personalEmail],
    ['Official Mail ID', master.officialEmail || 'Not Created'],
    ['Bank Account No', master.bankAccountNumber],
    ['Bank Name', master.bankName],
    ['Bank IFSC Code', master.bankIfscCode],
    ['PAN Card No', master.panNumber],
    ['Aadhaar No', master.aadhaarNumber],
    ['UAN', master.uanNumber],
    ['PF NO', master.pfNumber],
    ['ESI', master.esiNumber],
    ['CTC', money(master.ctc)],
    ['Salary Take Home', money(master.salaryTakeHome)],
    ['verified Status', master.verifiedStatus],
    ['OFFER LETTER LINK', master.offerLetterLink],
    ['APPOINTMENT LETTER LINK', master.appointmentLetterLink || 'Pending Employee Creation'],
    ['PROBATION PERIOD', master.probationPeriod],
    ['DOE', 'NULL'],
    ['Remark', master.remark],
    ['Right HR APP', master.rightHrApp],
    ['HOD', master.hod],
  ]
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <tbody className="divide-y divide-slate-50 dark:divide-slate-800/60">
          {rows.map(([label, value]) => (
            <tr key={label}>
              <td className="py-2 pr-4 text-slate-400 whitespace-nowrap">{label}</td>
              <td className="py-2 text-slate-700 dark:text-slate-200 font-medium">{valueText(value)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function JoiningReadinessPage({ id }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('Joining Details')
  const [busy, setBusy] = useState(false)

  function load() {
    setLoading(true)
    preboardingApi.joiningReadiness(id)
      .then((res) => setData(res.data.data))
      .finally(() => setLoading(false))
  }
  useEffect(load, [id])

  async function markJoined() {
    setBusy(true)
    try {
      await preboardingApi.markJoined(id)
      load()
    } catch (err) {
      alert(err.response?.data?.message || 'Could not mark joined')
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <PageLoader />
  if (!data) return <div className="stat-card text-center py-16">Joining readiness was not found.</div>

  const { candidate, job, preboarding, master, checklist } = data
  const candidateName = master.name || `${candidate?.firstName || ''} ${candidate?.lastName || ''}`.trim()

  return (
    <div className="animate-fade-in space-y-6 max-w-6xl">
      <Link href={`/hr/onboarding/${id}`} className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
        <ArrowLeft className="w-3.5 h-3.5" /> Back to Preboarding
      </Link>

      <div className="page-header">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{candidateName}</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">{master.designation || job?.publicTitle || job?.jobTitle}</p>
          <p className="text-xs text-slate-400 mt-1">Joining: {master.joiningDate ? formatDate(master.joiningDate, 'dd MMM yyyy') : '-'}</p>
        </div>
        <div className="text-right space-y-2">
          <Badge variant={checklist.readyToCreateEmployee ? 'COMPLETE' : 'PENDING'}>
            Employee Creation {checklist.readyToCreateEmployee ? 'READY' : 'NOT READY'}
          </Badge>
          <p className="text-xs text-slate-400">Readiness {checklist.readinessPercentage}%</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {checklist.preconditions.map((row) => (
          <div key={row.key} className="stat-card !p-4">
            <p className="text-xs text-slate-400">{row.label}</p>
            <p className={cn('text-sm font-semibold mt-1', row.ready ? 'text-emerald-600' : 'text-amber-600')}>{row.status}</p>
          </div>
        ))}
      </div>

      <div className="stat-card !p-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Proposed Employee Code</p>
          <p className="text-xs text-slate-400 mt-0.5">{master.employeeCode} is reserved only during final employee creation.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {!checklist.joined && (
            <button onClick={markJoined} disabled={busy || !checklist.mandatoryReady} className="btn-primary">
              {busy && <Loader2 className="w-4 h-4 animate-spin" />} Mark as Joined
            </button>
          )}
          <Link href={`/hr/onboarding/${id}/convert`} className={cn('btn-primary', !checklist.readyToCreateEmployee && 'pointer-events-none opacity-50')}>
            <UserPlus className="w-4 h-4" /> Create Employee
          </Link>
        </div>
      </div>

      <div className="border-b border-slate-100 dark:border-slate-800 overflow-x-auto">
        <div className="flex gap-1 min-w-max">
          {TABS.map((t) => (
            <button key={t} onClick={() => setTab(t)} className={cn('px-3.5 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap', tab === t ? 'border-blue-600 text-blue-600 dark:text-blue-400' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200')}>
              {t}
            </button>
          ))}
        </div>
      </div>

      {tab === 'Joining Details' && (
        <div className="grid lg:grid-cols-2 gap-4">
          <SectionCard title="Employee Master Readiness">
            <Checklist rows={checklist.required} />
          </SectionCard>
          <SectionCard title="Optional / Post-Joining Fields">
            <Checklist rows={checklist.optional} />
          </SectionCard>
        </div>
      )}
      {tab === 'Employment Details' && (
        <SectionCard title="Employment Details">
          <Row label="Company Name" value={master.companyName} />
          <Row label="Company Code" value={master.companyCode} />
          <Row label="Department" value={master.department} />
          <Row label="Designation" value={master.designation} />
          <Row label="Date of Joining" value={master.joiningDate} />
          <Row label="Working Hours" value={master.workingHours} />
          <Row label="In Timing" value={master.inTiming} />
          <Row label="Area Zone" value={master.areaZone} />
          <Row label="Country" value={master.country} />
          <Row label="State" value={master.state} />
          <Row label="Location" value={master.location} />
          <Row label="International / Domestic" value={master.workClassification} />
          <Row label="Week Off" value={master.weekOff} />
          <Row label="Reporting To" value={master.reportingManager} />
          <Row label="HOD" value={master.hod} />
          <Row label="Mother Head" value={master.motherHead} />
          <Row label="Status" value={master.status} />
        </SectionCard>
      )}
      {tab === 'Personal Details' && (
        <SectionCard title="Personal Details">
          <Row label="Name" value={master.name} />
          <Row label="Gender" value={master.gender} />
          <Row label="Marital Status" value={master.maritalStatus} />
          <Row label="Date of Birth" value={master.dateOfBirth} />
          <Row label="Anniversary Date" value={master.anniversaryDate} />
          <Row label="Blood Group" value={master.bloodGroup} />
          <Row label="Father Name" value={master.fatherName} />
          <Row label="Mother Name" value={master.motherName} />
          <Row label="Spouse Name" value={master.spouseName} />
        </SectionCard>
      )}
      {tab === 'Contact Details' && (
        <SectionCard title="Contact Details">
          <Row label="Current Address" value={master.currentAddress} />
          <Row label="Permanent Address" value={master.permanentAddress} />
          <Row label="Phone No" value={master.phone} />
          <Row label="Emergency Contact No." value={master.emergencyContactNumber} />
          <Row label="Emergency Person Name" value={master.emergencyPersonName} />
          <Row label="Official Phone Number" value={master.officialPhoneNumber} />
          <Row label="Personal Email ID" value={master.personalEmail} />
          <Row label="Official Mail ID" value={master.officialEmail || 'Not Created'} />
        </SectionCard>
      )}
      {tab === 'Bank & Statutory' && (
        <SectionCard title="Bank & Statutory">
          <Row label="Bank Account No" value={master.bankAccountNumber} />
          <Row label="Bank Name" value={master.bankName} />
          <Row label="Bank IFSC Code" value={master.bankIfscCode} />
          <Row label="PAN Card No" value={master.panNumber} />
          <Row label="Aadhaar No" value={master.aadhaarNumber} />
          <Row label="UAN" value={master.uanNumber || 'Missing'} />
          <Row label="PF No" value={master.pfNumber || 'To be generated'} />
          <Row label="ESI" value={master.esiNumber || 'Not available'} />
        </SectionCard>
      )}
      {tab === 'Compensation' && (
        <SectionCard title="Compensation">
          <Row label="Annual CTC" value={money(master.ctc)} />
          <Row label="Monthly Gross" value={master.ctc ? money(master.ctc / 12) : null} />
          <Row label="Estimated Take Home" value={money(master.salaryTakeHome)} />
          <Row label="Probation Period" value={master.probationPeriod} />
        </SectionCard>
      )}
      {tab === 'Documents' && (
        <SectionCard title="Documents">
          <Row label="Offer Letter" value={master.offerLetterLink || 'Pending'} />
          <Row label="Appointment Letter" value="Pending Employee Creation" />
        </SectionCard>
      )}
      {tab === 'Employee Master Preview' && (
        <SectionCard title="Employee Master Preview">
          <MasterPreviewTable master={master} />
        </SectionCard>
      )}
    </div>
  )
}
