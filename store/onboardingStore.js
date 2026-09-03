import { create } from 'zustand'

const generateId = () => Math.random().toString(36).substring(2, 9);

const INITIAL_RECORDS = [
  {
    id: 'onb-1001',
    candidate: { id: 'CAN-1024', name: 'Rahul Sharma', email: 'rahul.s@example.com', phone: '+91 9876543210', avatar: null },
    position: 'Software Developer',
    department: 'Engineering',
    designation: 'SDE II',
    employmentType: 'Full Time',
    workMode: 'Hybrid',
    workLocation: 'Bangalore HQ',
    reportingManager: 'Amit Verma',
    onboardingOwner: 'Priya Sharma',
    joiningDate: '2026-08-25',
    status: 'IN_PROGRESS',
    progress: 80,
    createdAt: '2026-08-15T10:00:00Z',
    tasks: [
      { id: 't1', name: 'Document Verification', assignedTo: 'Priya Sharma', dueDate: '2026-08-20', priority: 'High', status: 'COMPLETED', required: true },
      { id: 't2', name: 'IT Equipment Setup', assignedTo: 'IT Admin', dueDate: '2026-08-24', priority: 'Medium', status: 'IN_PROGRESS', required: true },
      { id: 't3', name: 'Bank Details', assignedTo: 'Rahul Sharma', dueDate: '2026-08-22', priority: 'High', status: 'COMPLETED', required: true },
      { id: 't4', name: 'System Access', assignedTo: 'IT Admin', dueDate: '2026-08-24', priority: 'High', status: 'PENDING', required: true },
      { id: 't5', name: 'Orientation', assignedTo: 'Priya Sharma', dueDate: '2026-08-25', priority: 'Low', status: 'PENDING', required: false },
    ],
    documents: [
      { id: 'd1', name: 'Resume', required: true, status: 'VERIFIED', uploadedAt: '2026-08-16T10:00:00Z', verifiedBy: 'Priya Sharma' },
      { id: 'd2', name: 'Government ID', required: true, status: 'VERIFIED', uploadedAt: '2026-08-16T10:30:00Z', verifiedBy: 'Priya Sharma' },
      { id: 'd3', name: 'PAN Card', required: true, status: 'VERIFIED', uploadedAt: '2026-08-16T10:30:00Z', verifiedBy: 'Priya Sharma' },
      { id: 'd4', name: 'Experience Certificate', required: true, status: 'PENDING_VERIFICATION', uploadedAt: '2026-08-18T10:00:00Z' },
      { id: 'd5', name: 'Bank Details', required: true, status: 'VERIFIED', uploadedAt: '2026-08-18T11:00:00Z', verifiedBy: 'Priya Sharma' },
      { id: 'd6', name: 'Photograph', required: true, status: 'NOT_SUBMITTED' }
    ],
    activities: [
      { id: 'a1', action: 'Onboarding started', user: 'Priya Sharma', timestamp: '2026-08-15T10:05:00Z' },
      { id: 'a2', action: 'Government ID uploaded', user: 'Rahul Sharma', timestamp: '2026-08-16T10:00:00Z' },
      { id: 'a3', action: 'Government ID verified', user: 'Priya Sharma', timestamp: '2026-08-16T14:00:00Z' },
    ]
  },
  {
    id: 'onb-1002',
    candidate: { id: 'CAN-1025', name: 'Neha Singh', email: 'neha.singh@example.com', phone: '+91 9988776655', avatar: null },
    position: 'UI/UX Designer',
    department: 'Design',
    designation: 'Senior Designer',
    employmentType: 'Full Time',
    workMode: 'Remote',
    workLocation: 'N/A',
    reportingManager: 'Arjun Das',
    onboardingOwner: 'Priya Sharma',
    joiningDate: '2026-09-01',
    status: 'NOT_STARTED',
    progress: 0,
    createdAt: '2026-08-20T09:00:00Z',
    tasks: [
      { id: 't1', name: 'Document Verification', assignedTo: 'Priya Sharma', dueDate: '2026-08-25', priority: 'High', status: 'PENDING', required: true },
    ],
    documents: [
      { id: 'd1', name: 'Government ID', required: true, status: 'NOT_SUBMITTED' },
      { id: 'd2', name: 'PAN Card', required: true, status: 'NOT_SUBMITTED' },
      { id: 'd3', name: 'Portfolio Link', required: false, status: 'NOT_SUBMITTED' }
    ],
    activities: [
      { id: 'a1', action: 'Onboarding started', user: 'Priya Sharma', timestamp: '2026-08-20T09:05:00Z' },
    ]
  }
]

export const useOnboardingStore = create((set, get) => ({
  records: INITIAL_RECORDS,

  getRecord: (id) => get().records.find(r => r.id === id),

  updateJoiningConfig: (recordId, updates) => set((state) => ({
    records: state.records.map((r) => {
      if (r.id !== recordId) return r
      return {
        ...r,
        ...updates,
        activities: [
          { id: generateId(), action: 'Joining configuration updated', user: 'System', timestamp: new Date().toISOString() },
          ...r.activities,
        ],
      }
    }),
  })),

  startOnboarding: (data) => set((state) => {
    const newRecord = {
      id: `onb-${Date.now()}`,
      candidate: data.candidate,
      position: data.position,
      department: data.department,
      designation: data.designation,
      employmentType: data.employmentType,
      workMode: data.workMode,
      workLocation: data.workLocation,
      reportingManager: data.reportingManager,
      onboardingOwner: data.onboardingOwner,
      joiningDate: data.joiningDate,
      status: 'NOT_STARTED',
      progress: 0,
      createdAt: new Date().toISOString(),
      tasks: data.tasks.map(t => ({ ...t, id: generateId(), status: 'PENDING' })),
      documents: data.documents || [],
      activities: [{ id: generateId(), action: 'Onboarding started', user: data.onboardingOwner, timestamp: new Date().toISOString() }]
    }
    return {
      records: [newRecord, ...state.records]
    }
  }),

  updateTask: (recordId, taskId, updates) => set((state) => {
    return {
      records: state.records.map(r => {
        if (r.id !== recordId) return r;
        const newTasks = r.tasks.map(t => t.id === taskId ? { ...t, ...updates } : t);
        
        // Recalculate progress
        const reqTasks = newTasks.filter(t => t.required);
        const reqDocs = r.documents.filter(d => d.required);
        const completedTasks = reqTasks.filter(t => t.status === 'COMPLETED').length;
        const completedDocs = reqDocs.filter(d => d.status === 'VERIFIED').length;
        
        const totalItems = (reqTasks.length + reqDocs.length) || 1;
        const completedItems = completedTasks + completedDocs;
        const progress = Math.round((completedItems / totalItems) * 100);
        
        // Status only goes to IN_PROGRESS. It only becomes COMPLETED via convertToEmployee.
        const status = r.status === 'NOT_STARTED' && progress > 0 ? 'IN_PROGRESS' : r.status;
        
        return { 
          ...r, 
          tasks: newTasks, 
          progress,
          status
        }
      })
    }
  }),

  addTask: (recordId, task) => set((state) => {
    return {
      records: state.records.map(r => {
        if (r.id !== recordId) return r;
        
        const newTasks = [...r.tasks, { ...task, id: generateId(), status: 'PENDING' }];
        
        // Recalculate progress
        const reqTasks = newTasks.filter(t => t.required);
        const reqDocs = r.documents.filter(d => d.required);
        const completedTasks = reqTasks.filter(t => t.status === 'COMPLETED').length;
        const completedDocs = reqDocs.filter(d => d.status === 'VERIFIED').length;
        const totalItems = (reqTasks.length + reqDocs.length) || 1;
        const progress = Math.round(((completedTasks + completedDocs) / totalItems) * 100);
        
        return {
          ...r,
          tasks: newTasks,
          progress,
          activities: [{ id: generateId(), action: `Task added: ${task.name}`, user: 'System', timestamp: new Date().toISOString() }, ...r.activities]
        }
      })
    }
  }),

  deleteTask: (recordId, taskId) => set((state) => {
    return {
      records: state.records.map(r => {
        if (r.id !== recordId) return r;
        const newTasks = r.tasks.filter(t => t.id !== taskId);
        
        // Recalculate progress
        const reqTasks = newTasks.filter(t => t.required);
        const reqDocs = r.documents.filter(d => d.required);
        const completedTasks = reqTasks.filter(t => t.status === 'COMPLETED').length;
        const completedDocs = reqDocs.filter(d => d.status === 'VERIFIED').length;
        const totalItems = (reqTasks.length + reqDocs.length) || 1;
        const progress = Math.round(((completedTasks + completedDocs) / totalItems) * 100);
        
        return { ...r, tasks: newTasks, progress }
      })
    }
  }),

  updateDocument: (recordId, docId, updates) => set((state) => {
    return {
      records: state.records.map(r => {
        if (r.id !== recordId) return r;
        
        const newDocs = r.documents.map(d => d.id === docId ? { ...d, ...updates } : d);
        
        // Recalculate progress
        const reqTasks = r.tasks.filter(t => t.required);
        const reqDocs = newDocs.filter(d => d.required);
        const completedTasks = reqTasks.filter(t => t.status === 'COMPLETED').length;
        const completedDocs = reqDocs.filter(d => d.status === 'VERIFIED').length;
        
        const totalItems = (reqTasks.length + reqDocs.length) || 1;
        const completedItems = completedTasks + completedDocs;
        const progress = Math.round((completedItems / totalItems) * 100);
        
        const status = r.status === 'NOT_STARTED' && progress > 0 ? 'IN_PROGRESS' : r.status;
        
        return {
          ...r,
          documents: newDocs,
          progress,
          status,
          activities: [{ id: generateId(), action: `Document updated`, user: 'System', timestamp: new Date().toISOString() }, ...r.activities]
        }
      })
    }
  }),

  addDocument: (recordId, doc) => set((state) => {
    return {
      records: state.records.map(r => {
        if (r.id !== recordId) return r;
        const newDocs = [...r.documents, { ...doc, id: `d${Date.now()}`, status: 'NOT_SUBMITTED' }];
        
        // Recalculate progress
        const reqTasks = r.tasks.filter(t => t.required);
        const reqDocs = newDocs.filter(d => d.required);
        const completedTasks = reqTasks.filter(t => t.status === 'COMPLETED').length;
        const completedDocs = reqDocs.filter(d => d.status === 'VERIFIED').length;
        const totalItems = (reqTasks.length + reqDocs.length) || 1;
        const progress = Math.round(((completedTasks + completedDocs) / totalItems) * 100);
        
        return {
          ...r,
          documents: newDocs,
          progress,
          activities: [{ id: generateId(), action: `Document request added: ${doc.name}`, user: 'System', timestamp: new Date().toISOString() }, ...r.activities]
        }
      })
    }
  }),

  removeDocument: (recordId, docId) => set((state) => {
    return {
      records: state.records.map(r => {
        if (r.id !== recordId) return r;
        const newDocs = r.documents.filter(d => d.id !== docId);
        
        // Recalculate progress
        const reqTasks = r.tasks.filter(t => t.required);
        const reqDocs = newDocs.filter(d => d.required);
        const completedTasks = reqTasks.filter(t => t.status === 'COMPLETED').length;
        const completedDocs = reqDocs.filter(d => d.status === 'VERIFIED').length;
        const totalItems = (reqTasks.length + reqDocs.length) || 1;
        const progress = Math.round(((completedTasks + completedDocs) / totalItems) * 100);
        
        return {
          ...r,
          documents: newDocs,
          progress,
          activities: [{ id: generateId(), action: `Document request removed`, user: 'System', timestamp: new Date().toISOString() }, ...r.activities]
        }
      })
    }
  }),

  updateStatus: (recordId, status) => set((state) => {
    return {
      records: state.records.map(r => {
        if (r.id !== recordId) return r;
        return { 
          ...r, 
          status,
          activities: [{ id: generateId(), action: `Status changed to ${status}`, user: 'System', timestamp: new Date().toISOString() }, ...r.activities]
        }
      })
    }
  }),
  
  convertToEmployee: (recordId) => set((state) => {
    return {
      records: state.records.map(r => {
        if (r.id !== recordId) return r;
        return { 
          ...r, 
          status: 'COMPLETED',
          activities: [{ id: generateId(), action: `Candidate converted to active employee`, user: 'System', timestamp: new Date().toISOString() }, ...r.activities]
        }
      })
    }
  })
}))
