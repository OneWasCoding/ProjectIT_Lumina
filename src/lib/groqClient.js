/**
 * Groq AI client for AI-generated quiz creation.
 *
 * Production (Vercel): calls /api/groq/chat (Vercel Serverless Function) so GROQ_API_KEY stays server-side.
 * Fallback (local dev / static hosts): if /api/groq/chat is unavailable or unconfigured and VITE_GROQ_API_KEY
 * is present, automatically falls back to direct Groq API calls with model auto-discovery.
 */

const GROQ_PROXY_URL = '/api/groq/chat'
const LOCAL_GROQ_KEY = (import.meta.env.VITE_GROQ_API_KEY || '').trim()
const LOCAL_GROQ_URL = (
  import.meta.env.VITE_GROQ_BASE_URL || 'https://api.groq.com/openai/v1/chat/completions'
).trim()
const LOCAL_GROQ_MODELS_URL = LOCAL_GROQ_URL.replace(/\/chat\/completions\/?$/, '/models')

const DEFAULT_GROQ_MODEL = 'llama-3.3-70b-versatile'

const DECOMMISSIONED_MODEL_MAP = {
  'llama-3.1-70b-versatile': 'llama-3.3-70b-versatile',
  'llama-3.1-70b-specdec': 'llama-3.3-70b-versatile',
  'llama-3.2-90b-vision-preview': 'llama-3.3-70b-versatile',
  'llama-3.2-11b-vision-preview': 'meta-llama/llama-4-scout-17b-16e-instruct',
  'llama3-70b-8192': 'llama-3.3-70b-versatile',
  'llama3-8b-8192': 'meta-llama/llama-4-scout-17b-16e-instruct',
  'mixtral-8x7b-32768': 'llama-3.3-70b-versatile',
  'gemma2-9b-it': 'meta-llama/llama-4-scout-17b-16e-instruct',
}

const PREFERRED_CHAT_MODELS = [
  'llama-3.3-70b-versatile',
  'meta-llama/llama-4-scout-17b-16e-instruct',
  'meta-llama/llama-4-maverick-17b-128e-instruct',
  'openai/gpt-oss-120b',
  'openai/gpt-oss-20b',
  'qwen/qwen3-32b',
  'llama-3.1-8b-instant',
]

const NON_CHAT_MODEL_PATTERN = /whisper|tts|playai|guard|safeguard|embed|orpheus|moderation/i

function resolveGroqModel(rawModel) {
  const trimmed = String(rawModel || '').trim()
  if (!trimmed) return DEFAULT_GROQ_MODEL
  return DECOMMISSIONED_MODEL_MAP[trimmed] || trimmed
}

const LOCAL_GROQ_MODEL = resolveGroqModel(import.meta.env.VITE_GROQ_MODEL)
let cachedWorkingDirectModel = null

export class GroqError extends Error {
  constructor(message, status) {
    super(message)
    this.name = 'GroqError'
    this.status = status
  }
}

export function isGroqConfigured() {
  // On Vercel, GROQ_API_KEY lives on the serverless function (/api/groq/chat),
  // so the UI should always allow triggering generation.
  return true
}

async function callProxy(messages, temperature, maxTokens, signal) {
  const res = await fetch(GROQ_PROXY_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages, temperature, maxTokens }),
    signal,
  })
  const contentType = res.headers.get('content-type') || ''
  if (!contentType.includes('application/json')) {
    throw new GroqError(`Proxy endpoint unavailable (${res.status})`, res.status || 404)
  }
  let data = {}
  try {
    data = await res.json()
  } catch {
    // ignore
  }
  if (!res.ok) {
    const msg = data?.error || `AI request failed (${res.status})`
    throw new GroqError(msg, res.status)
  }
  return data?.content || ''
}

async function discoverAccessibleChatModels(signal) {
  try {
    const res = await fetch(LOCAL_GROQ_MODELS_URL, {
      method: 'GET',
      headers: { Authorization: `Bearer ${LOCAL_GROQ_KEY}` },
      signal,
    })
    if (!res.ok) return []
    const json = await res.json()
    const list = Array.isArray(json?.data) ? json.data : []
    const chatIds = list
      .filter(m => m && typeof m.id === 'string' && m.active !== false && !NON_CHAT_MODEL_PATTERN.test(m.id))
      .map(m => m.id)
    chatIds.sort((a, b) => {
      const ia = PREFERRED_CHAT_MODELS.indexOf(a)
      const ib = PREFERRED_CHAT_MODELS.indexOf(b)
      if (ia !== -1 && ib !== -1) return ia - ib
      if (ia !== -1) return -1
      if (ib !== -1) return 1
      return a.localeCompare(b)
    })
    return chatIds
  } catch {
    return []
  }
}

async function callDirect(messages, temperature, maxTokens, signal) {
  if (!LOCAL_GROQ_KEY) {
    throw new GroqError(
      'Groq API key is not configured. Add GROQ_API_KEY in Vercel Project Settings -> Environment Variables (and Redeploy), or set VITE_GROQ_API_KEY in local .env.',
      0
    )
  }

  const initialModel = cachedWorkingDirectModel || LOCAL_GROQ_MODEL
  const triedModels = new Set()
  const candidateQueue = [initialModel]
  let discovered = false
  let lastError = null

  while (candidateQueue.length > 0) {
    const model = candidateQueue.shift()
    if (!model || triedModels.has(model)) continue
    triedModels.add(model)

    const res = await fetch(LOCAL_GROQ_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${LOCAL_GROQ_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages,
        temperature,
        max_tokens: maxTokens,
        stream: false,
      }),
      signal,
    })

    if (res.ok) {
      cachedWorkingDirectModel = model
      const data = await res.json()
      return data.choices?.[0]?.message?.content || ''
    }

    const body = await res.text().catch(() => '')
    lastError = new GroqError(
      `Groq API request failed (${res.status}): ${body || res.statusText}`,
      res.status
    )

    const isModelError =
      res.status === 400 || res.status === 404
        ? /model_decommissioned|model_not_found|decommissioned|does not exist|not have access/i.test(body)
        : false

    if (!isModelError) {
      throw lastError
    }

    if (!discovered) {
      discovered = true
      const accessible = await discoverAccessibleChatModels(signal)
      if (accessible.length > 0) {
        candidateQueue.push(...accessible.filter(m => !triedModels.has(m)))
      } else {
        candidateQueue.push(...PREFERRED_CHAT_MODELS.filter(m => !triedModels.has(m)))
      }
    }
  }

  throw (
    lastError ||
    new GroqError(
      `None of the Groq chat models (${Array.from(triedModels).join(', ')}) are accessible with your current API key.`,
      404
    )
  )
}

export async function groqChat({ messages, temperature = 0.4, maxTokens = 2500, signal } = {}) {
  try {
    return await callProxy(messages, temperature, maxTokens, signal)
  } catch (e) {
    if (e?.name === 'AbortError') throw e
    // If local/client key is available and the serverless proxy isn't running or isn't configured, fall back cleanly
    if (LOCAL_GROQ_KEY) {
      return callDirect(messages, temperature, maxTokens, signal)
    }
    throw e
  }
}

/**
 * Extract a JSON array from Groq's response (handles markdown code fences).
 */
function extractJsonArray(text) {
  if (!text || typeof text !== 'string') return null

  const fence = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i)
  const candidate = fence ? fence[1] : text

  const start = candidate.indexOf('[')
  const end = candidate.lastIndexOf(']')
  if (start === -1 || end === -1 || end < start) return null

  const slice = candidate.slice(start, end + 1)
  try {
    return JSON.parse(slice)
  } catch {
    try {
      return JSON.parse(slice.replace(/,\s*([\]}])/g, '$1'))
    } catch {
      return null
    }
  }
}

/**
 * Validate and normalize a single generated question into the app's quiz format.
 * options must be exactly 4 strings; correctAnswer is 0-3.
 */
function normalizeQuestion(raw) {
  if (!raw || typeof raw !== 'object') return null

  const question = String(raw.question || raw.q || '').trim()
  const options = Array.isArray(raw.options)
    ? raw.options.map(String).map(o => o.trim()).filter(Boolean)
    : []

  if (!question || options.length < 2) return null

  while (options.length < 4) options.push(`Option ${options.length + 1}`)
  const four = options.slice(0, 4)

  let correctAnswer = Number(raw.correctAnswer ?? raw.correct_answer ?? raw.answer)
  if (!Number.isInteger(correctAnswer) || correctAnswer < 0 || correctAnswer > 3) {
    const letter = String(raw.correctAnswer ?? raw.correct_answer ?? raw.answer ?? '')
      .toUpperCase()
      .trim()
    const letterIndex = 'ABCD'.indexOf(letter)
    correctAnswer = letterIndex >= 0 ? letterIndex : 0
  }

  const explanation = String(raw.explanation || raw.rationale || '').trim() || undefined

  return {
    question,
    options: four,
    correctAnswer,
    explanation,
  }
}

/**
 * Parse Groq's quiz response into an array of validated questions.
 */
export function parseQuizResponse(text, maxQuestions = 50) {
  const arr = extractJsonArray(text)
  if (!Array.isArray(arr)) return []

  const questions = []
  for (const raw of arr) {
    const q = normalizeQuestion(raw)
    if (q) questions.push(q)
    if (questions.length >= maxQuestions) break
  }
  return questions
}

/**
 * Flatten extracted slides into a single text block for the model.
 */
export function slidesToText(slides) {
  if (!Array.isArray(slides) || slides.length === 0) return ''
  return slides
    .map((s, i) => {
      const title = s.title || `Slide ${i + 1}`
      const bullets = Array.isArray(s.bullets) ? s.bullets.filter(Boolean) : []
      const body = bullets.length ? bullets.join('\n') : (s.content || '')
      return `Slide ${i + 1} — ${title}\n${body}`
    })
    .join('\n\n')
}

/**
 * Generate quiz questions from extracted slide text via Groq.
 * Returns { questions, raw }.
 */
export async function generateQuizFromText(text, opts = {}) {
  const count = opts.count || 8
  const messages = [quizSystemPrompt(), buildQuizUserMessage(text, { count, ...opts })]
  const raw = await groqChat({ messages, temperature: 0.4, maxTokens: 2500 })
  const questions = parseQuizResponse(raw, count)
  return { questions, raw }
}

/**
 * Generate quiz questions from extracted slide objects via Groq.
 * Returns { questions, raw, sourceSlides }.
 */
export async function generateQuizFromSlides(slides, opts = {}) {
  const text = slidesToText(slides)
  if (!text.trim()) {
    throw new Error('No extractable text found in the uploaded presentation.')
  }
  const result = await generateQuizFromText(text, opts)
  return { ...result, sourceSlides: slides }
}

/**
 * System prompt instructing Groq to output a JSON array of MCQs.
 */
function quizSystemPrompt() {
  return {
    role: 'system',
    content: `You are an expert instructional designer. Generate multiple-choice quiz questions from the provided lecture slide content.

Rules:
- Output ONLY a JSON array (no markdown, no prose outside the array).
- Each object must have: "question" (string), "options" (exactly 4 strings), "correctAnswer" (integer 0-3), "explanation" (string, 1-2 sentences).
- Questions must be answerable from the slide content, clear, unambiguous, and varied in difficulty.
- Distractors should be plausible but clearly incorrect.
- Max 50 questions.`,
  }
}

/**
 * Build the user message from flattened slide text.
 */
function buildQuizUserMessage(slideText, { count = 8, subject = '', topic = '' } = {}) {
  const subjectLine = subject ? `Subject: ${subject}\n` : ''
  const topicLine = topic ? `Topic: ${topic}\n` : ''
  return {
    role: 'user',
    content: `${subjectLine}${topicLine}Generate ${count} multiple-choice quiz questions from this lecture content:\n\n---\n${slideText}\n---\n\nReturn a JSON array of ${count} questions.`,
  }
}
