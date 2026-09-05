'use client'

import React, { useState } from 'react'
import { User, MapPin, HeartPulse, Save, CreditCard, Edit3, X, ShieldCheck } from 'lucide-react'

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

export function OnboardingEmployeeDetails({ record }) {
  const [isEditing, setIsEditing] = useState(false)
  
  // Try to parse the candidate name
  const nameParts = record.candidate.name.split(' ')
  const initialFirstName = nameParts[0] || ''
  const initialLastName = nameParts.slice(1).join(' ') || ''

  const [formData, setFormData] = useState({
    firstName: initialFirstName,
    lastName: initialLastName,
    officialEmail: record.candidate.email || '',
    phone: record.candidate.phone || '',
    personalEmail: '',
    fatherName: '',
    motherName: '',
    spouseName: '',
    bloodGroup: '',
    gender: '',
    maritalStatus: '',
    dateOfBirth: '',
    anniversaryDate: '',
    currentAddress: '',
    permanentAddress: '',
    emergencyContactNumber: '',
    emergencyPersonName: '',
    bankName: '',
    bankAccountNumber: '',
    bankIfscCode: '',
    panNumber: '',
    aadhaarNumber: '',
    pfNumber: '',
    esiNumber: ''
  })

  const handleChange = (key, value) => {
    setFormData(prev => ({ ...prev, [key]: value }))
  }

  const handleSave = () => {
    const requiredKeys = ['firstName', 'lastName', 'officialEmail']
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
    
    setIsEditing(false)
    // Here we would typically save to the store/API
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
              <button onClick={handleSave} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-3 text-sm font-extrabold text-white shadow-lg shadow-blue-500/20 transition-all hover:-translate-y-0.5 hover:shadow-xl">
                <Save className="h-4 w-4" /> Save Details
            </button>
          </div>
        )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        
        {/* Core Details */}
        <SectionCard icon={User} title="Core Details" description="Identity and primary contact details used for employee creation." tone="blue">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {renderField('First Name *', 'firstName')}
            {renderField('Last Name *', 'lastName')}
            {renderField('Official Email *', 'officialEmail', 'email')}
            {renderField('Phone', 'phone', 'tel')}
          </div>
        </SectionCard>

        {/* Personal & Family */}
        <SectionCard icon={HeartPulse} title="Personal & Family" description="Optional demographic and family information for HR records." tone="rose">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {renderField('Personal Email', 'personalEmail', 'email')}
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
            </div>
          </div>
        </SectionCard>

        {/* Financial & Legal */}
        <SectionCard icon={CreditCard} title="Financial & Legal" description="Bank, tax, PF, and ESIC details needed before payroll activation." tone="emerald">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {renderField('Bank Name', 'bankName')}
            {renderField('Bank Account No', 'bankAccountNumber')}
            {renderField('Bank IFSC Code', 'bankIfscCode')}
            {renderField('PAN Card No', 'panNumber')}
            {renderField('Aadhar No', 'aadhaarNumber')}
            {renderField('PF No', 'pfNumber')}
            {renderField('ESIC No', 'esiNumber')}
          </div>
        </SectionCard>

      </div>
    </div>
  )
}
