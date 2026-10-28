'use client'

import React, { useState } from 'react'
import { User, MapPin, HeartPulse, Save, CreditCard, Edit3, X, ShieldCheck } from 'lucide-react'
import { preboardingApi } from '@/services/preboardingApi'

function SectionCard({ icon: Icon, title, description, children, tone = 'blue' }) {
  const tones = {
    blue: 'from-blue-50/90 to-white border-blue-100 text-blue-600 dark:from-blue-950/20 dark:to-slate-900 dark:border-blue-900/40',
    rose: 'from-rose-50/90 to-white border-rose-100 text-rose-600 dark:from-rose-950/20 dark:to-slate-900 dark:border-rose-900/40',
    amber: 'from-amber-50/90 to-white border-amber-100 text-amber-600 dark:from-amber-950/20 dark:to-slate-900 dark:border-amber-900/40',
    emerald: 'from-emerald-50/90 to-white border-emerald-100 text-emerald-600 dark:from-emerald-950/20 dark:to-slate-900 dark:border-emerald-900/40',
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

export function OnboardingEmployeeDetails({ record, onRefresh }) {
  const [isEditing, setIsEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState('')
  const [saveError, setSaveError] = useState('')
  
  // Try to parse the candidate name
  const nameParts = record.candidate.name.split(' ')
  const initialFirstName = nameParts[0] || ''
  const initialLastName = nameParts.slice(1).join(' ') || ''

  const raw = record.raw || {}
  const personal = raw.personal || {}
  const emergencyContact = raw.emergencyContact || {}
  const bank = raw.bank || {}
  const statutory = raw.statutory || {}
  const customFields = statutory.customFields || {}

  const [formData, setFormData] = useState({
    firstName: personal.fullLegalName?.split(' ')?.[0] || initialFirstName,
    lastName: personal.fullLegalName?.split(' ')?.slice(1).join(' ') || initialLastName,
    employeeCode: record.employeeCode || '',
    preferredName: personal.preferredName || '',
    officialEmail: customFields.officialEmail || record.candidate.email || '',
    phone: personal.mobileNumber || record.candidate.phone || '',
    personalEmail: personal.personalEmail || record.candidate.email || '',
    fatherName: customFields.fatherName || '',
    motherName: customFields.motherName || '',
    spouseName: customFields.spouseName || '',
    bloodGroup: customFields.bloodGroup || '',
    gender: customFields.gender || '',
    maritalStatus: customFields.maritalStatus || '',
    dateOfBirth: personal.dateOfBirth?.slice?.(0, 10) || '',
    anniversaryDate: customFields.anniversaryDate?.slice?.(0, 10) || '',
    currentAddress: personal.currentAddress || '',
    permanentAddress: personal.permanentAddress || '',
    emergencyContactNumber: emergencyContact.phone || '',
    emergencyPersonName: emergencyContact.contactName || '',
    emergencyRelationship: emergencyContact.relationship || '',
    emergencyAlternatePhone: emergencyContact.alternatePhone || '',
    bankName: bank.bankName || '',
    bankAccountNumber: bank.bankAccountNumber || '',
    confirmBankAccountNumber: bank.bankAccountNumber || '',
    bankIfscCode: bank.bankIfscCode || '',
    bankBranch: bank.bankBranch || '',
    accountHolderName: bank.accountHolderName || '',
    panNumber: statutory.panNumber || '',
    aadhaarNumber: customFields.aadhaarNumber || '',
    pfNumber: customFields.pfNumber || '',
    uanNumber: statutory.uanNumber || '',
    esiNumber: customFields.esiNumber || '',
    previousPfMember: statutory.previousPfMember ?? '',
    declarationAccurate: personal.declarationAccurate || false,
    declarationWillNotify: personal.declarationWillNotify || false,
    requestedJoiningDate: record.raw?.requestedJoiningDate?.slice?.(0, 10) || '',
    requestedJoiningReason: record.raw?.requestedJoiningReason || '',
    availableToJoin: record.raw?.availableToJoin ?? null,
    relocationRequired: record.raw?.relocationRequired ?? null,
    accommodationRequired: record.raw?.accommodationRequired ?? null,
  })
  const [employmentHistory, setEmploymentHistory] = useState(record.raw?.employmentHistory || [])
  const [education, setEducation] = useState(record.raw?.education || [])

  const handleChange = (key, value) => {
    setFormData(prev => ({ ...prev, [key]: value }))
  }

  const handleSave = async () => {
    const requiredKeys = ['firstName', 'lastName', 'officialEmail', 'personalEmail', 'phone', 'dateOfBirth', 'currentAddress', 'emergencyPersonName', 'emergencyContactNumber']
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
    if (formData.bankAccountNumber && formData.bankAccountNumber !== formData.confirmBankAccountNumber) {
      setSaveError('Bank account numbers do not match')
      return
    }

    setSaving(true)
    setSaveError('')
    setSaveMessage('')
    try {
      await preboardingApi.updateEmployeeDetails(record.id, { ...formData, employmentHistory, education })
      setIsEditing(false)
      setSaveMessage('Employee details saved and onboarding progress updated')
      await onRefresh?.()
      window.setTimeout(() => setSaveMessage(''), 3000)
    } catch (err) {
      setSaveError(err.response?.data?.message || err.message || 'Failed to save employee details')
    } finally {
      setSaving(false)
    }
  }

  // Helper for rendering form fields elegantly
  const renderField = (label, key, type = 'text', options = null) => {
    return (
      <div id={`field-${key}`} className="rounded-2xl border border-slate-200/70 bg-white/85 p-4 shadow-sm transition-all focus-within:border-blue-300 focus-within:ring-4 focus-within:ring-blue-500/10 dark:border-slate-800 dark:bg-slate-950/40">
        <label className="mb-2 block text-[11px] font-extrabold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">{label}</label>
        {isEditing ? (
          options ? (
            <select className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-900 outline-none transition-all focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-500/10 dark:border-slate-800 dark:bg-slate-900 dark:text-white" value={formData[key]} onChange={e => handleChange(key, e.target.value)}>
              <option value="">Select {label}</option>
              {options.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </select>
          ) : type === 'textarea' ? (
            <textarea rows="2" className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-900 outline-none transition-all focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-500/10 dark:border-slate-800 dark:bg-slate-900 dark:text-white" value={formData[key]} onChange={e => handleChange(key, e.target.value)} />
          ) : (
            <input type={type} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-900 outline-none transition-all focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-500/10 dark:border-slate-800 dark:bg-slate-900 dark:text-white" value={formData[key]} onChange={e => handleChange(key, e.target.value)} />
          )
        ) : (
          <p className={`truncate text-sm font-bold ${formData[key] ? 'text-slate-900 dark:text-white' : 'text-slate-400 dark:text-slate-500'}`}>
            {type === 'date' && formData[key] 
              ? new Date(formData[key]).toLocaleDateString() 
              : formData[key] || '-'}
          </p>
        )}
      </div>
    )
  }

  const renderArrayField = (row, index, key, items, setItems) => {
    const labels = { employerName: 'Employer', designation: 'Designation', startDate: 'Start Date', endDate: 'End Date', employeeId: 'Employee ID', reasonForLeaving: 'Reason for Leaving', degree: 'Degree', specialization: 'Specialization', institution: 'Institution', university: 'University', startYear: 'Start Year', completionYear: 'Completion Year', score: 'Score' }
    const value = row?.[key] || ''
    return (
      <label key={key} className="text-xs font-bold text-slate-500">
        {labels[key] || key}
        <input type={key.toLowerCase().includes('date') ? 'date' : 'text'} className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-white" value={value} onChange={(e) => setItems((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, [key]: e.target.value } : item))} />
      </label>
    )
  }

  const renderReadonlyChoice = (label, value) => (
    <div className="rounded-2xl border border-slate-200/70 bg-white/85 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/40">
      <p className="mb-2 text-[11px] font-extrabold uppercase tracking-[0.16em] text-slate-500">{label}</p>
      {isEditing ? (
        <select className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold" value={value == null ? '' : String(value)} onChange={(e) => handleChange(label === 'Available to Join' ? 'availableToJoin' : label === 'Relocation Required' ? 'relocationRequired' : 'accommodationRequired', e.target.value === '' ? null : e.target.value === 'true')}>
          <option value="">Not specified</option><option value="true">Yes</option><option value="false">No</option>
        </select>
      ) : <p className="text-sm font-bold">{value == null ? '-' : value ? 'Yes' : 'No'}</p>}
    </div>
  )

  return (
    <div className="animate-in fade-in p-5 pb-24 duration-300 md:p-8">
      <div className="mb-8 overflow-hidden rounded-3xl border border-blue-100 bg-gradient-to-br from-blue-50 via-white to-slate-50 p-6 shadow-sm dark:border-slate-800 dark:from-blue-950/20 dark:via-slate-900 dark:to-slate-950">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-extrabold uppercase tracking-wider text-blue-600 shadow-sm dark:bg-slate-900 dark:text-blue-400">
              <ShieldCheck className="h-3.5 w-3.5" /> Candidate master profile
            </div>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white">Employee Details</h3>
            <p className="mt-1 text-sm font-medium text-slate-500">Core personal, family, address, bank, and statutory information.</p>
        </div>
        {!isEditing ? (
            <button onClick={() => setIsEditing(true)} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-extrabold text-slate-700 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
              <Edit3 className="h-4 w-4" /> Edit Details
          </button>
        ) : (
          <div className="flex gap-2">
              <button onClick={() => setIsEditing(false)} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-extrabold text-slate-700 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
                <X className="h-4 w-4" /> Cancel
            </button>
              <button onClick={handleSave} disabled={saving} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-3 text-sm font-extrabold text-white shadow-lg shadow-blue-500/20 transition-all hover:-translate-y-0.5 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-70">
                <Save className="h-4 w-4" /> {saving ? 'Saving...' : 'Save Details'}
            </button>
          </div>
        )}
        </div>
      </div>

      {saveMessage && <div className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700 shadow-sm">{saveMessage}</div>}
      {saveError && <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-600 shadow-sm">{saveError}</div>}

      <div className="grid grid-cols-1 gap-6">
        
        {/* Core Details */}
        <SectionCard icon={User} title="Core Details" description="Identity and primary contact details used for employee creation." tone="blue">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
            {renderField('First Name *', 'firstName')}
            {renderField('Last Name *', 'lastName')}
            {renderField('Official Email *', 'officialEmail', 'email')}
            {renderField('Phone', 'phone', 'tel')}
            <div>
              {renderField('Employee ID (login username)', 'employeeCode')}
              {!record.employeeCode && <p className="mt-1 px-1 text-[11px] text-slate-500">Set a unique ID before conversion. The employee can use it with their password to sign in.</p>}
            </div>
          </div>
        </SectionCard>

        {/* Personal & Family */}
        <SectionCard icon={HeartPulse} title="Personal & Family" description="Optional demographic and family information for HR records." tone="rose">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {renderField('Personal Email', 'personalEmail', 'email')}
            {renderField('Preferred Name', 'preferredName')}
            {renderField('Father Name', 'fatherName')}
            {renderField('Mother Name', 'motherName')}
            {renderField('Spouse Name', 'spouseName')}
            {renderField('Blood Group', 'bloodGroup')}
            {renderField('Gender', 'gender', 'text', [
              { value: 'MALE', label: 'Male' },
              { value: 'FEMALE', label: 'Female' },
              { value: 'OTHER', label: 'Other' }
            ])}
            {renderField('Marital Status', 'maritalStatus', 'text', [
              { value: 'SINGLE', label: 'Single' },
              { value: 'MARRIED', label: 'Married' },
              { value: 'DIVORCED', label: 'Divorced' },
              { value: 'WIDOWED', label: 'Widowed' }
            ])}
            {renderField('Date of Birth', 'dateOfBirth', 'date')}
            {renderField('Anniversary Date', 'anniversaryDate', 'date')}
          </div>
        </SectionCard>

        {/* Address & Emergency */}
        <SectionCard icon={MapPin} title="Address & Emergency" description="Address proof and emergency contact details for onboarding file." tone="amber">
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {renderField('Current Address', 'currentAddress', 'textarea')}
              {renderField('Permanent Address', 'permanentAddress', 'textarea')}
            </div>
            <div className="grid grid-cols-1 gap-4 border-t border-white/80 pt-4 sm:grid-cols-2 dark:border-slate-800">
            {renderField('Emergency Contact No.', 'emergencyContactNumber', 'tel')}
            {renderField('Emergency Person Name', 'emergencyPersonName')}
            {renderField('Relationship', 'emergencyRelationship')}
            {renderField('Alternate Phone', 'emergencyAlternatePhone', 'tel')}
            </div>
          </div>
        </SectionCard>

        <SectionCard icon={User} title="Previous Employment" description="Employment history supplied in the email form.">
          {isEditing ? (
            <div className="space-y-3">
              {employmentHistory.map((row, index) => (
                <div key={index} className="grid grid-cols-1 gap-3 rounded-2xl border border-slate-200 p-3 sm:grid-cols-2 dark:border-slate-800">
                  {['employerName', 'designation', 'startDate', 'endDate', 'employeeId', 'reasonForLeaving'].map((key) => renderArrayField(row, index, key, employmentHistory, setEmploymentHistory))}
                  <button type="button" onClick={() => setEmploymentHistory((items) => items.filter((_, i) => i !== index))} className="text-left text-xs font-bold text-rose-600">Remove employment</button>
                </div>
              ))}
              <button type="button" onClick={() => setEmploymentHistory((items) => [...items, { employerName: '', designation: '', startDate: '', endDate: '', employeeId: '', reasonForLeaving: '' }])} className="text-xs font-bold text-blue-600">+ Add Previous Employment</button>
            </div>
          ) : <p className="text-sm text-slate-500">{employmentHistory.length ? `${employmentHistory.length} previous employment record(s)` : 'No previous employment added'}</p>}
        </SectionCard>

        <SectionCard icon={User} title="Education" description="Education history supplied in the email form.">
          {isEditing ? (
            <div className="space-y-3">
              {education.map((row, index) => (
                <div key={index} className="grid grid-cols-1 gap-3 rounded-2xl border border-slate-200 p-3 sm:grid-cols-2 dark:border-slate-800">
                  {['degree', 'specialization', 'institution', 'university', 'startYear', 'completionYear', 'score'].map((key) => renderArrayField(row, index, key, education, setEducation))}
                  <button type="button" onClick={() => setEducation((items) => items.filter((_, i) => i !== index))} className="text-left text-xs font-bold text-rose-600">Remove education</button>
                </div>
              ))}
              <button type="button" onClick={() => setEducation((items) => [...items, { degree: '', specialization: '', institution: '', university: '', startYear: '', completionYear: '', score: '' }])} className="text-xs font-bold text-blue-600">+ Add Education</button>
            </div>
          ) : <p className="text-sm text-slate-500">{education.length ? `${education.length} education record(s)` : 'No education added'}</p>}
        </SectionCard>

        {/* Financial & Legal */}
        <SectionCard icon={CreditCard} title="Financial & Legal" description="Bank, tax, PF, and ESIC details needed before payroll activation." tone="emerald">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {renderField('Bank Name', 'bankName')}
            {renderField('Account Holder Name', 'accountHolderName')}
            {renderField('Bank Account No', 'bankAccountNumber')}
            {renderField('Confirm Bank Account No', 'confirmBankAccountNumber')}
            {renderField('Bank IFSC Code', 'bankIfscCode')}
            {renderField('Bank Branch', 'bankBranch')}
            {renderField('PAN Card No', 'panNumber')}
            {renderField('Aadhar No', 'aadhaarNumber')}
            {renderField('UAN No', 'uanNumber')}
            {renderField('PF No', 'pfNumber')}
            {renderField('ESIC No', 'esiNumber')}
            {renderField('Previous PF Member', 'previousPfMember', 'text', [{ value: true, label: 'Yes' }, { value: false, label: 'No' }])}
          </div>
        </SectionCard>

        <SectionCard icon={MapPin} title="Joining Information" description="Candidate responses from the email form.">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {renderReadonlyChoice('Available to Join', formData.availableToJoin)}
            {renderReadonlyChoice('Relocation Required', formData.relocationRequired)}
            {renderReadonlyChoice('Accommodation Required', formData.accommodationRequired)}
            {renderField('Requested Joining Date', 'requestedJoiningDate', 'date')}
            {renderField('Requested Joining Reason', 'requestedJoiningReason', 'textarea')}
          </div>
        </SectionCard>

        <SectionCard icon={ShieldCheck} title="Declaration" description="Confirmation submitted by the candidate.">
          <div className="space-y-2 text-sm text-slate-700 dark:text-slate-200">
            <label className="flex items-center gap-2"><input type="checkbox" checked={formData.declarationAccurate} onChange={(e) => handleChange('declarationAccurate', e.target.checked)} disabled={!isEditing} /> Information is accurate.</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={formData.declarationWillNotify} onChange={(e) => handleChange('declarationWillNotify', e.target.checked)} disabled={!isEditing} /> I will notify the company if information changes.</label>
          </div>
        </SectionCard>

      </div>
    </div>
  )
}
