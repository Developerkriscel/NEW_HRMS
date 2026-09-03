import { create } from 'zustand'
import { candidateApi } from '@/services/candidateApi'
import { offerApi } from '@/services/offerApi'
import { interviewApi } from '@/services/interviewApi'
import { selectionApi } from '@/services/selectionApi'

function displayStatus(application) {
  if (application.status === 'REJECTED' || application.status === 'WITHDRAWN') return 'Rejected'
  if (application.selectionStatus === 'SELECTED' || application.selectionStatus === 'SELECTION_APPROVAL_PENDING' || application.selectionStatus === 'SELECTION_APPROVED') return 'Selected'
  if (application.status === 'HIRED') return 'HIRED'
  return application.status
}

function pickStage(stages, preferredName, preferredCategory) {
  const active = (stages || []).filter((stage) => stage.isActive !== false)
  if (!active.length) return null
  const wanted = String(preferredName || '').toLowerCase()
  return active.find((stage) => String(stage.name || '').toLowerCase() === wanted)
    || active.find((stage) => wanted && String(stage.name || '').toLowerCase().includes(wanted))
    || active.find((stage) => preferredCategory && stage.category === preferredCategory)
    || active[0]
}

function addOneHour(time) {
  const [hours, minutes] = String(time || '10:00').split(':').map(Number)
  const nextHour = Number.isFinite(hours) ? (hours + 1) % 24 : 11
  const safeMinutes = Number.isFinite(minutes) ? minutes : 0
  return `${String(nextHour).padStart(2, '0')}:${String(safeMinutes).padStart(2, '0')}`
}

function displayOfferStatus(status) {
  if (!status) return null
  if (status === 'SENT' || status === 'VIEWED') return 'Sent'
  if (status === 'ACCEPTED') return 'Accepted'
  if (status === 'DECLINED' || status === 'WITHDRAWN' || status === 'EXPIRED') return 'Rejected'
  if (status === 'DRAFT') return 'Draft'
  return status
}

function combineInterviewDateTime(interview) {
  if (!interview?.date) return null
  const datePart = new Date(interview.date).toISOString().slice(0, 10)
  const timePart = interview.startTime || '00:00'
  return `${datePart}T${timePart}:00`
}

export const useRecruitmentStore = create((set, get) => ({
  candidates: [],
  offers: [],
  rejected: [],
  loading: false,
  error: null,

  fetchCandidates: async (params = {}) => {
    set({ loading: true, error: null });
    try {
      // Load raw applications from backend
      const res = await candidateApi.list({ size: 200, ...params });
      const rows = res.data.data.content || [];
      
      // Transform backend shape (application) into the UI candidate card shape
      const mappedCandidates = rows.map(a => ({
        id: a.applicationId,
        candidateId: a.candidateId,
        name: a.candidateName,
        email: a.email,
        phone: a.phone,
        role: a.jobTitle,
        stage: a.stage || 'Applied',
        score: a.aiMatchScore || 0,
        status: displayStatus(a),
        backendStatus: a.status,
        selectionStatus: a.selectionStatus,
        readyForOffer: a.readyForOffer,
        offerId: a.offerId,
        offerStatus: displayOfferStatus(a.offerStatus),
        backendOfferStatus: a.offerStatus,
        offerSentAt: a.offerSentAt,
        offerAcceptedAt: a.offerAcceptedAt,
        offerDeclinedAt: a.offerDeclinedAt,
        offerExpiresAt: a.offerExpiresAt,
        latestInterview: a.latestInterview,
        appliedAt: a.appliedAt,
        interviewAt: combineInterviewDateTime(a.latestInterview),
        interviewTime: a.latestInterview?.startTime || null,
        interviewEndTime: a.latestInterview?.endTime || null,
        interviewRoundName: a.latestInterview?.roundName || null,
        interviewMode: a.latestInterview?.mode || null,
        interviewStatus: a.latestInterview?.status || null,
        selectedAt: null,
      }));

      set({ 
        candidates: mappedCandidates,
        offers: mappedCandidates.filter(c => c.status === 'Selected' || c.status === 'HIRED'),
        rejected: mappedCandidates.filter(c => c.status === 'Rejected'),
        loading: false 
      });
    } catch (e) {
      console.error(e);
      set({ error: 'Failed to fetch candidates', loading: false });
    }
  },

  updateCandidateStatus: async (candidateObj, newStatus) => {
    // In our backend, updating status (e.g. Reject) might be a specific API call.
    // For simplicity, if newStatus is 'Rejected', we can call candidateApi.reject
    try {
      if (newStatus === 'Rejected' || newStatus === 'REJECTED') {
         await candidateApi.reject(candidateObj.id, { reason: 'Other', comment: 'General rejection' });
      } else if (newStatus === 'Selected' || newStatus === 'HIRED') {
         // Placeholder for selecting/hiring
         // Usually you'd create an offer.
      }
      // Re-fetch after mutation
      get().fetchCandidates();
    } catch (e) {
      console.error(e);
    }
  },

  selectCandidate: async (candidateObj, data = {}) => {
    try {
      const application = await candidateApi.getApplication(candidateObj.id)
      const stages = application.data.data.pipelineStages || []
      const selectedStage = pickStage(stages, 'Selected', 'SELECTED')
      if (selectedStage && application.data.data.currentStageName !== selectedStage.name) {
        await candidateApi.moveStage(candidateObj.id, selectedStage._id, 'Moved to selected from recruitment board')
      }
      const proposedJoiningDate = data.proposedJoiningDate || new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10)
      await selectionApi.select(candidateObj.id, {
        proposedJoiningDate,
        employmentType: data.employmentType || null,
        comments: data.comments || 'Selected from recruitment board',
      })
      await get().fetchCandidates()
    } catch (e) {
      console.error(e)
      set({ error: e.response?.data?.message || 'Failed to select candidate' })
    }
  },

  scheduleInterview: async (candidateObj, data) => {
    try {
      const endTime = data.endTime || addOneHour(data.startTime)
      await interviewApi.create({
        applicationId: candidateObj.id,
        roundName: data.roundName || 'Interview',
        type: data.type || 'TECHNICAL',
        date: data.date,
        startTime: data.startTime,
        endTime,
        mode: data.mode || 'ONLINE',
        meetingProvider: data.meetingUrl ? 'CUSTOM_LINK' : null,
        meetingUrl: data.meetingUrl || null,
        location: data.location || null,
        candidateInstructions: data.candidateInstructions || null,
        interviewers: data.interviewers || [],
      })
      await get().fetchCandidates()
    } catch (e) {
      console.error(e)
      set({ error: e.response?.data?.message || 'Failed to schedule interview' })
      throw e
    }
  },

  sendOffer: async (candidate) => {
    try {
      const payload = candidate?.offerEmail ? {
        subject: candidate.offerEmail.subject,
        body: candidate.offerEmail.body,
      } : {}
      const res = await candidateApi.quickOffer(candidate.id || candidate, payload)
      await get().fetchCandidates()
      return res.data.data
    } catch (e) {
      console.error(e)
      set({ error: e.response?.data?.message || 'Failed to send offer' })
      throw e
    }
  },
  
  acceptOffer: async (candidateOrId) => {
    try {
      const candidate = typeof candidateOrId === 'object'
        ? candidateOrId
        : get().offers.find((item) => item.id === candidateOrId) || get().candidates.find((item) => item.id === candidateOrId)
      if (!candidate?.offerId) throw new Error('No sent offer found for this candidate')
      await offerApi.accept(candidate.offerId, {
        fullName: candidate.name,
        comment: 'Marked accepted from recruitment board',
      })
      await get().fetchCandidates()
    } catch (e) {
      console.error(e)
      set({ error: e.response?.data?.message || e.message || 'Failed to accept offer' })
      throw e
    }
  },
  
  rejectOffer: async (candidateOrId) => {
    try {
      const candidate = typeof candidateOrId === 'object'
        ? candidateOrId
        : get().offers.find((item) => item.id === candidateOrId) || get().candidates.find((item) => item.id === candidateOrId)
      if (!candidate?.offerId) throw new Error('No sent offer found for this candidate')
      await offerApi.decline(candidate.offerId, {
        reason: 'Other',
        comment: 'Marked declined from recruitment board',
      })
      await get().fetchCandidates()
    } catch (e) {
      console.error(e)
      set({ error: e.response?.data?.message || e.message || 'Failed to decline offer' })
      throw e
    }
  },

  updateCandidateStage: async (candidateId, newStageName) => {
    try {
      const application = await candidateApi.getApplication(candidateId)
      const stages = application.data.data.pipelineStages || []
      const preferredCategory = /interview|technical|round/i.test(newStageName) ? 'INTERVIEW' : null
      const targetStage = pickStage(stages, newStageName, preferredCategory)
      if (!targetStage) throw new Error('No pipeline stage found for this job')
      await candidateApi.moveStage(candidateId, targetStage._id, `Moved to ${targetStage.name}`)

      const state = get();
      const updatedCandidates = state.candidates.map(c => 
        c.id === candidateId ? { ...c, stage: targetStage.name } : c
      );
      set({ candidates: updatedCandidates });
      await get().fetchCandidates()
    } catch (e) {
      console.error(e);
      set({ error: e.response?.data?.message || e.message || 'Failed to move candidate stage' })
    }
  }
}))
