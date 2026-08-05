'use client'

import { useEffect, useState } from 'react'
import { AlertTriangle, Laptop, Send } from 'lucide-react'
import { Badge } from '@/components/common/Badge'
import { DataTable } from '@/components/tables/DataTable'
import { assetApi } from '@/services/assetApi'
import { formatDate } from '@/lib/utils'

export function AssetsWorkspace({ title, subtitle, employeeMode = false, reviewMode = false }) {
  const [assets, setAssets] = useState([])
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [requestForm, setRequestForm] = useState({ assetName: '', type: 'NEW', reason: '' })
  const [reportingAssetId, setReportingAssetId] = useState('')
  const [reportNote, setReportNote] = useState('')

  function load() {
    setLoading(true)
    Promise.all([
      assetApi.list(),
      assetApi.listRequests({ size: 100 }),
    ])
      .then(([assetRes, requestRes]) => {
        setAssets(assetRes.data.data || [])
        setRequests(requestRes.data.data.content || [])
      })
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  async function requestAsset(e) {
    e.preventDefault()
    setSaving(true)
    setMessage('')
    try {
      await assetApi.request(requestForm)
      setRequestForm({ assetName: '', type: 'NEW', reason: '' })
      setMessage('Asset request submitted')
      load()
    } catch (err) {
      setMessage(err.response?.data?.message || 'Failed to submit request')
    } finally {
      setSaving(false)
    }
  }

  async function reviewRequest(id, approved) {
    setSaving(true)
    setMessage('')
    try {
      if (approved) await assetApi.approveRequest(id, 'Approved from workspace')
      else await assetApi.rejectRequest(id, 'Rejected from workspace')
      setMessage(approved ? 'Request approved' : 'Request rejected')
      load()
    } catch (err) {
      setMessage(err.response?.data?.message || 'Failed to update request')
    } finally {
      setSaving(false)
    }
  }

  async function reportAsset(e) {
    e.preventDefault()
    if (!reportingAssetId) return
    setSaving(true)
    setMessage('')
    try {
      await assetApi.report(reportingAssetId, { status: 'DAMAGED', note: reportNote, requestReplacement: true })
      setReportingAssetId('')
      setReportNote('')
      setMessage('Asset reported and replacement request opened')
      load()
    } catch (err) {
      setMessage(err.response?.data?.message || 'Failed to report asset')
    } finally {
      setSaving(false)
    }
  }

  const assetColumns = [
    { header: 'Asset', accessor: 'name', render: (_, row) => (
      <div>
        <p className="font-medium text-slate-800 dark:text-slate-100">{row.name}</p>
        <p className="text-xs text-slate-400">{row.assetTag} - {row.category || 'Asset'}</p>
      </div>
    ) },
    { header: 'Assigned To', accessor: 'assignedTo', render: (v) => v ? `${v.firstName} ${v.lastName}` : 'Unassigned' },
    { header: 'Status', accessor: 'status', render: (v) => <Badge>{v}</Badge> },
    { header: 'Assigned Date', accessor: 'assignedDate', render: (v) => formatDate(v) },
  ]

  const requestColumns = [
    { header: 'Request', accessor: 'assetName', render: (_, row) => (
      <div>
        <p className="font-medium text-slate-800 dark:text-slate-100">{row.assetName}</p>
        <p className="text-xs text-slate-400">{row.type} - {row.reason || 'No reason added'}</p>
      </div>
    ) },
    { header: 'For', accessor: 'requestedFor', render: (v) => v ? `${v.firstName} ${v.lastName}` : 'Me' },
    { header: 'Status', accessor: 'status', render: (v) => <Badge>{v}</Badge> },
    { header: 'Created', accessor: 'createdAt', render: (v) => formatDate(v) },
  ]

  if (reviewMode) {
    requestColumns.push({
      header: 'Action',
      key: 'action',
      sortable: false,
      render: (_, row) => row.status === 'PENDING' ? (
        <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
          <button disabled={saving} className="btn-secondary py-1.5" onClick={() => reviewRequest(row._id, true)}>Approve</button>
          <button disabled={saving} className="btn-secondary py-1.5 text-red-600" onClick={() => reviewRequest(row._id, false)}>Reject</button>
        </div>
      ) : null,
    })
  }

  return (
    <div className="animate-fade-in space-y-6">
      <div className="page-header">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{title}</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">{subtitle}</p>
        </div>
      </div>

      {employeeMode && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <form onSubmit={requestAsset} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-4 space-y-3">
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2"><Laptop className="w-4 h-4" /> Request Asset</h3>
            <input required className="input-field" placeholder="Laptop, monitor, access card..." value={requestForm.assetName} onChange={(e) => setRequestForm({ ...requestForm, assetName: e.target.value })} />
            <select className="input-field" value={requestForm.type} onChange={(e) => setRequestForm({ ...requestForm, type: e.target.value })}>
              <option value="NEW">NEW</option>
              <option value="REPLACEMENT">REPLACEMENT</option>
            </select>
            <textarea className="input-field" rows={2} placeholder="Reason" value={requestForm.reason} onChange={(e) => setRequestForm({ ...requestForm, reason: e.target.value })} />
            <button disabled={saving} className="btn-primary"><Send className="w-4 h-4" /> Submit Request</button>
          </form>

          <form onSubmit={reportAsset} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-4 space-y-3">
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> Report Damaged Asset</h3>
            <select required className="input-field" value={reportingAssetId} onChange={(e) => setReportingAssetId(e.target.value)}>
              <option value="">Select assigned asset</option>
              {assets.map((asset) => <option key={asset._id} value={asset._id}>{asset.name} ({asset.assetTag})</option>)}
            </select>
            <textarea className="input-field" rows={2} placeholder="What happened?" value={reportNote} onChange={(e) => setReportNote(e.target.value)} />
            <button disabled={saving || !reportingAssetId} className="btn-secondary"><AlertTriangle className="w-4 h-4" /> Report and Request Replacement</button>
          </form>
        </div>
      )}

      {message && <p className="text-sm text-slate-500 dark:text-slate-400">{message}</p>}

      <DataTable
        columns={assetColumns}
        data={assets}
        isLoading={loading}
        searchPlaceholder="Search assets..."
        emptyMessage="No assets found"
      />

      <DataTable
        columns={requestColumns}
        data={requests}
        isLoading={loading}
        searchPlaceholder="Search requests..."
        emptyMessage="No asset requests found"
      />
    </div>
  )
}
