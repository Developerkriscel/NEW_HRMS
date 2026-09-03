'use client'

import { useEffect, useState } from 'react'
import { AlertTriangle, Laptop, Send, Plus, X, AlertOctagon, Check, Trash2, Edit2, RotateCcw, Package, Settings, Wrench, Search, Users } from 'lucide-react'
import { Badge } from '@/components/common/Badge'
import { DataTable } from '@/components/tables/DataTable'
import { assetApi } from '@/services/assetApi'
import { employeeApi } from '@/services/employeeApi'
import { formatDate } from '@/lib/utils'
import { PageLoader } from '@/components/common/LoadingSpinner'
import { Portal } from '@/components/common/Portal'

export function AssetsWorkspace({ title, subtitle, employeeMode = false, reviewMode = false }) {
  const [activeTab, setActiveTab] = useState('directory')
  const [assets, setAssets] = useState([])
  const [requests, setRequests] = useState([])
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  // Modals state
  const [requestForm, setRequestForm] = useState({ assetName: '', type: 'NEW', reason: '' })
  const [showRequestForm, setShowRequestForm] = useState(false)
  
  const [showReportForm, setShowReportForm] = useState(false)
  const [reportingAssetId, setReportingAssetId] = useState('')
  const [reportNote, setReportNote] = useState('')

  const [showAddForm, setShowAddForm] = useState(false)
  const [addForm, setAddForm] = useState({ assetTag: '', name: '', category: 'Laptop', condition: 'Good' })

  const [showAssignForm, setShowAssignForm] = useState(false)
  const [assignAssetId, setAssignAssetId] = useState('')
  const [assignEmployeeId, setAssignEmployeeId] = useState('')

  const [showRecoverForm, setShowRecoverForm] = useState(false)
  const [recoverAssetId, setRecoverAssetId] = useState('')
  const [recoverCondition, setRecoverCondition] = useState('Good')
  const [recoverStatus, setRecoverStatus] = useState('AVAILABLE')

  function load() {
    setLoading(true)
    Promise.all([
      assetApi.list(),
      assetApi.listRequests({ size: 100 }),
      reviewMode ? employeeApi.getAll({ size: 1000 }).catch(() => ({ data: { data: { content: [] } } })) : Promise.resolve({ data: { data: { content: [] } } })
    ])
      .then(([assetRes, requestRes, empRes]) => {
        setAssets(assetRes.data.data || [])
        setRequests(requestRes.data.data?.content || [])
        if (reviewMode && empRes.data?.data?.content) {
          setEmployees(empRes.data.data.content)
        }
      })
      .finally(() => setLoading(false))
  }

  useEffect(load, [reviewMode])

  // KPIs
  const totalAssets = assets.length
  const availableAssets = assets.filter(a => a.status === 'AVAILABLE').length
  const assignedAssets = assets.filter(a => a.status === 'ASSIGNED').length
  const damagedAssets = assets.filter(a => a.status === 'DAMAGED' || a.status === 'RETIRED').length

  // Handlers for Employees
  async function requestAsset(e) {
    e.preventDefault()
    setSaving(true)
    setMessage('')
    try {
      await assetApi.request(requestForm)
      setRequestForm({ assetName: '', type: 'NEW', reason: '' })
      setMessage('Asset request submitted successfully')
      setShowRequestForm(false)
      load()
    } catch (err) {
      setMessage(err.response?.data?.message || 'Failed to submit request')
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
      setShowReportForm(false)
      load()
    } catch (err) {
      setMessage(err.response?.data?.message || 'Failed to report asset')
    } finally {
      setSaving(false)
    }
  }

  // Handlers for HR/Admin
  async function handleAddAsset(e) {
    e.preventDefault()
    setSaving(true)
    setMessage('')
    try {
      await assetApi.create(addForm)
      setAddForm({ assetTag: '', name: '', category: 'Laptop', condition: 'Good' })
      setShowAddForm(false)
      load()
    } catch (err) {
      setMessage(err.response?.data?.message || 'Failed to add asset')
    } finally {
      setSaving(false)
    }
  }

  async function handleAssignAsset(e) {
    e.preventDefault()
    if (!assignAssetId || !assignEmployeeId) return
    setSaving(true)
    setMessage('')
    try {
      await assetApi.assign(assignAssetId, assignEmployeeId)
      setShowAssignForm(false)
      setAssignAssetId('')
      setAssignEmployeeId('')
      load()
    } catch (err) {
      setMessage(err.response?.data?.message || 'Failed to assign asset')
    } finally {
      setSaving(false)
    }
  }

  async function handleRecoverAsset(e) {
    e.preventDefault()
    if (!recoverAssetId) return
    setSaving(true)
    setMessage('')
    try {
      await assetApi.recover(recoverAssetId, { status: recoverStatus, condition: recoverCondition })
      setShowRecoverForm(false)
      setRecoverAssetId('')
      load()
    } catch (err) {
      setMessage(err.response?.data?.message || 'Failed to recover asset')
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteAsset(id) {
    if (!confirm('Are you sure you want to delete this asset?')) return
    setSaving(true)
    try {
      await assetApi.delete(id)
      load()
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete asset')
    } finally {
      setSaving(false)
    }
  }

  async function reviewRequest(id, approved) {
    setSaving(true)
    setMessage('')
    try {
      if (approved) await assetApi.approveRequest(id, 'Approved')
      else await assetApi.rejectRequest(id, 'Rejected')
      load()
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update request')
    } finally {
      setSaving(false)
    }
  }

  // Tables
  const assetColumns = [
    { header: 'Asset Details', accessor: 'name', render: (_, row) => (
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
          <Laptop className="w-5 h-5 text-slate-500" />
        </div>
        <div>
          <p className="font-medium text-slate-800 dark:text-slate-100">{row.name}</p>
          <p className="text-xs text-slate-400">{row.assetTag} · {row.category || 'Hardware'}</p>
        </div>
      </div>
    ) },
    { header: 'Condition', accessor: 'condition', render: (v) => <span className="text-sm font-medium text-slate-600 dark:text-slate-300">{v || 'Good'}</span> },
    { header: 'Status', accessor: 'status', render: (v) => <Badge>{v}</Badge> },
    { header: 'Assignment', accessor: 'assignedTo', render: (v, row) => (
      v ? (
        <div>
          <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{v.firstName} {v.lastName}</p>
          <p className="text-xs text-slate-400">{formatDate(row.assignedDate)}</p>
        </div>
      ) : (
        <span className="text-sm text-slate-400 italic">Unassigned</span>
      )
    ) },
  ]

  if (reviewMode) {
    assetColumns.push({
      header: 'Actions',
      key: 'action',
      sortable: false,
      render: (_, row) => (
        <div className="flex gap-2">
          {row.status === 'AVAILABLE' && (
            <button 
              className="px-3 py-1.5 bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400 font-medium text-xs rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-colors"
              onClick={() => { setAssignAssetId(row._id); setShowAssignForm(true); }}
            >
              Assign
            </button>
          )}
          {row.status === 'ASSIGNED' && (
            <button 
              className="px-3 py-1.5 bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400 font-medium text-xs rounded-lg hover:bg-amber-100 dark:hover:bg-amber-500/20 transition-colors"
              onClick={() => { setRecoverAssetId(row._id); setShowRecoverForm(true); }}
            >
              Recover
            </button>
          )}
          <button 
            className="p-1.5 text-slate-400 hover:text-rose-500 transition-colors rounded-lg hover:bg-rose-50 dark:hover:bg-rose-500/10"
            onClick={() => handleDeleteAsset(row._id)}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      )
    })
  }

  const requestColumns = [
    { header: 'Request Info', accessor: 'assetName', render: (_, row) => (
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
          <Package className="w-5 h-5 text-slate-500" />
        </div>
        <div>
          <p className="font-medium text-slate-800 dark:text-slate-100">{row.assetName}</p>
          <p className="text-xs text-slate-400">{row.type} Request</p>
        </div>
      </div>
    ) },
    { header: 'Reason', accessor: 'reason', render: (v) => <span className="text-sm text-slate-600 dark:text-slate-400">{v || '-'}</span> },
    { header: 'Employee', accessor: 'requestedFor', render: (v) => v ? <span className="text-sm font-medium text-slate-800 dark:text-slate-200">{v.firstName} {v.lastName}</span> : 'Me' },
    { header: 'Status', accessor: 'status', render: (v) => <Badge>{v}</Badge> },
    { header: 'Date', accessor: 'createdAt', render: (v) => formatDate(v) },
  ]

  if (reviewMode) {
    requestColumns.push({
      header: 'Action',
      key: 'action',
      sortable: false,
      render: (_, row) => row.status === 'PENDING' ? (
        <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
          <button disabled={saving} className="px-3 py-1.5 bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 font-medium text-xs rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-500/20 transition-colors" onClick={() => reviewRequest(row._id, true)}>Approve</button>
          <button disabled={saving} className="px-3 py-1.5 bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400 font-medium text-xs rounded-lg hover:bg-rose-100 dark:hover:bg-rose-500/20 transition-colors" onClick={() => reviewRequest(row._id, false)}>Reject</button>
        </div>
      ) : null,
    })
  }

  const kpis = [
    { label: 'Total Assets', value: totalAssets, icon: Laptop, color: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-indigo-50 dark:bg-indigo-500/10' },
    { label: 'Available', value: availableAssets, icon: Check, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-500/10' },
    { label: 'Assigned', value: assignedAssets, icon: Users, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-500/10' },
    { label: 'Needs Attention', value: damagedAssets, icon: Wrench, color: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-50 dark:bg-rose-500/10' },
  ]

  return (
    <div className="animate-fade-in space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 relative z-10">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-800 dark:text-white">
            {title}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            {subtitle}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex bg-slate-100/50 dark:bg-slate-800/50 p-1 rounded-xl w-fit border border-slate-200/50 dark:border-slate-700/50 backdrop-blur-xl">
            <button onClick={() => setActiveTab('directory')} className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg font-bold text-xs transition-all duration-300 ${activeTab === 'directory' ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm ring-1 ring-slate-200 dark:ring-slate-700' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800'}`}>
              <Laptop className="w-3.5 h-3.5" /> {reviewMode ? 'Directory' : 'My Assets'}
            </button>
            <button onClick={() => setActiveTab('requests')} className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg font-bold text-xs transition-all duration-300 ${activeTab === 'requests' ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm ring-1 ring-slate-200 dark:ring-slate-700' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800'}`}>
              <Package className="w-3.5 h-3.5" /> Requests {requests.filter(r => r.status === 'PENDING').length > 0 && <span className="bg-rose-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">{requests.filter(r => r.status === 'PENDING').length}</span>}
            </button>
          </div>
          
          {reviewMode && activeTab === 'directory' && (
            <button 
              className="bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-4 rounded-xl font-bold text-sm transition-all shadow-[0_0_20px_-5px_rgba(79,70,229,0.5)] flex items-center gap-2" 
              onClick={() => { setMessage(''); setShowAddForm(true); }}
            >
              <Plus className="w-4 h-4" /> Add Asset
            </button>
          )}
        </div>

        {employeeMode && (
          <div className="flex items-center gap-3">
            <button className="bg-white hover:bg-slate-50 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 py-2 px-4 rounded-xl font-bold text-sm transition-all shadow-sm border border-slate-200 dark:border-slate-700 flex items-center gap-2" onClick={() => { setMessage(''); setShowReportForm(true); }}>
              <AlertTriangle className="w-4 h-4 text-amber-500" /> Report Issue
            </button>
            <button className="bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-4 rounded-xl font-bold text-sm transition-all shadow-[0_0_20px_-5px_rgba(79,70,229,0.5)] flex items-center gap-2" onClick={() => { setMessage(''); setShowRequestForm(true); }}>
              <Plus className="w-4 h-4" /> Request Asset
            </button>
          </div>
        )}
      </div>

      {/* KPI Cards (Review Mode Only) */}
      {reviewMode && activeTab === 'directory' && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {kpis.map((kpi, idx) => {
            const Icon = kpi.icon
            return (
              <div key={idx} className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/60 dark:border-slate-700/60 p-4 rounded-2xl shadow-sm flex items-center gap-4 transition-all hover:scale-[1.02] duration-300">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${kpi.bg}`}>
                  <Icon className={`w-6 h-6 ${kpi.color}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-800 dark:text-white leading-none">{kpi.value}</p>
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1 uppercase tracking-wider">{kpi.label}</p>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Tables */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
        {(!reviewMode || activeTab === 'directory') && (
          <div className={reviewMode && activeTab !== 'directory' ? 'hidden' : 'block'}>
            <DataTable
              columns={assetColumns}
              data={assets}
              isLoading={loading}
              searchPlaceholder="Search assets..."
              emptyMessage="No assets found"
            />
          </div>
        )}
        
        {(!reviewMode || activeTab === 'requests') && (
          <div className={reviewMode && activeTab !== 'requests' ? 'hidden' : 'block'}>
            <DataTable
              columns={requestColumns}
              data={requests}
              isLoading={loading}
              searchPlaceholder="Search requests..."
              emptyMessage="No asset requests found"
            />
          </div>
        )}
      </div>

      {/* === MODALS === */}
      {/* 1. Add Asset Modal */}
      {showAddForm && (
        <Portal><div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={() => setShowAddForm(false)}></div>
          <div className="max-h-[90dvh] overflow-y-auto relative bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-fade-in-up border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-500/20 flex items-center justify-center">
                  <Laptop className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">Add New Asset</h2>
                  <p className="text-xs text-slate-500 font-medium">Add hardware to the inventory</p>
                </div>
              </div>
              <button onClick={() => setShowAddForm(false)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            
            <form onSubmit={handleAddAsset} className="p-6 space-y-5">
              {message && <div className="p-3 rounded-lg text-sm font-medium border bg-rose-50 text-rose-700 border-rose-100">{message}</div>}
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase text-slate-500 ml-1">Asset Tag *</label>
                  <input required className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm font-medium text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all" placeholder="e.g. LAP-001" value={addForm.assetTag} onChange={(e) => setAddForm({ ...addForm, assetTag: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase text-slate-500 ml-1">Category</label>
                  <select className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm font-medium text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all" value={addForm.category} onChange={(e) => setAddForm({ ...addForm, category: e.target.value })}>
                    <option value="Laptop">Laptop</option>
                    <option value="Monitor">Monitor</option>
                    <option value="Phone">Phone</option>
                    <option value="Accessories">Accessories</option>
                    <option value="Software">Software License</option>
                  </select>
                </div>
              </div>
              
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase text-slate-500 ml-1">Asset Name *</label>
                <input required className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm font-medium text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all" placeholder="e.g. MacBook Pro M3 16GB" value={addForm.name} onChange={(e) => setAddForm({ ...addForm, name: e.target.value })} />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase text-slate-500 ml-1">Initial Condition</label>
                <input className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm font-medium text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all" placeholder="e.g. Brand New, Good" value={addForm.condition} onChange={(e) => setAddForm({ ...addForm, condition: e.target.value })} />
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button type="button" onClick={() => setShowAddForm(false)} className="px-5 py-2.5 rounded-xl font-bold text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">Cancel</button>
                <button type="submit" disabled={saving} className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm transition-all shadow-md flex items-center gap-2">
                  <Check className="w-4 h-4" /> Save Asset
                </button>
              </div>
            </form>
          </div>
        </div></Portal>
      )}

      {/* 2. Assign Asset Modal */}
      {showAssignForm && (
        <Portal><div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={() => setShowAssignForm(false)}></div>
          <div className="max-h-[90dvh] overflow-y-auto relative bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-fade-in-up border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 dark:border-slate-800">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Assign Asset</h2>
              <button onClick={() => setShowAssignForm(false)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-200 dark:hover:bg-slate-700">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            
            <form onSubmit={handleAssignAsset} className="p-6 space-y-5">
              {message && <div className="p-3 rounded-lg text-sm font-medium border bg-rose-50 text-rose-700 border-rose-100">{message}</div>}
              
              <div className="p-4 bg-indigo-50 dark:bg-indigo-500/10 rounded-xl mb-4 border border-indigo-100 dark:border-indigo-500/20">
                <p className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold uppercase mb-1">Asset to Assign</p>
                <p className="text-sm font-bold text-slate-900 dark:text-white">{assets.find(a => a._id === assignAssetId)?.name}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{assets.find(a => a._id === assignAssetId)?.assetTag}</p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase text-slate-500 ml-1">Select Employee *</label>
                <select required className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-medium text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all cursor-pointer" value={assignEmployeeId} onChange={(e) => setAssignEmployeeId(e.target.value)}>
                  <option value="">-- Choose Employee --</option>
                  {employees.map(emp => (
                    <option key={emp._id} value={emp._id}>{emp.firstName} {emp.lastName} ({emp.employeeCode})</option>
                  ))}
                </select>
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button type="button" onClick={() => setShowAssignForm(false)} className="px-5 py-2.5 rounded-xl font-bold text-sm text-slate-600 hover:bg-slate-100 transition-colors">Cancel</button>
                <button type="submit" disabled={saving || !assignEmployeeId} className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm transition-all shadow-md">
                  Confirm Assignment
                </button>
              </div>
            </form>
          </div>
        </div></Portal>
      )}

      {/* 3. Recover Asset Modal */}
      {showRecoverForm && (
        <Portal><div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={() => setShowRecoverForm(false)}></div>
          <div className="max-h-[90dvh] overflow-y-auto relative bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-fade-in-up border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 dark:border-slate-800">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Recover Asset</h2>
              <button onClick={() => setShowRecoverForm(false)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-200 dark:hover:bg-slate-700">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            
            <form onSubmit={handleRecoverAsset} className="p-6 space-y-5">
              {message && <div className="p-3 rounded-lg text-sm font-medium border bg-rose-50 text-rose-700 border-rose-100">{message}</div>}
              
              <div className="p-4 bg-amber-50 dark:bg-amber-500/10 rounded-xl mb-4 border border-amber-100 dark:border-amber-500/20">
                <p className="text-xs text-amber-600 dark:text-amber-400 font-semibold uppercase mb-1">Recovering From</p>
                <p className="text-sm font-bold text-slate-900 dark:text-white">{assets.find(a => a._id === recoverAssetId)?.assignedTo?.firstName} {assets.find(a => a._id === recoverAssetId)?.assignedTo?.lastName}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{assets.find(a => a._id === recoverAssetId)?.name}</p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase text-slate-500 ml-1">Return Status *</label>
                <select required className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-medium text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all cursor-pointer" value={recoverStatus} onChange={(e) => setRecoverStatus(e.target.value)}>
                  <option value="AVAILABLE">Available (Ready to assign)</option>
                  <option value="DAMAGED">Damaged (Needs repair)</option>
                  <option value="RETIRED">Retired (End of life)</option>
                  <option value="LOST">Lost / Stolen</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase text-slate-500 ml-1">Condition Notes</label>
                <input required className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm font-medium text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all" placeholder="e.g. Scratched screen, Good" value={recoverCondition} onChange={(e) => setRecoverCondition(e.target.value)} />
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button type="button" onClick={() => setShowRecoverForm(false)} className="px-5 py-2.5 rounded-xl font-bold text-sm text-slate-600 hover:bg-slate-100 transition-colors">Cancel</button>
                <button type="submit" disabled={saving} className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold text-sm transition-all shadow-md">
                  Complete Recovery
                </button>
              </div>
            </form>
          </div>
        </div></Portal>
      )}

      {/* Keep Employee Modals for Report/Request to maintain compatibility */}
      {/* 4. Employee Request Asset */}
      {showRequestForm && (
        <Portal><div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={() => setShowRequestForm(false)}></div>
          <div className="max-h-[90dvh] overflow-y-auto relative bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-fade-in-up border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-500/20 flex items-center justify-center">
                  <Laptop className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">Request Asset</h2>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">Apply for a new device or replacement</p>
                </div>
              </div>
              <button onClick={() => setShowRequestForm(false)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            
            <form onSubmit={requestAsset} className="p-6 space-y-5">
              {message && <div className="p-3 rounded-lg text-sm font-medium border bg-rose-50 text-rose-700">{message}</div>}

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase text-slate-500 ml-1">Asset Needed</label>
                <input required className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500" placeholder="e.g. MacBook Pro, External Monitor" value={requestForm.assetName} onChange={(e) => setRequestForm({ ...requestForm, assetName: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase text-slate-500 ml-1">Request Type</label>
                <select className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500" value={requestForm.type} onChange={(e) => setRequestForm({ ...requestForm, type: e.target.value })}>
                  <option value="NEW">New Assignment</option>
                  <option value="REPLACEMENT">Replacement</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase text-slate-500 ml-1">Reason</label>
                <textarea className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500 resize-none" rows={3} placeholder="Why do you need this asset?" value={requestForm.reason} onChange={(e) => setRequestForm({ ...requestForm, reason: e.target.value })} />
              </div>

              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setShowRequestForm(false)} className="flex-1 px-5 py-2.5 bg-slate-100 text-slate-700 rounded-xl font-bold text-sm hover:bg-slate-200 transition-colors">Cancel</button>
                <button type="submit" disabled={saving} className="flex-[2] bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-xl font-bold text-sm transition-all shadow-md flex items-center justify-center gap-2">
                  <Send className="w-4 h-4" /> Submit Request
                </button>
              </div>
            </form>
          </div>
        </div></Portal>
      )}

      {/* 5. Employee Report Asset */}
      {showReportForm && (
        <Portal><div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={() => setShowReportForm(false)}></div>
          <div className="max-h-[90dvh] overflow-y-auto relative bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-fade-in-up border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-500/20 flex items-center justify-center">
                  <AlertOctagon className="w-5 h-5 text-rose-600 dark:text-rose-400" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">Report Issue</h2>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">Report damage or malfunction</p>
                </div>
              </div>
              <button onClick={() => setShowReportForm(false)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            
            <form onSubmit={reportAsset} className="p-6 space-y-5">
              {message && <div className="p-3 rounded-lg text-sm font-medium border bg-rose-50 text-rose-700">{message}</div>}

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase text-slate-500 ml-1">Assigned Asset</label>
                <select required className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500" value={reportingAssetId} onChange={(e) => setReportingAssetId(e.target.value)}>
                  <option value="">Select the assigned asset</option>
                  {assets.map((asset) => <option key={asset._id} value={asset._id}>{asset.name} ({asset.assetTag})</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase text-slate-500 ml-1">Issue Details</label>
                <textarea required className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500 resize-none" rows={3} placeholder="Describe what happened..." value={reportNote} onChange={(e) => setReportNote(e.target.value)} />
              </div>

              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setShowReportForm(false)} className="flex-1 px-5 py-2.5 bg-slate-100 text-slate-700 rounded-xl font-bold text-sm hover:bg-slate-200 transition-colors">Cancel</button>
                <button type="submit" disabled={saving || !reportingAssetId} className="flex-[2] bg-rose-600 hover:bg-rose-700 text-white py-2.5 rounded-xl font-bold text-sm transition-all shadow-md flex items-center justify-center gap-2">
                  <AlertTriangle className="w-4 h-4" /> Report Issue
                </button>
              </div>
            </form>
          </div>
        </div></Portal>
      )}

    </div>
  )
}
