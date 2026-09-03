import { X, Briefcase, Calendar, Users, MapPin, DollarSign, Building2, Clock, GraduationCap, Star, FileText, Target } from 'lucide-react'
import { Portal } from '@/components/common/Portal'

export function PositionDetailsModal({ position, onClose }) {
  if (!position) return null

  return (
    <Portal><div className="fixed inset-0 z-50 flex justify-end bg-slate-900/20 backdrop-blur-sm transition-all duration-300">
      <div className="bg-white dark:bg-slate-900 w-full max-w-md h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300 border-l border-slate-200 dark:border-slate-800">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between sticky top-0 bg-white dark:bg-slate-900 z-10">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-indigo-500" />
            Position Details
          </h2>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-red-600 bg-slate-50 hover:bg-red-50 border border-slate-200 hover:border-red-200 dark:text-slate-400 dark:bg-slate-800/50 dark:border-slate-700 dark:hover:bg-red-500/10 dark:hover:border-red-500/30 dark:hover:text-red-400 rounded-full transition-all shadow-sm group"
          >
            <X className="w-4 h-4 group-hover:rotate-90 transition-transform duration-300" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-8">
          
          {/* Header Info */}
          <div>
            <div className="text-sm font-semibold text-slate-500 dark:text-slate-400 mb-1">Job Title</div>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{position.title || 'Untitled Position'}</h3>
            <div className="mt-2 flex items-center gap-3">
              <span className={`inline-flex px-3 py-1 rounded-full text-xs font-bold ${
                position.status === 'Active' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400' :
                position.status === 'Closed' ? 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' :
                'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-400'
              }`}>
                {position.status === 'Active' ? '● OPEN' : position.status === 'Closed' ? '● CLOSED' : '● ON HOLD'}
              </span>
              <span className="text-sm font-medium text-slate-500 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full">
                {position.priority || 'Medium'} Priority
              </span>
            </div>
          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-50 dark:bg-slate-800/30 p-4 rounded-2xl border border-slate-100 dark:border-slate-700">
              <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 mb-2">
                <Building2 className="w-4 h-4" />
                <span className="text-xs font-bold uppercase tracking-wider">Department</span>
              </div>
              <div className="text-slate-900 dark:text-white font-semibold">{position.department || 'Not specified'}</div>
            </div>
            
            <div className="bg-slate-50 dark:bg-slate-800/30 p-4 rounded-2xl border border-slate-100 dark:border-slate-700">
              <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 mb-2">
                <MapPin className="w-4 h-4" />
                <span className="text-xs font-bold uppercase tracking-wider">Location</span>
              </div>
              <div className="text-slate-900 dark:text-white font-semibold">{position.location || 'Remote'} ({position.workMode || 'Remote'})</div>
            </div>
            
            <div className="bg-slate-50 dark:bg-slate-800/30 p-4 rounded-2xl border border-slate-100 dark:border-slate-700">
              <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 mb-2">
                <Users className="w-4 h-4" />
                <span className="text-xs font-bold uppercase tracking-wider">Openings</span>
              </div>
              <div className="text-slate-900 dark:text-white font-semibold">{position.openings || 1}</div>
            </div>
            
            <div className="bg-slate-50 dark:bg-slate-800/30 p-4 rounded-2xl border border-slate-100 dark:border-slate-700">
              <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 mb-2">
                <DollarSign className="w-4 h-4" />
                <span className="text-xs font-bold uppercase tracking-wider">Compensation</span>
              </div>
              <div className="text-slate-900 dark:text-white font-semibold">
                {position.salaryMin && position.salaryMax 
                  ? `${position.currency || '$'}${position.salaryMin} - ${position.currency || '$'}${position.salaryMax} / ${position.salaryType || 'yr'}` 
                  : 'Standard'}
              </div>
            </div>
          </div>

          {/* Job Details */}
          <div className="space-y-4">
            <h4 className="text-base font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-2">Job Description</h4>
            
            <div className="space-y-4">
              {position.description && (
                <div>
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1"><FileText className="w-3 h-3"/> Description</div>
                  <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">{position.description}</p>
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1"><Clock className="w-3 h-3"/> Job Type</div>
                  <p className="text-sm text-slate-900 dark:text-white font-medium">{position.jobType || 'Full-time'} • {position.employmentType || 'Permanent'}</p>
                </div>
                
                <div>
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1"><GraduationCap className="w-3 h-3"/> Education & Exp.</div>
                  <p className="text-sm text-slate-900 dark:text-white font-medium">{position.education || 'Bachelor\'s Degree'} • {position.experience || 'Not specified'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Requirements & Skills */}
          <div className="space-y-4">
            <h4 className="text-base font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-2">Skills & Requirements</h4>
            
            <div className="space-y-3">
              <div>
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1"><Star className="w-3 h-3"/> Required Skills</div>
                <div className="flex flex-wrap gap-2">
                  {(position.requiredSkills || 'React, Node.js, TypeScript').split(',').map((skill, i) => (
                    <span key={i} className="px-2.5 py-1 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 rounded-md text-xs font-medium">
                      {skill.trim()}
                    </span>
                  ))}
                </div>
              </div>
              
              {position.preferredSkills && (
                <div>
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1"><Star className="w-3 h-3"/> Preferred Skills</div>
                  <div className="flex flex-wrap gap-2">
                    {position.preferredSkills.split(',').map((skill, i) => (
                      <span key={i} className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-md text-xs font-medium">
                        {skill.trim()}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Hiring Details */}
          <div className="space-y-4">
            <h4 className="text-base font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-2">Hiring Details</h4>
            
              <div className="bg-slate-50 dark:bg-slate-800/30 rounded-xl p-4 border border-slate-100 dark:border-slate-700 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-500">Hiring Manager</span>
                  <span className="text-sm font-medium text-slate-900 dark:text-white">{position.hiringManager || 'Not assigned'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-500">Recruiter</span>
                  <span className="text-sm font-medium text-slate-900 dark:text-white">{position.recruiter || 'Not assigned'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-500">Target Closing Date</span>
                  <span className="text-sm font-medium text-slate-900 dark:text-white">{position.targetClosingDate || 'Open until filled'}</span>
                </div>
              </div>
            </div>
            
          </div>
        </div>
      </div>
    </Portal>
  )
}
