import { useState, useEffect, useMemo, useRef } from 'react'
import { useApp } from '../context/AppContext.jsx'
import Avatar from '../components/Avatar.jsx'
import {
  ClipboardList,
  Plus,
  X,
  Trash2,
  Clock,
  CheckCircle2,
  Send,
  Image as ImageIcon,
  Upload,
  ZoomIn,
} from 'lucide-react'

const MAX_PHOTOS_PER_SUBMISSION = 6

const formatDateTime = (iso) =>
  iso ? new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : 'No due date'

const byDue = (a, b) => {
  if (!a.due_date && !b.due_date) return 0
  if (!a.due_date) return 1
  if (!b.due_date) return -1
  return new Date(a.due_date) - new Date(b.due_date)
}

const getSubmissionPhotos = (submission) =>
  Array.isArray(submission?.attached_files) ? submission.attached_files.filter(f => f && f.url) : []

export function studentAssignmentStatus(assignment, submission) {
  if (submission?.status === 'graded') {
    return { label: `Graded ${submission.score}/${assignment.max_points}`, cls: 'badge-green' }
  }
  if (submission) {
    return submission.status === 'late'
      ? { label: 'Submitted late', cls: 'badge-yellow' }
      : { label: 'Submitted', cls: 'badge-purple' }
  }
  if (assignment.due_date && new Date(assignment.due_date) < new Date()) {
    return { label: 'Missing', cls: 'badge-danger' }
  }
  return { label: 'Not submitted', cls: 'badge-yellow' }
}

export default function AssignmentsPage() {
  const {
    user, profile, selectedSubject, assignments, submissions,
    fetchAssignments, fetchSubmissions, addAssignment, deleteAssignment,
    uploadSubmissionPhoto, submitAssignment, gradeSubmission, showToast,
  } = useApp()
  const isFaculty = profile?.role === 'faculty'
  const subjectId = selectedSubject?.id

  const [showCreate, setShowCreate] = useState(false)
  const [openId, setOpenId] = useState(null)

  useEffect(() => {
    if (!subjectId) return
    fetchAssignments(subjectId)
    fetchSubmissions(subjectId)
  }, [subjectId, fetchAssignments, fetchSubmissions])

  const subjectAssignments = useMemo(
    () => assignments.filter(a => a.subject_id === subjectId).sort(byDue),
    [assignments, subjectId]
  )
  const subjectSubmissions = useMemo(
    () => submissions.filter(s => s.subject_id === subjectId),
    [submissions, subjectId]
  )

  const mySubmission = (assignmentId) =>
    subjectSubmissions.find(s => s.assignment_id === assignmentId && s.student_id === user?.id)

  const opened = subjectAssignments.find(a => a.id === openId) || null

  return (
    <>
      <div className="page-header">
        <div className="page-header-inner">
          <div>
            <h1 className="page-title">Assignments</h1>
            <p className="page-subtitle">
              {selectedSubject?.name} · {isFaculty ? 'Create assignments and grade submissions' : 'Complete and submit your work'}
            </p>
          </div>
          {isFaculty && (
            <button className="btn btn-gradient" onClick={() => setShowCreate(true)} id="btn-new-assignment">
              <Plus /> New Assignment
            </button>
          )}
        </div>
      </div>

      <div className="page-body">
        {subjectAssignments.length === 0 ? (
          <div className="empty-state">
            <ClipboardList />
            <h3>No assignments yet</h3>
            <p>{isFaculty ? 'Create your first assignment for this subject.' : 'Nothing has been assigned yet. Check back soon.'}</p>
          </div>
        ) : (
          <div className="assignment-list">
            {subjectAssignments.map(a => {
              const subs = subjectSubmissions.filter(s => s.assignment_id === a.id)
              const toGrade = subs.filter(s => s.status !== 'graded').length
              const mine = mySubmission(a.id)
              const myPhotos = getSubmissionPhotos(mine)
              const status = studentAssignmentStatus(a, mine)
              const overdue = a.due_date && new Date(a.due_date) < new Date()

              return (
                <button key={a.id} className="card assignment-card" onClick={() => setOpenId(a.id)} id={`assignment-${a.id}`}>
                  <div className="assignment-icon"><ClipboardList /></div>
                  <div className="assignment-info">
                    <h3 className="assignment-title">{a.title}</h3>
                    <div className="assignment-meta">
                      <span className={overdue ? 'text-danger' : ''}><Clock /> Due {formatDateTime(a.due_date)}</span>
                      <span>{a.max_points} pts</span>
                      {!isFaculty && myPhotos.length > 0 && (
                        <span><ImageIcon /> {myPhotos.length} photo{myPhotos.length === 1 ? '' : 's'}</span>
                      )}
                    </div>
                  </div>
                  {isFaculty ? (
                    <div className="assignment-side">
                      <span className="badge badge-purple">{subs.length} submitted</span>
                      {toGrade > 0 && <span className="badge badge-yellow">{toGrade} to grade</span>}
                    </div>
                  ) : (
                    <span className={`badge ${status.cls}`}>{status.label}</span>
                  )}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {showCreate && (
        <CreateAssignmentModal
          onClose={() => setShowCreate(false)}
          onSave={(fields) => addAssignment(subjectId, fields)}
        />
      )}

      {opened && !isFaculty && (
        <StudentAssignmentModal
          assignment={opened}
          submission={mySubmission(opened.id)}
          onUploadPhoto={(file) => uploadSubmissionPhoto(opened.id, file)}
          onSubmit={(text, photos) => submitAssignment(opened, text, photos)}
          showToast={showToast}
          onClose={() => setOpenId(null)}
        />
      )}

      {opened && isFaculty && (
        <FacultyAssignmentModal
          assignment={opened}
          submissions={subjectSubmissions.filter(s => s.assignment_id === opened.id)}
          onGrade={gradeSubmission}
          onDelete={async () => {
            if (window.confirm(`Delete "${opened.title}" and all of its submissions?`)) {
              const { error } = await deleteAssignment(opened.id)
              if (!error) setOpenId(null)
            }
          }}
          onClose={() => setOpenId(null)}
        />
      )}
    </>
  )
}

/* ---------------- Lightbox for full-size photo preview ---------------- */
function PhotoLightbox({ photo, onClose }) {
  if (!photo) return null
  return (
    <div className="photo-lightbox-overlay" onClick={e => { e.stopPropagation(); onClose() }}>
      <div className="photo-lightbox-inner" onClick={e => e.stopPropagation()}>
        <button className="btn btn-icon photo-lightbox-close" onClick={onClose} title="Close preview">
          <X />
        </button>
        <img src={photo.url} alt={photo.name || 'Submission photo'} className="photo-lightbox-img" />
        {photo.name && <div className="photo-lightbox-caption">{photo.name}</div>}
      </div>
    </div>
  )
}

/* ---------------- Faculty: create ---------------- */
function CreateAssignmentModal({ onClose, onSave }) {
  const [title, setTitle] = useState('')
  const [instructions, setInstructions] = useState('')
  const [maxPoints, setMaxPoints] = useState(100)
  const [dueDate, setDueDate] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!title.trim()) return
    setSaving(true)
    const { error } = await onSave({
      title: title.trim(),
      instructions: instructions.trim(),
      maxPoints: Math.min(Math.max(Number(maxPoints) || 100, 1), 1000),
      dueDate,
    })
    setSaving(false)
    if (!error) onClose()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">New Assignment</h2>
          <button className="btn btn-icon btn-outline" onClick={onClose}><X /></button>
        </div>
        <div className="modal-body">
          <div className="flex flex-col gap-16">
            <div className="form-group">
              <label className="form-label" htmlFor="asg-title">Title</label>
              <input id="asg-title" className="form-input" value={title} onChange={e => setTitle(e.target.value)} maxLength={120} autoFocus />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="asg-instructions">Instructions</label>
              <textarea id="asg-instructions" className="form-textarea" rows={5} value={instructions} onChange={e => setInstructions(e.target.value)} />
            </div>
            <div className="grid-2" style={{ gap: 16 }}>
              <div className="form-group">
                <label className="form-label" htmlFor="asg-points">Points</label>
                <input id="asg-points" type="number" min={1} max={1000} className="form-input" value={maxPoints} onChange={e => setMaxPoints(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="asg-due">Due date (optional)</label>
                <input id="asg-due" type="datetime-local" className="form-input" value={dueDate} onChange={e => setDueDate(e.target.value)} />
              </div>
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-outline" onClick={onClose}>Cancel</button>
          <button className="btn btn-gradient" onClick={handleSave} disabled={!title.trim() || saving} id="btn-save-assignment">
            {saving ? <span className="btn-loader" /> : 'Create Assignment'}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ---------------- Student: view + submit (text + photos) ---------------- */
function StudentAssignmentModal({ assignment, submission, onUploadPhoto, onSubmit, showToast, onClose }) {
  const [text, setText] = useState(submission?.submission_text || '')
  const [photos, setPhotos] = useState(() => getSubmissionPhotos(submission))
  const [uploadingCount, setUploadingCount] = useState(0)
  const [dragOver, setDragOver] = useState(false)
  const [previewPhoto, setPreviewPhoto] = useState(null)
  const [saving, setSaving] = useState(false)
  const fileInputRef = useRef(null)

  const graded = submission?.status === 'graded'
  const status = studentAssignmentStatus(assignment, submission)
  const isLate = assignment.due_date && new Date(assignment.due_date) < new Date()
  const canSubmit = !graded && uploadingCount === 0 && (text.trim().length > 0 || photos.length > 0)

  const handleFilesSelected = async (fileList) => {
    if (graded || !fileList?.length) return
    const files = Array.from(fileList)
    const remainingSlots = MAX_PHOTOS_PER_SUBMISSION - photos.length
    if (remainingSlots <= 0) {
      showToast?.(`You can attach up to ${MAX_PHOTOS_PER_SUBMISSION} photos per submission.`, 'info')
      return
    }
    const batch = files.slice(0, remainingSlots)
    if (files.length > remainingSlots) {
      showToast?.(`Only the first ${remainingSlots} photo(s) were added (max ${MAX_PHOTOS_PER_SUBMISSION}).`, 'info')
    }

    setUploadingCount(c => c + batch.length)
    for (const file of batch) {
      const { photo } = await onUploadPhoto(file)
      if (photo) {
        setPhotos(prev => [...prev, photo])
      }
      setUploadingCount(c => Math.max(0, c - 1))
    }
  }

  const handleRemovePhoto = (id) => {
    if (graded) return
    setPhotos(prev => prev.filter(p => p.id !== id))
  }

  const handleSubmit = async () => {
    if (!canSubmit) return
    setSaving(true)
    await onSubmit(text.trim(), photos)
    setSaving(false)
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2 className="modal-title">{assignment.title}</h2>
            <div className="assignment-meta mt-8">
              <span><Clock /> Due {formatDateTime(assignment.due_date)}</span>
              <span>{assignment.max_points} pts</span>
              <span className={`badge ${status.cls}`}>{status.label}</span>
            </div>
          </div>
          <button className="btn btn-icon btn-outline" onClick={onClose}><X /></button>
        </div>

        <div className="modal-body">
          <h4 className="section-subheading mb-6">Instructions</h4>
          <p className="prewrap mb-24">{assignment.instructions || 'No instructions were provided.'}</p>

          {graded && (
            <div className="grade-box mb-24">
              <div className="grade-score">{submission.score}<span>/{assignment.max_points}</span></div>
              <div>
                <div className="form-label">Instructor feedback</div>
                <p className="prewrap">{submission.feedback || 'No written feedback.'}</p>
              </div>
            </div>
          )}

          <div className="form-group mb-20">
            <label className="form-label" htmlFor="asg-answer">Written response (optional if attaching photos)</label>
            <textarea
              id="asg-answer"
              className="form-textarea"
              rows={5}
              value={text}
              onChange={e => setText(e.target.value)}
              disabled={graded}
              placeholder="Type your answer, notes, or explanation..."
            />
          </div>

          {/* Photo Attachments Section */}
          <div className="form-group">
            <div className="flex items-center justify-between mb-6">
              <label className="form-label">
                Photo attachments ({photos.length}/{MAX_PHOTOS_PER_SUBMISSION})
              </label>
              {!graded && photos.length < MAX_PHOTOS_PER_SUBMISSION && (
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingCount > 0}
                  id="btn-add-submission-photo"
                >
                  <Upload /> Add photos
                </button>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              multiple
              hidden
              onChange={e => {
                handleFilesSelected(e.target.files)
                e.target.value = ''
              }}
            />

            {!graded && photos.length === 0 && (
              <div
                className={`photo-upload-dropzone ${dragOver ? 'dragover' : ''}`}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                onDrop={e => {
                  e.preventDefault()
                  setDragOver(false)
                  handleFilesSelected(e.dataTransfer?.files)
                }}
              >
                <ImageIcon className="photo-dropzone-icon" />
                <div className="photo-dropzone-title">
                  {uploadingCount > 0 ? `Uploading ${uploadingCount} photo(s)...` : 'Click or drag & drop photos here'}
                </div>
                <div className="photo-dropzone-sub">
                  JPG, PNG or WebP · Up to {MAX_PHOTOS_PER_SUBMISSION} photos (max 10 MB each)
                </div>
              </div>
            )}

            {photos.length > 0 && (
              <div
                className={`submission-photos-grid ${dragOver ? 'dragover' : ''}`}
                onDragOver={e => { if (!graded) { e.preventDefault(); setDragOver(true) } }}
                onDragLeave={() => setDragOver(false)}
                onDrop={e => {
                  if (graded) return
                  e.preventDefault()
                  setDragOver(false)
                  handleFilesSelected(e.dataTransfer?.files)
                }}
              >
                {photos.map((photo, idx) => (
                  <div key={photo.id || idx} className="submission-photo-card">
                    <button
                      type="button"
                      className="submission-photo-thumb"
                      onClick={() => setPreviewPhoto(photo)}
                      title="Click to view full size"
                    >
                      <img src={photo.url} alt={photo.name || `Photo ${idx + 1}`} />
                      <span className="submission-photo-zoom"><ZoomIn /></span>
                    </button>
                    <div className="submission-photo-footer">
                      <span className="submission-photo-name" title={photo.name}>{photo.name || `Photo ${idx + 1}`}</span>
                      {!graded && (
                        <button
                          type="button"
                          className="submission-photo-remove"
                          onClick={() => handleRemovePhoto(photo.id)}
                          title="Remove photo"
                        >
                          <Trash2 />
                        </button>
                      )}
                    </div>
                  </div>
                ))}

                {!graded && photos.length < MAX_PHOTOS_PER_SUBMISSION && (
                  <button
                    type="button"
                    className="submission-photo-add-tile"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingCount > 0}
                  >
                    {uploadingCount > 0 ? <span className="btn-loader" /> : <Plus />}
                    <span>{uploadingCount > 0 ? 'Uploading...' : 'Add photo'}</span>
                  </button>
                )}
              </div>
            )}

            {submission && !graded && (
              <span className="form-hint mt-8">Submitted {formatDateTime(submission.submitted_at)}. You can update your text or photos and resubmit until it is graded.</span>
            )}
            {!submission && isLate && <span className="form-hint mt-8" style={{ color: 'var(--accent-danger)' }}>This assignment is past due and will be marked late.</span>}
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-outline" onClick={onClose}>Close</button>
          {!graded && (
            <button className="btn btn-gradient" onClick={handleSubmit} disabled={!canSubmit || saving} id="btn-submit-assignment">
              {saving ? <span className="btn-loader" /> : <><Send /> {submission ? 'Resubmit' : 'Submit'}</>}
            </button>
          )}
        </div>
      </div>

      <PhotoLightbox photo={previewPhoto} onClose={() => setPreviewPhoto(null)} />
    </div>
  )
}

/* ---------------- Faculty: submissions + grading ---------------- */
function FacultyAssignmentModal({ assignment, submissions, onGrade, onDelete, onClose }) {
  const [grading, setGrading] = useState(null)
  const sorted = [...submissions].sort((a, b) => new Date(b.submitted_at) - new Date(a.submitted_at))
  const current = grading ? submissions.find(s => s.id === grading) : null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2 className="modal-title">{assignment.title}</h2>
            <div className="assignment-meta mt-8">
              <span><Clock /> Due {formatDateTime(assignment.due_date)}</span>
              <span>{assignment.max_points} pts</span>
              <span className="badge badge-purple">{submissions.length} submitted</span>
            </div>
          </div>
          <button className="btn btn-icon btn-outline" onClick={onClose}><X /></button>
        </div>

        <div className="modal-body">
          {assignment.instructions && (
            <>
              <h4 className="section-subheading mb-6">Instructions</h4>
              <p className="prewrap mb-24">{assignment.instructions}</p>
            </>
          )}

          <h4 className="section-subheading mb-12">Submissions</h4>
          {sorted.length === 0 ? (
            <div className="empty-state-mini">No submissions yet.</div>
          ) : (
            <div className="table-responsive">
              <table className="scores-table">
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Submitted</th>
                    <th>Attachments</th>
                    <th>Status</th>
                    <th>Score</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {sorted.map(s => {
                    const photoCount = getSubmissionPhotos(s).length
                    return (
                      <tr key={s.id}>
                        <td>
                          <div className="flex items-center gap-8">
                            <Avatar name={s.student?.full_name || 'Student'} url={s.student?.avatar_url} size={28} />
                            {s.student?.full_name || 'Student'}
                          </div>
                        </td>
                        <td style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{formatDateTime(s.submitted_at)}</td>
                        <td style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                          {photoCount > 0 ? (
                            <span className="badge badge-purple">
                              <ImageIcon style={{ width: 12, height: 12, marginRight: 4 }} />
                              {photoCount} photo{photoCount === 1 ? '' : 's'}
                            </span>
                          ) : '—'}
                        </td>
                        <td>
                          <span className={`badge ${s.status === 'graded' ? 'badge-green' : s.status === 'late' ? 'badge-yellow' : 'badge-purple'}`}>
                            {s.status === 'graded' ? <><CheckCircle2 style={{ width: 12, height: 12, marginRight: 4 }} />Graded</> : s.status === 'late' ? 'Late' : 'Submitted'}
                          </span>
                        </td>
                        <td>{s.score != null ? `${s.score}/${assignment.max_points}` : '—'}</td>
                        <td>
                          <button className="btn btn-outline btn-sm" onClick={() => setGrading(s.id)}>
                            {s.status === 'graded' ? 'Edit grade' : 'Grade'}
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="modal-footer" style={{ justifyContent: 'space-between' }}>
          <button className="btn btn-outline" onClick={onDelete} style={{ color: 'var(--accent-danger)' }}>
            <Trash2 /> Delete assignment
          </button>
          <button className="btn btn-outline" onClick={onClose}>Close</button>
        </div>
      </div>

      {current && (
        <GradeModal
          submission={current}
          max={assignment.max_points}
          onClose={() => setGrading(null)}
          onSave={async (score, feedback) => {
            const { error } = await onGrade(current, score, feedback)
            if (!error) setGrading(null)
          }}
        />
      )}
    </div>
  )
}

function GradeModal({ submission, max, onClose, onSave }) {
  const [score, setScore] = useState(submission.score ?? '')
  const [feedback, setFeedback] = useState(submission.feedback || '')
  const [previewPhoto, setPreviewPhoto] = useState(null)
  const [saving, setSaving] = useState(false)
  const photos = getSubmissionPhotos(submission)

  const numeric = Number(score)
  const valid = score !== '' && !Number.isNaN(numeric) && numeric >= 0 && numeric <= max

  const handleSave = async () => {
    if (!valid) return
    setSaving(true)
    await onSave(numeric, feedback.trim())
    setSaving(false)
  }

  return (
    <div className="modal-overlay" style={{ zIndex: 250 }} onClick={e => { e.stopPropagation(); onClose() }}>
      <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Grade: {submission.student?.full_name || 'Student'}</h2>
          <button className="btn btn-icon btn-outline" onClick={onClose}><X /></button>
        </div>
        <div className="modal-body">
          <div className="flex flex-col gap-16">
            <div>
              <div className="form-label mb-6">Written response</div>
              <div className="submission-text prewrap">{submission.submission_text || 'No written response submitted.'}</div>
            </div>

            {photos.length > 0 && (
              <div>
                <div className="form-label mb-6">Submitted photos ({photos.length}) — click to enlarge</div>
                <div className="submission-photos-grid">
                  {photos.map((photo, idx) => (
                    <div key={photo.id || idx} className="submission-photo-card">
                      <button
                        type="button"
                        className="submission-photo-thumb"
                        onClick={() => setPreviewPhoto(photo)}
                        title="Click to view full size"
                      >
                        <img src={photo.url} alt={photo.name || `Photo ${idx + 1}`} />
                        <span className="submission-photo-zoom"><ZoomIn /></span>
                      </button>
                      <div className="submission-photo-footer">
                        <span className="submission-photo-name" title={photo.name}>{photo.name || `Photo ${idx + 1}`}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="form-group">
              <label className="form-label" htmlFor="grade-score">Score (out of {max})</label>
              <input id="grade-score" type="number" min={0} max={max} className="form-input" value={score} onChange={e => setScore(e.target.value)} autoFocus />
              {score !== '' && !valid && <span className="form-hint" style={{ color: 'var(--accent-danger)' }}>Enter a score between 0 and {max}.</span>}
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="grade-feedback">Feedback</label>
              <textarea id="grade-feedback" className="form-textarea" rows={4} value={feedback} onChange={e => setFeedback(e.target.value)} />
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-outline" onClick={onClose}>Cancel</button>
          <button className="btn btn-gradient" onClick={handleSave} disabled={!valid || saving} id="btn-save-grade">
            {saving ? <span className="btn-loader" /> : 'Save grade'}
          </button>
        </div>
      </div>

      <PhotoLightbox photo={previewPhoto} onClose={() => setPreviewPhoto(null)} />
    </div>
  )
}
