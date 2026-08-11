// Step 6 — Resume Parsing.
//
// There is no AI/LLM API key configured anywhere in this codebase (see the
// "Notify HR" callout in the Step 5 apply route and the resume-storage
// comment in lib/resumeStorage.js — this app has consistently avoided
// faking infrastructure it doesn't have). So this is a *real* parser, not a
// simulated one: it actually reads the text out of the uploaded PDF/DOCX
// file (via pdf-parse / mammoth) and runs deterministic regex + keyword
// heuristics over it. It is honest about its own uncertainty — every
// extracted field/section carries a confidence score, and the spec's own
// instruction ("Low-confidence fields should show Needs Review — this is
// much better than pretending every extraction is certainly correct")
// governs every heuristic below: when the text doesn't clearly contain
// something, this parser leaves it out rather than guessing.
import { readFile } from 'fs/promises'
import { PDFParse } from 'pdf-parse'
import mammoth from 'mammoth'

export const PARSER_VERSION = 'heuristic-v1'

// ---------------------------------------------------------------------------
// Text extraction
// ---------------------------------------------------------------------------

export async function extractResumeText(absolutePath, fileExt) {
  const buffer = await readFile(absolutePath)
  const ext = (fileExt || '').toLowerCase()

  if (ext === 'pdf') {
    const parser = new PDFParse({ data: buffer })
    try {
      const result = await parser.getText()
      // pdf-parse inserts a "-- N of M --" page-count marker between/after
      // pages — strip it so it never gets mistaken for resume content.
      return (result?.text || '').replace(/-{2,}\s*\d+\s*of\s*\d+\s*-{2,}/gi, '').trim()
    } finally {
      if (typeof parser.destroy === 'function') await parser.destroy()
    }
  }
  if (ext === 'docx') {
    const result = await mammoth.extractRawText({ buffer })
    return (result?.value || '').trim()
  }
  // Legacy .doc (pre-2007 binary format) has no reliable pure-JS text
  // extractor without native bindings — an honest, explicit limitation
  // rather than a faked result.
  const err = new Error('UNSUPPORTED_FORMAT')
  err.code = 'UNSUPPORTED_FORMAT'
  throw err
}

// ---------------------------------------------------------------------------
// Shared heuristics
// ---------------------------------------------------------------------------

const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/

const SECTION_HEADERS = {
  experience: /^\s*(work experience|professional experience|employment history|experience)\s*:?\s*$/im,
  education: /^\s*(education|academic (background|qualifications)|qualifications)\s*:?\s*$/im,
  skills: /^\s*(technical skills|key skills|skills)\s*:?\s*$/im,
  certifications: /^\s*(certifications?|licenses?( and certifications)?)\s*:?\s*$/im,
  projects: /^\s*(projects?|personal projects)\s*:?\s*$/im,
  summary: /^\s*(summary|profile|objective|about me)\s*:?\s*$/im,
}

const MONTHS = 'jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec|january|february|march|april|june|july|august|september|october|november|december'
const MONTH_INDEX = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, sept: 8, oct: 9, nov: 10, dec: 11,
  january: 0, february: 1, march: 2, april: 3, june: 5, july: 6, august: 7, september: 8, october: 9, november: 10, december: 11,
}

const DEGREE_KEYWORDS = [
  'B.Tech', 'BTech', 'B.E.', 'BE', 'M.Tech', 'MTech', 'M.E.', 'ME', 'MBA', 'MCA', 'BCA',
  'B.Sc', 'BSc', 'M.Sc', 'MSc', 'B.Com', 'BCom', 'M.Com', 'MCom', 'Ph.D', 'PhD', 'Diploma',
  'Bachelor of Technology', 'Bachelor of Engineering', 'Bachelor of Science', 'Bachelor of Commerce', 'Bachelor of Arts',
  'Master of Technology', 'Master of Engineering', 'Master of Science', 'Master of Business Administration',
  'Master of Computer Applications', 'Bachelor', 'Master', 'B.A', 'BA', 'M.A', 'MA',
]

// A working dictionary of common tech + business skills for whole-word
// matching against resume text. Not exhaustive by design — the "SKILLS"
// section scan below (splitting on commas/bullets) catches anything this
// dictionary misses, just at a lower confidence.
const SKILLS_DICTIONARY = [
  'JavaScript', 'TypeScript', 'Node.js', 'NodeJS', 'React', 'React.js', 'Redux', 'Angular', 'Vue', 'Vue.js', 'Next.js',
  'Python', 'Django', 'Flask', 'FastAPI', 'Java', 'Spring', 'Spring Boot', 'C++', 'C#', '.NET', 'Go', 'Golang', 'Ruby',
  'Ruby on Rails', 'PHP', 'Laravel', 'Swift', 'Kotlin', 'Rust', 'Scala',
  'HTML', 'HTML5', 'CSS', 'CSS3', 'Sass', 'Tailwind', 'Tailwind CSS', 'Bootstrap',
  'SQL', 'MySQL', 'PostgreSQL', 'MongoDB', 'Redis', 'SQLite', 'Oracle', 'DynamoDB', 'Elasticsearch', 'Cassandra',
  'AWS', 'Azure', 'GCP', 'Google Cloud', 'Docker', 'Kubernetes', 'Terraform', 'Jenkins', 'CI/CD', 'Git', 'GitHub', 'GitLab',
  'REST API', 'REST', 'GraphQL', 'gRPC', 'Microservices', 'Kafka', 'RabbitMQ',
  'Express', 'Express.js', 'NestJS', 'Webpack', 'Vite', 'Jira', 'Confluence', 'Agile', 'Scrum', 'Kanban',
  'Machine Learning', 'Deep Learning', 'TensorFlow', 'PyTorch', 'Pandas', 'NumPy', 'Data Analysis', 'Power BI', 'Tableau',
  'Excel', 'Microsoft Excel', 'PowerPoint', 'Word', 'SAP', 'Salesforce', 'HubSpot',
  'Project Management', 'Product Management', 'Business Analysis', 'Stakeholder Management',
  'Communication', 'Leadership', 'Team Management', 'Problem Solving', 'Recruitment', 'Talent Acquisition',
  'Sales', 'Marketing', 'Digital Marketing', 'SEO', 'SEM', 'Content Writing', 'Copywriting', 'Social Media Marketing',
  'Payroll', 'Accounting', 'Financial Analysis', 'Auditing', 'Taxation',
  'Android', 'iOS', 'Flutter', 'React Native', 'Selenium', 'Cypress', 'Jest', 'JUnit', 'Manual Testing', 'Automation Testing',
]

const CITY_DICTIONARY = [
  'Delhi NCR', 'New Delhi', 'Delhi', 'Gurgaon', 'Gurugram', 'Noida', 'Mumbai', 'Navi Mumbai', 'Pune', 'Bangalore', 'Bengaluru',
  'Hyderabad', 'Chennai', 'Kolkata', 'Ahmedabad', 'Jaipur', 'Chandigarh', 'Lucknow', 'Kochi', 'Cochin', 'Indore', 'Nagpur',
  'Coimbatore', 'Vadodara', 'Surat', 'Bhopal', 'Visakhapatnam', 'Thiruvananthapuram', 'Remote',
  'New York', 'San Francisco', 'London', 'Singapore', 'Dubai', 'Toronto', 'Berlin', 'Sydney',
]

function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function findPhone(text) {
  const candidates = text.match(/(\+?\d[\d\-\s()]{8,15}\d)/g) || []
  for (const raw of candidates) {
    const digits = raw.replace(/\D/g, '')
    if (digits.length >= 10 && digits.length <= 13) return raw.trim().replace(/\s{2,}/g, ' ')
  }
  return null
}

function findUrl(text, hostPattern) {
  const re = new RegExp(`(https?:\\/\\/)?(www\\.)?${hostPattern}[^\\s,)"'<>]*`, 'i')
  const match = text.match(re)
  if (!match) return null
  let url = match[0].trim().replace(/[.,;]+$/, '')
  if (!/^https?:\/\//i.test(url)) url = `https://${url}`
  return url
}

function findPortfolioUrl(text) {
  const re = /(https?:\/\/)?(www\.)?[a-z0-9-]+\.(dev|me|io|design|xyz|vercel\.app|netlify\.app)([/?][^\s,)"'<>]*)?/i
  const match = text.match(re)
  if (!match) return null
  if (/linkedin\.com|github\.com/i.test(match[0])) return null
  let url = match[0].trim().replace(/[.,;]+$/, '')
  if (!/^https?:\/\//i.test(url)) url = `https://${url}`
  return url
}

function findName(text) {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean)
  for (const line of lines.slice(0, 5)) {
    if (line.includes('@') || /\d/.test(line)) continue
    const words = line.split(/\s+/)
    if (words.length < 2 || words.length > 4) continue
    if (line.length > 45) continue
    const looksLikeName = words.every((w) => /^[A-Z][a-zA-Z'.-]*$/.test(w))
    if (looksLikeName) return { value: line, confidence: 0.8 }
  }
  return null
}

function findLocation(text) {
  const labeled = text.match(/(?:location|address|based in|city)\s*[:\-]\s*([A-Za-z ,]{3,40})/i)
  if (labeled) return { value: labeled[1].trim().replace(/,+$/, ''), confidence: 0.85 }
  for (const city of CITY_DICTIONARY) {
    const re = new RegExp(`\\b${escapeRegExp(city)}\\b`, 'i')
    if (re.test(text)) return { value: city, confidence: 0.5 }
  }
  return null
}

function findTotalExperience(text) {
  const match = text.match(/(\d+(?:\.\d+)?)\+?\s*(?:years?|yrs?)\s*(?:of)?\s*(?:relevant\s+)?experience/i)
  if (match) return { value: Number(match[1]), confidence: 0.8 }
  const match2 = text.match(/experience\s*[:\-]\s*(\d+(?:\.\d+)?)\+?\s*(?:years?|yrs?)/i)
  if (match2) return { value: Number(match2[1]), confidence: 0.8 }
  return null
}

function sectionText(text, key) {
  const startMatch = SECTION_HEADERS[key].exec(text)
  if (!startMatch) return null
  const start = startMatch.index + startMatch[0].length
  let end = text.length
  for (const [otherKey, re] of Object.entries(SECTION_HEADERS)) {
    if (otherKey === key) continue
    re.lastIndex = 0
    const m = re.exec(text.slice(start))
    if (m) end = Math.min(end, start + m.index)
  }
  return text.slice(start, end).trim()
}

function findCurrentCompanyDesignation(text) {
  const labeledCompany = text.match(/(?:current company|company)\s*[:\-]\s*([A-Za-z0-9 &.,'-]{2,50})/i)
  const labeledDesignation = text.match(/(?:current (?:role|title|designation)|designation|title|role)\s*[:\-]\s*([A-Za-z0-9 &.,'-]{2,50})/i)
  const result = {}
  if (labeledCompany) result.currentCompany = { value: labeledCompany[1].trim(), confidence: 0.8 }
  if (labeledDesignation) result.currentDesignation = { value: labeledDesignation[1].trim(), confidence: 0.8 }
  if (result.currentCompany || result.currentDesignation) return result

  // Fall back to the first line of the experience section, e.g.
  // "Backend Developer, ABC Technologies" / "ABC Technologies - Backend Developer".
  const exp = sectionText(text, 'experience')
  if (!exp) return result
  const firstLine = exp.split('\n').map((l) => l.trim()).find(Boolean)
  if (!firstLine) return result
  const parts = firstLine.split(/\s+[-|@,]\s+|\s+at\s+/i).map((p) => p.trim()).filter(Boolean)
  if (parts.length >= 2) {
    result.currentDesignation = { value: parts[0], confidence: 0.5 }
    result.currentCompany = { value: parts[1], confidence: 0.5 }
  }
  return result
}

function parseApproxDate(raw) {
  if (!raw) return null
  const clean = raw.trim().toLowerCase()
  if (/present|current|till date|ongoing/.test(clean)) return null
  const monthYear = clean.match(new RegExp(`(${MONTHS})\\.?\\s+(\\d{4})`, 'i'))
  if (monthYear) {
    const monthIdx = MONTH_INDEX[monthYear[1].toLowerCase()]
    return new Date(Date.UTC(Number(monthYear[2]), monthIdx ?? 0, 1))
  }
  const yearOnly = clean.match(/\b(19|20)\d{2}\b/)
  if (yearOnly) return new Date(Date.UTC(Number(yearOnly[0]), 0, 1))
  return null
}

// Resumes rarely survive PDF text extraction with their original blank-line
// spacing intact (pdf.js joins wrapped lines with single '\n's), so entries
// can't be split on blank lines alone. Instead: a line is a "header
// candidate" whenever the *next* line is a date range — that's what
// reliably identifies "Designation - Company" / "Company | Designation"
// lines in most single-column resume layouts — and everything between one
// date-range line and the next header candidate (or the next date range) is
// that entry's description.
function findWorkExperience(text) {
  const section = sectionText(text, 'experience')
  if (!section) return []

  const dateRangeRe = new RegExp(`((?:${MONTHS})\\.?\\s+\\d{4}|\\d{4})\\s*(?:-|–|to)\\s*((?:${MONTHS})\\.?\\s+\\d{4}|present|current|\\d{4})`, 'i')
  const lines = section.split('\n').map((l) => l.trim()).filter(Boolean)
  const isDate = lines.map((l) => dateRangeRe.test(l))
  const isHeaderCandidate = lines.map((l, i) => !isDate[i] && isDate[i + 1])

  const entries = []
  let i = 0
  while (i < lines.length) {
    if (!isDate[i]) { i++; continue }

    const dateMatch = dateRangeRe.exec(lines[i])
    dateRangeRe.lastIndex = 0
    const headerLine = (i > 0 && isHeaderCandidate[i - 1]) ? lines[i - 1] : lines[i].replace(dateMatch[0], '').trim()
    const parts = headerLine.split(/\s+[-|@,]\s+|\s+at\s+/i).map((p) => p.trim()).filter(Boolean)
    const companyName = parts[1] || parts[0] || null
    const designation = parts.length >= 2 ? parts[0] : null

    let j = i + 1
    const descLines = []
    while (j < lines.length && !isDate[j] && !isHeaderCandidate[j]) { descLines.push(lines[j]); j++ }

    if (companyName) {
      entries.push({
        companyName,
        designation,
        startDate: parseApproxDate(dateMatch[1]),
        endDate: parseApproxDate(dateMatch[2]),
        isCurrent: /present|current/i.test(dateMatch[2]),
        rawDateRange: dateMatch[0],
        description: descLines.join(' ').slice(0, 500) || null,
        confidence: 0.65,
      })
    }
    i = j
  }
  return entries.slice(0, 10)
}

function findEducation(text) {
  const section = sectionText(text, 'education') || ''
  const searchIn = section || text
  const blocks = searchIn.split(/\n\s*\n/).filter((b) => b.trim())
  const entries = []
  const candidateBlocks = blocks.length ? blocks : searchIn.split('\n')

  for (const block of candidateBlocks) {
    const degreeMatch = DEGREE_KEYWORDS
      .map((kw) => ({ kw, re: new RegExp(`\\b${escapeRegExp(kw)}\\b`, 'i') }))
      .find(({ re }) => re.test(block))
    if (!degreeMatch) continue

    const yearMatches = block.match(/\b(19|20)\d{2}\b/g) || []
    const scoreMatch = block.match(/(cgpa|gpa)\s*[:\-]?\s*(\d(?:\.\d+)?)/i) || block.match(/(\d{2,3}(?:\.\d+)?)\s*%/)
    const lines = block.split('\n').map((l) => l.trim()).filter(Boolean)
    const degreeLine = lines.find((l) => degreeMatch.re.test(l)) || lines[0]
    const institution = lines.find((l) => l !== degreeLine && !/^\d{4}/.test(l)) || null

    entries.push({
      degree: degreeMatch.kw,
      specialization: null,
      institution,
      startYear: yearMatches[0] ? Number(yearMatches[0]) : null,
      endYear: yearMatches[1] ? Number(yearMatches[1]) : (yearMatches[0] ? Number(yearMatches[0]) : null),
      score: scoreMatch ? scoreMatch[0].trim() : null,
      scoreType: scoreMatch ? (/%/.test(scoreMatch[0]) ? 'PERCENTAGE' : 'CGPA') : null,
      confidence: 0.7,
    })
  }
  return entries.slice(0, 6)
}

function findCertifications(text) {
  const section = sectionText(text, 'certifications')
  if (!section) return []
  return section.split('\n')
    .map((l) => l.replace(/^[-•*]\s*/, '').trim())
    .filter((l) => l.length > 2 && l.length < 150)
    .slice(0, 10)
    .map((line) => {
      const issuerMatch = line.match(/[-–|]\s*([A-Za-z0-9 &.,'-]+)$/) || line.match(/\(([^)]+)\)/)
      return {
        name: issuerMatch ? line.slice(0, issuerMatch.index).trim().replace(/[-–|]$/, '').trim() : line,
        issuer: issuerMatch ? issuerMatch[1].trim() : null,
        confidence: 0.55,
      }
    })
}

function findProjects(text) {
  const section = sectionText(text, 'projects')
  if (!section) return []
  const blocks = section.split(/\n\s*\n/).filter((b) => b.trim())
  return blocks.slice(0, 8).map((block) => {
    const lines = block.split('\n').map((l) => l.replace(/^[-•*]\s*/, '').trim()).filter(Boolean)
    const name = lines[0]
    const description = lines.slice(1).join(' ').slice(0, 400) || null
    const technologies = SKILLS_DICTIONARY.filter((s) => new RegExp(`\\b${escapeRegExp(s)}\\b`, 'i').test(block))
    return { name, description, technologies, projectUrl: findUrl(block, '(github|gitlab)\\.com/[^\\s]+') || findPortfolioUrl(block), confidence: 0.5 }
  }).filter((p) => p.name)
}

function findSkills(text) {
  const found = new Map()
  for (const skill of SKILLS_DICTIONARY) {
    const re = new RegExp(`\\b${escapeRegExp(skill)}\\b`, 'i')
    if (re.test(text)) found.set(skill.toLowerCase(), { skillName: skill, yearsOfExperience: null, confidence: 0.85 })
  }
  // Also scan an explicit "SKILLS" section for comma/bullet separated terms
  // this dictionary missed — lower confidence since these aren't validated
  // against a known-skill list.
  const section = sectionText(text, 'skills')
  if (section) {
    const terms = section.split(/[,•\n|]/).map((t) => t.trim()).filter((t) => t && t.length < 30 && t.length > 1)
    for (const term of terms) {
      const key = term.toLowerCase()
      if (!found.has(key)) found.set(key, { skillName: term, yearsOfExperience: null, confidence: 0.5 })
    }
  }
  return Array.from(found.values()).slice(0, 40)
}

// ---------------------------------------------------------------------------
// Orchestration
// ---------------------------------------------------------------------------

function extractStructuredData(text) {
  const name = findName(text)
  const email = text.match(EMAIL_RE)?.[0] || null
  const phone = findPhone(text)
  const location = findLocation(text)
  const experienceYears = findTotalExperience(text)
  const { currentCompany, currentDesignation } = findCurrentCompanyDesignation(text)
  const linkedinUrl = findUrl(text, 'linkedin\\.com/[^\\s]+')
  const githubUrl = findUrl(text, 'github\\.com/[^\\s]+')
  const portfolioUrl = findPortfolioUrl(text)

  const skills = findSkills(text)
  const experience = findWorkExperience(text)
  const education = findEducation(text)
  const certifications = findCertifications(text)
  const projects = findProjects(text)

  const avg = (arr) => (arr.length ? arr.reduce((s, x) => s + (x.confidence || 0), 0) / arr.length : null)

  return {
    personal: {
      name: name?.value || null,
      email: email || null,
      phone: phone || null,
      currentLocation: location?.value || null,
      currentCompany: currentCompany?.value || null,
      currentDesignation: currentDesignation?.value || null,
      totalExperience: experienceYears?.value ?? null,
      relevantExperience: null, // heuristics can't reliably distinguish this from totalExperience — left for HR
      linkedinUrl, githubUrl, portfolioUrl,
    },
    skills,
    experience,
    education,
    certifications,
    projects,
    confidence: {
      personal: {
        name: name?.confidence ?? null,
        email: email ? 0.97 : null,
        phone: phone ? 0.9 : null,
        currentLocation: location?.confidence ?? null,
        currentCompany: currentCompany?.confidence ?? null,
        currentDesignation: currentDesignation?.confidence ?? null,
        totalExperience: experienceYears?.confidence ?? null,
      },
      skills: avg(skills),
      experience: avg(experience),
      education: avg(education),
    },
  }
}

function decideStatus(parsedData) {
  const p = parsedData.confidence.personal
  const hasContact = !!(p.email || p.phone)
  const hasContent = parsedData.skills.length > 0 || parsedData.experience.length > 0 || parsedData.education.length > 0
  if (hasContact && hasContent) return 'PARSED'
  return 'REVIEW_REQUIRED'
}

const UNREADABLE_MESSAGE = 'This resume appears to contain no readable text (it may be a scanned image with no text layer). Please retry with a text-based PDF/DOCX, or fill in the candidate profile manually.'
const UNSUPPORTED_MESSAGE = 'Legacy .doc files can’t be parsed automatically. Please retry with a PDF or DOCX resume, or fill in the candidate profile manually.'
const GENERIC_FAILURE_MESSAGE = 'Could not read this resume file. It may be corrupted or password-protected.'

// Runs the full pipeline for one resume file. Never throws — parsing
// failure must never block a candidate application (Step 6 rule), so every
// failure mode is captured and returned as a FAILED result instead.
export async function runResumeParser(absolutePath, fileExt) {
  let text
  try {
    text = await extractResumeText(absolutePath, fileExt)
  } catch (err) {
    return {
      status: 'FAILED',
      parsedData: null,
      errorMessage: err.code === 'UNSUPPORTED_FORMAT' ? UNSUPPORTED_MESSAGE : GENERIC_FAILURE_MESSAGE,
    }
  }

  if (!text || text.replace(/\s+/g, '').length < 20) {
    return { status: 'FAILED', parsedData: null, errorMessage: UNREADABLE_MESSAGE }
  }

  const parsedData = extractStructuredData(text)
  return { status: decideStatus(parsedData), parsedData, errorMessage: null }
}
