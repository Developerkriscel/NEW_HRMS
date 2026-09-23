'use client'

import { useEffect, useState } from 'react'
import { FilePlus, Plus, X, FileText, ExternalLink, Check, Trash2, Upload } from 'lucide-react'
import { Badge } from '@/components/common/Badge'
import { DataTable } from '@/components/tables/DataTable'
import { documentApi } from '@/services/documentApi'
import { employeeApi } from '@/services/employeeApi'
import { formatDate } from '@/lib/utils'
import { Portal } from '@/components/common/Portal'

const STATUSES = ['PENDING', 'SUBMITTED', 'VERIFIED', 'REJECTED']

export function DocumentsWorkspace({ title, subtitle, employeeMode = false }) {
  const [documents, setDocuments] = useState([])
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ employeeId: '', title: '', category: 'GENERAL', fileUrl: '', notes: '' })
  const [selectedFile, setSelectedFile] = useState(null)
  const [isRequestMode, setIsRequestMode] = useState(false)

  function load() {
    setLoading(true)
    Promise.all([
      documentApi.list(),
      employeeMode ? Promise.resolve(null) : employeeApi.getAll({ size: 50 }),
    ])
      .then(([docRes, employeeRes]) => {
        setDocuments(docRes.data.data || [])
        if (employeeRes) setEmployees(employeeRes.data.data.content || [])
      })
      .finally(() => setLoading(false))
  }

  useEffect(load, [employeeMode])

  async function addDocument(e) {
    e.preventDefault()
    setSaving(true)
    setMessage('')
    try {
      let finalFileUrl = form.fileUrl
      if (selectedFile) {
        const formData = new FormData()
        formData.append('document', selectedFile)
        const uploadRes = await documentApi.upload(formData)
        finalFileUrl = uploadRes.data?.data?.url || uploadRes.data?.url
      }
      
      await documentApi.create({ ...form, fileUrl: finalFileUrl })
      setForm({ employeeId: '', title: '', category: 'GENERAL', fileUrl: '', notes: '' })
      setSelectedFile(null)
      setMessage('Document added successfully')
      setShowForm(false)
      load()
    } catch (err) {
      setMessage(err.response?.data?.message || 'Failed to add document')
    } finally {
      setSaving(false)
    }
  }

  async function setStatus(row, status) {
    setSaving(true)
    setMessage('')
    try {
      await documentApi.update(row._id, { status })
      setMessage('Document updated')
      load()
    } catch (err) {
      setMessage(err.response?.data?.message || 'Failed to update document')
    } finally {
      setSaving(false)
    }
  }

  async function removeDocument(id) {
    if (!window.confirm('Are you sure you want to remove this document?')) return
    setSaving(true)
    setMessage('')
    try {
      await documentApi.remove(id)
      setMessage('Document removed')
      load()
    } catch (err) {
      setMessage(err.response?.data?.message || 'Failed to remove document')
    } finally {
      setSaving(false)
    }
  }

  async function uploadToExistingDocument(doc, file) {
    if (!file) return;
    setSaving(true)
    setMessage('')
    try {
      const formData = new FormData()
      formData.append('document', file)
      const uploadRes = await documentApi.upload(formData)
      const fileUrl = uploadRes.data?.data?.url || uploadRes.data?.url
      
      await documentApi.update(doc._id, { fileUrl, status: 'SUBMITTED' })
      setMessage('File uploaded successfully')
      load()
    } catch (err) {
      setMessage(err.response?.data?.message || 'Failed to upload file')
    } finally {
      setSaving(false)
    }
  }

  const columns = [
    { header: 'Document', accessor: 'title', render: (_, row) => {
      const isValidUrl = row.fileUrl && (row.fileUrl.startsWith('http') || row.fileUrl.startsWith('/api') || row.fileUrl.startsWith('data:'));
      return (
        <div>
          <div className="flex items-center gap-2">
            <p className="font-medium text-slate-800 dark:text-slate-100">{row.title}</p>
            {isValidUrl && (
              <a href={row.fileUrl} target="_blank" rel="noreferrer" title="View Document" className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors bg-indigo-50 dark:bg-indigo-500/10 p-1.5 rounded-lg">
                <ExternalLink className="w-4 h-4" />
              </a>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-0.5">{row.category || 'GENERAL'} {row.fileUrl && !isValidUrl ? `(${row.fileUrl})` : ''}</p>
        </div>
      )
    } },
    { header: 'Employee', accessor: 'employee', render: (v) => v ? `${v.firstName} ${v.lastName}` : 'Me' },
    { header: 'Status', accessor: 'status', render: (v) => <Badge>{v}</Badge> },
    { header: 'Expires', accessor: 'expiresAt', render: (v) => formatDate(v) },
    { header: 'Action', key: 'action', sortable: false, render: (_, row) => {
      const isValidUrl = row.fileUrl && (row.fileUrl.startsWith('http') || row.fileUrl.startsWith('/api') || row.fileUrl.startsWith('data:'));
      if (isValidUrl) return null;
      return (
        <label className="inline-flex items-center justify-center p-2 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 dark:bg-indigo-500/10 dark:text-indigo-400 dark:hover:bg-indigo-500/20 cursor-pointer transition-colors shadow-sm" title="Upload File">
          <Upload className="w-4 h-4" />
          <input type="file" className="hidden" onChange={(e) => uploadToExistingDocument(row, e.target.files[0])} disabled={saving} />
        </label>
      )
    }}
  ]

  const adminColumns = [
    { 
      header: 'Employee', 
      accessor: 'firstName', 
      render: (_, row) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-500/20 flex items-center justify-center text-sm font-bold text-indigo-700 dark:text-indigo-300">
            {row.firstName?.[0]}{row.lastName?.[0]}
          </div>
          <div>
            <p className="font-bold text-slate-900 dark:text-white">{row.firstName} {row.lastName}</p>
            <p className="text-xs font-medium text-slate-500">{row.employeeCode || 'Emp'}</p>
          </div>
        </div>
      ) 
    },
    {
      header: 'Documents',
      key: 'documents',
      sortable: false,
      render: (_, employee) => {
        const empDocs = documents.filter(d => d.employee?._id === employee._id || d.employee === employee._id)
        if (empDocs.length === 0) return <p className="text-sm text-slate-400 italic font-medium">No documents uploaded</p>
        
        return (
          <div className="flex flex-wrap gap-3">
            {empDocs.map(doc => {
              const isValidUrl = doc.fileUrl && (doc.fileUrl.startsWith('http') || doc.fileUrl.startsWith('/api') || doc.fileUrl.startsWith('data:'))
              const docStatus = isValidUrl ? doc.status : 'PENDING'
              
              return (
                <div key={doc._id} className="flex items-center gap-3 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm">
                  <div className="flex flex-col">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-sm text-slate-800 dark:text-slate-200">{doc.title}</span>
                      {isValidUrl && (
                        <a href={doc.fileUrl} target="_blank" rel="noreferrer" title="View Document" className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 p-0.5 rounded">
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">{doc.category || 'GENERAL'}</span>
                  </div>
                  
                  <div className="pl-3 border-l border-slate-200 dark:border-slate-700 flex items-center gap-1.5">
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider mr-1 ${
                        docStatus === 'VERIFIED' ? 'text-emerald-700 bg-emerald-100/50 dark:text-emerald-400 dark:bg-emerald-500/10' :
                        docStatus === 'REJECTED' ? 'text-rose-700 bg-rose-100/50 dark:text-rose-400 dark:bg-rose-500/10' :
                        docStatus === 'PENDING' ? 'text-amber-700 bg-amber-100/50 dark:text-amber-400 dark:bg-amber-500/10' :
                        'text-indigo-700 bg-indigo-100/50 dark:text-indigo-400 dark:bg-indigo-500/10'
                      }`}>
                      {docStatus}
                    </span>
                    
                    {!isValidUrl && (
                      <label className="p-1.5 rounded-full text-indigo-600 bg-indigo-50 hover:bg-indigo-100 dark:text-indigo-400 dark:bg-indigo-500/10 dark:hover:bg-indigo-500/20 transition-all shadow-sm cursor-pointer" title="Upload File">
                        <Upload className="w-4 h-4 stroke-[2]" />
                        <input type="file" className="hidden" onChange={(e) => uploadToExistingDocument(doc, e.target.files[0])} disabled={saving} />
                      </label>
                    )}
                    
                    {isValidUrl && doc.status !== 'VERIFIED' && (
                      <button 
                        type="button" disabled={saving} onClick={() => setStatus(doc, 'VERIFIED')} title="Approve"
                        className="p-1.5 rounded-full text-emerald-600 bg-emerald-50 hover:bg-emerald-100 dark:text-emerald-400 dark:bg-emerald-500/10 dark:hover:bg-emerald-500/20 transition-all shadow-sm"
                      >
                        <Check className="w-4 h-4 stroke-[2.5]" />
                      </button>
                    )}
                    {isValidUrl && doc.status !== 'REJECTED' && (
                      <button 
                        type="button" disabled={saving} onClick={() => setStatus(doc, 'REJECTED')} title="Reject"
                        className="p-1.5 rounded-full text-rose-600 bg-rose-50 hover:bg-rose-100 dark:text-rose-400 dark:bg-rose-500/10 dark:hover:bg-rose-500/20 transition-all shadow-sm"
                      >
                        <X className="w-4 h-4 stroke-[2.5]" />
                      </button>
                    )}
                    
                    <div className="w-px h-4 bg-slate-200 dark:bg-slate-700 mx-1"></div>
                    
                    <button 
                      type="button" disabled={saving} onClick={() => removeDocument(doc._id)} title="Remove Document"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )
      }
    }
  ]

  const dataToRender = employeeMode ? documents : employees
  const columnsToRender = employeeMode ? columns : adminColumns
  const searchPlaceholder = employeeMode ? "Search documents..." : "Search employees..."

  return (
    <div className="animate-fade-in space-y-8 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-indigo-400 dark:from-indigo-400 dark:to-indigo-300 hover:scale-[1.02] transition-transform duration-300 relative w-fit pb-2 after:content-[''] after:absolute after:-bottom-1 after:left-0 after:w-1/3 after:h-1 after:bg-gradient-to-r after:from-indigo-500 after:to-transparent after:rounded-full">
            {title}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-2 font-medium">
            {subtitle}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            className="bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 px-5 rounded-xl font-bold text-sm transition-all shadow-[0_0_20px_-5px_rgba(79,70,229,0.5)] flex items-center gap-2" 
            onClick={() => { setMessage(''); setShowForm(true); }}
          >
            <Plus className="w-4 h-4" /> Add Document
          </button>
        </div>
      </div>

      {showForm && (
        <Portal><div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={() => setShowForm(false)}></div>
          <div className="max-h-[90dvh] overflow-y-auto relative bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden animate-fade-in-up border border-slate-200 dark:border-slate-800">
            <div className="absolute top-0 right-0 -mr-10 -mt-10 w-40 h-40 rounded-full bg-indigo-500/5 blur-3xl pointer-events-none"></div>
            
              <div className="flex flex-col sm:flex-row sm:items-center justify-between px-6 py-5 pr-14 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20 gap-4 relative">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-500/20 flex items-center justify-center">
                    <FileText className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">Add New Document</h2>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">Upload or request a new record</p>
                  </div>
                </div>
                
                <div className="flex gap-1 bg-slate-200/50 dark:bg-slate-800 p-1 rounded-xl">
                  <button type="button" onClick={() => setIsRequestMode(false)} className={`px-4 py-1.5 text-sm font-bold rounded-lg transition-all ${!isRequestMode ? 'bg-white dark:bg-slate-700 shadow text-indigo-600 dark:text-indigo-400' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>Upload</button>
                  <button type="button" onClick={() => { setIsRequestMode(true); setSelectedFile(null); }} className={`px-4 py-1.5 text-sm font-bold rounded-lg transition-all ${isRequestMode ? 'bg-white dark:bg-slate-700 shadow text-indigo-600 dark:text-indigo-400' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>Request</button>
                </div>
                
                <button type="button" onClick={() => setShowForm(false)} className="absolute top-5 right-5 w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>
            
            <form onSubmit={addDocument} className="p-8">
              {message && (
                <div className="mb-6 p-4 rounded-xl text-sm font-medium border bg-rose-50 text-rose-700 border-rose-100 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20">
                  {message}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {!employeeMode && (
                  <div className="space-y-2 sm:col-span-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 ml-1">Employee</label>
                    <select required className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-5 py-4 text-base font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all shadow-sm appearance-none cursor-pointer" value={form.employeeId} onChange={(e) => setForm({ ...form, employeeId: e.target.value })}>
                      <option value="">Select an employee</option>
                      {employees.map((employee) => <option key={employee._id} value={employee._id}>{employee.firstName} {employee.lastName}</option>)}
                    </select>
                  </div>
                )}
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 ml-1">Document Title</label>
                  <input required className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-5 py-4 text-base font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all shadow-sm" placeholder="e.g. ID Card, Offer Letter" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 ml-1">Category</label>
                  <input className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-5 py-4 text-base font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all shadow-sm" placeholder="GENERAL, LEGAL, HR" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
                </div>
                
                {!isRequestMode && (
                  <div className="space-y-2 sm:col-span-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 ml-1">Select Document</label>
                    <input 
                      type="file"
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-5 py-3 text-base font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all shadow-sm file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-bold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 dark:file:bg-indigo-900/30 dark:file:text-indigo-400 cursor-pointer" 
                      onChange={(e) => setSelectedFile(e.target.files[0] || null)} 
                      required={!isRequestMode}
                    />
                  </div>
                )}
              </div>

              <div className="mt-8 flex gap-4">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 py-4 rounded-2xl font-bold text-base hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-sm">
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="flex-[2] bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white py-4 rounded-2xl font-bold text-base transition-all shadow-[0_0_20px_-5px_rgba(79,70,229,0.5)] flex items-center justify-center gap-2">
                  <FilePlus className="w-5 h-5" /> {saving ? 'Processing...' : isRequestMode ? 'Send Request' : 'Upload Document'}
                </button>
              </div>
            </form>
          </div>
        </div></Portal>
      )}

      {message && <p className="text-sm text-slate-500 dark:text-slate-400">{message}</p>}
      <DataTable columns={columnsToRender} data={dataToRender} isLoading={loading} searchPlaceholder={searchPlaceholder} emptyMessage="No records found" />
    </div>
  )
}
