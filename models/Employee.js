import mongoose from 'mongoose'
import { tenantFields, model } from './_base'

export const EMPLOYEE_ROLES = [
  'COMPANY_ADMIN',
  'HR_MANAGER',
  'MANAGER',
  'EMPLOYEE',
  'FINANCE',
  'IT_ADMIN',
  'SUPPORT_AGENT',
]

export const EMPLOYEE_STATUSES = [
  'ACTIVE',
  'INACTIVE',
  'PROBATION',
  'NOTICE_PERIOD',
  'RESIGNED',
  'TERMINATED',
  'ABSCONDED',
  'RETIRED',
]

const EmployeeSchema = new mongoose.Schema(
  {
    employeeCode: { type: String, unique: true, sparse: true }, // e.g. EMP00001
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true },
    password: { type: String, required: true }, // bcrypt hash
    phone: { type: String },
    alternatePhone: { type: String },
    role: { type: String, enum: EMPLOYEE_ROLES, default: 'EMPLOYEE', required: true },
    status: { type: String, enum: EMPLOYEE_STATUSES, default: 'ACTIVE', required: true },
    dateOfBirth: { type: Date },
    gender: { type: String, enum: ['MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY'] },
    maritalStatus: { type: String },
    bloodGroup: { type: String },
    nationality: { type: String },
    religion: { type: String },
    department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', default: null },
    designation: { type: mongoose.Schema.Types.ObjectId, ref: 'Designation', default: null },
    branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', default: null },
    shift: { type: mongoose.Schema.Types.ObjectId, ref: 'Shift', default: null },
    reportingManager: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', default: null },
    joiningDate: { type: Date },
    confirmationDate: { type: Date },
    resignationDate: { type: Date },
    lastWorkingDate: { type: Date },
    workLocation: { type: String },
    employmentType: { type: String }, // Full-time, Part-time, Contract, Intern
    ctc: { type: Number },
    basicSalary: { type: Number },
    bankName: { type: String },
    bankAccountNumber: { type: String },
    bankIfscCode: { type: String },
    accountHolderName: { type: String },
    bankBranch: { type: String },
    aadhaarNumber: { type: String },
    panNumber: { type: String },
    pfNumber: { type: String },
    uanNumber: { type: String },
    esiNumber: { type: String },
    address: { type: String },
    city: { type: String },
    state: { type: String },
    country: { type: String },
    pincode: { type: String },
    profilePhotoUrl: { type: String },
    twoFactorEnabled: { type: Boolean, default: false },
    permissions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Permission' }],
    ...tenantFields,
  },
  { timestamps: true }
)

EmployeeSchema.index({ tenantId: 1, deleted: 1 })
EmployeeSchema.index({ email: 1, tenantId: 1 })
EmployeeSchema.index({ tenantId: 1, firstName: 1 })

EmployeeSchema.methods.getFullName = function () {
  return `${this.firstName} ${this.lastName}`
}

export default model('Employee', EmployeeSchema)
