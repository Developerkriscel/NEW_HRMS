'use client'

import { useEffect, useState } from 'react'
import { useParams, useSearchParams, useRouter } from 'next/navigation'
import { PageLoader } from '@/components/common/LoadingSpinner'
import { employeeApi } from '@/services/employeeApi'
import { AddEmployeePage } from '@/components/pages/AddEmployeePage'
import { ArrowLeft, Mail, Phone, Building2, Briefcase, Calendar, MapPin, ShieldCheck, User } from 'lucide-react'
import { Avatar } from '@/components/common/Avatar'
import { Badge } from '@/components/common/Badge'
import { formatDate } from '@/lib/utils'

export default function EmployeeProfileRoute() {
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  const isEditing = searchParams.get('edit') === 'true'
  
  const [employee, setEmployee] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (params?.id) {
      employeeApi.getById(params.id)
        .then((res) => setEmployee(res.data.data))
        .catch((err) => console.error(err))
        .finally(() => setLoading(false))
    }
  }, [params?.id, isEditing])

  if (loading) return <PageLoader />
  if (!employee) return <div className="p-10 text-center text-slate-500">Employee not found</div>

  return (
    <div className="animate-fade-in space-y-6 pb-12 relative">
      <div className="flex items-center justify-between">
        <button onClick={() => router.push('/company/employees')} className="flex items-center gap-2 text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors text-sm font-semibold">
          <ArrowLeft className="w-4 h-4" /> Back to Employees
        </button>
        <button onClick={() => router.push(`/company/employees/${employee._id}?edit=true`)} className="btn-primary">
          Edit Profile
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row items-center gap-8 hover:shadow-lg transition-all duration-300">
        <Avatar name={`${employee.firstName} ${employee.lastName}`} size="xl" className="w-32 h-32 text-4xl shadow-xl shadow-blue-500/20" />
        <div className="flex-1 text-center md:text-left">
          <div className="flex flex-col md:flex-row md:items-center gap-3 mb-2 justify-center md:justify-start">
            <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">{employee.firstName} {employee.lastName}</h1>
            <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400">{employee.status}</Badge>
          </div>
          <p className="text-lg font-medium text-slate-500 dark:text-slate-400 mb-4">{employee.designation?.name || 'No Designation'} • {employee.department?.name || 'No Department'}</p>
          
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-sm text-slate-600 dark:text-slate-300">
            <span className="flex items-center gap-1.5"><Mail className="w-4 h-4 text-slate-400" /> {employee.email}</span>
            <span className="flex items-center gap-1.5"><Phone className="w-4 h-4 text-slate-400" /> {employee.phone || 'N/A'}</span>
            <span className="flex items-center gap-1.5"><ShieldCheck className="w-4 h-4 text-slate-400" /> {employee.role}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-sm border border-slate-200 dark:border-slate-800">
          <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider mb-6 flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
            <Briefcase className="w-4 h-4 text-blue-500" /> Work Details
          </h3>
          <div className="space-y-4">
            <div>
              <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Employee Code</p>
              <p className="font-semibold text-slate-800 dark:text-slate-200">{employee.employeeCode}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Joining Date</p>
              <p className="font-semibold text-slate-800 dark:text-slate-200">{formatDate(employee.joiningDate)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Employment Type</p>
              <p className="font-semibold text-slate-800 dark:text-slate-200">{employee.employmentType}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Reporting Manager</p>
              <p className="font-semibold text-slate-800 dark:text-slate-200">{employee.reportingManager ? `${employee.reportingManager.firstName} ${employee.reportingManager.lastName}` : 'None'}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-sm border border-slate-200 dark:border-slate-800">
          <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider mb-6 flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
            <User className="w-4 h-4 text-purple-500" /> Personal Details
          </h3>
          <div className="space-y-4">
            <div>
              <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Gender</p>
              <p className="font-semibold text-slate-800 dark:text-slate-200">{employee.gender || 'Not specified'}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Blood Group</p>
              <p className="font-semibold text-slate-800 dark:text-slate-200">{employee.bloodGroup || 'Not specified'}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Date of Birth</p>
              <p className="font-semibold text-slate-800 dark:text-slate-200">{formatDate(employee.dateOfBirth)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Emergency Contact</p>
              <p className="font-semibold text-slate-800 dark:text-slate-200">{employee.emergencyPersonName ? `${employee.emergencyPersonName} (${employee.emergencyContactNumber})` : 'None provided'}</p>
            </div>
          </div>
        </div>
      </div>

      {isEditing && (
        <AddEmployeePage 
          basePath="/company/employees" 
          initialData={employee}
          onClose={() => router.push(`/company/employees/${employee._id}`)} 
        />
      )}
    </div>
  )
}
