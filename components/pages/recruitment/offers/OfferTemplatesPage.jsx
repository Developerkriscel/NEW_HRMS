'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Plus, Loader2, Trash2 } from 'lucide-react'
import { PageLoader } from '@/components/common/LoadingSpinner'
import { offerApi } from '@/services/offerApi'
import { OFFER_TEMPLATE_CATEGORIES, OFFER_TEMPLATE_VARIABLES } from '@/lib/offerConstants'

// item 5 — HR maintains reusable Offer Letter Templates. Pre-seeded with 5
// starter templates (Full-Time/Intern/Contract/Senior Management/Remote)
// the first time this page loads.
export function OfferTemplatesPage() {
  const [templates, setTemplates] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [creating, setCreating] = useState(false)

  function load() {
    setLoading(true)
    offerApi.listTemplates().then((res) => { setTemplates(res.data.data || []); }).finally(() => setLoading(false))
  }
  useEffect(load, [])

  return (
    <div className="animate-fade-in space-y-6">
      <Link href="/hr/recruitment/offers" className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
        <ArrowLeft className="w-3.5 h-3.5" /> Back to Offers
      </Link>

      <div className="page-header">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Offer Letter Templates</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Reusable letter bodies with {'{{variables}}'} — no legal text lives in code.</p>
        </div>
        <button onClick={() => setCreating(true)} className="btn-primary"><Plus className="w-4 h-4" /> New Template</button>
      </div>

      {loading ? (
        <PageLoader />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {templates.map((t) => (
            <button key={t._id} onClick={() => setSelected(t)} className="stat-card text-left hover:border-blue-300 dark:hover:border-blue-700 border border-transparent transition-colors">
              <div className="flex items-center justify-between mb-1">
                <h3 className="font-semibold text-slate-800 dark:text-slate-100">{t.name}</h3>
                {t.isDefault && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400">Default</span>}
              </div>
              <p className="text-xs text-slate-400">{t.category}</p>
              {t.description && <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">{t.description}</p>}
            </button>
          ))}
        </div>
      )}

      {selected && <TemplateEditorModal template={selected} onClose={() => setSelected(null)} onSaved={() => { setSelected(null); load() }} />}
      {creating && <TemplateEditorModal template={null} onClose={() => setCreating(false)} onSaved={() => { setCreating(false); load() }} />}
    </div>
  )
}

function TemplateEditorModal({ template, onClose, onSaved }) {
  const [name, setName] = useState(template?.name || '')
  const [category, setCategory] = useState(template?.category || '')
  const [description, setDescription] = useState(template?.description || '')
  const [content, setContent] = useState(template?.content || '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function save() {
    if (!name.trim()) return setError('A template name is required')
    if (!content.trim()) return setError('Template content is required')
    setSaving(true); setError('')
    try {
      if (template) await offerApi.updateTemplate(template._id, { name, category, description, content })
      else await offerApi.createTemplate({ name, category, description, content })
      onSaved()
    } catch (err) { setError(err.response?.data?.message || 'Could not save the template'); setSaving(false) }
  }

  async function remove() {
    if (!template || !confirm('Delete this template?')) return
    setSaving(true)
    try { await offerApi.deleteTemplate(template._id); onSaved() } catch (err) { setError(err.response?.data?.message || 'Could not delete'); setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] overflow-y-auto p-6 space-y-4">
        <h2 className="text-base font-semibold text-slate-900 dark:text-white">{template ? 'Edit Template' : 'New Template'}</h2>
        {error && <div className="px-3 py-2 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">{error}</div>}

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">Name *</span>
            <input className="input-field" value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">Category</span>
            <select className="input-field" value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="">None</option>
              {OFFER_TEMPLATE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>
        </div>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">Description</span>
          <input className="input-field" value={description} onChange={(e) => setDescription(e.target.value)} />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">Content * — use ## for section headings, {'{{variable}}'} for placeholders</span>
          <textarea className="input-field min-h-64 font-mono text-xs" value={content} onChange={(e) => setContent(e.target.value)} />
        </label>
        <div className="flex flex-wrap gap-1.5">
          {OFFER_TEMPLATE_VARIABLES.map((v) => <span key={v.key} className="text-[10px] px-2 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-mono">{'{{' + v.key + '}}'}</span>)}
        </div>

        <div className="flex justify-between items-center pt-2">
          {template ? <button onClick={remove} disabled={saving} className="btn-secondary !text-red-600"><Trash2 className="w-3.5 h-3.5" /> Delete</button> : <span />}
          <div className="flex gap-3">
            <button onClick={onClose} disabled={saving} className="btn-secondary">Cancel</button>
            <button onClick={save} disabled={saving} className="btn-primary">{saving && <Loader2 className="w-4 h-4 animate-spin" />} Save</button>
          </div>
        </div>
      </div>
    </div>
  )
}
