import { useState, useEffect, useMemo } from 'react'
import { useApp } from '../context/AppContext.jsx'
import Avatar from '../components/Avatar.jsx'
import { Megaphone, Plus, X, Pin, PinOff, Trash2 } from 'lucide-react'

export function timeAgo(iso) {
  if (!iso) return ''
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins} min ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days} day${days === 1 ? '' : 's'} ago`
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function AnnouncementsPage() {
  const {
    profile, selectedSubject, announcements,
    fetchAnnouncements, addAnnouncement, updateAnnouncement, deleteAnnouncement,
  } = useApp()
  const isFaculty = profile?.role === 'faculty'
  const subjectId = selectedSubject?.id
  const [showCreate, setShowCreate] = useState(false)

  useEffect(() => {
    if (subjectId) fetchAnnouncements(subjectId)
  }, [subjectId, fetchAnnouncements])

  const items = useMemo(
    () =>
      announcements
        .filter(a => a.subject_id === subjectId)
        .sort((a, b) => Number(b.pinned) - Number(a.pinned) || new Date(b.created_at) - new Date(a.created_at)),
    [announcements, subjectId]
  )

  const handleDelete = (a) => {
    if (window.confirm(`Delete the announcement "${a.title}"?`)) deleteAnnouncement(a.id)
  }

  return (
    <>
      <div className="page-header">
        <div className="page-header-inner">
          <div>
            <h1 className="page-title">Announcements</h1>
            <p className="page-subtitle">{selectedSubject?.name} · Updates from your instructor</p>
          </div>
          {isFaculty && (
            <button className="btn btn-gradient" onClick={() => setShowCreate(true)} id="btn-new-announcement">
              <Plus /> New Announcement
            </button>
          )}
        </div>
      </div>

      <div className="page-body">
        {items.length === 0 ? (
          <div className="empty-state">
            <Megaphone />
            <h3>No announcements yet</h3>
            <p>{isFaculty ? 'Post an announcement to keep your students informed.' : 'Your instructor has not posted anything yet.'}</p>
          </div>
        ) : (
          <div className="announcement-list">
            {items.map(a => (
              <article key={a.id} className={`card announcement-card ${a.pinned ? 'pinned' : ''}`}>
                <div className="announcement-head">
                  <Avatar name={a.author?.full_name || 'Instructor'} url={a.author?.avatar_url} size={40} />
                  <div className="announcement-who">
                    <div className="announcement-author">{a.author?.full_name || 'Instructor'}</div>
                    <div className="announcement-time">{timeAgo(a.created_at)}</div>
                  </div>
                  {a.pinned && <span className="badge badge-yellow"><Pin style={{ width: 12, height: 12, marginRight: 4 }} /> Pinned</span>}
                  {isFaculty && (
                    <div className="announcement-actions">
                      <button
                        className="btn btn-icon btn-outline btn-sm"
                        title={a.pinned ? 'Unpin' : 'Pin to top'}
                        onClick={() => updateAnnouncement(a.id, { pinned: !a.pinned })}
                      >
                        {a.pinned ? <PinOff /> : <Pin />}
                      </button>
                      <button className="btn btn-icon btn-outline btn-sm" title="Delete" onClick={() => handleDelete(a)}>
                        <Trash2 style={{ color: 'var(--accent-danger)' }} />
                      </button>
                    </div>
                  )}
                </div>
                <h3 className="announcement-title">{a.title}</h3>
                {a.body && <p className="announcement-body">{a.body}</p>}
              </article>
            ))}
          </div>
        )}
      </div>

      {showCreate && (
        <CreateAnnouncementModal
          onClose={() => setShowCreate(false)}
          onSave={(fields) => addAnnouncement(subjectId, fields)}
        />
      )}
    </>
  )
}

function CreateAnnouncementModal({ onClose, onSave }) {
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [pinned, setPinned] = useState(false)
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!title.trim()) return
    setSaving(true)
    const { error } = await onSave({ title: title.trim(), body: body.trim(), pinned })
    setSaving(false)
    if (!error) onClose()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">New Announcement</h2>
          <button className="btn btn-icon btn-outline" onClick={onClose}><X /></button>
        </div>
        <div className="modal-body">
          <div className="flex flex-col gap-16">
            <div className="form-group">
              <label className="form-label" htmlFor="ann-title">Title</label>
              <input id="ann-title" className="form-input" value={title} onChange={e => setTitle(e.target.value)} maxLength={120} autoFocus />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="ann-body">Message</label>
              <textarea id="ann-body" className="form-textarea" rows={6} value={body} onChange={e => setBody(e.target.value)} />
            </div>
            <label className="check-row">
              <input type="checkbox" checked={pinned} onChange={e => setPinned(e.target.checked)} />
              Pin to the top of the announcement list
            </label>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-outline" onClick={onClose}>Cancel</button>
          <button className="btn btn-gradient" onClick={handleSave} disabled={!title.trim() || saving} id="btn-post-announcement">
            {saving ? <span className="btn-loader" /> : 'Post'}
          </button>
        </div>
      </div>
    </div>
  )
}

