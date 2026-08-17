import dotenv from 'dotenv'
import mongoose from 'mongoose'
dotenv.config({ path: '.env.local' })
const uri = process.env.MONGODB_DIRECT_URI || process.env.MONGODB_URI
await mongoose.connect(uri)
const conn = mongoose.connection.useDb('nexahr_tenant_asd', { useCache: true })
const anySchema = new mongoose.Schema({}, { strict: false })
const JobScreeningQuestion = conn.model('job_screening_questions', anySchema, 'job_screening_questions')
const JobApplicationField = conn.model('job_application_fields', anySchema, 'job_application_fields')
const JobPipelineStage = conn.model('job_pipeline_stages', anySchema, 'job_pipeline_stages')

const jobId = '6a773928b23b69a5e76c35c0' // JOB-2026-0007
const questions = await JobScreeningQuestion.find({ jobId }).lean()
const fields = await JobApplicationField.find({ jobId }).lean()
const stages = await JobPipelineStage.find({ jobId, isActive: true }).sort({ order: 1 }).lean()
console.log('screening questions:', JSON.stringify(questions, null, 2))
console.log('application fields:', JSON.stringify(fields, null, 2))
console.log('active pipeline stages:', JSON.stringify(stages.map(s => ({ id: s._id, name: s.name, order: s.order })), null, 2))
await mongoose.disconnect()
