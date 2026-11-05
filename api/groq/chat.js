const DEFAULT_MODEL = 'llama-3.3-70b-versatile'
const DECOMMISSIONED = {
  'llama-3.1-70b-versatile': 'llama-3.3-70b-versatile',
  'llama-3.1-70b-specdec': 'llama-3.3-70b-versatile',
  'llama-3.2-90b-vision-preview': 'llama-3.3-70b-versatile',
  'llama-3.2-11b-vision-preview': 'meta-llama/llama-4-scout-17b-16e-instruct',
  'llama3-70b-8192': 'llama-3.3-70b-versatile',
  'llama3-8b-8192': 'meta-llama/llama-4-scout-17b-16e-instruct',
  'mixtral-8x7b-32768': 'llama-3.3-70b-versatile',
  'gemma2-9b-it': 'meta-llama/llama-4-scout-17b-16e-instruct',
}
const PREFERRED = [
  'llama-3.3-70b-versatile',
  'meta-llama/llama-4-scout-17b-16e-instruct',
  'meta-llama/llama-4-maverick-17b-128e-instruct',
  'openai/gpt-oss-120b',
  'openai/gpt-oss-20b',
  'qwen/qwen3-32b',
  'llama-3.1-8b-instant',
]
const NON_CHAT = /whisper|tts|playai|guard|safeguard|embed|orpheus|moderation/i

function json(res, status, body) {
  res
    .status(status)
    .setHeader('Content-Type', 'application/json')
    .setHeader('Cache-Control', 'no-store')
    .end(JSON.stringify(body))
}

async function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body
  if (typeof req.body === 'string' && req.body.trim()) {
    try { return JSON.parse(req.body) } catch { return {} }
  }
  const chunks = []
  for await (const chunk of req) chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk)
  const text = Buffer.concat(chunks).toString('utf8')
  if (!text) return {}
  try { return JSON.parse(text) } catch { return {} }
}

function resolveModel(raw) {
  const m = String(raw || '').trim()
  if (!m) return DEFAULT_MODEL
  return DECOMMISSIONED[m] || m
}

async function discoverModels(key, base) {
  try {
    const r = await fetch(base.replace(/\/chat\/completions\/?$/, '/models'), {
      headers: { Authorization: `Bearer ${key}` },
    })
    if (!r.ok) return []
    const j = await r.json()
    const ids = (Array.isArray(j?.data) ? j.data : [])
      .filter(m => m?.id && m.active !== false && !NON_CHAT.test(m.id))
      .map(m => m.id)
    ids.sort((a, b) => {
      const ia = PREFERRED.indexOf(a), ib = PREFERRED.indexOf(b)
      if (ia !== -1 && ib !== -1) return ia - ib
      if (ia !== -1) return -1
      if (ib !== -1) return 1
      return a.localeCompare(b)
    })
    return ids
  } catch { return [] }
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.status(204).end()
    return
  }
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' })

  // Support either GROQ_API_KEY (server-only) or VITE_GROQ_API_KEY in Vercel Environment Variables
  const key = (process.env.GROQ_API_KEY || process.env.VITE_GROQ_API_KEY || '').trim()
  if (!key) {
    return json(res, 500, {
      error: 'Groq API key is not configured on Vercel. Add GROQ_API_KEY (or VITE_GROQ_API_KEY) in Vercel Project Settings -> Environment Variables and Redeploy.',
    })
  }

  const base = (
    process.env.GROQ_BASE_URL ||
    process.env.VITE_GROQ_BASE_URL ||
    'https://api.groq.com/openai/v1/chat/completions'
  ).trim()

  const { messages, temperature = 0.4, maxTokens = 2500 } = await readBody(req)
  if (!Array.isArray(messages) || messages.length === 0) {
    return json(res, 400, { error: 'messages array is required' })
  }

  const tried = new Set()
  let queue = [resolveModel(process.env.GROQ_MODEL || process.env.VITE_GROQ_MODEL)]
  let discovered = false
  let last = { status: 502, body: 'No model attempted' }

  while (queue.length) {
    const model = queue.shift()
    if (!model || tried.has(model)) continue
    tried.add(model)
    const r = await fetch(base, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, messages, temperature, max_tokens: maxTokens, stream: false }),
    })
    if (r.ok) {
      const data = await r.json()
      return json(res, 200, { content: data.choices?.[0]?.message?.content || '', model })
    }
    const body = await r.text().catch(() => '')
    last = { status: r.status, body }
    const modelErr = (r.status === 400 || r.status === 404) &&
      /model_decommissioned|model_not_found|decommissioned|does not exist|not have access/i.test(body)
    if (!modelErr) {
      return json(res, r.status, { error: `Groq API request failed (${r.status}): ${body || r.statusText}` })
    }
    if (!discovered) {
      discovered = true
      const accessible = await discoverModels(key, base)
      queue.push(...(accessible.length ? accessible : PREFERRED).filter(m => !tried.has(m)))
    }
  }

  return json(res, 502, {
    error: `No accessible Groq chat model for this API key (tried: ${Array.from(tried).join(', ')}). ${last.body || ''}`.trim(),
  })
}
