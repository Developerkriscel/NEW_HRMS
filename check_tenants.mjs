import mongoose from 'mongoose';
import dotenv from 'dotenv';
import crypto from 'crypto';

dotenv.config({ path: '.env.local' });

function decryptSecret(ciphertext, iv, tag) {
  if (!ciphertext || !iv || !tag) return null
  try {
    const algorithm = 'aes-256-gcm'
    const keyBuffer = Buffer.from(process.env.JWT_SECRET || 'fallback-dev-secret-key-that-is-32-bytes-long', 'utf-8').subarray(0, 32)
    const decipher = crypto.createDecipheriv(algorithm, keyBuffer, Buffer.from(iv, 'hex'))
    decipher.setAuthTag(Buffer.from(tag, 'hex'))
    
    let decrypted = decipher.update(ciphertext, 'hex', 'utf8')
    decrypted += decipher.final('utf8')
    return decrypted
  } catch (error) {
    return null
  }
}

async function run() {
  await mongoose.connect(process.env.MONGODB_DIRECT_URI || process.env.MONGODB_URI);
  console.log('Connected to DB');

  const tenants = await mongoose.connection.collection('tenants').find({}).toArray();
  for (const t of tenants) {
    console.log(`Tenant ${t._id}: ${t.name}`);
    if (t.aiSettings) {
      const key = decryptSecret(t.aiSettings.apiKeyCiphertext, t.aiSettings.apiKeyIv, t.aiSettings.apiKeyTag);
      console.log(`  AI Provider: ${t.aiSettings.provider}, Key: ${key}`);
    } else {
      console.log('  No AI Settings');
    }
  }

  mongoose.disconnect();
}

run().catch(console.error);
