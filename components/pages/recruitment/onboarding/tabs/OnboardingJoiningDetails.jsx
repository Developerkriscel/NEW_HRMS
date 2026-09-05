'use client'

import React, { useEffect, useState } from 'react'
import { Building, Briefcase, CreditCard, Clock, Save, Edit3, X, Sparkles } from 'lucide-react'
import { branchApi, departmentApi, shiftApi } from '@/services/departmentApi'
import { preboardingApi } from '@/services/preboardingApi'
import { employeeApi } from '@/services/employeeApi'

function SectionCard({ icon: Icon, title, description, children, tone = 'blue' }) {
  const tones = {
    blue: 'from-blue-50/90 to-white border-blue-100 text-blue-600 dark:from-blue-950/20 dark:to-slate-900 dark:border-blue-900/40',
    amber: 'from-amber-50/90 to-white border-amber-100 text-amber-600 dark:from-amber-950/20 dark:to-slate-900 dark:border-amber-900/40',
    emerald: 'from-emerald-50/90 to-white border-emerald-100 text-emerald-600 dark:from-emerald-950/20 dark:to-slate-900 dark:border-emerald-900/40',
    violet: 'from-violet-50/90 to-white border-violet-100 text-violet-600 dark:from-violet-950/20 dark:to-slate-900 dark:border-violet-900/40',
  }

  return (
    <section className={`rounded-3xl border bg-gradient-to-br p-5 shadow-sm ${tones[tone]}`}>
      <div className="mb-5 flex items-start gap-3 border-b border-white/70 pb-4 dark:border-slate-800/70">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-slate-100 dark:bg-slate-900 dark:ring-slate-800">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <h4 className="text-sm font-extrabold uppercase tracking-[0.18em] text-slate-800 dark:text-slate-100">{title}</h4>
          {description && <p className="mt-1 text-xs font-medium normal-case tracking-normal text-slate-500 dark:text-slate-400">{description}</p>}
        </div>
      </div>
      {children}
    </section>
  )
}

const DERIVED_FIELDS = new Set([
  'workLocation',
  'branchAddress',
  'branchPhone',
  'branchCity',
  'branchState',
  'branchCountry',
  'shiftStartTime',
  'shiftEndTime',
  'gracePeriodMinutes',
  'workingDays',
  'weeklyOff',
])

function branchLocationLabel(branch) {
  if (!branch) return ''
  return [branch.name, branch.city, branch.state].filter(Boolean).join(' - ')
}

function normalizeShift(shift) {
  if (!shift || typeof shift !== 'object') return null
  const workingDays = Array.isArray(shift.workingDays) && shift.workingDays.length
    ? shift.workingDays
    : ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
  const weeklyOff = Array.isArray(shift.weeklyOff) && shift.weeklyOff.length
    ? shift.weeklyOff
    : ['Saturday', 'Sunday']
  return { ...shift, workingDays, weeklyOff }
}

function formatDays(days = []) {
  return days.join(', ')
}

export function OnboardingJoiningDetails({ record, onRefresh }) {
  const recordShift = normalizeShift(record.shift || record.offer?.shift)
  const recordBranch = record.branch || null
  const [isEditing, setIsEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState('')
  const [saveError, setSaveError] = useState('')
  const [departments, setDepartments] = useState([])
  const [shifts, setShifts] = useState([])
  const [branches, setBranches] = useState([])
  const [managers, setManagers] = useState([])
  const [departmentError, setDepartmentError] = useState(false)
  const [shiftError, setShiftError] = useState(false)
  const [branchError, setBranchError] = useState(false)
  
  const [formData, setFormData] = useState({
    department: record.department?._id || record.departmentId || record.offer?.departmentId || record.department || '',
    designation: record.designation || record.offer?.designation || '',
    role: 'EMPLOYEE',
    employmentType: record.employmentType || 'Full Time',
    workMode: record.workMode || 'On-site',
    workLocation: record.workLocation || record.offer?.location || '',
    reportingManager: record.reportingManager || record.offer?.reportingManager || '',
    joiningDate: record.joiningDate ? record.joiningDate.split('T')[0] : record.offer?.joiningDate ? record.offer.joiningDate.split('T')[0] : '',
    probationPeriod: '3 Months',
    companyCode: 'NEXA001',
    companyName: 'NexaHR Solutions',
    branch: recordBranch?._id || record.branch || record.locationId || '',
    branchAddress: recordBranch?.address || '',
    branchPhone: recordBranch?.phone || '',
    branchCity: recordBranch?.city || '',
    branchState: recordBranch?.state || '',
    branchCountry: recordBranch?.country || '',
    shift: recordShift?._id || record.shift || '',
    shiftStartTime: recordShift?.startTime || '',
    shiftEndTime: recordShift?.endTime || '',
    gracePeriodMinutes: recordShift?.gracePeriodMinutes ?? '',
    workingDays: formatDays(recordShift?.workingDays || []),
    leavePolicy: 'Standard Probation',
    weeklyOff: formatDays(recordShift?.weeklyOff || ['Saturday', 'Sunday']),
    holidayCalendar: 'India - Karnataka',
    ctc: record.ctc || record.offer?.ctc || '',
    salaryStructure: record.salaryStructure || record.offer?.salaryStructure || 'Standard Bracket',
    pfEligible: record.pfEligible === false || record.offer?.pfEligible === false ? 'No' : 'Yes',
    esiEligible: record.esiEligible === false || record.offer?.esiEligible === false ? 'No' : 'Yes',
    ptEligible: record.ptEligible === false || record.offer?.ptEligible === false ? 'No' : 'Yes',
    insuranceGroup: record.insuranceGroup || record.offer?.insuranceGroup || 'Tier 2'
  })

  useEffect(() => {
    Promise.allSettled([
      departmentApi.getAll(),
      branchApi.getAll(),
      shiftApi.getAll(),
      employeeApi.getAll({ size: 1000 })
    ]).then(([departmentResult, branchResult, shiftResult, employeeResult]) => {
      if (departmentResult.status === 'fulfilled') {
        setDepartments((departmentResult.value.data.data || []).filter((department) => department.active !== false))
        setDepartmentError(false)
      } else {
        setDepartments([])
        setDepartmentError(true)
      }

      if (branchResult.status === 'fulfilled') {
        setBranches((branchResult.value.data.data || []).filter((branch) => branch.active !== false))
        setBranchError(false)
      } else {
        setBranches([])
        setBranchError(true)
      }

      if (shiftResult.status === 'fulfilled') {
        setShifts((shiftResult.value.data.data || []).filter((shift) => shift.active !== false).map(normalizeShift))
        setShiftError(false)
      } else {
        setShifts([])
        setShiftError(true)
      }

      if (employeeResult.status === 'fulfilled') {
        const emps = employeeResult.value.data?.data?.content || employeeResult.value.data?.data || []
        const eligible = emps.filter(e => ['COMPANY_ADMIN', 'HR_MANAGER', 'MANAGER'].includes(e.role))
        setManagers(eligible)
      } else {
        setManagers([])
      }
    })
  }, [])

  useEffect(() => {
    if (!formData.branch || branches.length === 0) return
    const selectedBranch = branches.find((branch) => branch._id === formData.branch)
    if (!selectedBranch) return
    setFormData(prev => ({
      ...prev,
      workLocation: branchLocationLabel(selectedBranch) || prev.workLocation,
      branchAddress: selectedBranch.address || '',
      branchPhone: selectedBranch.phone || '',
      branchCity: selectedBranch.city || '',
      branchState: selectedBranch.state || '',
      branchCountry: selectedBranch.country || '',
    }))
  }, [branches, formData.branch])

  useEffect(() => {
    if (!formData.shift || shifts.length === 0) return
    const selectedShift = shifts.find((shift) => shift._id === formData.shift)
    if (!selectedShift) return
    setFormData(prev => ({
      ...prev,
      shiftStartTime: selectedShift.startTime || '',
      shiftEndTime: selectedShift.endTime || '',
      gracePeriodMinutes: selectedShift.gracePeriodMinutes ?? 0,
      workingDays: formatDays(selectedShift.workingDays),
      weeklyOff: formatDays(selectedShift.weeklyOff),
    }))
  }, [shifts, formData.shift])

  const handleChange = (key, value) => {
    if (key === 'branch') {
      const selectedBranch = branches.find((branch) => branch._id === value)
      setFormData(prev => ({
        ...prev,
        branch: value,
        workLocation: branchLocationLabel(selectedBranch) || prev.workLocation,
        branchAddress: selectedBranch?.address || '',
        branchPhone: selectedBranch?.phone || '',
        branchCity: selectedBranch?.city || '',
        branchState: selectedBranch?.state || '',
        branchCountry: selectedBranch?.country || '',
      }))
      return
    }
    if (key === 'shift') {
      const selectedShift = shifts.find((shift) => shift._id === value)
      setFormData(prev => ({
        ...prev,
        shift: value,
        shiftStartTime: selectedShift?.startTime || '',
        shiftEndTime: selectedShift?.endTime || '',
        gracePeriodMinutes: selectedShift?.gracePeriodMinutes ?? '',
        workingDays: selectedShift ? formatDays(selectedShift.workingDays) : '',
        weeklyOff: selectedShift ? formatDays(selectedShift.weeklyOff) : '',
      }))
      return
    }
    setFormData(prev => ({ ...prev, [key]: value }))
  }

  const handleSave = async () => {
    const requiredKeys = ['department', 'designation', 'employmentType', 'workLocation', 'joiningDate', 'reportingManager']
    for (const key of requiredKeys) {
      if (!formData[key] || !String(formData[key]).trim()) {
        const el = document.getElementById(`field-${key}`)
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' })
          el.querySelector('input, select, textarea')?.focus()
          el.classList.add('border-red-500', 'ring-4', 'ring-red-500/20')
          setTimeout(() => el.classList.remove('border-red-500', 'ring-4', 'ring-red-500/20'), 2000)
        }
        return
      }
    }

    setSaving(true)
    setSaveError('')
    setSaveMessage('')
    try {
      if (!/^[a-f\d]{24}$/i.test(record.id)) throw new Error('This onboarding profile is not connected to database')
      await preboardingApi.updateJoiningConfig(record.id, formData)

      setIsEditing(false)
      setSaveMessage('Joining configuration saved')
      await onRefresh?.()
      window.setTimeout(() => setSaveMessage(''), 3000)
    } catch (err) {
      setSaveError(err.response?.data?.message || err.message || 'Failed to save joining configuration')
    } finally {
      setSaving(false)
    }
  }

  const departmentOptions = departments.map((department) => ({
    value: department._id,
    label: department.name,
  }))
  const shiftOptions = shifts.map((shift) => ({
    value: shift._id,
    label: `${shift.name} (${shift.startTime} - ${shift.endTime})`,
  }))
  const branchOptions = branches.map((branch) => ({
    value: branch._id,
    label: branchLocationLabel(branch),
  }))

  const renderField = (label, key, type = 'text', options = null) => {
    const normalizedOptions = options?.map((opt) => (
      typeof opt === 'string' ? { value: opt, label: opt } : opt
    ))
    const selectedOption = normalizedOptions?.find((opt) => opt.value === formData[key])
    const isDerived = DERIVED_FIELDS.has(key)

    return (
      <div id={`field-${key}`} className="rounded-2xl border border-slate-200/70 bg-white/85 p-4 shadow-sm transition-all focus-within:border-violet-300 focus-within:ring-4 focus-within:ring-violet-500/10 dark:border-slate-800 dark:bg-slate-950/40">
        <div className="mb-2 flex items-center justify-between gap-2">
          <label className="block text-[11px] font-extrabold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">{label}</label>
          {isDerived && <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-extrabold text-blue-600 dark:bg-blue-500/10 dark:text-blue-300">Auto</span>}
        </div>
        {isEditing && !isDerived ? (
          normalizedOptions ? (
            <select className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-900 outline-none transition-all focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-500/10 dark:border-slate-800 dark:bg-slate-900 dark:text-white" value={formData[key]} onChange={e => handleChange(key, e.target.value)}>
              <option value="">Select</option>
              {normalizedOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </select>
          ) : (
            <input type={type} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-900 outline-none transition-all focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-500/10 dark:border-slate-800 dark:bg-slate-900 dark:text-white" value={formData[key]} onChange={e => handleChange(key, e.target.value)} />
          )
        ) : (
          <p className={`truncate text-sm font-bold ${selectedOption?.label || formData[key] ? 'text-slate-900 dark:text-white' : 'text-slate-400 dark:text-slate-500'}`}>
            {type === 'date' && formData[key] ? new Date(formData[key]).toLocaleDateString() : selectedOption?.label || formData[key] || '-'}
          </p>
        )}
      </div>
    )
  }

  const managerOptions = managers.map(m => ({ value: m._id, label: `${m.firstName} ${m.lastName}` }))

  return (
    <div className="animate-in fade-in p-5 pb-24 duration-300 md:p-8">
      <div className="mb-8 overflow-hidden rounded-3xl border border-violet-100 bg-gradient-to-br from-violet-50 via-white to-slate-50 p-6 shadow-sm dark:border-slate-800 dark:from-violet-950/20 dark:via-slate-900 dark:to-slate-950">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-extrabold uppercase tracking-wider text-violet-600 shadow-sm dark:bg-slate-900 dark:text-violet-400">
              <Sparkles className="h-3.5 w-3.5" /> Joining setup
            </div>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white">Joining Details & Configuration</h3>
            <p className="mt-1 text-sm font-medium text-slate-500">Employment terms, branch assignment, shift rules, payroll, and benefits.</p>
          </div>
          {!isEditing ? (
            <button onClick={() => setIsEditing(true)} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-extrabold text-slate-700 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
              <Edit3 className="h-4 w-4" /> Edit Config
            </button>
          ) : (
            <div className="flex flex-wrap gap-2">
              <button onClick={() => setIsEditing(false)} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-extrabold text-slate-700 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
                <X className="h-4 w-4" /> Cancel
              </button>
              <button onClick={handleSave} disabled={saving} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 to-blue-600 px-5 py-3 text-sm font-extrabold text-white shadow-lg shadow-violet-500/20 transition-all hover:-translate-y-0.5 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-70">
                <Save className="h-4 w-4" /> {saving ? 'Saving...' : 'Save Config'}
              </button>
            </div>
          )}
        </div>
      </div>

      {saveMessage && <div className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700 shadow-sm">{saveMessage}</div>}
      {saveError && <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-600 shadow-sm">{saveError}</div>}

      <div className="grid grid-cols-1 gap-6">
        
        {/* Employment & Placement */}
        <SectionCard icon={Briefcase} title="Employment & Placement" description="Role, department, manager, and joining timeline." tone="blue">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div>
              {renderField('Department', 'department', 'text', departmentOptions)}
              {departmentError && <p className="mt-1 text-[11px] font-medium text-rose-500">Unable to load departments from settings.</p>}
              {!departmentError && departments.length === 0 && <p className="mt-1 text-[11px] font-medium text-amber-600">Create a department in Settings first.</p>}
            </div>
            {renderField('Designation', 'designation')}
            {renderField('Authority / Role', 'role', 'text', ['EMPLOYEE', 'MANAGER', 'HR_MANAGER', 'FINANCE', 'IT_ADMIN'])}
            {renderField('Employment Type', 'employmentType', 'text', ['Full Time', 'Part Time', 'Contract', 'Intern'])}
            {renderField('Joining Date', 'joiningDate', 'date')}
            {renderField('Reporting Manager', 'reportingManager', 'text', managerOptions)}
            {renderField('Probation Period', 'probationPeriod')}
          </div>
        </SectionCard>

        {/* Company & Attendance Config */}
        <SectionCard icon={Clock} title="Company & Attendance Config" description="Company defaults and attendance policy context." tone="amber">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {renderField('Company Code', 'companyCode')}
            {renderField('Company Name', 'companyName')}
            {renderField('Work Mode', 'workMode', 'text', ['On-site', 'Hybrid', 'Remote'])}
            {renderField('Holiday Calendar', 'holidayCalendar')}
          </div>
        </SectionCard>

        {/* Branch & Shift Config */}
        <SectionCard icon={Building} title="Branch, Location & Shift" description="Choose branch and shift; related location and working rules auto-fill." tone="violet">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div>
              {renderField('Branch', 'branch', 'text', branchOptions)}
              {branchError && <p className="mt-1 text-[11px] font-medium text-rose-500">Unable to load branches from settings.</p>}
              {!branchError && branches.length === 0 && <p className="mt-1 text-[11px] font-medium text-amber-600">Create a branch in Settings first.</p>}
            </div>
            {renderField('Work Location', 'workLocation')}
            <div>
              {renderField('Shift', 'shift', 'text', shiftOptions)}
              {shiftError && <p className="mt-1 text-[11px] font-medium text-rose-500">Unable to load shifts from settings.</p>}
              {!shiftError && shifts.length === 0 && <p className="mt-1 text-[11px] font-medium text-amber-600">Create a shift in Settings first.</p>}
            </div>
            {renderField('Shift Time', 'shiftStartTime')}
            {renderField('Shift End', 'shiftEndTime')}
            {renderField('Grace Minutes', 'gracePeriodMinutes', 'number')}
            {renderField('Working Days', 'workingDays')}
            {renderField('Weekly Off', 'weeklyOff')}
            {renderField('Branch Address', 'branchAddress')}
            {renderField('Branch Phone', 'branchPhone')}
            {renderField('Branch City', 'branchCity')}
            {renderField('Branch State', 'branchState')}
            {renderField('Branch Country', 'branchCountry')}
            {renderField('Leave Policy', 'leavePolicy')}
          </div>
        </SectionCard>

        {/* Payroll & Benefits */}
        <SectionCard icon={CreditCard} title="Payroll & Benefits" description="Salary, statutory benefits, and insurance grouping." tone="emerald">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {renderField('Annual CTC', 'ctc', 'number')}
            {renderField('Salary Structure', 'salaryStructure', 'text', ['Standard Bracket', 'No PF Bracket', 'Executive Bracket', 'Custom'])}
            {renderField('PF Eligible', 'pfEligible', 'text', ['Yes', 'No'])}
            {renderField('ESI Eligible', 'esiEligible', 'text', ['Yes', 'No'])}
            {renderField('PT Eligible', 'ptEligible', 'text', ['Yes', 'No'])}
            {renderField('Insurance Group', 'insuranceGroup', 'text', ['Not Applicable', 'Tier 1', 'Tier 2', 'Tier 3'])}
          </div>
        </SectionCard>

      </div>
    </div>
  )
}
