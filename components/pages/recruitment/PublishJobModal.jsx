import { useEffect, useState } from 'react'
import { X, Globe, CheckCircle2, Loader2, Linkedin, ExternalLink, Users, Briefcase, AlertCircle } from 'lucide-react'
import { Portal } from '@/components/common/Portal'
import { publishingApi } from '@/services/publishingApi'

const PLATFORMS = [
  { id: 'CAREER_PAGE', name: 'Company Career Page', icon: Briefcase, color: 'bg-indigo-600' },
  { id: 'REFERRAL', name: 'Employee Referral', icon: Users, color: 'bg-emerald-600' },
  { id: 'LINKEDIN', name: 'LinkedIn', icon: Linkedin, color: 'bg-blue-600' },
  { id: 'NAUKRI', name: 'Naukri', icon: Globe, color: 'bg-blue-500' },
  { id: 'INDEED', name: 'Indeed', icon: Globe, color: 'bg-cyan-600' },
  { id: 'FOUNDIT', name: 'Foundit', icon: Globe, color: 'bg-violet-600' },
]

export function PublishJobModal({ position, onClose, onPublish }) {
  const [selectedPlatforms, setSelectedPlatforms] = useState(['CAREER_PAGE'])
  const [publishing, setPublishing] = useState(false)
  const [published, setPublished] = useState(false)
  const [results, setResults] = useState([])
  const [error, setError] = useState('')

  useEffect(() => {
    setSelectedPlatforms(['CAREER_PAGE'])
    setPublishing(false)
    setPublished(false)
    setResults([])
    setError('')
  }, [position?.id])

  if (!position) return null

  const togglePlatform = (id) => {
    setSelectedPlatforms(prev => 
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    )
  }

  const handlePublish = async () => {
    setError('')
    setPublishing(true)
    try {
      const response = await publishingApi.publish(position.id, selectedPlatforms)
      const publishedResults = response.data?.data?.results || []
      setResults(publishedResults)
      const allPublished = publishedResults.length > 0 && publishedResults.every((item) => item.status === 'PUBLISHED')
      setPublished(allPublished)
      if (publishedResults.some((item) => item.status === 'PUBLISHED')) onPublish?.(position.id, publishedResults)
    } catch (requestError) {
      const fieldErrors = requestError.response?.data?.data?.errors
      setError(fieldErrors ? Object.values(fieldErrors).join(' ') : requestError.response?.data?.message || requestError.message || 'Publishing failed. Please try again.')
    } finally {
      setPublishing(false)
    }
  }

  return (
    <Portal><div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="max-h-[90dvh] overflow-y-auto bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col border border-slate-200 dark:border-slate-800">
        
        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/30">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Globe className="w-5 h-5 text-indigo-500" />
            Publish Job Listing
          </h2>
          <button 
            onClick={onClose}
            disabled={publishing}
            className="p-2 text-slate-400 hover:text-red-600 bg-white hover:bg-red-50 border border-slate-200 hover:border-red-200 dark:bg-slate-800 dark:border-slate-700 dark:hover:bg-red-500/10 dark:hover:border-red-500/30 rounded-full transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6">
          <div className="mb-6">
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Position to publish</p>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">{position.title}</h3>
            <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">Publish the open position to the selected channels. External job boards require a connected integration.</p>
          </div>

          <div className="space-y-3 mb-8">
            {PLATFORMS.map(platform => {
              const isSelected = selectedPlatforms.includes(platform.id)
              const Icon = platform.icon
              return (
                <div 
                  key={platform.id}
                  onClick={() => !publishing && !published && togglePlatform(platform.id)}
                  className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all cursor-pointer ${
                    isSelected 
                      ? 'border-indigo-500 bg-indigo-50/50 dark:border-indigo-500 dark:bg-indigo-500/10' 
                      : 'border-slate-100 bg-white hover:border-slate-200 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white ${platform.color}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className={`font-bold ${isSelected ? 'text-indigo-900 dark:text-indigo-100' : 'text-slate-700 dark:text-slate-300'}`}>
                      {platform.name}
                    </span>
                  </div>
                  
                  <div className={`w-5 h-5 rounded flex items-center justify-center transition-colors ${
                    isSelected ? 'bg-indigo-500 text-white' : 'bg-slate-100 border border-slate-300 dark:bg-slate-800 dark:border-slate-600'
                  }`}>
                    {isSelected && <CheckCircle2 className="w-3.5 h-3.5" />}
                  </div>
                </div>
              )
            })}
          </div>

          {error ? <div role="alert" className="mb-4 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-700"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{error}</div> : null}
          {results.length > 0 && (
            <div className="mb-4 space-y-2" aria-live="polite">
              {results.map((result) => {
                const channel = PLATFORMS.find((item) => item.id === result.channel)
                const success = result.status === 'PUBLISHED'
                return <div key={result.channel} className={`flex items-start gap-2 rounded-xl border p-3 text-sm ${success ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-amber-200 bg-amber-50 text-amber-800'}`}>
                  {success ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> : <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />}
                  <div className="min-w-0"><div className="font-bold">{channel?.name || result.channel}: {success ? 'Published' : result.status}</div>{result.errorMessage ? <p className="mt-0.5 text-xs">{result.errorMessage}</p> : null}{result.externalUrl ? <a className="mt-1 block truncate text-xs underline" href={result.externalUrl.startsWith('http') ? result.externalUrl : `/${result.externalUrl.replace(/^\//, '')}`} target="_blank" rel="noreferrer">View listing</a> : null}</div>
                </div>
              })}
            </div>
          )}
          {published ? (
            <div className="mb-4 rounded-xl bg-emerald-50 p-3 text-sm font-bold text-emerald-700">All selected channels published successfully.</div>
          ) : null}
          {!published && (
            <button 
              onClick={handlePublish}
              disabled={publishing || selectedPlatforms.length === 0}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 px-4 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/30 disabled:opacity-50 disabled:shadow-none"
            >
              {publishing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Publishing to {selectedPlatforms.length} channels...
                </>
              ) : (
                <>
                  <ExternalLink className="w-5 h-5" />
                  Publish Job ({selectedPlatforms.length})
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div></Portal>
  )
}
