import { useState, useRef } from 'react'
import { useApp } from '../context/AppContext.jsx'
import {
  Plus,
  Upload,
  Presentation,
  ChevronLeft,
  ChevronRight,
  X,
  Trash2,
  Calendar,
  Layers,
  Maximize2,
  FileText,
} from 'lucide-react'

export default function PresentationsPage() {
  const { user, presentations, addPresentation, deletePresentation } = useApp()
  const [showUpload, setShowUpload] = useState(false)
  const [viewingPres, setViewingPres] = useState(null)
  const [currentSlide, setCurrentSlide] = useState(0)

  const isTeacher = user?.role === 'teacher'

  return (
    <>
      <div className="page-header">
        <div className="page-header-inner">
          <div>
            <h1 className="page-title">Presentations</h1>
            <p className="page-subtitle">Upload, manage and preview your slides</p>
          </div>
          {isTeacher && (
            <button className="btn btn-gradient" onClick={() => setShowUpload(true)} id="btn-upload-pres">
              <Plus /> Upload Presentation
            </button>
          )}
        </div>
      </div>

      <div className="page-body">
        {presentations.length === 0 ? (
          <div className="empty-state">
            <Presentation />
            <h3>No Presentations Yet</h3>
            <p>
              {isTeacher
                ? 'Upload your first PowerPoint presentation to get started.'
                : 'Your teacher hasn\'t uploaded any presentations yet.'}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-16">
            {presentations.map((pres) => (
              <div
                key={pres.id}
                className="presentation-card"
                onClick={() => { setViewingPres(pres); setCurrentSlide(0); }}
                id={`pres-${pres.id}`}
              >
                <div className="presentation-thumb">
                  <div style={{
                    width: '100%',
                    height: '100%',
                    background: `linear-gradient(135deg, ${pres.slides[0]?.color || '#7c5cfc'}22, ${pres.slides[0]?.color || '#7c5cfc'}08)`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <FileText style={{ width: 36, height: 36, color: pres.slides[0]?.color || 'var(--accent-primary)' }} />
                  </div>
                </div>
                <div className="presentation-info">
                  <div className="presentation-title">{pres.title}</div>
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8 }}>
                    {pres.subject}
                  </div>
                  <div className="presentation-meta">
                    <span><Layers style={{ width: 14, height: 14 }} /> {pres.slideCount} slides</span>
                    <span><Calendar style={{ width: 14, height: 14 }} /> {pres.uploadedAt}</span>
                  </div>
                </div>
                {isTeacher && (
                  <button
                    className="btn btn-icon btn-outline"
                    onClick={(e) => { e.stopPropagation(); deletePresentation(pres.id); }}
                    title="Delete"
                    id={`delete-pres-${pres.id}`}
                  >
                    <Trash2 style={{ width: 16, height: 16, color: 'var(--accent-danger)' }} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Upload Modal */}
      {showUpload && (
        <UploadModal onClose={() => setShowUpload(false)} onUpload={addPresentation} />
      )}

      {/* Slide Viewer Modal */}
      {viewingPres && (
        <SlideViewer
          presentation={viewingPres}
          currentSlide={currentSlide}
          setCurrentSlide={setCurrentSlide}
          onClose={() => setViewingPres(null)}
        />
      )}
    </>
  )
}

function UploadModal({ onClose, onUpload }) {
  const [title, setTitle] = useState('')
  const [subject, setSubject] = useState('')
  const [slides, setSlides] = useState([])
  const [dragOver, setDragOver] = useState(false)
  const fileRef = useRef()

  const colors = ['#7c5cfc', '#00d4aa', '#ff6b9d', '#ffb547', '#5c9cfc', '#fc5c8a']

  const handleFile = (file) => {
    if (!file) return
    // Simulate extracting slides from a file
    const slideCount = 3 + Math.floor(Math.random() * 5)
    const mockSlides = Array.from({ length: slideCount }, (_, i) => ({
      id: i + 1,
      title: `Slide ${i + 1}`,
      content: `Content for slide ${i + 1} from "${file.name}"`,
      color: colors[i % colors.length],
    }))
    setSlides(mockSlides)
    if (!title) setTitle(file.name.replace(/\.[^/.]+$/, ''))
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    handleFile(file)
  }

  const handleSubmit = () => {
    if (!title.trim() || slides.length === 0) return
    onUpload({
      title: title.trim(),
      subject: subject.trim() || 'General',
      slides,
      slideCount: slides.length,
    })
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Upload Presentation</h2>
          <button className="btn btn-icon btn-outline" onClick={onClose}>
            <X />
          </button>
        </div>
        <div className="modal-body">
          <div className="flex flex-col gap-20">
            <div
              className={`upload-zone ${dragOver ? 'dragover' : ''}`}
              onClick={() => fileRef.current?.click()}
              onDrop={handleDrop}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
            >
              <Upload />
              <h3>Drop your file here or click to browse</h3>
              <p>Supports PPTX, PDF, and image files</p>
              <input
                ref={fileRef}
                type="file"
                accept=".pptx,.ppt,.pdf,.png,.jpg,.jpeg"
                style={{ display: 'none' }}
                onChange={e => handleFile(e.target.files[0])}
              />
            </div>

            {slides.length > 0 && (
              <div className="badge badge-green" style={{ alignSelf: 'flex-start' }}>
                ✓ {slides.length} slides loaded
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Title</label>
              <input
                className="form-input"
                placeholder="Presentation title"
                value={title}
                onChange={e => setTitle(e.target.value)}
                id="input-pres-title"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Subject</label>
              <input
                className="form-input"
                placeholder="e.g. IT Fundamentals"
                value={subject}
                onChange={e => setSubject(e.target.value)}
                id="input-pres-subject"
              />
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-outline" onClick={onClose}>Cancel</button>
          <button
            className="btn btn-gradient"
            onClick={handleSubmit}
            disabled={!title.trim() || slides.length === 0}
            id="btn-submit-pres"
          >
            <Upload /> Upload
          </button>
        </div>
      </div>
    </div>
  )
}

function SlideViewer({ presentation, currentSlide, setCurrentSlide, onClose }) {
  const slide = presentation.slides[currentSlide]
  const total = presentation.slides.length

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 900 }}>
        <div className="modal-header">
          <h2 className="modal-title">{presentation.title}</h2>
          <button className="btn btn-icon btn-outline" onClick={onClose}>
            <X />
          </button>
        </div>
        <div className="modal-body" style={{ padding: 0 }}>
          {/* Slide Display */}
          <div className="slide-viewer">
            <div style={{
              width: '100%',
              height: '100%',
              background: `linear-gradient(135deg, ${slide.color}20, ${slide.color}08)`,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 40,
              textAlign: 'center',
            }}>
              <div style={{
                fontSize: 14,
                fontWeight: 600,
                color: slide.color,
                marginBottom: 12,
                textTransform: 'uppercase',
                letterSpacing: 2,
              }}>
                {slide.title}
              </div>
              <div style={{
                fontSize: 22,
                fontWeight: 600,
                fontFamily: 'var(--font-display)',
                lineHeight: 1.5,
                maxWidth: 600,
              }}>
                {slide.content}
              </div>
            </div>

            {/* Navigation Controls */}
            <div className="slide-controls">
              <button
                className="slide-nav-btn"
                onClick={() => setCurrentSlide(Math.max(0, currentSlide - 1))}
                disabled={currentSlide === 0}
                style={{ opacity: currentSlide === 0 ? 0.3 : 1 }}
              >
                <ChevronLeft />
              </button>
              <span className="slide-counter">
                {currentSlide + 1} / {total}
              </span>
              <button
                className="slide-nav-btn"
                onClick={() => setCurrentSlide(Math.min(total - 1, currentSlide + 1))}
                disabled={currentSlide === total - 1}
                style={{ opacity: currentSlide === total - 1 ? 0.3 : 1 }}
              >
                <ChevronRight />
              </button>
            </div>
          </div>

          {/* Slide Thumbnails */}
          <div style={{
            display: 'flex',
            gap: 8,
            padding: '16px 24px',
            overflowX: 'auto',
          }}>
            {presentation.slides.map((s, idx) => (
              <button
                key={s.id}
                onClick={() => setCurrentSlide(idx)}
                style={{
                  width: 80,
                  height: 50,
                  borderRadius: 'var(--radius-sm)',
                  background: `linear-gradient(135deg, ${s.color}30, ${s.color}10)`,
                  border: idx === currentSlide
                    ? `2px solid ${s.color}`
                    : '2px solid var(--border-color)',
                  cursor: 'pointer',
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 10,
                  fontWeight: 700,
                  color: idx === currentSlide ? s.color : 'var(--text-muted)',
                  transition: 'all 0.2s ease',
                }}
              >
                {idx + 1}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
