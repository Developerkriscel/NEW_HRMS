import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3'

function cleanSegment(value) {
  return String(value || '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 120) || 'file'
}

function getR2Endpoint() {
  if (process.env.R2_ENDPOINT) return process.env.R2_ENDPOINT
  if (process.env.R2_ACCOUNT_ID) return `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`
  return null
}

export function isR2StorageEnabled() {
  return String(process.env.STORAGE_DRIVER || '').toLowerCase() === 'r2'
}

function requireR2Config() {
  const endpoint = getR2Endpoint()
  const bucket = process.env.R2_BUCKET_NAME
  const accessKeyId = process.env.R2_ACCESS_KEY_ID
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY

  if (!endpoint || !bucket || !accessKeyId || !secretAccessKey) {
    throw new Error('R2 storage is enabled but R2_ENDPOINT/R2_ACCOUNT_ID, R2_BUCKET_NAME, R2_ACCESS_KEY_ID, or R2_SECRET_ACCESS_KEY is missing.')
  }

  return { endpoint, bucket, accessKeyId, secretAccessKey }
}

let r2Client = null

function getR2Client() {
  if (r2Client) return r2Client
  const { endpoint, accessKeyId, secretAccessKey } = requireR2Config()
  r2Client = new S3Client({
    region: 'auto',
    endpoint,
    forcePathStyle: true,
    credentials: { accessKeyId, secretAccessKey },
  })
  return r2Client
}

export function storageKey(...segments) {
  return segments.map(cleanSegment).join('/')
}

export async function putPrivateObject(key, buffer, { contentType = 'application/octet-stream', metadata = {} } = {}) {
  const { bucket } = requireR2Config()
  await getR2Client().send(new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: buffer,
    ContentType: contentType,
    Metadata: Object.fromEntries(
      Object.entries(metadata)
        .filter(([, value]) => value !== undefined && value !== null)
        .map(([name, value]) => [name, String(value)])
    ),
  }))
}

async function streamToBuffer(stream) {
  const chunks = []
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  }
  return Buffer.concat(chunks)
}

export async function getPrivateObjectBuffer(key) {
  const { bucket } = requireR2Config()
  try {
    const result = await getR2Client().send(new GetObjectCommand({ Bucket: bucket, Key: key }))
    return result.Body ? await streamToBuffer(result.Body) : null
  } catch (err) {
    if (err?.name === 'NoSuchKey' || err?.$metadata?.httpStatusCode === 404) return null
    throw err
  }
}

export async function deletePrivateObject(key) {
  const { bucket } = requireR2Config()
  await getR2Client().send(new DeleteObjectCommand({ Bucket: bucket, Key: key }))
}
