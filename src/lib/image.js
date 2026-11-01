const MAX_INPUT_BYTES = 8 * 1024 * 1024

/**
 * Crop an image file to a centered square and downscale it. Keeps avatars small
 * (about 20-40 KB) regardless of the original photo size.
 * Resolves to { blob, dataUrl }.
 */
export async function resizeAvatar(file, size = 256) {
  if (!file || !file.type?.startsWith('image/')) {
    throw new Error('Please choose an image file (JPG, PNG or WebP).')
  }
  if (file.size > MAX_INPUT_BYTES) {
    throw new Error('That image is too large. Please choose one under 8 MB.')
  }

  const url = URL.createObjectURL(file)
  try {
    const img = await new Promise((resolve, reject) => {
      const el = new Image()
      el.onload = () => resolve(el)
      el.onerror = () => reject(new Error('That image could not be read.'))
      el.src = url
    })

    const side = Math.min(img.width, img.height)
    const sx = (img.width - side) / 2
    const sy = (img.height - side) / 2

    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    canvas.getContext('2d').drawImage(img, sx, sy, side, side, 0, 0, size, size)

    const blob = await new Promise((resolve, reject) =>
      canvas.toBlob(b => (b ? resolve(b) : reject(new Error('Could not process the image.'))), 'image/jpeg', 0.85)
    )
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85)
    return { blob, dataUrl }
  } finally {
    URL.revokeObjectURL(url)
  }
}

const MAX_SUBMISSION_IMAGE_BYTES = 10 * 1024 * 1024

/**
 * Downscale a submission photo while preserving its aspect ratio so full pages,
 * screenshots, and handwritten solutions remain legible and fast to upload.
 * Resolves to { blob, dataUrl, name, size }.
 */
export async function prepareSubmissionPhoto(file, maxDimension = 1600) {
  if (!file || !file.type?.startsWith('image/')) {
    throw new Error('Please choose an image file (JPG, PNG or WebP).')
  }
  if (file.size > MAX_SUBMISSION_IMAGE_BYTES) {
    throw new Error('That image is too large. Please choose one under 10 MB.')
  }

  const url = URL.createObjectURL(file)
  try {
    const img = await new Promise((resolve, reject) => {
      const el = new Image()
      el.onload = () => resolve(el)
      el.onerror = () => reject(new Error('That image could not be read.'))
      el.src = url
    })

    const scale = Math.min(1, maxDimension / Math.max(img.width, img.height))
    const width = Math.max(1, Math.round(img.width * scale))
    const height = Math.max(1, Math.round(img.height * scale))

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    canvas.getContext('2d').drawImage(img, 0, 0, width, height)

    const blob = await new Promise((resolve, reject) =>
      canvas.toBlob(b => (b ? resolve(b) : reject(new Error('Could not process the image.'))), 'image/jpeg', 0.86)
    )
    const dataUrl = canvas.toDataURL('image/jpeg', 0.86)
    const baseName = (file.name || 'photo').replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '_') || 'photo'
    return {
      blob,
      dataUrl,
      name: `${baseName}.jpg`,
      size: blob.size,
    }
  } finally {
    URL.revokeObjectURL(url)
  }
}


