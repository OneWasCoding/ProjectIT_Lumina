const MAX_PRESENTATION_BYTES = 50 * 1024 * 1024 // 50 MB (matches faculty-files bucket)

const SLIDE_COLORS = ['#7c5cfc', '#00d4aa', '#ff6b9d', '#ffb547', '#3b82f6', '#10b981']

export function detectPresentationKind(fileOrName = '', mimeType = '') {
  const name = typeof fileOrName === 'string' ? fileOrName : fileOrName?.name || ''
  const mime = (typeof fileOrName === 'object' ? fileOrName?.type : mimeType) || ''
  const lower = name.toLowerCase()

  if (lower.endsWith('.pdf') || mime === 'application/pdf') return 'pdf'
  if (
    lower.endsWith('.pptx') ||
    mime === 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  ) {
    return 'pptx'
  }
  if (lower.endsWith('.ppt') || mime === 'application/vnd.ms-powerpoint') return 'ppt'
  return null
}

export function validatePresentationFile(file) {
  if (!file) throw new Error('Please choose a presentation file.')
  const kind = detectPresentationKind(file)
  if (!kind) {
    throw new Error('Unsupported file format. Please upload a PDF (.pdf) or PowerPoint (.ppt, .pptx) file.')
  }
  if (file.size > MAX_PRESENTATION_BYTES) {
    throw new Error('File is too large. Maximum allowed size is 50 MB.')
  }
  return kind
}

export function formatFileSize(bytes) {
  const n = Number(bytes)
  if (!n || Number.isNaN(n)) return ''
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / (1024 * 1024)).toFixed(2)} MB`
}

/**
 * Extract slide titles and bullet text from a .pptx file (which is a ZIP archive
 * containing ppt/slides/slide1.xml, slide2.xml, ...) using native browser APIs.
 * Returns an array of { title, bullets, color, insight } or [] if extraction is unavailable.
 */
export async function extractPptxSlides(file) {
  try {
    if (typeof DecompressionStream === 'undefined') return []
    const buffer = await file.arrayBuffer()
    const entries = await readZipEntries(buffer)

    const slideEntries = entries
      .filter(e => /^ppt\/slides\/slide\d+\.xml$/i.test(e.name))
      .sort((a, b) => {
        const na = parseInt(a.name.match(/slide(\d+)\.xml/i)?.[1] || '0', 10)
        const nb = parseInt(b.name.match(/slide(\d+)\.xml/i)?.[1] || '0', 10)
        return na - nb
      })

    if (!slideEntries.length) return []

    const slides = []
    for (let i = 0; i < slideEntries.length; i++) {
      const xmlBytes = await extractZipEntryBytes(buffer, slideEntries[i])
      const xmlText = new TextDecoder('utf-8').decode(xmlBytes)
      const parsed = parseSlideXml(xmlText, i + 1)
      if (parsed) slides.push(parsed)
    }
    return slides
  } catch (err) {
    console.warn('Could not extract inline slides from PPTX:', err)
    return []
  }
}

function parseSlideXml(xmlText, slideNumber) {
  const doc = new DOMParser().parseFromString(xmlText, 'application/xml')
  const shapes = Array.from(doc.getElementsByTagNameNS('*', 'sp'))

  let title = ''
  const paragraphs = []

  for (const sp of shapes) {
    const ph = sp.getElementsByTagNameNS('*', 'ph')[0]
    const phType = ph?.getAttribute('type') || ''
    const isTitleShape = phType === 'title' || phType === 'ctrTitle'

    const paras = Array.from(sp.getElementsByTagNameNS('*', 'p'))
    for (const p of paras) {
      const runs = Array.from(p.getElementsByTagNameNS('*', 't'))
      const line = runs.map(r => r.textContent || '').join('').replace(/\s+/g, ' ').trim()
      if (!line) continue
      if (isTitleShape && !title) {
        title = line
      } else {
        paragraphs.push(line)
      }
    }
  }

  // Fallback if no shapes had explicit title placeholder
  if (!title && paragraphs.length > 0) {
    title = paragraphs.shift()
  }

  // If still empty, check all <a:t> nodes in the slide
  if (!title && paragraphs.length === 0) {
    const allRuns = Array.from(doc.getElementsByTagNameNS('*', 't'))
      .map(n => (n.textContent || '').trim())
      .filter(Boolean)
    if (allRuns.length > 0) {
      title = allRuns[0]
      paragraphs.push(...allRuns.slice(1))
    }
  }

  return {
    title: title || `Slide ${slideNumber}`,
    bullets: paragraphs.length > 0 ? paragraphs.slice(0, 10) : ['(Visual slide — switch to Document Viewer or download the file to view graphics)'],
    color: SLIDE_COLORS[(slideNumber - 1) % SLIDE_COLORS.length],
    insight: paragraphs.length > 10 ? `+ ${paragraphs.length - 10} more line(s) on this slide` : '',
  }
}

async function readZipEntries(buffer) {
  const view = new DataView(buffer)
  const bytes = new Uint8Array(buffer)

  // Locate End of Central Directory (EOCD) signature 0x06054b50 near the end of the file
  let eocdOffset = -1
  const minOffset = Math.max(0, buffer.byteLength - 65557)
  for (let i = buffer.byteLength - 22; i >= minOffset; i--) {
    if (view.getUint32(i, true) === 0x06054b50) {
      eocdOffset = i
      break
    }
  }
  if (eocdOffset < 0) return []

  const totalEntries = view.getUint16(eocdOffset + 10, true)
  const cdOffset = view.getUint32(eocdOffset + 16, true)

  const entries = []
  let ptr = cdOffset
  for (let i = 0; i < totalEntries && ptr + 46 <= buffer.byteLength; i++) {
    if (view.getUint32(ptr, true) !== 0x02014b50) break
    const compressionMethod = view.getUint16(ptr + 10, true)
    const compressedSize = view.getUint32(ptr + 20, true)
    const uncompressedSize = view.getUint32(ptr + 24, true)
    const nameLen = view.getUint16(ptr + 28, true)
    const extraLen = view.getUint16(ptr + 30, true)
    const commentLen = view.getUint16(ptr + 32, true)
    const localHeaderOffset = view.getUint32(ptr + 42, true)

    const name = new TextDecoder('utf-8').decode(bytes.subarray(ptr + 46, ptr + 46 + nameLen))
    entries.push({
      name,
      compressionMethod,
      compressedSize,
      uncompressedSize,
      localHeaderOffset,
    })
    ptr += 46 + nameLen + extraLen + commentLen
  }
  return entries
}

async function extractZipEntryBytes(buffer, entry) {
  const view = new DataView(buffer)
  const offset = entry.localHeaderOffset
  if (view.getUint32(offset, true) !== 0x04034b50) {
    throw new Error('Invalid local ZIP header')
  }
  const nameLen = view.getUint16(offset + 26, true)
  const extraLen = view.getUint16(offset + 28, true)
  const dataStart = offset + 30 + nameLen + extraLen
  const rawSlice = new Uint8Array(buffer, dataStart, entry.compressedSize)

  if (entry.compressionMethod === 0) {
    return rawSlice
  }
  if (entry.compressionMethod === 8) {
    const ds = new DecompressionStream('deflate-raw')
    const writer = ds.writable.getWriter()
    writer.write(rawSlice)
    writer.close()
    const outBuffer = await new Response(ds.readable).arrayBuffer()
    return new Uint8Array(outBuffer)
  }
  throw new Error(`Unsupported ZIP compression method: ${entry.compressionMethod}`)
}

