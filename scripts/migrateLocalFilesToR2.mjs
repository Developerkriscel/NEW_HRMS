import { readdir, readFile, stat } from 'node:fs/promises'
import path from 'node:path'
import { config } from 'dotenv'
import mongoose from 'mongoose'
import { putPrivateObject, storageKey } from '../lib/objectStorage.js'

config({ path: '.env.local' })

const root = process.cwd()
const outputRoot = path.join(root, 'output')

const contentTypes = {
  pdf: 'application/pdf',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
  svg: 'image/svg+xml',
}

function extOf(filename) {
  return filename.split('.').pop()?.toLowerCase() || 'bin'
}

async function listFiles(dir) {
  try {
    const entries = await readdir(dir, { withFileTypes: true })
    const files = []
    for (const entry of entries) {
      const absolute = path.join(dir, entry.name)
      if (entry.isDirectory()) files.push(...await listFiles(absolute))
      if (entry.isFile()) files.push(absolute)
    }
    return files
  } catch (err) {
    if (err?.code === 'ENOENT') return []
    throw err
  }
}

function tenantAndFilename(filePath, moduleDir) {
  const relative = path.relative(path.join(outputRoot, moduleDir), filePath)
  const [tenantId, filename] = relative.split(path.sep)
  if (!tenantId || !filename || relative.split(path.sep).length !== 2) return null
  return { tenantId, filename }
}

function apiUrl(moduleName, tenantId, filename) {
  if (moduleName === 'resumes') return `/api/recruitment/resumes/${tenantId}/${filename}`
  if (moduleName === 'assessment-submissions') return `/api/recruitment/candidate-assessments/files/${tenantId}/${filename}`
  if (moduleName === 'offers') return `/api/recruitment/offers/files/${tenantId}/${filename}`
  return null
}

async function uploadFiles(moduleName, objectFolder, { updateDb } = {}) {
  const files = await listFiles(path.join(outputRoot, moduleName))
  let uploaded = 0
  let dbUpdates = 0
  for (const filePath of files) {
    const mapped = tenantAndFilename(filePath, moduleName)
    if (!mapped) continue
    const { tenantId, filename } = mapped
    const buffer = await readFile(filePath)
    const key = storageKey('tenants', tenantId, objectFolder, filename)
    await putPrivateObject(key, buffer, {
      contentType: contentTypes[extOf(filename)] || 'application/octet-stream',
      metadata: { migratedFrom: moduleName },
    })
    uploaded += 1
    if (updateDb) dbUpdates += await updateDb({ tenantId, filename, url: apiUrl(moduleName, tenantId, filename) })
  }
  return { uploaded, dbUpdates }
}

async function updateTenantDb(tenantId, fn) {
  const tenant = await rootDb
    .collection('tenants')
    .findOne({ _id: new mongoose.Types.ObjectId(tenantId), deleted: { $ne: true } }, { projection: { databaseName: 1 } })
  if (!tenant?.databaseName) return 0
  const db = mongoose.connection.useDb(tenant.databaseName, { useCache: true }).db
  return fn(db)
}

const missing = ['R2_BUCKET_NAME', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY']
  .filter((key) => !process.env[key])
if (!process.env.R2_ENDPOINT && !process.env.R2_ACCOUNT_ID) missing.push('R2_ENDPOINT or R2_ACCOUNT_ID')
if (missing.length) {
  console.error(`Missing R2 env value(s): ${missing.join(', ')}`)
  process.exit(1)
}
if (process.env.STORAGE_DRIVER !== 'r2') {
  console.error('Set STORAGE_DRIVER=r2 before running this migration.')
  process.exit(1)
}

const MONGODB_URI = process.env.MONGODB_DIRECT_URI || process.env.MONGODB_URI
if (!MONGODB_URI) {
  console.error('MONGODB_URI is not set.')
  process.exit(1)
}

await mongoose.connect(MONGODB_URI, {
  serverSelectionTimeoutMS: Number(process.env.MONGODB_CONNECT_TIMEOUT_MS || 4000),
  connectTimeoutMS: Number(process.env.MONGODB_CONNECT_TIMEOUT_MS || 4000),
  socketTimeoutMS: Number(process.env.MONGODB_SOCKET_TIMEOUT_MS || 15000),
})
const rootDb = mongoose.connection.db
await stat(outputRoot).catch(() => null)

const results = {}

results.resumes = await uploadFiles('resumes', 'resumes', {
  updateDb: async ({ tenantId, filename, url }) => updateTenantDb(tenantId, async (db) => {
    const resumeUpdate = await db.collection('candidate_resumes').updateMany({ tenantId: new mongoose.Types.ObjectId(tenantId), fileName: filename }, { $set: { fileUrl: url } })
    const candidateUpdate = await db.collection('candidates').updateMany(
      { tenantId: new mongoose.Types.ObjectId(tenantId), resumeUrl: { $regex: `${filename.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$` } },
      { $set: { resumeUrl: url } }
    )
    return (resumeUpdate.modifiedCount || 0) + (candidateUpdate.modifiedCount || 0)
  }),
})

results.preboardingDocuments = await uploadFiles('preboarding-documents', 'preboarding-documents', {
  updateDb: async ({ tenantId, filename }) => updateTenantDb(tenantId, async (db) => {
    const update = await db.collection('candidate_document_versions').updateMany(
      { tenantId: new mongoose.Types.ObjectId(tenantId), storageKey: filename },
      { $set: { storageKey: filename } }
    )
    return update.modifiedCount || 0
  }),
})

results.assessmentSubmissions = await uploadFiles('assessment-submissions', 'assessment-submissions', {
  updateDb: async ({ tenantId, filename, url }) => updateTenantDb(tenantId, async (db) => {
    const update = await db.collection('candidate_assessment_answers').updateMany(
      { tenantId: new mongoose.Types.ObjectId(tenantId), answer: { $regex: `${filename.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$` } },
      { $set: { answer: url } }
    )
    return update.modifiedCount || 0
  }),
})

results.offers = await uploadFiles('offers', 'offers', {
  updateDb: async ({ tenantId, filename, url }) => updateTenantDb(tenantId, async (db) => {
    const update = await db.collection('offer_versions').updateMany(
      { tenantId: new mongoose.Types.ObjectId(tenantId), pdfUrl: { $regex: `${filename.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$` } },
      { $set: { pdfUrl: url } }
    )
    return update.modifiedCount || 0
  }),
})

console.log(JSON.stringify(results, null, 2))
await mongoose.disconnect()
