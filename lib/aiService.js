import { GoogleGenAI, Type } from '@google/genai'
import OpenAI from 'openai'
import Tenant from '@/models/Tenant'
import { decryptSecret } from '@/lib/platformSecurity'

// Helper to get the AI client for a tenant, falling back to ENV key if tenant has no key
async function getAiClientForTenant(tenantId) {
  let provider = 'GEMINI'
  let model = 'gemini-2.5-flash'
  let apiKey = process.env.GEMINI_API_KEY || null

  if (tenantId) {
    const tenant = await Tenant.findOne({ _id: tenantId, deleted: false }).select('+aiSettings.apiKeyCiphertext +aiSettings.apiKeyIv +aiSettings.apiKeyTag').lean()
    if (tenant?.aiSettings?.provider) {
      provider = tenant.aiSettings.provider
    }
    if (tenant?.aiSettings?.model) {
      model = tenant.aiSettings.model
    }
    if (tenant?.aiSettings?.apiKeyCiphertext) {
      try {
        apiKey = decryptSecret(
          tenant.aiSettings.apiKeyCiphertext, 
          tenant.aiSettings.apiKeyIv, 
          tenant.aiSettings.apiKeyTag
        )
      } catch (err) {
        console.error('Failed to decrypt tenant AI key', err)
      }
    }
  }

  // Ensure logical defaults if model somehow wasn't set but provider was
  if (!model && provider === 'GROK') model = 'grok-2-latest'
  if (!model && provider === 'GEMINI') model = 'gemini-2.5-flash'
  if (!model && provider === 'MISTRAL') model = 'mistral-large-latest'
  if (provider === 'OPENAI' && (!model || model === 'gemini-2.5-flash')) model = 'gpt-4o-mini'
  if (provider === 'GROK' && model === 'gemini-2.5-flash') model = 'grok-2-latest'
  if (provider === 'MISTRAL' && model === 'gemini-2.5-flash') model = 'mistral-large-latest'

  if (!apiKey) return { client: null, provider, model }

  if (provider === 'OPENAI') {
    return {
      client: new OpenAI({ apiKey: apiKey }),
      provider,
      model
    }
  } else if (provider === 'GROK') {
    return {
      client: new OpenAI({
        apiKey: apiKey,
        baseURL: 'https://api.x.ai/v1'
      }),
      provider,
      model
    }
  } else if (provider === 'MISTRAL') {
    return {
      client: new OpenAI({
        apiKey: apiKey,
        baseURL: 'https://api.mistral.ai/v1'
      }),
      provider,
      model
    }
  } else {
    return {
      client: new GoogleGenAI({ apiKey }),
      provider,
      model
    }
  }
}

// ---------------------------------------------------------------------------
// Resume Parsing (Replaces heuristics if AI is available)
// ---------------------------------------------------------------------------

export async function parseResumeWithAi(resumeText, tenantId = null) {
  const { client, provider, model } = await getAiClientForTenant(tenantId)
  if (!client) {
    console.warn('No AI API Key available. Falling back to heuristic parsing.')
    return null
  }

  const schemaDefinition = {
    type: 'object',
    properties: {
      personal: {
        type: 'object',
        properties: {
          name: { type: 'string', description: "null if missing" },
          email: { type: 'string', description: "null if missing" },
          phone: { type: 'string', description: "null if missing" },
          currentLocation: { type: 'string', description: "null if missing" },
          currentCompany: { type: 'string', description: "null if missing" },
          currentDesignation: { type: 'string', description: "null if missing" },
          totalExperience: { type: 'number', description: "Total years of experience" },
          linkedinUrl: { type: 'string', description: "null if missing" },
          githubUrl: { type: 'string', description: "null if missing" },
          portfolioUrl: { type: 'string', description: "null if missing" }
        }
      },
      skills: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            skillName: { type: 'string' },
            confidence: { type: 'number', description: "Score from 0 to 1 on how confident you are they have this skill based on resume" }
          }
        }
      },
      experience: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            companyName: { type: 'string', description: "null if missing" },
            designation: { type: 'string', description: "null if missing" },
            startDate: { type: 'string', description: "ISO Date String" },
            endDate: { type: 'string', description: "ISO Date String or null if current" },
            isCurrent: { type: 'boolean', description: "null if missing" },
            description: { type: 'string', description: "null if missing" },
            confidence: { type: 'number' }
          }
        }
      },
      education: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            degree: { type: 'string', description: "null if missing" },
            institution: { type: 'string', description: "null if missing" },
            startYear: { type: 'number', description: "null if missing" },
            endYear: { type: 'number', description: "null if missing" },
            score: { type: 'string', description: "null if missing" },
            confidence: { type: 'number' }
          }
        }
      },
      certifications: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            issuer: { type: 'string', description: "null if missing" },
            confidence: { type: 'number' }
          }
        }
      },
      projects: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            description: { type: 'string', description: "null if missing" },
            technologies: { type: 'array', items: { type: 'string' }, description: "null if missing" },
            confidence: { type: 'number' }
          }
        }
      },
      aiSummary: { type: 'string', description: "A brief summary of the candidate's profile based on the resume." }
    }
  }

  const prompt = `
You are an expert recruitment AI. Analyze the following resume text and extract the candidate's structured information. 
Extract their personal details, skills, experience, education, certifications, and projects.
Be as accurate as possible. If a field is missing, leave it as null or empty array.
You MUST return ONLY a JSON object that exactly matches the following schema structure:
${JSON.stringify(schemaDefinition, null, 2)}
  
Resume Text:
${resumeText}
`

  try {
    if (provider === 'OPENAI' || provider === 'GROK' || provider === 'MISTRAL') {
      const response = await client.chat.completions.create({
        model: model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.2,
        response_format: { type: 'json_object' }
      })
      if (response.choices && response.choices.length > 0) {
        return JSON.parse(response.choices[0].message.content)
      }
      return null
    } else {
      // GEMINI Implementation using dynamic Type mapping
      const toGenAiSchema = (schema) => {
        const typeMap = { 'string': Type.STRING, 'number': Type.NUMBER, 'boolean': Type.BOOLEAN, 'object': Type.OBJECT, 'array': Type.ARRAY }
        const result = { type: typeMap[schema.type] }
        if (schema.description) result.description = schema.description
        if (schema.properties) {
          result.properties = {}
          for (const k in schema.properties) {
            result.properties[k] = toGenAiSchema(schema.properties[k])
            if (schema.properties[k].description === 'null if missing') {
              result.properties[k].nullable = true
            }
          }
        }
        if (schema.items) {
          result.items = toGenAiSchema(schema.items)
        }
        return result
      }
      
      const response = await client.models.generateContent({
        model: model,
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: toGenAiSchema(schemaDefinition),
          temperature: 0.2
        }
      })
      
      if (response.text) {
        return JSON.parse(response.text)
      }
      return null
    }
  } catch (error) {
    console.error('AI Resume Parsing Error:', error)
    return null
  }
}

// ---------------------------------------------------------------------------
// Candidate-Job Matching (Supplementary AI Evaluation)
// ---------------------------------------------------------------------------

export async function evaluateCandidateMatchWithAi(jobData, candidateData, resumeParsedData, tenantId = null) {
  const { client, provider, model } = await getAiClientForTenant(tenantId)
  if (!client) return null

  const schemaDefinition = {
    type: 'object',
    properties: {
      aiMatchScore: { type: 'integer', description: "Integer score from 0 to 100 indicating fit" },
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
2. Calculate the logical percentage overlap. Provide a natural, whole-number percentage (e.g., 50, 75, 80, 95) that reflects the true depth of the match. Ensure the score is a logical representation of the candidate's fit.
3. DO NOT penalize the candidate if their detailed "Resume Experience" (past roles/dates) is empty or missing. If their Skills and Total Experience match the job, they deserve a high score based purely on that overlap.

Job Details:
Title: ${jobData.jobTitle || jobData.title || 'N/A'}
Description/Summary: ${jobData.jobSummary || jobData.description || 'N/A'}
Responsibilities: ${jobData.responsibilities || 'N/A'}
Required Qualifications: ${jobData.requiredQualifications || 'N/A'}
Required Skills: ${JSON.stringify(jobData.requiredSkills || jobData.skills || [])}
Preferred Skills: ${JSON.stringify(jobData.preferredSkills || [])}

Candidate Profile:
Name: ${candidateData.firstName} ${candidateData.lastName || ''}
Experience: ${candidateData.totalExperience || 'Unknown'} years
Current Title: ${candidateData.currentDesignation || 'Unknown'}
Resume Skills: ${JSON.stringify(resumeParsedData?.skills || [])}
Resume Experience: ${JSON.stringify(resumeParsedData?.experience || [])}
Resume Summary: ${resumeParsedData?.aiSummary || 'None'}

You must return ONLY a JSON object exactly matching the following schema structure:
${JSON.stringify(schemaDefinition, null, 2)}
`

  let retries = 3;
  let delay = 2500; // Start with 2.5s delay to be safe for Mistral free tier

  while (retries > 0) {
    try {
      if (provider === 'OPENAI' || provider === 'GROK' || provider === 'MISTRAL') {
        const response = await client.chat.completions.create({
          model: model,
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.0,
          seed: 42,
          response_format: {
            type: 'json_schema',
            json_schema: {
              name: 'candidate_evaluation',
              schema: {
                type: 'object',
                properties: schemaDefinition.properties,
                required: ['aiMatchScore', 'aiMatchReasoning', 'strengths', 'concerns'],
                additionalProperties: false
              },
              strict: true
            }
          }
        })
        if (response.choices && response.choices.length > 0) {
          return JSON.parse(response.choices[0].message.content)
        }
        return null
      } else {
        const toGenAiSchema = (schema) => {
          const typeMap = { 'string': Type.STRING, 'number': Type.NUMBER, 'boolean': Type.BOOLEAN, 'object': Type.OBJECT, 'array': Type.ARRAY }
          const result = { type: typeMap[schema.type] }
          if (schema.description) result.description = schema.description
          if (schema.properties) {
            result.properties = {}
            for (const k in schema.properties) {
              result.properties[k] = toGenAiSchema(schema.properties[k])
            }
          }
          if (schema.items) {
            result.items = toGenAiSchema(schema.items)
          }
          return result
        }

        const response = await client.models.generateContent({
          model: model,
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            responseSchema: toGenAiSchema(schemaDefinition),
            temperature: 0.0
          }
        })
        
        if (response.text) {
          return JSON.parse(response.text)
        }
        return null
      }
    } catch (error) {
      if (error?.status === 429 || error?.code === '1300' || error?.message?.includes('Rate limit')) {
        retries--
        if (retries === 0) {
          console.error('AI Match Rate Limit Exhausted')
          return null
        }
        await new Promise(r => setTimeout(r, delay))
        delay *= 2
      } else {
        console.error('AI Candidate Matching Error:', error.message || error)
        return null
      }
    }
  }
  return null;
}
