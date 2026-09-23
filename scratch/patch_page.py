import re

with open(r'c:\Projects\NexaHR\app\(dashboard)\hr\recruitment\page.js', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add imports
content = content.replace(
    "import { jobApi } from '@/services/jobApi'",
    "import { jobApi } from '@/services/jobApi'\nimport { departmentApi, branchApi } from '@/services/departmentApi'"
)

# 2. Replace positionsList state and fetch
positions_block = """  const [positionsList, setPositionsList] = useState([
    {
      id: 1, title: 'Senior Frontend Developer', department: 'Engineering', location: 'Remote',
      type: 'Full-time', openings: 2, status: 'Active', 
      description: 'Looking for an experienced React developer...',
      skills: ['React', 'Next.js', 'Tailwind'], applicants: 45
    },
    {
      id: 2, title: 'Product Manager', department: 'Product', location: 'New York',
      type: 'Full-time', openings: 1, status: 'Active',
      description: 'Lead product strategy and execution...',
      skills: ['Product Strategy', 'Agile', 'Jira'], applicants: 28
    },
    {
      id: 3, title: 'UX Designer', department: 'Design', location: 'London',
      type: 'Contract', openings: 1, status: 'On Hold',
      description: 'Create beautiful and intuitive user experiences...',
      skills: ['Figma', 'UI/UX', 'Prototyping'], applicants: 15
    },
    {
      id: 4, title: 'Backend Developer', department: 'Engineering', location: 'Remote',
      type: 'Full-time', openings: 3, status: 'Closed',
      description: 'Build scalable backend services...',
      skills: ['Node.js', 'MongoDB', 'AWS'], applicants: 62
    }
  ])"""

new_positions_block = """  const [positionsList, setPositionsList] = useState([])
  const [loadingPositions, setLoadingPositions] = useState(false)
  const [formOptions, setFormOptions] = useState({ departments: [], branches: [], employees: [] })

  const fetchFormOptions = async () => {
    try {
      const [deptRes, branchRes, empRes] = await Promise.all([
        departmentApi.getAll(),
        branchApi.getAll(),
        jobApi.getEmployees()
      ])
      setFormOptions({
        departments: deptRes.data?.data || deptRes.data || [],
        branches: branchRes.data?.data || branchRes.data || [],
        employees: empRes.data?.data || empRes.data || []
      })
    } catch (err) {
      console.error('Failed to fetch form options', err)
    }
  }

  const fetchPositionsList = async () => {
    try {
      setLoadingPositions(true)
      const response = await jobApi.list()
      const mapped = response.data?.content?.map(job => ({
        id: job._id,
        title: job.jobTitle || job.title,
        department: job.department?.name || 'General',
        status: job.status === 'DRAFT' ? 'On Hold' : job.status === 'PUBLISHED' || job.status === 'OPEN' ? 'Active' : 'Closed',
        jobCode: job.jobCode,
        ...job
      })) || []
      setPositionsList(mapped)
    } catch (err) {
      console.error('Failed to load positions', err)
    } finally {
      setLoadingPositions(false)
    }
  }

  useEffect(() => {
    fetchPositionsList()
    fetchFormOptions()
  }, [])"""

content = content.replace(positions_block, new_positions_block)

# 3. Replace handleSavePosition, handleDeletePosition, handleStatusChange
mutators_block = """  const handleSavePosition = (form) => {
    if (editingPositionForModal) {
      setPositionsList(positionsList.map(p => p.id === editingPositionForModal.id ? { ...p, ...form } : p))
    } else {
      setPositionsList([...positionsList, { id: Date.now(), ...form }])
    }
    setShowOpenPositionModal(false)
    setEditingPositionForModal(null)
  }

  const handleDeletePosition = (id) => {
    const pos = positionsList.find(p => p.id === id)
    setPositionToDelete(pos)
  }

  const handleStatusChange = (id, newStatus) => {
    setPositionsList(positionsList.map(p => p.id === id ? { ...p, status: newStatus } : p))
  }"""

new_mutators_block = """  const handleSavePosition = async (form) => {
    try {
      const isValidObjectId = (id) => id && typeof id === 'string' && id.match(/^[0-9a-fA-F]{24}$/)
      const payload = {
        jobTitle: form.title || form.jobTitle,
        totalOpenings: parseInt(form.openings) || 1,
        employmentType: form.jobType === 'Full-time' ? 'FULL_TIME' : 
                        form.jobType === 'Part-time' ? 'PART_TIME' :
                        form.jobType === 'Contract' ? 'CONTRACT' :
                        form.jobType === 'Intern' ? 'INTERNSHIP' : 'FULL_TIME',
        workMode: form.workMode === 'Remote' ? 'REMOTE' :
                  form.workMode === 'Hybrid' ? 'HYBRID' : 'ONSITE',
        department: isValidObjectId(form.departmentId) ? form.departmentId : null,
        location: isValidObjectId(form.locationId) ? form.locationId : null,
        hiringManager: isValidObjectId(form.hiringManagerId) ? form.hiringManagerId : null,
        recruiter: isValidObjectId(form.recruiterId) ? form.recruiterId : null,
        jobSummary: form.description,
        responsibilities: form.responsibilities,
        requiredQualifications: form.requiredSkills,
        preferredQualifications: form.preferredSkills,
        internalMinCtc: form.salaryMin ? parseInt(form.salaryMin) : null,
        internalMaxCtc: form.salaryMax ? parseInt(form.salaryMax) : null,
        currency: form.currency || 'INR',
        benefits: form.benefits,
        openingDate: form.openingDate || null,
        targetClosingDate: form.targetClosingDate || null,
        expectedJoiningDate: form.expectedJoiningDate || null,
      }

      if (editingPositionForModal) {
        await jobApi.update(editingPositionForModal.id, payload)
      } else {
        await jobApi.create(payload)
      }
      setShowOpenPositionModal(false)
      setEditingPositionForModal(null)
      fetchPositionsList()
    } catch (err) {
      console.error('Failed to save position', err)
      alert(err?.response?.data?.message || 'Failed to save position')
    }
  }

  const handleDeletePosition = async (id) => {
    try {
      await jobApi.cancel(id, 'Deleted from dashboard', true)
      setPositionToDelete(null)
      fetchPositionsList()
    } catch (err) {
      console.error('Failed to delete position', err)
    }
  }

  const handleStatusChange = async (id, newStatus) => {
    try {
      if (newStatus === 'Active') await jobApi.open(id)
      else if (newStatus === 'On Hold') await jobApi.pause(id, 'Paused from dashboard')
      else if (newStatus === 'Closed') await jobApi.close(id, 'Closed from dashboard', true)
      fetchPositionsList()
    } catch (err) {
      console.error('Failed to change status', err)
    }
  }"""

content = content.replace(mutators_block, new_mutators_block)

# 4. ConfirmDialog onConfirm
confirm_block = """        onConfirm={() => {
          setPositionsList(positionsList.filter(p => p.id !== positionToDelete.id))
          setPositionToDelete(null)
        }}"""

new_confirm_block = """        onConfirm={() => {
          handleDeletePosition(positionToDelete.id)
        }}"""
content = content.replace(confirm_block, new_confirm_block)

# 5. OpenPositionModal options
modal_block = """      {showOpenPositionModal && (
        <OpenPositionModal 
          initialData={editingPositionForModal}
          onSave={handleSavePosition}
          onClose={() => {
            setShowOpenPositionModal(false)
            setEditingPositionForModal(null)
          }} 
        />
      )}"""

new_modal_block = """      {showOpenPositionModal && (
        <OpenPositionModal 
          initialData={editingPositionForModal}
          options={formOptions}
          onSave={handleSavePosition}
          onClose={() => {
            setShowOpenPositionModal(false)
            setEditingPositionForModal(null)
          }} 
        />
      )}"""
content = content.replace(modal_block, new_modal_block)

# 6. ID mapped to jobCode
content = content.replace('<div className="font-medium text-slate-500 mb-1">#{pos.id}</div>', '<div className="font-medium text-slate-500 mb-1">#{pos.jobCode || pos.id}</div>')

with open(r'c:\Projects\NexaHR\app\(dashboard)\hr\recruitment\page.js', 'w', encoding='utf-8') as f:
    f.write(content)

print("Patch applied successfully")
