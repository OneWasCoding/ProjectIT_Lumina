import { CheckCircle, XCircle, Info } from 'lucide-react'

export default function Toast({ message, type }) {
  const icons = {
    success: <CheckCircle style={{ color: 'var(--accent-secondary)', width: 18, height: 18 }} />,
    error: <XCircle style={{ color: 'var(--accent-danger)', width: 18, height: 18 }} />,
    info: <Info style={{ color: 'var(--accent-primary)', width: 18, height: 18 }} />,
  }

  return (
    <div className={`toast toast-${type}`} id="toast-notification">
      {icons[type] || icons.info}
      {message}
    </div>
  )
}
