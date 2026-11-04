import { useState, useEffect, useRef } from 'react'
import { useApp } from '../context/AppContext.jsx'
import { formatFileSize } from '../lib/presentationParser.js'
import QuizSection, { FacultyQuizUploadModal } from './QuizPanel.jsx'
import AiQuizGenerator from '../components/AiQuizGenerator.jsx'
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
    setCurrentTopic,
    topics,
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
    deleteQuiz,
    deleteTopicQuizzes,
    completeExternalQuiz,
    submitQuizResult,
    quizResults,
    fetchMyResults,
    showToast,
  } = useApp()

  const [activeTab, setActiveTab] = useState('text') // 'text' | 'presentation' | 'insights' | 'summary' | 'quiz'
  const [quizStartSignal, setQuizStartSignal] = useState(0)
  const isFaculty = profile?.role === 'faculty'
  const [showAiQuizModal, setShowAiQuizModal] = useState(false)
  const [aiQuizDeck, setAiQuizDeck] = useState(null) // { extractedSlides[], title, ... }

  // Load content, quizzes & student results for this topic
  useEffect(() => {
    setQuizStartSignal(0)
    if (currentTopic?.id) {
      fetchTopicContent(currentTopic.id)
      fetchQuizzes(currentTopic.id)
      if (!isFaculty) fetchMyResults()
    }
  }, [currentTopic, isFaculty, fetchTopicContent, fetchQuizzes, fetchMyResults])

  // Content filtered by this topic and type
  const topicItems = topicContent.filter(c => Number(c.topic_id) === Number(currentTopic?.id))
  const textContents = topicItems.filter(c => c.content_type === 'text')
  const presentationContents = topicItems.filter(c => c.content_type === 'presentation')
  const insightContents = topicItems.filter(
    c => c.content_type === 'notes' && (!user?.id || !c.created_by || c.created_by === user.id)
  )

  // Find results for quizzes in this topic
  const topicQuizzes = quizzes.filter(q => Number(q.topic_id) === Number(currentTopic?.id))
  const primaryQuiz = topicQuizzes[0] || null
  const topicResults = quizResults.filter(r => topicQuizzes.some(q => q.id === r.quiz_id))
  const hasPassedTopic = topicResults.some(r => r.passed)
  const latestResult = topicResults[0]

  const handleLaunchQuiz = () => {
    setActiveTab('quiz')
    setQuizStartSignal(s => s + 1)
  }

  // Next topic in the same subject
  const sortedSubjectTopics = [...(topics || [])]
    .filter(t => !selectedSubject?.id || t.subject_id === selectedSubject.id)
    .sort((a, b) => (a.order_number || 0) - (b.order_number || 0))
  const currentTopicIdx = sortedSubjectTopics.findIndex(t => t.id === currentTopic?.id)
  const nextTopic = currentTopicIdx >= 0 ? sortedSubjectTopics[currentTopicIdx + 1] || null : null

  const handleNextTopic = () => {
    if (!nextTopic) return
    setCurrentTopic(nextTopic)
    setActiveTab('text')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const quizTabLabel = (() => {
    if (!primaryQuiz) return 'Quiz'
    if (primaryQuiz.quiz_type === 'gform') return 'Quiz (Google Form)'
    const qCount = (primaryQuiz.quiz_questions || []).length
    return `Quiz (${primaryQuiz.time_limit_minutes || 10} Mins${qCount ? ` · ${qCount} Items` : ''})`
  })()

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
          {topicQuizzes.length === 0 ? (
            <div className="badge badge-purple flex items-center gap-6">
              <CheckCircle2 style={{ width: 14, height: 14 }} />
              No Quiz Required
            </div>
          ) : hasPassedTopic ? (
            <div className="badge badge-green flex items-center gap-6">
              <CheckCircle2 style={{ width: 14, height: 14 }} />
              {primaryQuiz?.quiz_type === 'gform' ? 'Form Completed' : 'Passed (Proceed Enabled)'}
            </div>
          ) : latestResult ? (
            <div className="badge badge-danger flex items-center gap-6">
              <XCircle style={{ width: 14, height: 14 }} />
              Failed ({primaryQuiz?.passing_score || 75}% Required)
            </div>
          ) : (
            <div className="badge badge-yellow flex items-center gap-6">
              <Clock style={{ width: 14, height: 14 }} />
              {primaryQuiz?.quiz_type === 'gform' ? 'Google Form Pending' : 'Quiz Not Taken'}
            </div>
          )}

          {topicQuizzes.length > 0 ? (
            <button
              className="btn btn-gradient btn-sm flex items-center gap-6"
              onClick={handleLaunchQuiz}
              id="btn-start-topic-quiz"
            >
              <Play style={{ width: 14, height: 14 }} />
              {primaryQuiz?.quiz_type === 'gform'
                ? hasPassedTopic ? 'View Google Form' : 'Open Google Form Quiz'
                : hasPassedTopic ? 'Retake Quiz' : 'Start Topic Quiz'}
            </button>
          ) : isFaculty ? (
            <button
              className="btn btn-gradient btn-sm flex items-center gap-6"
              onClick={() => {
                setActiveTab('quiz')
                setShowCreateQuizModal(true)
              }}
              id="btn-start-topic-quiz"
            >
              <Plus style={{ width: 14, height: 14 }} />
              Add Topic Quiz
            </button>
          ) : nextTopic ? (
            <button
              className="btn btn-gradient btn-sm flex items-center gap-6"
              onClick={handleNextTopic}
              id="btn-next-topic-header"
            >
              Next Topic
              <ChevronRight style={{ width: 14, height: 14 }} />
            </button>
          ) : null}
        </div>
      </div>

      {/* Topic Title & Description Banner */}
      <div className="topic-hero-banner">
        <div className="topic-hero-content">
          <div className="topic-meta-label">LESSON {currentTopic?.order_number}</div>
          <h1 className="topic-hero-title">{currentTopic?.title}</h1>
          <p className="topic-hero-desc">
            {currentTopic?.summary || 'Explore the lesson materials, interactive presentation slides, insights, and complete the topic quiz to unlock the next topic.'}
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
          {quizTabLabel}
          {hasPassedTopic && (
            <span className="tab-pill-passed">
              {primaryQuiz?.quiz_type === 'gform' ? 'Done' : `${primaryQuiz?.passing_score || 75}%+`}
            </span>
          )}
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
            onGenerateAiQuiz={deck => {
              setAiQuizDeck(deck)
              setShowAiQuizModal(true)
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
            onProceedToQuiz={handleLaunchQuiz}
          />
        )}

        {activeTab === 'quiz' && (
          <QuizSection
            topic={currentTopic}
            quizzes={topicQuizzes}
            results={topicResults}
            isFaculty={isFaculty}
            startSignal={quizStartSignal}
            onOpenCreateModal={() => setShowCreateQuizModal(true)}
            onSubmitResult={submitQuizResult}
            onCompleteExternal={completeExternalQuiz}
            onDeleteQuiz={deleteQuiz}
            onClearTopicQuizzes={() => deleteTopicQuizzes(currentTopic.id)}
            onBackToTOC={onBackToTOC}
            nextTopic={nextTopic}
            onNextTopic={handleNextTopic}
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
              quizData.questions,
              { quizType: quizData.quizType, externalUrl: quizData.externalUrl }
            )
            if (!error) setShowCreateQuizModal(false)
          }}
        />
      )}

      {/* Modal: AI-generated quiz from uploaded presentation */}
      {showAiQuizModal && aiQuizDeck && (
        <AiQuizGenerator
          slides={aiQuizDeck.extractedSlides || []}
          topicId={currentTopic.id}
          topicTitle={currentTopic.title}
          onClose={() => {
            setShowAiQuizModal(false)
            setAiQuizDeck(null)
          }}
          onSave={() => {
            setShowAiQuizModal(false)
            setAiQuizDeck(null)
            fetchQuizzes(currentTopic.id)
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
  onGenerateAiQuiz,
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
            <>
              <button
                type="button"
                className="btn btn-gradient btn-sm flex items-center gap-6"
                onClick={() => setShowUploadModal(true)}
                id="btn-upload-topic-presentation"
              >
                <Upload style={{ width: 15, height: 15 }} />
                Upload PDF / PPT
              </button>
              {activeDeck?.extractedSlides?.length && onGenerateAiQuiz && (
                <button
                  type="button"
                  className="btn btn-gradient btn-sm flex items-center gap-6"
                  onClick={() => onGenerateAiQuiz(activeDeck)}
                  id="btn-generate-ai-quiz-from-deck"
                >
                  <Sparkles style={{ width: 15, height: 15 }} />
                  Generate AI Quiz
                </button>
              )}
            </>
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
  const hasQuiz = quizzes.length > 0 && (quizzes[0]?.quiz_type === 'gform' || quizzes[0]?.quiz_questions?.length > 0)

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
          <div className="summary-icon-box amber">{hasQuiz ? (quizzes[0].quiz_type === 'gform' ? 1 : quizzes[0].quiz_questions.length) : 0}</div>
          <div>
            <h4>Topic Assessment</h4>
            <p>
              {hasQuiz
                ? quizzes[0].quiz_type === 'gform' ? 'Google Forms quiz shared by your instructor.' : ` question(s) · ${quizzes[0].time_limit_minutes || 10} mins · ${quizzes[0].passing_score || 75}% required to pass.`
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
