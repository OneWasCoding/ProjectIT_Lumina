import { useState, useEffect } from 'react'

export default function Avatar({ name = '', url, size = 36, className = '' }) {
  const [failed, setFailed] = useState(false)

  // Retry when a new image URL arrives
  useEffect(() => setFailed(false), [url])

  const initials =
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map(w => w[0]?.toUpperCase())
      .join('') || '?'

  const style = { width: size, height: size, fontSize: Math.round(size * 0.38) }

  if (url && !failed) {
    return (
      <img
        className={`avatar ${className}`}
        src={url}
        alt={name || 'Avatar'}
        style={style}
        onError={() => setFailed(true)}
      />
    )
  }

  return (
    <div className={`avatar avatar-initials ${className}`} style={style} aria-label={name || 'Avatar'}>
      {initials}
    </div>
  )
}

