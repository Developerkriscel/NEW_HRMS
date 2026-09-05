'use client'

import React, { useRef, useState, useCallback, useEffect } from 'react'
import { Camera, X, RefreshCw, CheckCircle2, MapPin } from 'lucide-react'
import { Portal } from '@/components/common/Portal'

export function CameraVerificationModal({ isOpen, onClose, onConfirm, locationRequired = false, title = "Verify Attendance", variant = 'modal' }) {
  const videoRef = useRef(null)
  const [stream, setStream] = useState(null)
  const [capturedImage, setCapturedImage] = useState(null)
  const [error, setError] = useState('')
  const [location, setLocation] = useState(null)
  const [locationError, setLocationError] = useState('')
  const [isLocating, setIsLocating] = useState(false)
  const streamRef = useRef(null)

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
      setStream(null)
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
  }, [])

  const startCamera = useCallback(async () => {
    try {
      setError('')
      // Stop any existing stream first
      stopCamera()
      
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' }
      })
      streamRef.current = mediaStream
      setStream(mediaStream)
      
    } catch (err) {
      setError('Camera access is required to capture your attendance photo. Please allow camera permissions.')
    }
  }, [stopCamera])

  useEffect(() => {
    if (videoRef.current && stream && videoRef.current.srcObject !== stream) {
      videoRef.current.srcObject = stream
    }
  }) // Run on every render to ensure video tag always has stream if it remounts

  const getLocation = useCallback(() => {
    if (!locationRequired) return;
    setIsLocating(true)
    setLocationError('')
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: position.timestamp
          })
          setIsLocating(false)
        },
        (error) => {
          setLocationError('Location permission is required for attendance.')
          setIsLocating(false)
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      )
    } else {
      setLocationError('Geolocation is not supported by your browser.')
      setIsLocating(false)
    }
  }, [locationRequired])

  useEffect(() => {
    if (isOpen) {
      setCapturedImage(null)
      startCamera()
      if (locationRequired) {
        getLocation()
      }
    } else {
      stopCamera()
    }
    
    return () => {
      stopCamera()
    }
  }, [isOpen, startCamera, stopCamera, locationRequired, getLocation])

  const handleCapture = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas')
      canvas.width = videoRef.current.videoWidth
      canvas.height = videoRef.current.videoHeight
      const ctx = canvas.getContext('2d')
      
      // Mirror the canvas to match the video feed's -scale-x-100
      ctx.translate(canvas.width, 0)
      ctx.scale(-1, 1)
      
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height)
      const imageUrl = canvas.toDataURL('image/jpeg', 0.8)
      setCapturedImage(imageUrl)
      stopCamera()
    }
  }

  const handleRetake = () => {
    setCapturedImage(null)
    startCamera()
  }

  const handleConfirm = () => {
    if (locationRequired && !location) {
      setLocationError('Please allow location access to continue.')
      return;
    }
    onConfirm({ photo: capturedImage, location })
    onClose()
  }

  if (!isOpen) return null

  const content = (
    <div className={`${variant === 'inline' ? 'w-full overflow-hidden' : 'max-h-[90dvh] w-full max-w-md overflow-y-auto'} rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900 flex flex-col animate-in zoom-in-95 duration-200`}>
      
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
          <Camera className="w-5 h-5 text-indigo-500" />
          {title}
        </h2>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Content */}
      <div className={`${variant === 'inline' ? 'min-h-[360px] p-4 sm:p-6' : 'min-h-[400px] p-6'} flex-1 flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900/50`}>
        {error ? (
          <div className="text-center p-6">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <Camera className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">Camera Access Denied</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">{error}</p>
            <button onClick={startCamera} className="px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-lg text-sm font-medium hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors">
              Try Again
            </button>
          </div>
        ) : capturedImage ? (
          <div className="w-full flex flex-col items-center animate-in fade-in zoom-in-95 duration-300">
            <div className={`${variant === 'inline' ? 'w-56 h-56 sm:w-64 sm:h-64' : 'w-64 h-64'} relative rounded-full overflow-hidden border-4 border-indigo-500 shadow-xl mb-6`}>
              <img src={capturedImage} alt="Captured" className="w-full h-full object-cover" />
              <div className="absolute inset-0 border-4 border-white/20 rounded-full pointer-events-none"></div>
            </div>
            
            {locationRequired && (
              <div className="w-full mb-6 p-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm">
                {isLocating ? (
                  <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span className="text-sm">Verifying location...</span>
                  </div>
                ) : locationError ? (
                  <div className="flex items-start gap-3 text-red-500">
                    <MapPin className="w-4 h-4 mt-0.5" />
                    <span className="text-sm">{locationError}</span>
                  </div>
                ) : location ? (
                  <div className="flex items-start gap-3 text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="w-5 h-5 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">Location Verified</p>
                      <p className="text-xs opacity-80 mt-0.5">Accuracy: {Math.round(location.accuracy)}m</p>
                    </div>
                  </div>
                ) : null}
              </div>
            )}

            <div className="flex gap-3 w-full">
              <button onClick={handleRetake} className="flex-1 py-3 px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4" />
                Retake
              </button>
              <button 
                onClick={handleConfirm}
                disabled={locationRequired && (!location || !!locationError)}
                className="flex-1 py-3 px-4 rounded-xl bg-indigo-600 text-white font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-500/30"
              >
                Confirm
              </button>
            </div>
          </div>
        ) : (
          <div className="w-full flex flex-col items-center">
            <div className={`${variant === 'inline' ? 'w-56 h-56 sm:w-64 sm:h-64' : 'w-72 h-72'} relative rounded-full overflow-hidden bg-slate-900 border-4 border-white dark:border-slate-800 shadow-2xl mb-8 group`}>
              <video 
                ref={(node) => {
                  videoRef.current = node
                  if (node && stream && node.srcObject !== stream) {
                    node.srcObject = stream
                  }
                }}
                autoPlay 
                playsInline 
                muted 
                className="w-full h-full object-cover -scale-x-100" 
              />
              
              {/* Face Guide Overlay */}
              <div className="absolute inset-0 pointer-events-none">
                <div className="w-full h-full border-[8px] border-black/20 rounded-full"></div>
                <div className="absolute inset-8 border-2 border-dashed border-white/50 rounded-[40%] animate-pulse"></div>
                <div className="absolute bottom-6 left-0 right-0 text-center">
                  <span className="bg-black/50 text-white text-xs px-3 py-1 rounded-full backdrop-blur-md">
                    Keep face inside frame
                  </span>
                </div>
              </div>
            </div>

            <button 
              onClick={handleCapture}
              className="group relative w-16 h-16 rounded-full bg-white dark:bg-slate-800 border-4 border-slate-200 dark:border-slate-700 flex items-center justify-center hover:border-indigo-500 transition-colors"
            >
              <div className="w-12 h-12 rounded-full bg-indigo-600 group-hover:scale-95 transition-transform"></div>
            </button>
          </div>
        )}
      </div>
    </div>
  )

  if (variant === 'inline') {
    return content
  }

  return (
    <Portal><div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200 p-4">
      {content}
    </div></Portal>
  )
}
