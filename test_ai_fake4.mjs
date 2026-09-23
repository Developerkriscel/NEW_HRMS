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
  
  const schemaDefinition = {
    type: 'object',
    properties: {
      aiMatchScore: { type: 'number', description: "Score from 0 to 100 indicating fit" },
      aiMatchReasoning: { type: 'string', description: "Detailed explanation of why this candidate is or isn't a good fit for the role." },
      strengths: { type: 'array', items: { type: 'string' }, description: "Key strengths matching the role" },
      concerns: { type: 'array', items: { type: 'string' }, description: "Key gaps or concerns" }
    }
  }

  const prompt = `
You are an expert tech recruiter. Evaluate this candidate for the following job.
Provide a match score (0-100) and reasoning for the match.
CRITICAL INSTRUCTION: Keep your reasoning STRICTLY under 2 short sentences. Do not write large paragraphs. Be extremely concise.

Scoring Rules:
1. Conduct a strict, word-to-word and semantic analysis of the candidate's Skills, Current Title, and Total Experience against the Job Responsibilities and Required Qualifications.
2. Calculate the exact percentage overlap. Do not use generic round numbers (e.g., avoid exactly 0, 50, 70, 95). Provide a realistic, granular score (e.g., 14, 68, 87, 92) that reflects the true depth of the match.
3. DO NOT penalize the candidate if their detailed "Resume Experience" (past roles/dates) is empty or missing. If their Skills and Total Experience match the job, they deserve a high score based purely on that overlap.

Job Details:
Title: Software Developer
Description/Summary: N/A
Responsibilities: N/A
Required Qualifications: N/A

Candidate Profile:
Name: Rahul Sharma
Experience: 1.5 Years years
Current Title: Full Stack Developer
Resume Skills: []
Resume Experience: []
Resume Summary: Role: Full Stack Developer. Experience: 1.5 Years.

You must return ONLY a JSON object exactly matching the following schema structure:
${JSON.stringify(schemaDefinition, null, 2)}
`;
    
  const response = await client.chat.completions.create({
    model: tenant.aiSettings.model || 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.0,
    seed: 42,
    response_format: { type: 'json_object' }
  });
  console.log('Result:', response.choices[0].message.content);
  
  await mongoose.disconnect();
}

run();
