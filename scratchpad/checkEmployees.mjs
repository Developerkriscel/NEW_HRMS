import dotenv from 'dotenv'
import mongoose from 'mongoose'
dotenv.config({ path: '.env.local' })
const uri = process.env.MONGODB_DIRECT_URI || process.env.MONGODB_URI
await mongoose.connect(uri)
const Employee = mongoose.model('Employee', new mongoose.Schema({}, { strict: false }), 'employees')
const Department = mongoose.model('Department', new mongoose.Schema({}, { strict: false }), 'departments')
const Designation = mongoose.model('Designation', new mongoose.Schema({}, { strict: false }), 'designations')
const Branch = mongoose.model('Branch', new mongoose.Schema({}, { strict: false }), 'branches')

for (const tenantId of ['6a6b1b6ba53f75950969aa4c', '6a73553b272b178112e2071a']) {
  const emps = await Employee.find({ tenantId }).select('firstName lastName email role status').lean()
  console.log(`--- tenant ${tenantId} employees ---`)
  console.log(JSON.stringify(emps, null, 2))
  const depts = await Department.countDocuments({ tenantId })
  const desigs = await Designation.countDocuments({ tenantId })
  const branches = await Branch.countDocuments({ tenantId })
  console.log(`depts=${depts} designations=${desigs} branches=${branches}`)
}
await mongoose.disconnect()
