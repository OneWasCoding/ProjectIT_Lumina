import { useState, useEffect } from 'react'
import { useApp } from '../context/AppContext.jsx'
import {
  BookOpen,
  GraduationCap,
  Plus,
  X,
  ArrowRight,
  Layers,
} from 'lucide-react'

export default function SubjectSelector() {
  const { user, profile, subjects, fetchSubjects, addSubject, setSelectedSubject, showToast } = useApp()
  const [showCreate, setShowCreate] = useState(false)
  const [selectedYear, setSelectedYear] = useState(profile?.year_level || '1st Year')
  const isFaculty = profile?.role === 'faculty'

  const yearLevels = ['1st Year', '2nd Year', '3rd Year', '4th Year']

  useEffect(() => {
    fetchSubjects()
  }, [fetchSubjects])

  // Faculty only see the subjects they created (also enforced by database policies);
  // students see every subject for their chosen year level.
  const filteredSubjects = isFaculty
    ? subjects.filter(s => s.created_by === user?.id)
    : subjects.filter(s => s.year_level === selectedYear)

  const handleSelectSubject = (subject) => {
    setSelectedSubject(subject)
  }

  return (
    <div className="subject-selector-page">
      <div className="subject-selector-container">
        <div className="subject-selector-header">
          <div className="subject-selector-icon">
            <BookOpen />
          </div>
          <h1>Select Your Subject</h1>
          <p>Choose a subject and year level to get started</p>
        </div>

        {/* Year Level Filter */}
        {!isFaculty && (
          <div className="year-filter">
            {yearLevels.map(y => (
              <button
                key={y}
                className={`year-chip ${selectedYear === y ? 'active' : ''}`}
                onClick={() => setSelectedYear(y)}
              >
                <GraduationCap style={{ width: 14, height: 14 }} />
                {y}
              </button>
            ))}
          </div>
        )}

        {isFaculty && (
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <button className="btn btn-gradient" onClick={() => setShowCreate(true)} id="btn-create-subject">
              <Plus /> Create Subject
            </button>
          </div>
        )}

        {/* Subject Cards */}
        {filteredSubjects.length === 0 ? (
          <div className="empty-state">
            <Layers />
            <h3>No Subjects Found</h3>
            <p>
              {isFaculty
                ? 'You have no subjects yet. Create your first subject to get started.'
                : `No subjects available for ${selectedYear} yet.`}
            </p>
          </div>
        ) : (
          <div className="subject-grid">
            {filteredSubjects.map(subject => (
              <div
                key={subject.id}
                className="subject-card"
                onClick={() => handleSelectSubject(subject)}
                id={`subject-${subject.id}`}
              >
                <div className="subject-card-badge">{subject.year_level}</div>
                <div className="subject-card-icon">
                  <BookOpen />
                </div>
                <h3>{subject.name}</h3>
                {subject.description && (
                  <p className="subject-card-desc">{subject.description}</p>
                )}
                <div className="subject-card-action">
                  Enter <ArrowRight style={{ width: 16, height: 16 }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Subject Modal */}
      {showCreate && (
        <CreateSubjectModal
          onClose={() => setShowCreate(false)}
          onSave={addSubject}
        />
      )}
    </div>
  )
}

function CreateSubjectModal({ onClose, onSave }) {
  const [name, setName] = useState('')
  const [yearLevel, setYearLevel] = useState('1st Year')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)

  const yearLevels = ['1st Year', '2nd Year', '3rd Year', '4th Year']

  const handleSave = async () => {
    if (!name.trim()) return
    setSaving(true)
    const { error } = await onSave(name.trim(), yearLevel, description.trim())
    setSaving(false)
    if (!error) onClose()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Create New Subject</h2>
          <button className="btn btn-icon btn-outline" onClick={onClose}><X /></button>
        </div>
        <div className="modal-body">
          <div className="flex flex-col gap-20">
            <div className="form-group">
              <label className="form-label">Subject Name</label>
              <input
                className="form-input"
                placeholder="e.g. IT Fundamentals"
                value={name}
                onChange={e => setName(e.target.value)}
                id="input-subject-name"
                autoFocus
              />
            </div>
            <div className="form-group">
              <label className="form-label">Year Level</label>
              <select
                className="form-select"
                value={yearLevel}
                onChange={e => setYearLevel(e.target.value)}
                id="select-subject-year"
              >
                {yearLevels.map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Description (optional)</label>
              <textarea
                className="form-textarea"
                placeholder="Brief description of the subject..."
                value={description}
                onChange={e => setDescription(e.target.value)}
                id="input-subject-desc"
              />
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-outline" onClick={onClose}>Cancel</button>
          <button
            className="btn btn-gradient"
            onClick={handleSave}
            disabled={!name.trim() || saving}
            id="btn-save-subject"
          >
            {saving ? <span className="btn-loader" /> : 'Create Subject'}
          </button>
        </div>
      </div>
    </div>
  )
}
