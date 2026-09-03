import { useState } from 'react'
import { X, Globe, CheckCircle2, Loader2, Linkedin, Twitter, ExternalLink } from 'lucide-react'
import { Portal } from '@/components/common/Portal'

const PLATFORMS = [
  { id: 'linkedin', name: 'LinkedIn', icon: Linkedin, color: 'bg-blue-600', active: true },
  { id: 'indeed', name: 'Indeed', icon: Globe, color: 'bg-blue-500', active: true },
  { id: 'glassdoor', name: 'Glassdoor', icon: Globe, color: 'bg-green-500', active: false },
  { id: 'monster', name: 'Monster', icon: Globe, color: 'bg-purple-600', active: false },
]

export function PublishJobModal({ position, onClose, onPublish }) {
  const [selectedPlatforms, setSelectedPlatforms] = useState(['linkedin', 'indeed'])
  const [publishing, setPublishing] = useState(false)
  const [published, setPublished] = useState(false)

  if (!position) return null

  const togglePlatform = (id) => {
    setSelectedPlatforms(prev => 
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    )
  }

  const handlePublish = () => {
    setPublishing(true)
    // Simulate API call to job boards
    setTimeout(() => {
      setPublishing(false)
      setPublished(true)
      setTimeout(() => {
        if (onPublish) onPublish(position.id, selectedPlatforms)
        onClose()
      }, 1500)
    }, 2000)
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
            <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">Automatically push this job listing to the selected platforms via API integration.</p>
          </div>

          <div className="space-y-3 mb-8">
            {PLATFORMS.map(platform => {
              const isSelected = selectedPlatforms.includes(platform.id)
              const Icon = platform.icon
              return (
                <div 
                  key={platform.id}
                  onClick={() => !publishing && togglePlatform(platform.id)}
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

          {published ? (
            <div className="bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 p-4 rounded-xl flex items-center gap-3 font-bold">
              <CheckCircle2 className="w-5 h-5" />
              Job published successfully!
            </div>
          ) : (
            <button 
              onClick={handlePublish}
              disabled={publishing || selectedPlatforms.length === 0}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 px-4 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/30 disabled:opacity-50 disabled:shadow-none"
            >
              {publishing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Publishing to {selectedPlatforms.length} platforms...
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
