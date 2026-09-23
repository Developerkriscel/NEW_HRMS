import mongoose from 'mongoose';
import dotenv from 'dotenv';
import crypto from 'crypto';
import OpenAI from 'openai';

dotenv.config({ path: '.env.local' });

function decryptSecret(ciphertext, iv, tag) {
  if (!ciphertext || !iv || !tag) return null
  try {
    const algorithm = 'aes-256-gcm'
    const keyBuffer = Buffer.from(process.env.JWT_SECRET || 'fallback-dev-secret-key-that-is-32-bytes-long', 'utf-8').subarray(0, 32)
    const decipher = crypto.createDecipheriv(algorithm, keyBuffer, Buffer.from(iv, 'base64'))
    decipher.setAuthTag(Buffer.from(tag, 'base64'))
    const plainText = Buffer.concat([
      decipher.update(Buffer.from(ciphertext, 'base64')),
      decipher.final()
    ])
    return plainText.toString('utf8')
  } catch (error) {
    console.error(error);
    return null
  }
}

async function run() {
  await mongoose.connect(process.env.MONGODB_DIRECT_URI || process.env.MONGODB_URI);
  const tenant = await mongoose.connection.collection('tenants').findOne({});
  const apiKey = decryptSecret(
    tenant.aiSettings.apiKeyCiphertext,
    tenant.aiSettings.apiKeyIv,
    tenant.aiSettings.apiKeyTag
  );
  
  console.log('Testing OpenAI key with gpt-4o-mini...');
  const openai = new OpenAI({ apiKey });
  
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: 'Test message. Please reply with "OK".' }]
    });
    console.log('SUCCESS! Response:', response.choices[0].message.content);
  } catch (error) {
    console.log('OPENAI ERROR STATUS:', error.status);
    console.log('OPENAI ERROR MESSAGE:', error.message);
    console.log('OPENAI ERROR CODE:', error.code);
  }
  
  await mongoose.disconnect();
}

run();
