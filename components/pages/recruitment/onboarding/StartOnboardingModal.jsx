import React, { useEffect, useMemo, useState } from 'react'
import { AlertCircle, Briefcase, CalendarDays, CheckCircle2, Mail, Phone, RefreshCw, Search, User, X } from 'lucide-react'
import { Portal } from '@/components/common/Portal'
import { offerApi } from '@/services/offerApi'
import { preboardingApi } from '@/services/preboardingApi'

function listFromResponse(res) {
  const data = res?.data
  if (Array.isArray(data?.data?.content)) return data.data.content
  if (Array.isArray(data?.data?.items)) return data.data.items
  if (Array.isArray(data?.data)) return data.data
  if (Array.isArray(data?.items)) return data.items
  if (Array.isArray(data?.content)) return data.content
  return []
}

function toId(value) {
  if (!value) return ''
  if (typeof value === 'object') return String(value._id || value.id || '')
  return String(value)
}

function candidateInitial(name) {
  return (name || 'C').trim().charAt(0).toUpperCase()
}

function normalizeOffer(offer) {
  const offerId = toId(offer.offerId || offer._id || offer.id)
  const candidateName = offer.candidateName || offer.candidate?.name || [offer.candidate?.firstName, offer.candidate?.lastName].filter(Boolean).join(' ') || 'Unknown Candidate'

  return {
    raw: offer,
    offerId,
    offerCode: offer.offerCode || offer.code || offerId,
    candidateName,
    candidateCode: offer.candidateCode || offer.candidate?.candidateCode || '',
    candidateEmail: offer.candidateEmail || offer.candidate?.email || '',
    candidatePhone: offer.candidatePhone || offer.candidate?.phone || '',
    jobTitle: offer.jobTitle || offer.job?.publicTitle || offer.job?.jobTitle || 'Offered Role',
    joiningDate: offer.joiningDate || offer.proposedJoiningDate || '',
    status: offer.status || offer.offerStatus || '',
  }
}

function onboardingOfferId(record) {
  return toId(record.offerId || record.offer?._id || record.raw?.offerId)
}

export function StartOnboardingModal({ isOpen, onClose, onRefresh }) {
  const [loading, setLoading] = useState(false)
  const [offers, setOffers] = useState([])
  const [selectedOfferId, setSelectedOfferId] = useState('')
  const [search, setSearch] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let alive = true

    async function loadAcceptedOffers() {
      setLoading(true)
      setError('')
      setSelectedOfferId('')
      try {
        const [offersRes, onboardingRes] = await Promise.all([
          offerApi.list({ status: 'ACCEPTED', size: 100 }),
          preboardingApi.list({ size: 200 }),
        ])

        if (!alive) return

        const existingOfferIds = new Set(listFromResponse(onboardingRes).map(onboardingOfferId).filter(Boolean))
        const available = listFromResponse(offersRes)
          .map(normalizeOffer)
          .filter((offer) => offer.offerId && offer.status === 'ACCEPTED' && !existingOfferIds.has(offer.offerId))

        setOffers(available)
      } catch (err) {
        if (!alive) return
        setError(err.response?.data?.message || 'Failed to load accepted offers from database.')
        setOffers([])
      } finally {
        if (alive) setLoading(false)
      }
    }

    if (isOpen) {
      loadAcceptedOffers()
    } else {
      setOffers([])
      setSearch('')
      setError('')
      setSelectedOfferId('')
      setSubmitting(false)
    }

    return () => {
      alive = false
    }
  }, [isOpen])

  const filteredOffers = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return offers
    return offers.filter((offer) => [
      offer.candidateName,
      offer.candidateCode,
      offer.candidateEmail,
      offer.jobTitle,
      offer.offerCode,
    ].some((value) => String(value || '').toLowerCase().includes(term)))
  }, [offers, search])

  if (!isOpen) return null

  const selectedOffer = offers.find((offer) => offer.offerId === selectedOfferId)

  const handleStart = async () => {
    if (!selectedOfferId) return
    setSubmitting(true)
    setError('')
    try {
      await preboardingApi.start({ offerId: selectedOfferId })
      onRefresh?.()
      onClose()
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to start onboarding.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Portal>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl animate-in zoom-in-95 duration-300 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/80 px-8 py-5 dark:border-slate-800 dark:bg-slate-900/70">
            <div>
              <h2 className="text-xl font-extrabold text-blue-600">Sync Accepted Offers</h2>
              <p className="mt-1 text-sm font-medium text-slate-500">Onboarding is created automatically when an offer is accepted. Use this only to recover an accepted offer that has not appeared in onboarding yet.</p>
            </div>
            <button onClick={onClose} className="rounded-full p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="border-b border-slate-100 bg-white px-8 py-5 dark:border-slate-800 dark:bg-slate-900">
            <div className="rounded-2xl border border-blue-100 bg-blue-50 p-5 dark:border-blue-500/20 dark:bg-blue-500/10">
              <div className="flex items-start gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-500/25">
                  <RefreshCw className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">When should this be used?</h3>
                  <p className="mt-1 text-sm font-semibold leading-6 text-slate-600 dark:text-slate-300">
                    Normally you do not need this. After a candidate accepts an offer, the onboarding record should already be created and shown on this page. If an accepted offer is missing because of an old record or failed sync, select it below and create the missing onboarding profile.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto bg-slate-50/60 p-8 dark:bg-slate-950/30">
            <div className="relative mb-6">
              <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search accepted offer, candidate, email, or position..."
                className="w-full rounded-2xl border border-slate-200 bg-white py-4 pl-12 pr-4 text-sm font-semibold text-slate-700 shadow-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
              />
            </div>

            {error && (
              <div className="mb-5 flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-700 dark:border-rose-900/40 dark:bg-rose-900/10 dark:text-rose-300">
                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {loading ? (
              <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center text-sm font-semibold text-slate-500 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                Loading accepted offers from database...
              </div>
            ) : filteredOffers.length === 0 ? (
              <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20">
                  <CheckCircle2 className="h-7 w-7" />
                </div>
                <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">Everything is synced</h3>
                <p className="mx-auto mt-2 max-w-md text-sm font-medium text-slate-500">
                  There are no accepted offers missing from onboarding. Existing accepted offers are already shown on the onboarding dashboard.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {filteredOffers.map((offer) => {
                  const selected = selectedOfferId === offer.offerId
                  return (
                    <button
                      key={offer.offerId}
                      type="button"
                      onClick={() => setSelectedOfferId(offer.offerId)}
                      className={`rounded-3xl border bg-white p-5 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg dark:bg-slate-900 ${
                        selected
                          ? 'border-blue-500 ring-4 ring-blue-500/10 dark:border-blue-400'
                          : 'border-slate-200 hover:border-blue-300 dark:border-slate-800'
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-lg font-black ${selected ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-600 dark:bg-blue-900/20'}`}>
                          {candidateInitial(offer.candidateName)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="mb-2 flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <h4 className="truncate text-base font-extrabold text-slate-900 dark:text-white">{offer.candidateName}</h4>
                              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">{offer.offerCode}</p>
                            </div>
                            {selected && <CheckCircle2 className="h-5 w-5 shrink-0 text-blue-600" />}
                          </div>

                          <div className="space-y-2 text-xs font-semibold text-slate-500">
                            <p className="flex items-center gap-2"><Briefcase className="h-4 w-4" /> {offer.jobTitle}</p>
                            {offer.candidateEmail && <p className="flex items-center gap-2"><Mail className="h-4 w-4" /> {offer.candidateEmail}</p>}
                            {offer.candidatePhone && <p className="flex items-center gap-2"><Phone className="h-4 w-4" /> {offer.candidatePhone}</p>}
                            {offer.joiningDate && <p className="flex items-center gap-2"><CalendarDays className="h-4 w-4" /> Joining: {new Date(offer.joiningDate).toLocaleDateString()}</p>}
                          </div>
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between border-t border-slate-100 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-500">
              <User className="h-4 w-4" />
              {selectedOffer ? `${selectedOffer.candidateName} selected` : 'Select a missing accepted offer to sync'}
            </div>
            <div className="flex gap-3">
              <button onClick={onClose} className="rounded-xl px-5 py-2.5 text-sm font-bold text-slate-600 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800">
                Cancel
              </button>
              <button
                onClick={handleStart}
                disabled={!selectedOfferId || submitting}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-blue-500/30 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? 'Syncing...' : 'Create Missing Onboarding'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Portal>
  )
}
