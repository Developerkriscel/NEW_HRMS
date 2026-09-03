'use client'

import React from 'react'
import { X, Clock, MapPin, CheckCircle2, User, Camera, Calendar } from 'lucide-react'
import { Portal } from '@/components/common/Portal'

export function AttendanceDetailsDrawer({ isOpen, onClose, record }) {
  if (!isOpen || !record) return null

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })
  }

  const formatTime = (dateString) => {
    if (!dateString) return '—'
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'PRESENT': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
      case 'ABSENT': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
      case 'LATE': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
      case 'HALF_DAY': return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
      case 'ON_LEAVE': return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
      default: return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400'
    }
  }

  const formatDuration = (minutes) => {
    if (!minutes) return '00h 00m'
    const h = Math.floor(minutes / 60)
    const m = Math.floor(minutes % 60)
    return `${h.toString().padStart(2, '0')}h ${m.toString().padStart(2, '0')}m`
  }

  return (
    <>
      {/* Backdrop */}
      <Portal><div 
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 transition-opacity animate-in fade-in" 
        onClick={onClose}
      />
      
      {/* Drawer */}
      <div className="fixed inset-y-0 right-0 w-full max-w-md bg-white dark:bg-slate-900 shadow-2xl z-50 transform transition-transform duration-300 ease-in-out border-l border-slate-200 dark:border-slate-800 flex flex-col animate-in slide-in-from-right">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <Calendar className="w-5 h-5 text-indigo-500" />
            Attendance Details
          </h2>
          <button 
            onClick={onClose} 
            className="p-2 -mr-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          
          {/* Header Info */}
          <div>
            <div className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Date</div>
            <div className="text-xl font-semibold text-slate-900 dark:text-white mb-3">
              {formatDate(record.date)}
            </div>
            <span className={`px-3 py-1 text-xs font-medium rounded-full ${getStatusColor(record.status)} inline-flex items-center gap-1.5`}>
              <span className="w-1.5 h-1.5 rounded-full bg-current opacity-75"></span>
              {record.status}
            </span>
          </div>

          <hr className="border-slate-100 dark:border-slate-800" />

          {/* Time Stats */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 mb-2">
                <Clock className="w-4 h-4" />
                <span className="text-sm font-medium">Check In</span>
              </div>
              <div className="text-lg font-semibold text-slate-900 dark:text-white">
                {formatTime(record.checkInTime)}
              </div>
            </div>
            
            <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 mb-2">
                <Clock className="w-4 h-4" />
                <span className="text-sm font-medium">Check Out</span>
              </div>
              <div className="text-lg font-semibold text-slate-900 dark:text-white">
                {formatTime(record.checkOutTime)}
              </div>
            </div>

            <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-xl border border-indigo-100 dark:border-indigo-900/30">
              <div className="text-sm font-medium text-indigo-600 dark:text-indigo-400 mb-1">Working Hours</div>
              <div className="text-lg font-semibold text-slate-900 dark:text-white">
                {formatDuration(record.workingMinutes)}
              </div>
            </div>

            <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-xl border border-orange-100 dark:border-orange-900/30">
              <div className="text-sm font-medium text-orange-600 dark:text-orange-400 mb-1">Break Duration</div>
              <div className="text-lg font-semibold text-slate-900 dark:text-white">
                {formatDuration(record.breakMinutes)}
              </div>
            </div>
          </div>

          {/* Verification */}
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4 uppercase tracking-wider">Verification</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${record.checkInPhoto || record.verificationStatus?.includes('CAMERA') ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-slate-100 text-slate-400 dark:bg-slate-800'}`}>
                  <Camera className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-sm font-medium text-slate-900 dark:text-white">Camera Verification</div>
                  <div className="text-xs text-slate-500">{record.checkInPhoto ? 'Verified successfully' : 'Not verified'}</div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${(record.checkInLatitude && record.checkInLongitude) || record.verificationStatus?.includes('LOCATION') ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-slate-100 text-slate-400 dark:bg-slate-800'}`}>
                  <MapPin className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-sm font-medium text-slate-900 dark:text-white">Location Verification</div>
                  <div className="text-xs text-slate-500">{(record.checkInLatitude && record.checkInLongitude) ? 'Verified successfully' : 'Not verified'}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Photos (if available) */}
          {(record.checkInPhoto || record.checkOutPhoto) && (
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4 uppercase tracking-wider">Attendance Photos</h3>
              <div className="grid grid-cols-2 gap-4">
                {record.checkInPhoto && (
                  <div>
                    <div className="aspect-square rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 mb-2">
                      <img src={record.checkInPhoto} alt="Check In" className="w-full h-full object-cover" />
                    </div>
                    <div className="text-xs font-medium text-slate-500 text-center">Check-in Photo</div>
                  </div>
                )}
                {record.checkOutPhoto && (
                  <div>
                    <div className="aspect-square rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 mb-2">
                      <img src={record.checkOutPhoto} alt="Check Out" className="w-full h-full object-cover" />
                    </div>
                    <div className="text-xs font-medium text-slate-500 text-center">Check-out Photo</div>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Timeline (simple representation) */}
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4 uppercase tracking-wider">Timeline</h3>
            <div className="space-y-4 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 dark:before:via-slate-700 before:to-transparent">
              
              {record.checkInTime && (
                <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white dark:border-slate-900 bg-emerald-100 text-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-400 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm ml-4 md:ml-0">
                    <div className="flex items-center justify-between mb-1">
                      <div className="font-semibold text-slate-900 dark:text-white text-sm">Check In</div>
                      <time className="text-xs font-medium text-indigo-500">{formatTime(record.checkInTime)}</time>
                    </div>
                    <div className="text-xs text-slate-500">Camera & Location Verified</div>
                  </div>
                </div>
              )}

              {record.breaks && record.breaks.map((b, idx) => (
                <React.Fragment key={idx}>
                  <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white dark:border-slate-900 bg-orange-100 text-orange-600 dark:bg-orange-900/50 dark:text-orange-400 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                      <Clock className="w-4 h-4" />
                    </div>
                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm ml-4 md:ml-0">
                      <div className="flex items-center justify-between mb-1">
                        <div className="font-semibold text-slate-900 dark:text-white text-sm">Break Started</div>
                        <time className="text-xs font-medium text-orange-500">{formatTime(b.start)}</time>
                      </div>
                    </div>
                  </div>
                  {b.end && (
                    <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group">
                      <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white dark:border-slate-900 bg-emerald-100 text-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-400 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                      <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm ml-4 md:ml-0">
                        <div className="flex items-center justify-between mb-1">
                          <div className="font-semibold text-slate-900 dark:text-white text-sm">Break Ended</div>
                          <time className="text-xs font-medium text-emerald-500">{formatTime(b.end)}</time>
                        </div>
                        <div className="text-xs text-slate-500">Duration: {formatDuration(b.duration)}</div>
                      </div>
                    </div>
                  )}
                </React.Fragment>
              ))}

              {record.checkOutTime && (
                <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white dark:border-slate-900 bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                    <LogOut className="w-4 h-4" />
                  </div>
                  <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm ml-4 md:ml-0">
                    <div className="flex items-center justify-between mb-1">
                      <div className="font-semibold text-slate-900 dark:text-white text-sm">Check Out</div>
                      <time className="text-xs font-medium text-slate-500">{formatTime(record.checkOutTime)}</time>
                    </div>
                    <div className="text-xs text-slate-500">End of day</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
          <button 
            className="w-full py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            Request Correction
          </button>
        </div>
      </div>
      </Portal>
    </>
  )
}

function LogOut(props) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  )
}
