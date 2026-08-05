'use client'

import { useEffect, useState } from 'react'
import { UserPlus } from 'lucide-react'
import { Badge } from '@/components/common/Badge'
import { DataTable } from '@/components/tables/DataTable'
import { recruitmentApi } from '@/services/recruitmentApi'

const STAGES = ['APPLIED', 'SCREENING', 'INTERVIEW', 'OFFERED', 'HIRED', 'REJECTED']

export function RecruitmentWorkspace() {
  const [candidates, setCandidates] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [form, setForm] = useState({ name: '', email: '', phone: '', roleApplied: '', source: '', resumeUrl: '' })

  function load() {
    setLoading(true)
    recruitmentApi.list()
      .then((res) => setCandidates(res.data.data || []))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  async function addCandidate(e) {
    e.preventDefault()
    setSaving(true)
    setMessage('')
    try {
      await recruitmentApi.create(form)
      setForm({ name: '', email: '', phone: '', roleApplied: '', source: '', resumeUrl: '' })
      setMessage('Candidate added')
      load()
    } catch (err) {
      setMessage(err.response?.data?.message || 'Failed to add candidate')
    } finally {
      setSaving(false)
    }
  }

  async function updateStage(row, stage) {
    setSaving(true)
    setMessage('')
    try {
      await recruitmentApi.update(row._id, { stage })
      setMessage('Candidate updated')
      load()
    } catch (err) {
      setMessage(err.response?.data?.message || 'Failed to update candidate')
    } finally {
      setSaving(false)
    }
  }

  const columns = [
    { header: 'Candidate', accessor: 'name', render: (_, row) => (
      <div>
        <p className="font-medium text-slate-800 dark:text-slate-100">{row.name}</p>
        <p className="text-xs text-slate-400">{row.email} - {row.phone || 'No phone'}</p>
      </div>
    ) },
    { header: 'Role', accessor: 'roleApplied' },
    { header: 'Source', accessor: 'source' },
    { header: 'Stage', accessor: 'stage', render: (v) => <Badge>{v}</Badge> },
    { header: 'Action', key: 'action', sortable: false, render: (_, row) => (
      <select className="input-field min-w-36" value={row.stage} disabled={saving} onChange={(e) => updateStage(row, e.target.value)}>
        {STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
      </select>
    ) },
  ]

  return (
    <div className="animate-fade-in space-y-6">
      <div className="page-header">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Recruitment</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Track candidates and hiring stages</p>
        </div>
      </div>
      <form onSubmit={addCandidate} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-4 grid grid-cols-1 md:grid-cols-3 gap-3">
        <input required className="input-field" placeholder="Candidate name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <input required type="email" className="input-field" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <input className="input-field" placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        <input required className="input-field" placeholder="Role applied" value={form.roleApplied} onChange={(e) => setForm({ ...form, roleApplied: e.target.value })} />
        <input className="input-field" placeholder="Source" value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} />
        <button disabled={saving} className="btn-primary"><UserPlus className="w-4 h-4" /> Add Candidate</button>
      </form>
      {message && <p className="text-sm text-slate-500 dark:text-slate-400">{message}</p>}
      <DataTable columns={columns} data={candidates} isLoading={loading} searchPlaceholder="Search candidates..." emptyMessage="No candidates found" />
    </div>
  )
}
