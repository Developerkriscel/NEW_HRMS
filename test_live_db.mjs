import mongoose from 'mongoose';
import dotenv from 'dotenv';
import crypto from 'crypto';
import OpenAI from 'openai';

dotenv.config({ path: '.env.local' });

function encryptionKey() {
  const material = process.env.SECRET_ENCRYPTION_KEY || process.env.JWT_SECRET || 'NexaHR-local-secret-encryption-key'
  return crypto.createHash('sha256').update(material).digest()
}

function decryptSecret(ciphertextBase64, ivBase64, tagBase64) {
  const decipher = crypto.createDecipheriv('aes-256-gcm', encryptionKey(), Buffer.from(ivBase64, 'base64'))
  decipher.setAuthTag(Buffer.from(tagBase64, 'base64'))
  const plainText = Buffer.concat([
    decipher.update(Buffer.from(ciphertextBase64, 'base64')),
    decipher.final()
  ])
  return plainText.toString('utf8')
}

async function run() {
  await mongoose.connect(process.env.MONGODB_DIRECT_URI || process.env.MONGODB_URI);
  
  const tenant = await mongoose.connection.collection('tenants').findOne({});
  const apiKey = decryptSecret(
    tenant.aiSettings.apiKeyCiphertext,
    tenant.aiSettings.apiKeyIv,
    tenant.aiSettings.apiKeyTag
  );
  
  const client = new OpenAI({ apiKey });
  
  const prompt = `
You are an expert tech recruiter. Evaluate this candidate for the following job.
Provide a match score (0-100) and reasoning for the match, focusing on semantic fit between their experience and the job's responsibilities and Required Qualifications, beyond just keyword matching.
Keep the reasoning under 2 sentences.

Job Details:
Title: Software Developer
Description/Summary: We need a software developer.
Responsibilities: N/A
Required Qualifications: React, Node.js

Candidate Profile:
Name: Vikram Yadav
Experience: 2 Years
Current Title: Full Stack Developer
Resume Skills: ["React", "Node.js", "MongoDB", "Express"]
Resume Experience: []
Resume Summary: Role: Full Stack Developer. Experience: 2 Years.

You must return ONLY a JSON object exactly matching the following schema structure:
{
  "aiMatchScore": 95,
  "aiMatchReasoning": "Strong fit based on React and Node.js skills.",
  "strengths": ["React", "Node.js"],
  "concerns": []
}
`;

  try {
    const response = await client.chat.completions.create({
      model: tenant.aiSettings.model || 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      response_format: { type: 'json_object' }
    });
    console.log('SUCCESS:', response.choices[0].message.content);
  } catch (err) {
    console.error('OPENAI ERROR:', err.message);
  }
  
  await mongoose.disconnect();
}

run();
