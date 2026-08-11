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
    companyName: { type: String, default: null },
    companyCode: { type: String, default: null },
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
    anniversaryDate: { type: Date, default: null },
    bloodGroup: { type: String },
    nationality: { type: String },
    religion: { type: String },
    colorCode: { type: String, default: null },
    discTest: { type: String, default: null },
    motherHead: { type: String, default: null },
    fatherName: { type: String, default: null },
    motherName: { type: String, default: null },
    spouseName: { type: String, default: null },
    department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', default: null },
    designation: { type: mongoose.Schema.Types.ObjectId, ref: 'Designation', default: null },
    branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', default: null },
    shift: { type: mongoose.Schema.Types.ObjectId, ref: 'Shift', default: null },
    reportingManager: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', default: null },
    hod: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', default: null },
    joiningDate: { type: Date },
    confirmationDate: { type: Date },
    resignationDate: { type: Date },
    lastWorkingDate: { type: Date },
    dateOfExit: { type: Date, default: null },
    workLocation: { type: String },
    areaZone: { type: String, default: null },
    workingHours: { type: String, default: null },
    inTiming: { type: String, default: null },
    weekOff: { type: String, default: null },
    workClassification: { type: String, default: null }, // International / Domestic
    employmentType: { type: String }, // Full-time, Part-time, Contract, Intern
    ctc: { type: Number },
    salaryTakeHome: { type: Number, default: null },
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
    verifiedStatus: { type: String, enum: ['PENDING', 'PARTIALLY_VERIFIED', 'VERIFIED'], default: 'PENDING' },
    offerLetterLink: { type: String, default: null },
    appointmentLetterLink: { type: String, default: null },
    probationPeriod: { type: String, default: null },
    remark: { type: String, default: null },
    rightHrApp: { type: String, default: null },
    address: { type: String },
    currentAddress: { type: String, default: null },
    permanentAddress: { type: String, default: null },
    city: { type: String },
    state: { type: String },
    country: { type: String },
    pincode: { type: String },
    personalEmail: { type: String, default: null },
    officialEmail: { type: String, default: null },
    officialPhoneNumber: { type: String, default: null },
    emergencyContactNumber: { type: String, default: null },
    emergencyPersonName: { type: String, default: null },
    profilePhotoUrl: { type: String },
    twoFactorEnabled: { type: Boolean, default: false },
    permissions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Permission' }],
    sourceCandidateId: { type: mongoose.Schema.Types.ObjectId, ref: 'Candidate', default: null },
    sourceApplicationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Application', default: null },
    sourceJobId: { type: mongoose.Schema.Types.ObjectId, ref: 'Job', default: null },
    sourceOfferId: { type: mongoose.Schema.Types.ObjectId, ref: 'Offer', default: null },
    sourcePreboardingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Preboarding', default: null },
    recruitmentSource: { type: String, default: null },
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
