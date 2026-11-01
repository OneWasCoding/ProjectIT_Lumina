import { useState, useEffect, useRef } from 'react'
import { useApp } from '../context/AppContext.jsx'
import { formatFileSize } from '../lib/presentationParser.js'
import {
  ArrowLeft,
  BookOpen,
  Presentation as PresentationIcon,
  Sparkles,
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  Plus,
  X,
  Play,
  RotateCcw,
  Award,
  Layers,
  Save,
  Trash2,
  Edit3,
  Upload,
  Download,
  ExternalLink,
  FileUp,
} from 'lucide-react'

export default function TopicStudyPage({ onBackToTOC }) {
  const {
    currentTopic,
    selectedSubject,
    profile,
    user,
    topicContent,
    fetchTopicContent,
    addTopicContent,
    uploadTopicPresentation,
    deleteTopicContent,
    quizzes,
    fetchQuizzes,
    addQuiz,
    submitQuizResult,
    quizResults,
    fetchMyResults,
    showToast,
  } = useApp()

  const [activeTab, setActiveTab] = useState('text') // 'text' | 'presentation' | 'insights' | 'summary' | 'quiz'
  const isFaculty = profile?.role === 'faculty'

  // Load content & quizzes for this topic
  useEffect(() => {
    if (currentTopic?.id) {
      fetchTopicContent(currentTopic.id)
      fetchQuizzes(currentTopic.id)
    }
  }, [currentTopic, fetchTopicContent, fetchQuizzes])

  // Content filtered by this topic and type
  const topicItems = topicContent.filter(c => c.topic_id === currentTopic?.id)
  const textContents = topicItems.filter(c => c.content_type === 'text')
  const presentationContents = topicItems.filter(c => c.content_type === 'presentation')
  const insightContents = topicItems.filter(
    c => c.content_type === 'notes' && (!user?.id || !c.created_by || c.created_by === user.id)
  )

  // Find results for quizzes in this topic
  const topicQuizzes = quizzes.filter(q => q.topic_id === currentTopic?.id)
  const topicResults = quizResults.filter(r => topicQuizzes.some(q => q.id === r.quiz_id))
  const hasPassedTopic = topicResults.some(r => r.passed)
  const latestResult = topicResults[0]

  // Modals
  const [showAddTextModal, setShowAddTextModal] = useState(false)
  const [showCreateQuizModal, setShowCreateQuizModal] = useState(false)

  return (
    <div className="topic-study-container">
      {/* Top Header Navigation */}
      <div className="topic-top-bar">
        <button
          className="btn btn-outline btn-sm flex items-center gap-8"
          onClick={onBackToTOC}
          id="btn-return-toc"
        >
          <ArrowLeft style={{ width: 16, height: 16 }} />
          Return to Table of Contents
        </button>

        <div className="topic-subject-badge">
          <span>{selectedSubject?.name}</span>
          <span className="badge badge-purple">Topic #{currentTopic?.order_number}</span>
        </div>

        <div className="topic-header-actions">
          {hasPassedTopic ? (
            <div className="badge badge-green flex items-center gap-6">
              <CheckCircle2 style={{ width: 14, height: 14 }} />
              Passed (Proceed Enabled)
            </div>
          ) : latestResult ? (
            <div className="badge badge-danger flex items-center gap-6">
              <XCircle style={{ width: 14, height: 14 }} />
              Failed (75% Required)
            </div>
          ) : (
            <div className="badge badge-yellow flex items-center gap-6">
              <Clock style={{ width: 14, height: 14 }} />
              Quiz Not Taken
            </div>
          )}

          <button
            className="btn btn-gradient btn-sm flex items-center gap-6"
            onClick={() => setActiveTab('quiz')}
            id="btn-start-topic-quiz"
          >
            <Play style={{ width: 14, height: 14 }} />
            {hasPassedTopic ? 'Retake Quiz' : 'Start Topic Quiz'}
          </button>
        </div>
      </div>

      {/* Topic Title & Description Banner */}
      <div className="topic-hero-banner">
        <div className="topic-hero-content">
          <div className="topic-meta-label">LESSON {currentTopic?.order_number}</div>
          <h1 className="topic-hero-title">{currentTopic?.title}</h1>
          <p className="topic-hero-desc">
            {currentTopic?.summary || 'Explore the lesson materials, interactive presentation slides, insights, and complete the 10-minute quiz to unlock the next topic.'}
          </p>
        </div>
      </div>

      {/* Topic Navigation Tabs */}
      <div className="topic-nav-tabs">
        <button
          className={`topic-tab-button ${activeTab === 'text' ? 'active' : ''}`}
          onClick={() => setActiveTab('text')}
          id="tab-text"
        >
          <FileText style={{ width: 16, height: 16 }} />
          {isFaculty ? 'Insert Text / Lesson' : 'Lesson Materials'}
        </button>

        <button
          className={`topic-tab-button ${activeTab === 'presentation' ? 'active' : ''}`}
          onClick={() => setActiveTab('presentation')}
          id="tab-presentation"
        >
          <PresentationIcon style={{ width: 16, height: 16 }} />
          Presentation
        </button>

        <button
          className={`topic-tab-button ${activeTab === 'insights' ? 'active' : ''}`}
          onClick={() => setActiveTab('insights')}
          id="tab-insights"
        >
          <Sparkles style={{ width: 16, height: 16 }} />
          My Study Notes & Insights
        </button>

        <button
          className={`topic-tab-button ${activeTab === 'summary' ? 'active' : ''}`}
          onClick={() => setActiveTab('summary')}
          id="tab-summary"
        >
          <BookOpen style={{ width: 16, height: 16 }} />
          Summary
        </button>

        <button
          className={`topic-tab-button ${activeTab === 'quiz' ? 'active' : ''}`}
          onClick={() => setActiveTab('quiz')}
          id="tab-quiz"
        >
          <Award style={{ width: 16, height: 16 }} />
          Quiz (10 Mins · Max 50 Items)
          {hasPassedTopic && <span className="tab-pill-passed">75%+</span>}
        </button>
      </div>

      {/* Main Tab Content */}
      <div className="topic-tab-body">
        {activeTab === 'text' && (
          <TextLessonSection
            topic={currentTopic}
            contents={textContents}
            onAdd={() => setShowAddTextModal(true)}
            onDelete={(item) => deleteTopicContent(item.id, null)}
            isFaculty={isFaculty}
          />
        )}

        {activeTab === 'presentation' && (
          <PresentationSection
            topic={currentTopic}
            contents={presentationContents}
            isFaculty={isFaculty}
            onUploadPresentation={(file, title) => uploadTopicPresentation(currentTopic.id, file, title)}
            onDeletePresentation={(item) => deleteTopicContent(item.id, item.slides?.filePath)}
            onAddNewSlideSet={(slides) => {
              addTopicContent(currentTopic.id, 'presentation', 'Lesson Slide Deck', slides, presentationContents.length + 1)
            }}
          />
        )}

        {activeTab === 'insights' && (
          <InsightsSection
            topic={currentTopic}
            contents={insightContents}
            onSaveInsight={(title, notes, theme) =>
              addTopicContent(
                currentTopic.id,
                'notes',
                notes,
                [{ title, notes, theme, date: new Date().toLocaleDateString() }],
                insightContents.length + 1
              )
            }
          />
        )}

        {activeTab === 'summary' && (
          <SummarySection
            topic={currentTopic}
            textContents={textContents}
            presentationContents={presentationContents}
            quizzes={topicQuizzes}
            onProceedToQuiz={() => setActiveTab('quiz')}
          />
        )}

        {activeTab === 'quiz' && (
          <QuizSection
            topic={currentTopic}
            quizzes={topicQuizzes}
            isFaculty={isFaculty}
            onOpenCreateModal={() => setShowCreateQuizModal(true)}
            onSubmitResult={submitQuizResult}
            onRefresh={() => fetchQuizzes(currentTopic.id)}
            onBackToTOC={onBackToTOC}
          />
        )}
      </div>

      {/* Modal: Insert Text / Lesson Note */}
      {showAddTextModal && (
        <InsertTextModal
          topicId={currentTopic.id}
          nextOrder={textContents.length + 1}
          onClose={() => setShowAddTextModal(false)}
          onSave={async (content) => {
            const { error } = await addTopicContent(currentTopic.id, 'text', content, null, textContents.length + 1)
            if (!error) setShowAddTextModal(false)
          }}
        />
      )}

      {/* Modal: Faculty Quiz Upload */}
      {showCreateQuizModal && (
        <FacultyQuizUploadModal
          topicId={currentTopic.id}
          topicTitle={currentTopic.title}
          onClose={() => setShowCreateQuizModal(false)}
          onSave={async (quizData) => {
            const { error } = await addQuiz(
              currentTopic.id,
              quizData.title,
              quizData.timeLimit,
              quizData.maxItems,
              quizData.passingScore,
              quizData.questions
            )
            if (!error) setShowCreateQuizModal(false)
          }}
        />
      )}
    </div>
  )
}

/* ============================================================
   SECTION 1: TEXT LESSON / INSERT TEXT
   ============================================================ */
function TextLessonSection({ topic, contents, onAdd, onDelete, isFaculty }) {
  return (
    <div className="section-card">
      <div className="flex items-center justify-between mb-24" style={{ flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 className="section-title">Lesson Reading & Text Materials</h2>
          <p className="section-subtitle">
            {isFaculty
              ? 'Publish lesson reading materials and lecture notes for your students.'
              : 'Read the lesson materials uploaded by your instructor for this topic.'}
          </p>
        </div>
        {isFaculty && (
          <button className="btn btn-gradient btn-sm flex items-center gap-6" onClick={onAdd} id="btn-insert-text">
            <Plus style={{ width: 16, height: 16 }} />
            Insert Lesson Text
          </button>
        )}
      </div>

      <div className="lesson-text-stack">
        {contents.length === 0 ? (
          <div className="empty-state-mini">
            <FileText style={{ width: 32, height: 32, color: 'var(--text-muted)', marginBottom: 8 }} />
            <p style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
              No Lesson Text Uploaded Yet
            </p>
            <p style={{ fontSize: 13 }}>
              {isFaculty
                ? 'Click "Insert Lesson Text" above to publish reading materials for this topic.'
                : 'Your instructor has not uploaded lesson reading materials for this topic yet. Check the Presentation tab or come back soon.'}
            </p>
          </div>
        ) : (
          contents.map((item, idx) => (
            <div key={item.id || idx} className="text-lesson-card">
              <div className="text-lesson-header">
                <FileText className="text-lesson-icon" />
                <h3 className="text-lesson-title">Lesson Section #{item.order_number || idx + 1}</h3>
                <span className="badge badge-purple">Instructor Material</span>
                {isFaculty && onDelete && (
                  <button
                    type="button"
                    className="btn btn-icon btn-outline btn-sm"
                    style={{ color: 'var(--accent-danger)', borderColor: 'rgba(255,71,87,0.35)' }}
                    onClick={() => onDelete(item)}
                    title="Delete this lesson section"
                  >
                    <Trash2 style={{ width: 14, height: 14 }} />
                  </button>
                )}
              </div>
              <div className="text-lesson-body">
                {item.content?.split('\n\n').map((para, i) => (
                  <p key={i}>{para}</p>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

/* ============================================================
   SECTION 2: PRESENTATION VIEWER (PDF / PPT / PPTX + SLIDES)
   ============================================================ */
function PresentationSection({
  topic,
  contents,
  isFaculty,
  onUploadPresentation,
  onDeletePresentation,
}) {
  // Default interactive slides if none exist yet
  const defaultSlides = [
    {
      title: `${topic?.title} — Slide 1: Introduction`,
      bullets: [
        'Welcome to this interactive presentation module.',
        'Study each concept carefully before taking the topic quiz.',
        'Passing standard is set at 75% to proceed to the next unit.',
      ],
      color: '#7c5cfc',
      insight: 'Foundations determine system scalability.',
    },
    {
      title: 'Slide 2: System Architecture & Workflow',
      bullets: [
        'Client-Server and Microservices patterns.',
        'Data persistence through secure database transactions.',
        'Role-based access control protecting faculty and student records.',
      ],
      color: '#00d4aa',
      insight: 'Security must be designed into the schema from day one.',
    },
    {
      title: 'Slide 3: Best Practices & Practical Tips',
      bullets: [
        'Always normalize database models to prevent redundancy.',
        'Validate inputs client-side and sanitize server-side.',
        'Generate structured PDF and Excel reports for academic compliance.',
      ],
      color: '#ff6b9d',
      insight: 'Clean documentation empowers long-term maintenance.',
    },
    {
      title: 'Slide 4: Key Takeaways & Quiz Readiness',
      bullets: [
        '10-minute maximum countdown timer on the assessment.',
        '75% passing threshold strictly enforced.',
        'Make sure to create custom notes in the Insights tab!',
      ],
      color: '#ffb547',
      insight: 'Review thoroughly before launching the quiz!',
    },
  ]

  // Normalize all available presentation items for this topic
  const uploadedDecks = (contents || []).map((item, idx) => {
    const raw = item.slides
    if (raw && typeof raw === 'object' && !Array.isArray(raw) && raw.isFilePresentation) {
      return {
        id: item.id || `deck-${idx}`,
        rawItem: item,
        type: 'file',
        kind: (raw.kind || 'pdf').toLowerCase(),
        title: raw.title || item.content || raw.fileName || `Presentation #${idx + 1}`,
        fileName: raw.fileName || `${raw.title || 'presentation'}.${raw.kind || 'pdf'}`,
        fileUrl: raw.fileUrl || '',
        fileSize: raw.fileSize || 0,
        uploadedAt: raw.uploadedAt || item.created_at,
        extractedSlides: Array.isArray(raw.extractedSlides) ? raw.extractedSlides : [],
      }
    }
    if (Array.isArray(raw) && raw.length > 0) {
      return {
        id: item.id || `deck-${idx}`,
        rawItem: item,
        type: 'slides',
        kind: 'slides',
        title: item.content || `Slide Deck #${idx + 1}`,
        slides: raw,
      }
    }
    return null
  }).filter(Boolean)

  const allDecks = uploadedDecks

  const [selectedDeckId, setSelectedDeckId] = useState(() => allDecks[0]?.id || null)
  const [pptViewMode, setPptViewMode] = useState('auto') // 'auto' | 'slides' | 'office'
  const [slideIndex, setSlideIndex] = useState(0)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadTitle, setUploadTitle] = useState('')
  const [selectedFile, setSelectedFile] = useState(null)
  const [dragActive, setDragActive] = useState(false)

  const viewerRef = useRef(null)
  const fileInputRef = useRef(null)

  // Keep selectedDeckId synced when a new presentation is uploaded or topic switches
  useEffect(() => {
    const exists = allDecks.some(d => d.id === selectedDeckId)
    if (!exists) {
      setSelectedDeckId(allDecks[0]?.id || null)
    }
  }, [topic?.id, uploadedDecks.length, selectedDeckId])

  const activeDeck = allDecks.find(d => d.id === selectedDeckId) || allDecks[0] || null
  const isPdf = activeDeck?.type === 'file' && activeDeck.kind === 'pdf'
  const isPpt = activeDeck?.type === 'file' && (activeDeck.kind === 'pptx' || activeDeck.kind === 'ppt')
  const isPublicHttpUrl = typeof activeDeck?.fileUrl === 'string' && /^https?:\/\//i.test(activeDeck.fileUrl) && !/localhost|127\.0\.0\.1/i.test(activeDeck.fileUrl)
  const hasExtractedSlides = Array.isArray(activeDeck?.extractedSlides) && activeDeck.extractedSlides.length > 0

  // Determine whether we are currently rendering the interactive slide stage
  const effectivePptMode = (() => {
    if (!isPpt) return null
    if (pptViewMode === 'office' && isPublicHttpUrl) return 'office'
    if (pptViewMode === 'slides' && hasExtractedSlides) return 'slides'
    if (hasExtractedSlides && !isPublicHttpUrl) return 'slides'
    if (isPublicHttpUrl) return 'office'
    if (hasExtractedSlides) return 'slides'
    return 'download'
  })()

  const activeSlides =
    activeDeck?.type === 'slides'
      ? activeDeck.slides
      : (isPpt && effectivePptMode === 'slides' && hasExtractedSlides)
      ? activeDeck.extractedSlides
      : defaultSlides

  const currentSlide = activeSlides[slideIndex] || activeSlides[0]

  // Reset slide index when switching decks
  useEffect(() => {
    setSlideIndex(0)
  }, [activeDeck?.id, effectivePptMode])

  // Keep slide index valid if the deck changes
  useEffect(() => {
    if (slideIndex > activeSlides.length - 1) setSlideIndex(0)
  }, [activeSlides.length, slideIndex])

  // Arrow-key navigation when viewing interactive slides
  useEffect(() => {
    const onKey = (e) => {
      const tag = e.target?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      if (e.key === 'ArrowRight') setSlideIndex(i => Math.min(i + 1, activeSlides.length - 1))
      if (e.key === 'ArrowLeft') setSlideIndex(i => Math.max(i - 1, 0))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [activeSlides.length])

  // Stay in sync when the user leaves fullscreen with Esc
  useEffect(() => {
    const onFsChange = () => {
      if (!document.fullscreenElement) setIsFullscreen(false)
    }
    document.addEventListener('fullscreenchange', onFsChange)
    return () => document.removeEventListener('fullscreenchange', onFsChange)
  }, [])

  const nextSlide = () => {
    if (slideIndex < activeSlides.length - 1) setSlideIndex(prev => prev + 1)
  }

  const prevSlide = () => {
    if (slideIndex > 0) setSlideIndex(prev => prev - 1)
  }

  const toggleFullscreen = () => {
    if (!isFullscreen) {
      if (viewerRef.current?.requestFullscreen) {
        viewerRef.current.requestFullscreen()
      }
      setIsFullscreen(true)
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen()
      }
      setIsFullscreen(false)
    }
  }

  const handlePickFile = (file) => {
    if (!file) return
    setSelectedFile(file)
    if (!uploadTitle.trim()) {
      setUploadTitle(file.name.replace(/\.[^.]+$/, ''))
    }
  }

  const handleUploadSubmit = async (e) => {
    e.preventDefault()
    if (!selectedFile || !onUploadPresentation) return
    setUploading(true)
    const res = await onUploadPresentation(selectedFile, uploadTitle)
    setUploading(false)
    if (res?.data) {
      setSelectedDeckId(res.data.id)
      setSelectedFile(null)
      setUploadTitle('')
      setShowUploadModal(false)
    }
  }

  return (
    <div className="section-card">
      <div className="flex items-center justify-between mb-16" style={{ flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 className="section-title">Topic Presentation Deck</h2>
          <p className="section-subtitle">
            {isPdf
              ? `Viewing uploaded PDF presentation for ${topic?.title}.`
              : isPpt
              ? `Viewing uploaded PowerPoint (${activeDeck.kind.toUpperCase()}) presentation for ${topic?.title}.`
              : `Interactive slides for ${topic?.title}. Use arrow keys or on-screen buttons to navigate.`}
          </p>
        </div>

        <div className="flex items-center gap-8" style={{ flexWrap: 'wrap' }}>
          {isFaculty && (
            <button
              type="button"
              className="btn btn-gradient btn-sm flex items-center gap-6"
              onClick={() => setShowUploadModal(true)}
              id="btn-upload-topic-presentation"
            >
              <Upload style={{ width: 15, height: 15 }} />
              Upload PDF / PPT
            </button>
          )}

          {activeDeck?.type === 'file' && activeDeck.fileUrl && (
            <>
              <a
                href={activeDeck.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-outline btn-sm flex items-center gap-6"
                title="Open file in a new browser tab"
              >
                <ExternalLink style={{ width: 14, height: 14 }} />
                Open
              </a>
              <a
                href={activeDeck.fileUrl}
                download={activeDeck.fileName}
                className="btn btn-outline btn-sm flex items-center gap-6"
                title="Download presentation file"
              >
                <Download style={{ width: 14, height: 14 }} />
                Download {activeDeck.kind.toUpperCase()}
              </a>
            </>
          )}

          {isFaculty && activeDeck && !activeDeck.isDefault && activeDeck.rawItem && onDeletePresentation && (
            <button
              type="button"
              className="btn btn-icon btn-outline btn-sm"
              style={{ color: 'var(--accent-danger)', borderColor: 'rgba(255,71,87,0.35)' }}
              onClick={() => onDeletePresentation(activeDeck.rawItem)}
              title="Delete this uploaded presentation"
            >
              <Trash2 style={{ width: 15, height: 15 }} />
            </button>
          )}

          {activeDeck && (!isPdf && (!isPpt || effectivePptMode === 'slides')) && (
            <span className="badge badge-purple">
              Slide {slideIndex + 1} of {activeSlides.length}
            </span>
          )}

          {activeDeck && (
            <button
              className="btn btn-icon btn-outline btn-sm"
              onClick={toggleFullscreen}
              title="Toggle Fullscreen"
            >
              {isFullscreen ? <Minimize2 style={{ width: 16, height: 16 }} /> : <Maximize2 style={{ width: 16, height: 16 }} />}
            </button>
          )}
        </div>
      </div>

      {/* Presentation Deck Selector Bar (shown whenever faculty uploaded PDF/PPT decks exist) */}
      {uploadedDecks.length > 0 && (
        <div className="presentation-deck-switcher mb-16">
          <div className="presentation-deck-pills">
            {allDecks.map((deck) => {
              const active = deck.id === activeDeck?.id
              const badgeLabel =
                deck.kind === 'pdf'
                  ? 'PDF'
                  : deck.kind === 'pptx' || deck.kind === 'ppt'
                  ? deck.kind.toUpperCase()
                  : 'SLIDES'
              return (
                <button
                  type="button"
                  key={deck.id}
                  className={`presentation-deck-pill ${active ? 'active' : ''}`}
                  onClick={() => setSelectedDeckId(deck.id)}
                >
                  <span className={`deck-kind-tag kind-${deck.kind}`}>{badgeLabel}</span>
                  <span className="deck-pill-title">{deck.title}</span>
                  {deck.fileSize ? (
                    <span className="deck-pill-meta">({formatFileSize(deck.fileSize)})</span>
                  ) : null}
                </button>
              )
            })}
          </div>

          {isPpt && hasExtractedSlides && isPublicHttpUrl && (
            <div className="presentation-mode-toggle">
              <button
                type="button"
                className={`mode-btn ${effectivePptMode === 'office' ? 'active' : ''}`}
                onClick={() => setPptViewMode('office')}
              >
                Office Viewer
              </button>
              <button
                type="button"
                className={`mode-btn ${effectivePptMode === 'slides' ? 'active' : ''}`}
                onClick={() => setPptViewMode('slides')}
              >
                Interactive Slides ({activeDeck.extractedSlides.length})
              </button>
            </div>
          )}
        </div>
      )}

      {/* Main Presentation Viewport */}
      {!activeDeck ? (
        <div className="empty-state-mini" style={{ padding: '48px 24px' }}>
          <PresentationIcon style={{ width: 40, height: 40, color: 'var(--text-muted)', marginBottom: 10 }} />
          <p style={{ fontWeight: 600, fontSize: 15, color: 'var(--text-primary)', marginBottom: 4 }}>
            No Presentation Uploaded Yet
          </p>
          <p style={{ fontSize: 13, maxWidth: 460, margin: '0 auto' }}>
            {isFaculty
              ? 'Click "Upload PDF / PPT" above to upload a PDF or PowerPoint presentation for this topic.'
              : 'Your instructor has not uploaded a presentation for this topic yet.'}
          </p>
        </div>
      ) : isPdf ? (
        <div
          ref={viewerRef}
          className={`presentation-doc-viewport ${isFullscreen ? 'fullscreen-mode' : ''}`}
        >
          <div className="presentation-doc-toolbar">
            <div className="flex items-center gap-8">
              <span className="deck-kind-tag kind-pdf">PDF</span>
              <strong>{activeDeck.title}</strong>
              {activeDeck.fileSize > 0 && (
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  · {formatFileSize(activeDeck.fileSize)}
                </span>
              )}
            </div>
            <div className="flex items-center gap-8">
              <a
                href={activeDeck.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-outline btn-sm flex items-center gap-6"
              >
                <ExternalLink style={{ width: 14, height: 14 }} />
                New Tab
              </a>
              <button
                type="button"
                className="btn btn-outline btn-sm flex items-center gap-6"
                onClick={toggleFullscreen}
              >
                {isFullscreen ? <Minimize2 style={{ width: 14, height: 14 }} /> : <Maximize2 style={{ width: 14, height: 14 }} />}
                {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
              </button>
            </div>
          </div>
          <iframe
            src={activeDeck.fileUrl}
            title={activeDeck.title}
            className="presentation-doc-frame"
          />
        </div>
      ) : isPpt && effectivePptMode === 'office' ? (
        <div
          ref={viewerRef}
          className={`presentation-doc-viewport ${isFullscreen ? 'fullscreen-mode' : ''}`}
        >
          <div className="presentation-doc-toolbar">
            <div className="flex items-center gap-8">
              <span className="deck-kind-tag kind-pptx">{activeDeck.kind.toUpperCase()}</span>
              <strong>{activeDeck.title}</strong>
              {activeDeck.fileSize > 0 && (
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  · {formatFileSize(activeDeck.fileSize)}
                </span>
              )}
            </div>
            <div className="flex items-center gap-8">
              {hasExtractedSlides && (
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={() => setPptViewMode('slides')}
                >
                  Switch to Interactive Slides
                </button>
              )}
              <a
                href={activeDeck.fileUrl}
                download={activeDeck.fileName}
                className="btn btn-outline btn-sm flex items-center gap-6"
              >
                <Download style={{ width: 14, height: 14 }} />
                Download
              </a>
            </div>
          </div>
          <iframe
            src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(activeDeck.fileUrl)}`}
            title={activeDeck.title}
            className="presentation-doc-frame"
            allowFullScreen
          />
        </div>
      ) : isPpt && effectivePptMode === 'download' ? (
        <div
          ref={viewerRef}
          className={`presentation-doc-viewport presentation-doc-fallback ${isFullscreen ? 'fullscreen-mode' : ''}`}
        >
          <PresentationIcon style={{ width: 48, height: 48, color: 'var(--accent-primary)', marginBottom: 12 }} />
          <span className="deck-kind-tag kind-pptx" style={{ marginBottom: 8 }}>
            {activeDeck.kind.toUpperCase()} PRESENTATION
          </span>
          <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 6 }}>{activeDeck.title}</h3>
          <p style={{ color: 'var(--text-secondary)', maxWidth: 460, marginBottom: 20, fontSize: 14 }}>
            This PowerPoint file ({activeDeck.fileName}
            {activeDeck.fileSize ? `, ${formatFileSize(activeDeck.fileSize)}` : ''}) is ready for this topic.
            Download or open the file below to view all slides and animations.
          </p>
          <div className="flex items-center gap-12">
            <a
              href={activeDeck.fileUrl}
              download={activeDeck.fileName}
              className="btn btn-gradient flex items-center gap-8"
            >
              <Download style={{ width: 16, height: 16 }} />
              Download {activeDeck.fileName}
            </a>
          </div>
        </div>
      ) : (
        <div
          ref={viewerRef}
          className={`interactive-slide-viewport ${isFullscreen ? 'fullscreen-mode' : ''}`}
          style={{
            background: `linear-gradient(145deg, #12131c, ${currentSlide.color || '#7c5cfc'}22)`,
            borderColor: `${currentSlide.color || '#7c5cfc'}44`,
          }}
        >
          <div className="slide-content-stage">
            <div className="slide-badge-top" style={{ color: currentSlide.color || '#7c5cfc' }}>
              <span>
                {isPpt ? `${activeDeck.title.toUpperCase()} · ` : ''}TOPIC SLIDE {slideIndex + 1}
              </span>
            </div>

            <h1 className="slide-main-title">{currentSlide.title}</h1>

            <ul className="slide-bullet-list">
              {currentSlide.bullets?.map((bullet, i) => (
                <li key={i} className="slide-bullet-item">
                  <span className="slide-bullet-dot" style={{ backgroundColor: currentSlide.color || '#7c5cfc' }} />
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>

            {currentSlide.insight && (
              <div className="slide-insight-box">
                <Sparkles style={{ width: 18, height: 18, color: currentSlide.color || '#7c5cfc', flexShrink: 0 }} />
                <div>
                  <strong>Key Insight:</strong> {currentSlide.insight}
                </div>
              </div>
            )}
          </div>

          {/* Slide Controls Footer */}
          <div className="slide-footer-bar">
            <button
              className="slide-nav-pill"
              onClick={prevSlide}
              disabled={slideIndex === 0}
              id="btn-slide-prev"
            >
              <ChevronLeft style={{ width: 18, height: 18 }} />
              Previous
            </button>

            <div className="slide-dots">
              {activeSlides.map((_, i) => (
                <button
                  key={i}
                  className={`slide-dot ${i === slideIndex ? 'active' : ''}`}
                  onClick={() => setSlideIndex(i)}
                  style={{
                    backgroundColor: i === slideIndex ? (currentSlide.color || '#7c5cfc') : 'rgba(255,255,255,0.2)',
                  }}
                />
              ))}
            </div>

            <button
              className="slide-nav-pill"
              onClick={nextSlide}
              disabled={slideIndex === activeSlides.length - 1}
              id="btn-slide-next"
            >
              Next
              <ChevronRight style={{ width: 18, height: 18 }} />
            </button>
          </div>
        </div>
      )}

      {/* Faculty Modal: Upload PDF or PPT/PPTX Presentation */}
      {showUploadModal && (
        <div className="modal-overlay" onClick={() => !uploading && setShowUploadModal(false)}>
          <div className="modal-card" style={{ maxWidth: 520 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title flex items-center gap-8">
                <FileUp style={{ width: 20, height: 20, color: 'var(--accent-primary)' }} />
                Upload Topic Presentation (PDF / PPT)
              </h3>
              <button
                type="button"
                className="btn btn-icon btn-outline btn-sm"
                onClick={() => !uploading && setShowUploadModal(false)}
              >
                <X style={{ width: 16, height: 16 }} />
              </button>
            </div>

            <form onSubmit={handleUploadSubmit}>
              <div className="modal-body">
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>
                  Upload a <strong>PDF (.pdf)</strong> or <strong>PowerPoint (.pptx, .ppt)</strong> presentation for{' '}
                  <strong>{topic?.title}</strong>. Students will be able to view and download it directly in this topic.
                </p>

                <div className="form-group mb-16">
                  <label className="form-label">Presentation Title</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Lecture 1 — Introduction & Architecture"
                    value={uploadTitle}
                    onChange={e => setUploadTitle(e.target.value)}
                  />
                </div>

                <div className="form-group mb-16">
                  <label className="form-label">Presentation File (.pdf, .pptx, .ppt · up to 50 MB)</label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.ppt,.pptx,application/pdf,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation"
                    style={{ display: 'none' }}
                    onChange={e => handlePickFile(e.target.files?.[0])}
                  />

                  <div
                    className={`presentation-upload-dropzone ${dragActive ? 'drag-active' : ''} ${selectedFile ? 'has-file' : ''}`}
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={(e) => { e.preventDefault(); setDragActive(true) }}
                    onDragLeave={() => setDragActive(false)}
                    onDrop={(e) => {
                      e.preventDefault()
                      setDragActive(false)
                      handlePickFile(e.dataTransfer?.files?.[0])
                    }}
                  >
                    <Upload style={{ width: 28, height: 28, color: 'var(--accent-primary)', marginBottom: 8 }} />
                    {selectedFile ? (
                      <>
                        <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)' }}>
                          {selectedFile.name}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
                          {formatFileSize(selectedFile.size)} · Click to choose a different file
                        </div>
                      </>
                    ) : (
                      <>
                        <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)' }}>
                          Click to browse or drag & drop your presentation here
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                          Supports PDF (.pdf) and PowerPoint (.pptx, .ppt) up to 50 MB
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="modal-footer flex justify-end gap-10">
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setShowUploadModal(false)}
                  disabled={uploading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-gradient flex items-center gap-8"
                  disabled={!selectedFile || uploading}
                  id="btn-confirm-upload-presentation"
                >
                  <Upload style={{ width: 16, height: 16 }} />
                  {uploading ? 'Uploading & Processing...' : 'Upload Presentation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

/* ============================================================
   SECTION 3: MAKE YOUR OWN SLIDES / INSIGHTS
   ============================================================ */
function InsightsSection({ topic, contents, onSaveInsight }) {
  const [title, setTitle] = useState('')
  const [notes, setNotes] = useState('')
  const [theme, setTheme] = useState('purple') // 'purple' | 'cyan' | 'pink' | 'amber' | 'emerald'
  const [saving, setSaving] = useState(false)

  const themeColors = {
    purple: { name: 'Neon Purple', color: '#7c5cfc', bg: 'rgba(124, 92, 252, 0.15)', border: 'rgba(124, 92, 252, 0.4)' },
    cyan: { name: 'Ocean Cyan', color: '#00d4aa', bg: 'rgba(0, 212, 170, 0.15)', border: 'rgba(0, 212, 170, 0.4)' },
    pink: { name: 'Sunset Pink', color: '#ff6b9d', bg: 'rgba(255, 107, 157, 0.15)', border: 'rgba(255, 107, 157, 0.4)' },
    amber: { name: 'Amber Gold', color: '#ffb547', bg: 'rgba(255, 181, 71, 0.15)', border: 'rgba(255, 181, 71, 0.4)' },
    emerald: { name: 'Emerald Green', color: '#10b981', bg: 'rgba(16, 185, 129, 0.15)', border: 'rgba(16, 185, 129, 0.4)' },
  }

  const handleSave = async (e) => {
    e.preventDefault()
    if (!title.trim() || !notes.trim()) return
    setSaving(true)
    await onSaveInsight(title.trim(), notes.trim(), theme)
    setTitle('')
    setNotes('')
    setSaving(false)
  }

  // Flatten saved slides/insights
  const savedInsights = contents.flatMap((c) => {
    if (c.slides && Array.isArray(c.slides)) return c.slides
    return [{ title: 'Note', notes: c.content, theme: 'purple', date: 'Recent' }]
  })

  return (
    <div className="section-card">
      <div className="mb-24">
        <h2 className="section-title">Make Your Own Slides & Insights</h2>
        <p className="section-subtitle">
          Create customized slides, formulas, study reflections, and insights inside the app. Saved directly to your database profile!
        </p>
      </div>

      <div className="grid-2-custom">
        {/* Creator Form */}
        <form className="slide-creator-panel" onSubmit={handleSave}>
          <h3 className="panel-title flex items-center gap-8">
            <Edit3 style={{ width: 18, height: 18, color: 'var(--accent-primary)' }} />
            New Custom Slide / Insight
          </h3>

          <div className="form-group mb-16">
            <label className="form-label">Slide / Insight Title</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. My takeaway on relational database joins..."
              value={title}
              onChange={e => setTitle(e.target.value)}
              id="input-insight-title"
              required
            />
          </div>

          <div className="form-group mb-16">
            <label className="form-label">Theme Color & Card Style</label>
            <div className="theme-picker-row">
              {Object.entries(themeColors).map(([key, val]) => (
                <button
                  type="button"
                  key={key}
                  className={`theme-chip-btn ${theme === key ? 'active' : ''}`}
                  onClick={() => setTheme(key)}
                  style={{ borderColor: val.color }}
                >
                  <span className="theme-color-dot" style={{ backgroundColor: val.color }} />
                  {val.name}
                </button>
              ))}
            </div>
          </div>

          <div className="form-group mb-20">
            <label className="form-label">Notes, Bullet Points & Insights</label>
            <textarea
              className="form-textarea"
              rows={5}
              placeholder="Write your explanation, bullet points, memory aids, or code snippets..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
              id="input-insight-notes"
              required
            />
          </div>

          <button
            type="submit"
            className="btn btn-gradient w-full flex items-center justify-center gap-8"
            disabled={!title.trim() || !notes.trim() || saving}
            id="btn-save-insight"
          >
            <Save style={{ width: 16, height: 16 }} />
            {saving ? 'Saving to Database...' : 'Save Slide & Insight'}
          </button>
        </form>

        {/* Live Card Preview */}
        <div className="slide-preview-panel">
          <h3 className="panel-title flex items-center gap-8">
            <Sparkles style={{ width: 18, height: 18, color: themeColors[theme].color }} />
            Live Preview
          </h3>

          <div
            className="custom-insight-card live-preview"
            style={{
              background: `linear-gradient(145deg, var(--bg-card), ${themeColors[theme].bg})`,
              borderColor: themeColors[theme].border,
            }}
          >
            <div className="insight-card-badge" style={{ color: themeColors[theme].color }}>
              CUSTOM SLIDE CARD · TOPIC #{topic?.order_number}
            </div>
            <h4 className="insight-card-title">{title || 'Your Slide Title Here'}</h4>
            <div className="insight-card-body">
              {notes ? (
                notes.split('\n').map((line, i) => <p key={i}>{line || '\u00A0'}</p>)
              ) : (
                <p style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>
                  Type your notes above to see a real-time card preview here...
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Saved Insights Gallery */}
      <div className="mt-32">
        <h3 className="section-subheading mb-16 flex items-center gap-8">
          <Layers style={{ width: 18, height: 18, color: 'var(--accent-secondary)' }} />
          Your Saved Slides & Insights ({savedInsights.length})
        </h3>

        {savedInsights.length === 0 ? (
          <div className="empty-state-mini">
            <Sparkles style={{ width: 32, height: 32, color: 'var(--text-muted)' }} />
            <p>No custom slides created yet. Use the form above to add your first insight!</p>
          </div>
        ) : (
          <div className="insights-grid">
            {savedInsights.map((ins, i) => {
              const th = themeColors[ins.theme] || themeColors.purple
              return (
                <div
                  key={i}
                  className="custom-insight-card"
                  style={{
                    background: `linear-gradient(145deg, var(--bg-card), ${th.bg})`,
                    borderColor: th.border,
                  }}
                >
                  <div className="insight-card-badge" style={{ color: th.color }}>
                    SLIDE #{i + 1}
                  </div>
                  <h4 className="insight-card-title">{ins.title}</h4>
                  <div className="insight-card-body">
                    {ins.notes?.split('\n').map((l, idx) => (
                      <p key={idx}>{l}</p>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

/* ============================================================
   SECTION 4: TOPIC SUMMARY
   ============================================================ */
function SummarySection({ topic, textContents = [], presentationContents = [], quizzes = [], onProceedToQuiz }) {
  const hasQuiz = quizzes.length > 0 && quizzes[0]?.quiz_questions?.length > 0

  return (
    <div className="section-card">
      <div className="mb-24">
        <h2 className="section-title">Topic Summary & Key Review</h2>
        <p className="section-subtitle">
          Overview of the faculty-uploaded materials and assessment details for {topic?.title}.
        </p>
      </div>

      {topic?.summary ? (
        <div className="text-lesson-card mb-24">
          <div className="text-lesson-header">
            <BookOpen className="text-lesson-icon" />
            <h3 className="text-lesson-title">{topic.title} — Instructor Summary</h3>
            <span className="badge badge-purple">Topic Overview</span>
          </div>
          <div className="text-lesson-body">
            {topic.summary.split('\n\n').map((para, i) => (
              <p key={i}>{para}</p>
            ))}
          </div>
        </div>
      ) : (
        <div className="empty-state-mini mb-24">
          <BookOpen style={{ width: 28, height: 28, color: 'var(--text-muted)', marginBottom: 6 }} />
          <p>No additional summary description was provided by the instructor for this topic.</p>
        </div>
      )}

      <div className="summary-cards-grid">
        <div className="summary-point-card">
          <div className="summary-icon-box purple">{textContents.length}</div>
          <div>
            <h4>Lesson Text Sections</h4>
            <p>
              {textContents.length > 0
                ? `${textContents.length} reading section(s) uploaded by your instructor.`
                : 'No reading text uploaded for this topic yet.'}
            </p>
          </div>
        </div>

        <div className="summary-point-card">
          <div className="summary-icon-box cyan">{presentationContents.length}</div>
          <div>
            <h4>Uploaded Presentations</h4>
            <p>
              {presentationContents.length > 0
                ? `${presentationContents.length} presentation deck(s) (PDF / PPT) available in the Presentation tab.`
                : 'No PDF or PPT presentation uploaded for this topic yet.'}
            </p>
          </div>
        </div>

        <div className="summary-point-card">
          <div className="summary-icon-box amber">{hasQuiz ? quizzes[0].quiz_questions.length : 0}</div>
          <div>
            <h4>Topic Assessment</h4>
            <p>
              {hasQuiz
                ? `${quizzes[0].quiz_questions.length} question(s) · ${quizzes[0].time_limit_minutes || 10} mins · ${quizzes[0].passing_score || 75}% required to pass.`
                : 'Your instructor has not uploaded a quiz for this topic yet.'}
            </p>
          </div>
        </div>
      </div>

      {hasQuiz && (
        <div className="summary-cta-box mt-32">
          <div>
            <h3>Ready to test your knowledge?</h3>
            <p>
              The {quizzes[0].time_limit_minutes || 10}-minute countdown starts as soon as you launch the quiz.
            </p>
          </div>
          <button
            className="btn btn-gradient btn-lg flex items-center gap-8"
            onClick={onProceedToQuiz}
            id="btn-summary-to-quiz"
          >
            <Play style={{ width: 18, height: 18 }} />
            Launch Topic Quiz
          </button>
        </div>
      )}
    </div>
  )
}

/* ============================================================
   SECTION 5: QUIZ RUNNER & FACULTY UPLOAD
   ============================================================ */
function QuizSection({
  topic,
  quizzes,
  isFaculty,
  onOpenCreateModal,
  onSubmitResult,
  onRefresh,
  onBackToTOC,
}) {
  const activeQuiz = (quizzes && quizzes.length > 0) ? quizzes[0] : null
  const questions = (activeQuiz?.quiz_questions && activeQuiz.quiz_questions.length > 0)
    ? activeQuiz.quiz_questions
    : []

  // Quiz running state
  const [quizStarted, setQuizStarted] = useState(false)
  const [currentQIndex, setCurrentQIndex] = useState(0)
  const [answers, setAnswers] = useState({})
  const [timeLeft, setTimeLeft] = useState(10 * 60) // 10 minutes in seconds
  const [submitted, setSubmitted] = useState(false)
  const [resultData, setResultData] = useState(null)
  const timerRef = useRef(null)
  const answersRef = useRef({})
  const handleSubmitRef = useRef(null)

  answersRef.current = answers

  // Start Quiz
  const handleStartQuiz = () => {
    if (!activeQuiz || questions.length === 0) return
    setQuizStarted(true)
    setCurrentQIndex(0)
    setAnswers({})
    answersRef.current = {}
    setSubmitted(false)
    setResultData(null)
    const limitMinutes = activeQuiz.time_limit_minutes || 10
    setTimeLeft(limitMinutes * 60)
  }

  const handleSubmitQuiz = async (auto = false) => {
    if (!activeQuiz) return
    if (timerRef.current) clearInterval(timerRef.current)
    const currentAnswers = answersRef.current || {}
    let score = 0
    questions.forEach((q, idx) => {
      const selected = currentAnswers[idx]
      const correct = q.correct_answer !== undefined ? q.correct_answer : q.correctAnswer
      if (selected === correct) {
        score++
      }
    })

    const total = questions.length
    const percentage = total > 0 ? Math.round((score / total) * 100) : 0
    const passingThreshold = activeQuiz.passing_score || 75
    const passed = percentage >= passingThreshold

    setResultData({
      score,
      total,
      percentage,
      passed,
      passingThreshold,
      answers: currentAnswers,
      autoSubmitted: auto,
    })
    setSubmitted(true)

    // Save result to database
    await onSubmitResult(activeQuiz.id, score, total, percentage, passed, currentAnswers)
  }

  handleSubmitRef.current = handleSubmitQuiz

  // Timer countdown
  useEffect(() => {
    if (!quizStarted || submitted) return

    timerRef.current = setInterval(() => {
      setTimeLeft(prev => (prev > 0 ? prev - 1 : 0))
    }, 1000)

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [quizStarted, submitted])

  // Auto-submit exactly once when the countdown reaches zero (kept out of the state
  // updater so StrictMode's double-invocation can't submit twice)
  useEffect(() => {
    if (quizStarted && !submitted && timeLeft === 0) {
      handleSubmitRef.current?.(true)
    }
  }, [timeLeft, quizStarted, submitted])

  const formatTimer = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const selectOption = (qIndex, optionIndex) => {
    if (submitted) return
    setAnswers(prev => ({ ...prev, [qIndex]: optionIndex }))
  }

  return (
    <div className="section-card">
      {/* Quiz Top Action Bar */}
      <div className="flex items-center justify-between mb-24" style={{ flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 className="section-title">{activeQuiz ? activeQuiz.title : `${topic?.title || 'Topic'} Quiz`}</h2>
          <p className="section-subtitle">
            {activeQuiz && questions.length > 0 ? (
              <>
                Time Limit: <strong>{activeQuiz.time_limit_minutes || 10} Minutes</strong> · Items: <strong>{questions.length}</strong> · Passing Score: <strong>{activeQuiz.passing_score || 75}%</strong>
              </>
            ) : (
              'Topic assessment and quiz evaluation.'
            )}
          </p>
        </div>

        {isFaculty && (
          <button
            className="btn btn-outline btn-sm flex items-center gap-6"
            onClick={onOpenCreateModal}
            id="btn-faculty-upload-quiz"
          >
            <Plus style={{ width: 16, height: 16 }} />
            Faculty Quiz Upload
          </button>
        )}
      </div>

      {/* State 0: No Quiz Uploaded by Faculty Yet */}
      {(!activeQuiz || questions.length === 0) && (
        <div className="empty-state-mini" style={{ padding: '48px 24px' }}>
          <Award style={{ width: 40, height: 40, color: 'var(--text-muted)', marginBottom: 10 }} />
          <p style={{ fontWeight: 600, fontSize: 15, color: 'var(--text-primary)', marginBottom: 4 }}>
            No Quiz Uploaded Yet
          </p>
          <p style={{ fontSize: 13, maxWidth: 460, margin: '0 auto' }}>
            {isFaculty
              ? 'Click "Faculty Quiz Upload" above to create and publish the quiz for this topic.'
              : 'Your instructor has not uploaded a quiz for this topic yet.'}
          </p>
        </div>
      )}

      {/* State A: Before Starting */}
      {activeQuiz && questions.length > 0 && !quizStarted && !submitted && (
        <div className="quiz-start-card">
          <div className="quiz-start-icon">
            <Award style={{ width: 44, height: 44, color: 'var(--accent-primary)' }} />
          </div>
          <h3>Topic Assessment: {topic?.title}</h3>
          <p>
            You are about to start a 10-minute quiz consisting of {questions.length} items.
            According to academic rules, a score of <strong>75% or higher is strictly required</strong> to pass and unlock subsequent topics.
          </p>

          <div className="quiz-rules-row">
            <div className="quiz-rule-pill">
              <Clock style={{ width: 16, height: 16, color: 'var(--accent-warning)' }} />
              10 Minutes Timer
            </div>
            <div className="quiz-rule-pill">
              <HelpCircle style={{ width: 16, height: 16, color: 'var(--accent-primary)' }} />
              {questions.length} Questions (Max 50)
            </div>
            <div className="quiz-rule-pill">
              <Award style={{ width: 16, height: 16, color: 'var(--accent-secondary)' }} />
              75% Passing Standard
            </div>
          </div>

          <button
            className="btn btn-gradient btn-lg flex items-center gap-8 mt-24"
            onClick={handleStartQuiz}
            id="btn-begin-quiz-attempt"
          >
            <Play style={{ width: 18, height: 18 }} />
            Begin Quiz Now
          </button>
        </div>
      )}

      {/* State B: Taking Quiz with 10-Min Timer */}
      {quizStarted && !submitted && (
        <div className="quiz-active-wrapper">
          {/* Timer & Progress Bar */}
          <div className="quiz-live-header">
            <div className="quiz-q-indicator">
              Question {currentQIndex + 1} of {questions.length}
            </div>

            <div className={`quiz-timer-badge ${timeLeft < 60 ? 'timer-danger' : ''}`}>
              <Clock style={{ width: 18, height: 18 }} />
              <span>{formatTimer(timeLeft)}</span>
              {timeLeft < 60 && <span className="timer-warning-text">Time low!</span>}
            </div>
          </div>

          <div className="quiz-progress-bar-bg">
            <div
              className="quiz-progress-bar-fill"
              style={{ width: `${((currentQIndex + 1) / questions.length) * 100}%` }}
            />
          </div>

          {/* Question Navigator Bubbles */}
          <div className="quiz-bubbles-row">
            {questions.map((_, idx) => (
              <button
                key={idx}
                className={`bubble-btn ${idx === currentQIndex ? 'current' : ''} ${answers[idx] !== undefined ? 'answered' : ''}`}
                onClick={() => setCurrentQIndex(idx)}
              >
                {idx + 1}
              </button>
            ))}
          </div>

          {/* Active Question Box */}
          <div className="question-display-card">
            <div className="question-number-tag">Question #{currentQIndex + 1}</div>
            <h3 className="question-text">{questions[currentQIndex]?.question}</h3>

            <div className="options-stack">
              {questions[currentQIndex]?.options?.map((opt, optIdx) => {
                const isSelected = answers[currentQIndex] === optIdx
                return (
                  <button
                    key={optIdx}
                    className={`option-choice-btn ${isSelected ? 'selected' : ''}`}
                    onClick={() => selectOption(currentQIndex, optIdx)}
                    id={`opt-${currentQIndex}-${optIdx}`}
                  >
                    <span className="option-letter">{String.fromCharCode(65 + optIdx)}</span>
                    <span className="option-label">{opt}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Navigation Controls */}
          <div className="quiz-controls-row">
            <button
              className="btn btn-outline"
              disabled={currentQIndex === 0}
              onClick={() => setCurrentQIndex(prev => prev - 1)}
            >
              <ChevronLeft style={{ width: 16, height: 16 }} />
              Previous
            </button>

            {currentQIndex < questions.length - 1 ? (
              <button
                className="btn btn-outline"
                onClick={() => setCurrentQIndex(prev => prev + 1)}
              >
                Next
                <ChevronRight style={{ width: 16, height: 16 }} />
              </button>
            ) : (
              <button
                className="btn btn-gradient flex items-center gap-8"
                onClick={() => handleSubmitQuiz(false)}
                id="btn-submit-quiz"
              >
                <CheckCircle2 style={{ width: 16, height: 16 }} />
                Submit Quiz for Grading
              </button>
            )}
          </div>
        </div>
      )}

      {/* State C: Submitted / Score Result */}
      {submitted && resultData && (
        <div className="quiz-result-view">
          <div className={`result-banner ${resultData.passed ? 'passed' : 'failed'}`}>
            <div className="result-banner-icon">
              {resultData.passed ? (
                <CheckCircle2 style={{ width: 48, height: 48, color: '#00d4aa' }} />
              ) : (
                <XCircle style={{ width: 48, height: 48, color: '#ff4757' }} />
              )}
            </div>

            <h2 className="result-banner-title">
              {resultData.passed ? '🎉 Congratulations! You Passed!' : 'Assessment Not Passed'}
            </h2>

            <div className="result-score-highlight">
              <span className="score-num">{resultData.score}</span>
              <span className="score-divider">/</span>
              <span className="score-total">{resultData.total}</span>
              <span className="score-pct">({resultData.percentage}%)</span>
            </div>

            <p className="result-banner-text">
              {resultData.passed ? (
                <>
                  Passing score of 75% met. <strong>System has unlocked subsequent topics</strong> in your Table of Contents!
                </>
              ) : (
                <>
                  You scored {resultData.percentage}%. The passing threshold is <strong>75%</strong>. You <strong>cannot proceed to the next topic</strong> until this quiz is passed. Please review the lesson notes and retake the quiz.
                </>
              )}
            </p>

            <div className="result-actions-row">
              <button
                className="btn btn-gradient flex items-center gap-8"
                onClick={onBackToTOC}
                id="btn-result-return-toc"
              >
                <ArrowLeft style={{ width: 16, height: 16 }} />
                Return to Table of Contents
              </button>

              <button
                className="btn btn-outline flex items-center gap-8"
                onClick={handleStartQuiz}
                id="btn-retake-quiz"
              >
                <RotateCcw style={{ width: 16, height: 16 }} />
                Retake Assessment
              </button>
            </div>
          </div>

          {/* Question Review Section */}
          <div className="quiz-review-section mt-32">
            <h3 className="section-subheading mb-16">Review Your Answers</h3>
            <div className="review-cards-stack">
              {questions.map((q, idx) => {
                const selected = resultData.answers[idx]
                const correct = q.correct_answer !== undefined ? q.correct_answer : q.correctAnswer
                const isCorrect = selected === correct

                return (
                  <div key={idx} className={`review-card ${isCorrect ? 'correct' : 'incorrect'}`}>
                    <div className="review-card-header">
                      <span className="review-q-num">Q{idx + 1}</span>
                      <span className="review-q-title">{q.question}</span>
                      {isCorrect ? (
                        <span className="badge badge-green flex items-center gap-4">
                          <CheckCircle2 style={{ width: 12, height: 12 }} /> Correct
                        </span>
                      ) : (
                        <span className="badge badge-danger flex items-center gap-4">
                          <XCircle style={{ width: 12, height: 12 }} /> Incorrect
                        </span>
                      )}
                    </div>

                    <div className="review-options-list">
                      {q.options?.map((opt, oIdx) => {
                        const isThisSelected = selected === oIdx
                        const isThisCorrect = correct === oIdx

                        let optClass = 'review-opt'
                        if (isThisCorrect) optClass += ' correct-answer'
                        else if (isThisSelected && !isCorrect) optClass += ' wrong-selection'

                        return (
                          <div key={oIdx} className={optClass}>
                            <span className="opt-marker">
                              {isThisCorrect ? '✓' : isThisSelected ? '✗' : '·'}
                            </span>
                            <span>{opt}</span>
                            {isThisCorrect && <span className="opt-badge-correct">Correct Answer</span>}
                            {isThisSelected && !isCorrect && <span className="opt-badge-wrong">Your Answer</span>}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/* ============================================================
   MODAL 1: INSERT TEXT NOTE
   ============================================================ */
function InsertTextModal({ topicId, nextOrder, onClose, onSave }) {
  const [content, setContent] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!content.trim()) return
    setSaving(true)
    await onSave(content.trim())
    setSaving(false)
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Insert Text / Lesson Material</h2>
          <button className="btn btn-icon btn-outline" onClick={onClose}><X /></button>
        </div>
        <div className="modal-body">
          <div className="form-group">
            <label className="form-label">Lesson Content / Notes</label>
            <textarea
              className="form-textarea"
              rows={8}
              placeholder="Type lesson content, instructions, or notes here..."
              value={content}
              onChange={e => setContent(e.target.value)}
              id="input-insert-text-content"
              autoFocus
            />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-outline" onClick={onClose}>Cancel</button>
          <button
            className="btn btn-gradient"
            onClick={handleSave}
            disabled={!content.trim() || saving}
            id="btn-confirm-insert-text"
          >
            {saving ? 'Saving...' : 'Add Text Material'}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ============================================================
   MODAL 2: FACULTY QUIZ UPLOAD / CREATOR
   ============================================================ */
function FacultyQuizUploadModal({ topicId, topicTitle, onClose, onSave }) {
  const [title, setTitle] = useState(`${topicTitle} Quiz`)
  const [timeLimit, setTimeLimit] = useState(10)
  const [maxItems, setMaxItems] = useState(10)
  const [passingScore, setPassingScore] = useState(75)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Question list
  const [questions, setQuestions] = useState([
    {
      question: '',
      options: ['', '', '', ''],
      correctAnswer: 0,
    },
  ])

  const addQuestion = () => {
    if (questions.length >= 50) return
    setQuestions(prev => [
      ...prev,
      { question: '', options: ['', '', '', ''], correctAnswer: 0 },
    ])
  }

  const removeQuestion = (idx) => {
    if (questions.length <= 1) return
    setQuestions(prev => prev.filter((_, i) => i !== idx))
  }

  const updateQuestionText = (idx, text) => {
    setQuestions(prev => prev.map((q, i) => (i === idx ? { ...q, question: text } : q)))
  }

  const updateOptionText = (qIdx, optIdx, text) => {
    setQuestions(prev => prev.map((q, i) => (
      i === qIdx ? { ...q, options: q.options.map((o, j) => (j === optIdx ? text : o)) } : q
    )))
  }

  const updateCorrectAnswer = (qIdx, optIdx) => {
    setQuestions(prev => prev.map((q, i) => (i === qIdx ? { ...q, correctAnswer: optIdx } : q)))
  }

  const handleSave = async () => {
    if (!title.trim()) {
      setError('Please enter a quiz title.')
      return
    }
    // Validate that questions are filled
    const validQuestions = questions.filter(q => q.question.trim() && q.options.every(o => o.trim()))
    if (validQuestions.length === 0) {
      setError('Add at least one complete question (prompt and all four options).')
      return
    }
    if (validQuestions.length < questions.length) {
      setError(`${questions.length - validQuestions.length} incomplete question(s) found. Fill them in or remove them.`)
      return
    }

    setError('')
    setSaving(true)
    try {
      await onSave({
        title: title.trim(),
        timeLimit: Math.min(Math.max(Number(timeLimit) || 10, 1), 10),
        maxItems: Math.min(Number(maxItems) || 50, 50),
        passingScore: Math.min(Math.max(Number(passingScore) || 75, 50), 100),
        questions: validQuestions,
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Faculty Quiz Upload (10 Mins · Max 50 Items)</h2>
          <button className="btn btn-icon btn-outline" onClick={onClose}><X /></button>
        </div>

        <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
          <div className="grid-3 mb-20">
            <div className="form-group">
              <label className="form-label">Quiz Title</label>
              <input
                className="form-input"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="e.g. Topic 1 Comprehensive Test"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Time Limit (Minutes)</label>
              <input
                type="number"
                max={10}
                min={1}
                className="form-input"
                value={timeLimit}
                onChange={e => setTimeLimit(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Passing Score (%)</label>
              <input
                type="number"
                min={50}
                max={100}
                className="form-input"
                value={passingScore}
                onChange={e => setPassingScore(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center justify-between mb-16">
            <h3 className="section-subheading">Questions ({questions.length} / max 50)</h3>
            <button
              type="button"
              className="btn btn-outline btn-sm flex items-center gap-6"
              onClick={addQuestion}
              disabled={questions.length >= 50}
            >
              <Plus style={{ width: 14, height: 14 }} /> Add Question
            </button>
          </div>

          <div className="flex flex-col gap-20">
            {questions.map((q, qIdx) => (
              <div key={qIdx} className="faculty-q-editor-card">
                <div className="flex items-center justify-between mb-12">
                  <span className="badge badge-purple">Question #{qIdx + 1}</span>
                  {questions.length > 1 && (
                    <button
                      type="button"
                      className="btn btn-icon btn-outline btn-sm"
                      onClick={() => removeQuestion(qIdx)}
                      title="Remove Question"
                    >
                      <Trash2 style={{ width: 14, height: 14, color: 'var(--accent-danger)' }} />
                    </button>
                  )}
                </div>

                <div className="form-group mb-12">
                  <input
                    className="form-input"
                    placeholder="Enter question prompt..."
                    value={q.question}
                    onChange={e => updateQuestionText(qIdx, e.target.value)}
                  />
                </div>

                <div className="options-grid-editor">
                  {q.options.map((opt, optIdx) => (
                    <div key={optIdx} className="flex items-center gap-8">
                      <input
                        type="radio"
                        name={`correct-${qIdx}`}
                        checked={q.correctAnswer === optIdx}
                        onChange={() => updateCorrectAnswer(qIdx, optIdx)}
                        title="Mark as correct answer"
                      />
                      <input
                        className="form-input"
                        placeholder={`Option ${String.fromCharCode(65 + optIdx)}`}
                        value={opt}
                        onChange={e => updateOptionText(qIdx, optIdx, e.target.value)}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="modal-footer">
          {error && (
            <span style={{ color: 'var(--accent-danger)', fontSize: 13, marginRight: 'auto' }}>{error}</span>
          )}
          <button className="btn btn-outline" onClick={onClose}>Cancel</button>
          <button
            className="btn btn-gradient"
            onClick={handleSave}
            disabled={saving}
            id="btn-upload-quiz-db"
          >
            {saving ? 'Uploading to Database...' : 'Upload Quiz to Database'}
          </button>
        </div>
      </div>
    </div>
  )
}
