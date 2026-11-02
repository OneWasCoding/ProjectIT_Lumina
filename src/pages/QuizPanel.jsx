import { useState, useEffect, useRef } from 'react'
import {
  ArrowLeft,
  Award,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  ExternalLink,
  HelpCircle,
  Link2,
  Play,
  Plus,
  RotateCcw,
  Trash2,
  X,
} from 'lucide-react'

/* ============================================================
   Google Forms helpers
   ============================================================ */
export function isValidGformUrl(value) {
  try {
    const u = new URL((value || '').trim())
    if (u.protocol !== 'https:') return false
    if (u.hostname === 'forms.gle') return u.pathname.length > 1
    if (u.hostname === 'docs.google.com' || u.hostname === 'forms.google.com') {
      return u.pathname.startsWith('/forms') || u.pathname.startsWith('/a/')
    }
    return false
  } catch {
    return false
  }
}

// Google only allows embedding the /viewform page with ?embedded=true
function toGformEmbedUrl(value) {
  try {
    const u = new URL(value)
    if (u.hostname !== 'docs.google.com' || !u.pathname.includes('/viewform')) return null
    u.searchParams.set('embedded', 'true')
    return u.toString()
  } catch {
    return null
  }
}

const correctOf = (q) => (q.correct_answer !== undefined ? q.correct_answer : q.correctAnswer)

const sortQuestions = (qs) =>
  [...(qs || [])].sort((a, b) => (a.order_number || 0) - (b.order_number || 0))

/* ============================================================
   QUIZ SECTION (selector + in-app runner + Google Forms)
   ============================================================ */
export default function QuizSection({
  topic,
  quizzes,
  results,
  isFaculty,
  onOpenCreateModal,
  onSubmitResult,
  onCompleteExternal,
  onDeleteQuiz,
  onBackToTOC,
}) {
  const [selectedId, setSelectedId] = useState(null)
  const active = quizzes.find(q => q.id === selectedId) || quizzes[0] || null

  useEffect(() => {
    if (selectedId && !quizzes.some(q => q.id === selectedId)) setSelectedId(null)
  }, [quizzes, selectedId])

  const isGform = active?.quiz_type === 'gform'
  const questions = isGform ? [] : sortQuestions(active?.quiz_questions)
  const myResults = (results || []).filter(r => r.quiz_id === active?.id)

  const handleDelete = () => {
    if (!active) return
    if (window.confirm(`Delete the quiz "${active.title}" and all of its student results?`)) {
      onDeleteQuiz(active.id)
    }
  }

  return (
    <div className="section-card">
      <div className="flex items-center justify-between mb-24" style={{ flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 className="section-title">{active ? active.title : `${topic?.title || 'Topic'} Quiz`}</h2>
          <p className="section-subtitle">
            {!active && 'Topic assessment.'}
            {active && isGform && 'Google Forms quiz · opens the form your instructor shared.'}
            {active && !isGform && (
              <>
                Time Limit: <strong>{active.time_limit_minutes || 10} min</strong> · Items: <strong>{questions.length}</strong> · Passing Score: <strong>{active.passing_score || 75}%</strong>
              </>
            )}
          </p>
        </div>

        {isFaculty && (
          <div className="flex items-center gap-8">
            {active && (
              <button
                className="btn btn-icon btn-outline btn-sm"
                style={{ color: 'var(--accent-danger)', borderColor: 'rgba(255,71,87,0.35)' }}
                onClick={handleDelete}
                title="Delete this quiz"
              >
                <Trash2 style={{ width: 15, height: 15 }} />
              </button>
            )}
            <button
              className="btn btn-outline btn-sm flex items-center gap-6"
              onClick={onOpenCreateModal}
              id="btn-faculty-upload-quiz"
            >
              <Plus style={{ width: 16, height: 16 }} />
              Add Quiz
            </button>
          </div>
        )}
      </div>

      {quizzes.length > 1 && (
        <div className="presentation-deck-switcher mb-16">
          <div className="presentation-deck-pills">
            {quizzes.map(q => (
              <button
                key={q.id}
                type="button"
                className={`presentation-deck-pill ${q.id === active?.id ? 'active' : ''}`}
                onClick={() => setSelectedId(q.id)}
              >
                <span className={`deck-kind-tag ${q.quiz_type === 'gform' ? 'kind-pptx' : 'kind-slides'}`}>
                  {q.quiz_type === 'gform' ? 'FORM' : 'QUIZ'}
                </span>
                <span className="deck-pill-title">{q.title}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {!active && (
        <div className="empty-state-mini" style={{ padding: '48px 24px' }}>
          <Award style={{ width: 40, height: 40, color: 'var(--text-muted)', marginBottom: 10 }} />
          <p style={{ fontWeight: 600, fontSize: 15, color: 'var(--text-primary)', marginBottom: 4 }}>
            No Quiz Uploaded Yet
          </p>
          <p style={{ fontSize: 13, maxWidth: 460, margin: '0 auto' }}>
            {isFaculty
              ? 'Click "Add Quiz" to build a quiz here or share a Google Form link for this topic.'
              : 'Your instructor has not uploaded a quiz for this topic yet.'}
          </p>
        </div>
      )}

      {active && isGform && (
        <GformQuiz
          key={active.id}
          quiz={active}
          isFaculty={isFaculty}
          completed={myResults.some(r => r.passed)}
          completedAt={myResults.find(r => r.passed)?.submitted_at}
          onComplete={() => onCompleteExternal(active)}
        />
      )}

      {active && !isGform && isFaculty && <QuizPreview quiz={active} questions={questions} />}

      {active && !isGform && !isFaculty && (
        <QuizRunner
          key={active.id}
          topic={topic}
          quiz={active}
          questions={questions}
          myResults={myResults}
          onSubmitResult={onSubmitResult}
          onBackToTOC={onBackToTOC}
        />
      )}
    </div>
  )
}

/* ============================================================
   Google Forms quiz view
   ============================================================ */
function GformQuiz({ quiz, isFaculty, completed, completedAt, onComplete }) {
  const [saving, setSaving] = useState(false)
  const embedUrl = toGformEmbedUrl(quiz.external_url)

  const handleComplete = async () => {
    if (!window.confirm('Confirm that you have submitted the Google Form?')) return
    setSaving(true)
    await onComplete()
    setSaving(false)
  }

  return (
    <div>
      <div className="quiz-start-card" style={{ paddingTop: 12, paddingBottom: 24 }}>
        <div className="quiz-start-icon">
          <Link2 style={{ width: 40, height: 40, color: 'var(--accent-primary)' }} />
        </div>
        <h3>{quiz.title}</h3>
        <p>
          {isFaculty
            ? 'Students will open this Google Form from the Quiz tab and confirm once they have submitted it. Scores stay in your Google Forms responses.'
            : 'Complete the Google Form below, then come back and confirm so the next topic unlocks.'}
        </p>
        <div className="flex items-center gap-12" style={{ justifyContent: 'center', flexWrap: 'wrap' }}>
          <a
            href={quiz.external_url}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-gradient flex items-center gap-8"
          >
            <ExternalLink style={{ width: 16, height: 16 }} />
            Open Google Form
          </a>
          {!isFaculty && !completed && (
            <button className="btn btn-outline flex items-center gap-8" onClick={handleComplete} disabled={saving}>
              <CheckCircle2 style={{ width: 16, height: 16 }} />
              {saving ? 'Saving...' : "I've submitted the form"}
            </button>
          )}
        </div>
        {!isFaculty && completed && (
          <div className="badge badge-green mt-24" style={{ display: 'inline-flex', gap: 6 }}>
            <CheckCircle2 style={{ width: 14, height: 14 }} />
            Completed{completedAt ? ` on ${new Date(completedAt).toLocaleDateString()}` : ''}
          </div>
        )}
      </div>

      {embedUrl && (
        <iframe
          src={embedUrl}
          title={quiz.title}
          className="gform-embed-frame"
          loading="lazy"
        >
          Loading…
        </iframe>
      )}
    </div>
  )
}

/* ============================================================
   Faculty read-only preview of an in-app quiz
   ============================================================ */
function QuizPreview({ quiz, questions }) {
  return (
    <div>
      <p className="section-subtitle mb-16">
        Preview (instructor view). Students answer these questions with a {quiz.time_limit_minutes || 10}-minute timer.
        Results appear on the Scores page.
      </p>
      <div className="review-cards-stack">
        {questions.map((q, idx) => (
          <div key={q.id || idx} className="review-card">
            <div className="review-card-header">
              <span className="review-q-num">Q{idx + 1}</span>
              <span className="review-q-title">{q.question}</span>
            </div>
            <div className="review-options-list">
              {q.options?.map((opt, oIdx) => (
                <div key={oIdx} className={`review-opt ${correctOf(q) === oIdx ? 'correct-answer' : ''}`}>
                  <span className="opt-marker">{correctOf(q) === oIdx ? '✓' : '·'}</span>
                  <span>{opt}</span>
                  {correctOf(q) === oIdx && <span className="opt-badge-correct">Correct Answer</span>}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ============================================================
   Student quiz runner (timer, navigation, server-verified score)
   ============================================================ */
function QuizRunner({ topic, quiz, questions, myResults, onSubmitResult, onBackToTOC }) {
  const limitSeconds = (quiz.time_limit_minutes || 10) * 60
  const [quizStarted, setQuizStarted] = useState(false)
  const [currentQIndex, setCurrentQIndex] = useState(0)
  const [answers, setAnswers] = useState({})
  const [timeLeft, setTimeLeft] = useState(limitSeconds)
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [resultData, setResultData] = useState(null)
  const answersRef = useRef({})
  const endAtRef = useRef(0)
  const submittedRef = useRef(false)

  answersRef.current = answers

  const passingThreshold = quiz.passing_score || 75
  const best = myResults.reduce((m, r) => Math.max(m, Number(r.percentage) || 0), 0)
  const hasPassed = myResults.some(r => r.passed)

  const handleStart = () => {
    if (questions.length === 0) return
    submittedRef.current = false
    endAtRef.current = Date.now() + limitSeconds * 1000
    setAnswers({})
    answersRef.current = {}
    setCurrentQIndex(0)
    setTimeLeft(limitSeconds)
    setSubmitted(false)
    setResultData(null)
    setQuizStarted(true)
  }

  const submit = async (auto = false) => {
    if (submittedRef.current) return
    submittedRef.current = true
    setSubmitting(true)

    const given = answersRef.current || {}
    let score = 0
    questions.forEach((q, idx) => {
      if (given[idx] === correctOf(q)) score++
    })
    const total = questions.length
    const percentage = total > 0 ? Math.round((score / total) * 100) : 0
    const passed = percentage >= passingThreshold

    // The server re-grades the attempt; show the official score when available
    const res = await onSubmitResult(quiz.id, score, total, percentage, passed, given)
    const official = res?.data

    setResultData({
      score: official?.score ?? score,
      total: official?.total_items ?? total,
      percentage: official?.percentage ?? percentage,
      passed: official?.passed ?? passed,
      answers: given,
      autoSubmitted: auto,
    })
    setSubmitted(true)
    setSubmitting(false)
  }

  const submitRef = useRef(submit)
  submitRef.current = submit

  // Countdown based on a fixed deadline so throttled background tabs can't gain time
  useEffect(() => {
    if (!quizStarted || submitted) return
    const tick = () => {
      const remaining = Math.max(0, Math.ceil((endAtRef.current - Date.now()) / 1000))
      setTimeLeft(remaining)
      if (remaining === 0) submitRef.current(true)
    }
    const id = setInterval(tick, 500)
    return () => clearInterval(id)
  }, [quizStarted, submitted])

  const handleManualSubmit = () => {
    const unanswered = questions.length - Object.keys(answers).length
    if (unanswered > 0 && !window.confirm(`You still have ${unanswered} unanswered question(s). Submit anyway?`)) return
    submit(false)
  }

  const formatTimer = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

  /* ---------- Before starting ---------- */
  if (!quizStarted && !submitted) {
    return (
      <div className="quiz-start-card">
        <div className="quiz-start-icon">
          <Award style={{ width: 44, height: 44, color: 'var(--accent-primary)' }} />
        </div>
        <h3>Topic Assessment: {topic?.title}</h3>
        <p>
          This quiz has {questions.length} question(s) and a {quiz.time_limit_minutes || 10}-minute timer.
          You need <strong>{passingThreshold}% or higher</strong> to pass and unlock the next topic.
          The quiz auto-submits when time runs out.
        </p>

        <div className="quiz-rules-row">
          <div className="quiz-rule-pill">
            <Clock style={{ width: 16, height: 16, color: 'var(--accent-warning)' }} />
            {quiz.time_limit_minutes || 10} Minute Timer
          </div>
          <div className="quiz-rule-pill">
            <HelpCircle style={{ width: 16, height: 16, color: 'var(--accent-primary)' }} />
            {questions.length} Questions
          </div>
          <div className="quiz-rule-pill">
            <Award style={{ width: 16, height: 16, color: 'var(--accent-secondary)' }} />
            {passingThreshold}% to Pass
          </div>
        </div>

        {myResults.length > 0 && (
          <p style={{ marginTop: 20, marginBottom: 0 }}>
            Attempts: <strong>{myResults.length}</strong> · Best score: <strong>{best}%</strong>{' '}
            {hasPassed ? <span className="badge badge-green">Passed</span> : <span className="badge badge-danger">Not passed yet</span>}
          </p>
        )}

        <button
          className="btn btn-gradient btn-lg flex items-center gap-8 mt-24"
          onClick={handleStart}
          disabled={questions.length === 0}
          id="btn-begin-quiz-attempt"
        >
          <Play style={{ width: 18, height: 18 }} />
          {myResults.length > 0 ? 'Retake Quiz' : 'Begin Quiz Now'}
        </button>
      </div>
    )
  }

  /* ---------- Taking the quiz ---------- */
  if (quizStarted && !submitted) {
    const q = questions[currentQIndex]
    return (
      <div className="quiz-active-wrapper">
        <div className="quiz-live-header">
          <div className="quiz-q-indicator">Question {currentQIndex + 1} of {questions.length}</div>
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

        <div className="question-display-card">
          <div className="question-number-tag">Question #{currentQIndex + 1}</div>
          <h3 className="question-text">{q?.question}</h3>
          <div className="options-stack">
            {q?.options?.map((opt, optIdx) => (
              <button
                key={optIdx}
                className={`option-choice-btn ${answers[currentQIndex] === optIdx ? 'selected' : ''}`}
                onClick={() => setAnswers(prev => ({ ...prev, [currentQIndex]: optIdx }))}
                id={`opt-${currentQIndex}-${optIdx}`}
              >
                <span className="option-letter">{String.fromCharCode(65 + optIdx)}</span>
                <span className="option-label">{opt}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="quiz-controls-row">
          <button
            className="btn btn-outline"
            disabled={currentQIndex === 0}
            onClick={() => setCurrentQIndex(i => i - 1)}
          >
            <ChevronLeft style={{ width: 16, height: 16 }} />
            Previous
          </button>

          {currentQIndex < questions.length - 1 ? (
            <button className="btn btn-outline" onClick={() => setCurrentQIndex(i => i + 1)}>
              Next
              <ChevronRight style={{ width: 16, height: 16 }} />
            </button>
          ) : (
            <button
              className="btn btn-gradient flex items-center gap-8"
              onClick={handleManualSubmit}
              disabled={submitting}
              id="btn-submit-quiz"
            >
              <CheckCircle2 style={{ width: 16, height: 16 }} />
              {submitting ? 'Submitting...' : 'Submit Quiz for Grading'}
            </button>
          )}
        </div>
      </div>
    )
  }

  /* ---------- Result ---------- */
  return (
    <div className="quiz-result-view">
      <div className={`result-banner ${resultData.passed ? 'passed' : 'failed'}`}>
        <div className="result-banner-icon">
          {resultData.passed
            ? <CheckCircle2 style={{ width: 48, height: 48, color: '#00d4aa' }} />
            : <X style={{ width: 48, height: 48, color: '#ff4757' }} />}
        </div>
        <h2 className="result-banner-title">
          {resultData.passed ? '🎉 Congratulations! You Passed!' : 'Assessment Not Passed'}
        </h2>
        {resultData.autoSubmitted && (
          <p className="result-banner-text" style={{ marginBottom: 8 }}>Time ran out, so your quiz was submitted automatically.</p>
        )}
        <div className="result-score-highlight">
          <span className="score-num">{resultData.score}</span>
          <span className="score-divider">/</span>
          <span className="score-total">{resultData.total}</span>
          <span className="score-pct">({resultData.percentage}%)</span>
        </div>
        <p className="result-banner-text">
          {resultData.passed
            ? <>Passing score of {passingThreshold}% met. <strong>The next topic is unlocked</strong> in your Table of Contents.</>
            : <>You scored {resultData.percentage}%. You need <strong>{passingThreshold}%</strong> to proceed. Review the lesson and try again.</>}
        </p>
        <div className="result-actions-row">
          <button className="btn btn-gradient flex items-center gap-8" onClick={onBackToTOC} id="btn-result-return-toc">
            <ArrowLeft style={{ width: 16, height: 16 }} />
            Return to Table of Contents
          </button>
          <button className="btn btn-outline flex items-center gap-8" onClick={handleStart} id="btn-retake-quiz">
            <RotateCcw style={{ width: 16, height: 16 }} />
            Retake Assessment
          </button>
        </div>
      </div>

      <div className="quiz-review-section mt-32">
        <h3 className="section-subheading mb-16">Review Your Answers</h3>
        <div className="review-cards-stack">
          {questions.map((q, idx) => {
            const selected = resultData.answers[idx]
            const correct = correctOf(q)
            const isCorrect = selected === correct
            return (
              <div key={q.id || idx} className={`review-card ${isCorrect ? 'correct' : 'incorrect'}`}>
                <div className="review-card-header">
                  <span className="review-q-num">Q{idx + 1}</span>
                  <span className="review-q-title">{q.question}</span>
                  {isCorrect
                    ? <span className="badge badge-green">Correct</span>
                    : <span className="badge badge-danger">{selected === undefined ? 'Unanswered' : 'Incorrect'}</span>}
                </div>
                <div className="review-options-list">
                  {q.options?.map((opt, oIdx) => {
                    let cls = 'review-opt'
                    if (correct === oIdx) cls += ' correct-answer'
                    else if (selected === oIdx && !isCorrect) cls += ' wrong-selection'
                    return (
                      <div key={oIdx} className={cls}>
                        <span className="opt-marker">{correct === oIdx ? '✓' : selected === oIdx ? '✗' : '·'}</span>
                        <span>{opt}</span>
                        {correct === oIdx && <span className="opt-badge-correct">Correct Answer</span>}
                        {selected === oIdx && !isCorrect && <span className="opt-badge-wrong">Your Answer</span>}
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
  )
}

/* ============================================================
   Faculty modal: build a quiz in-app OR attach a Google Form link
   ============================================================ */
export function FacultyQuizUploadModal({ topicTitle, onClose, onSave }) {
  const [mode, setMode] = useState('internal') // 'internal' | 'gform'
  const [title, setTitle] = useState(`${topicTitle} Quiz`)
  const [timeLimit, setTimeLimit] = useState(10)
  const [passingScore, setPassingScore] = useState(75)
  const [formUrl, setFormUrl] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [questions, setQuestions] = useState([{ question: '', options: ['', '', '', ''], correctAnswer: 0 }])

  const addQuestion = () => {
    if (questions.length >= 50) return
    setQuestions(prev => [...prev, { question: '', options: ['', '', '', ''], correctAnswer: 0 }])
  }
  const removeQuestion = (idx) => {
    if (questions.length > 1) setQuestions(prev => prev.filter((_, i) => i !== idx))
  }
  const updateQuestion = (idx, text) =>
    setQuestions(prev => prev.map((q, i) => (i === idx ? { ...q, question: text } : q)))
  const updateOption = (qIdx, oIdx, text) =>
    setQuestions(prev => prev.map((q, i) => (
      i === qIdx ? { ...q, options: q.options.map((o, j) => (j === oIdx ? text : o)) } : q
    )))
  const updateCorrect = (qIdx, oIdx) =>
    setQuestions(prev => prev.map((q, i) => (i === qIdx ? { ...q, correctAnswer: oIdx } : q)))

  const handleSave = async () => {
    if (!title.trim()) return setError('Please enter a quiz title.')

    let payload
    if (mode === 'gform') {
      if (!isValidGformUrl(formUrl)) {
        return setError('Enter a valid Google Forms link (https://forms.gle/... or https://docs.google.com/forms/...).')
      }
      payload = { title: title.trim(), questions: [], quizType: 'gform', externalUrl: formUrl.trim() }
    } else {
      const incomplete = questions.filter(q => !q.question.trim() || q.options.some(o => !o.trim()))
      if (incomplete.length > 0) {
        return setError(`${incomplete.length} question(s) are incomplete. Fill in the prompt and all four options, or remove them.`)
      }
      payload = {
        title: title.trim(),
        timeLimit: Math.min(Math.max(Number(timeLimit) || 10, 1), 60),
        maxItems: questions.length,
        passingScore: Math.min(Math.max(Number(passingScore) || 75, 1), 100),
        questions: questions.map(q => ({ ...q, question: q.question.trim(), options: q.options.map(o => o.trim()) })),
        quizType: 'internal',
      }
    }

    setError('')
    setSaving(true)
    try {
      await onSave(payload)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Add Quiz</h2>
          <button className="btn btn-icon btn-outline" onClick={onClose}><X /></button>
        </div>

        <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
          <div className="presentation-mode-toggle mb-20" style={{ display: 'inline-flex' }}>
            <button type="button" className={`mode-btn ${mode === 'internal' ? 'active' : ''}`} onClick={() => { setMode('internal'); setError('') }}>
              Build in Lumina
            </button>
            <button type="button" className={`mode-btn ${mode === 'gform' ? 'active' : ''}`} onClick={() => { setMode('gform'); setError('') }}>
              Google Forms link
            </button>
          </div>

          <div className="form-group mb-20">
            <label className="form-label">Quiz Title</label>
            <input className="form-input" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Topic 1 Quiz" />
          </div>

          {mode === 'gform' ? (
            <div className="form-group mb-20">
              <label className="form-label">Google Form link</label>
              <input
                className="form-input"
                value={formUrl}
                onChange={e => setFormUrl(e.target.value)}
                placeholder="https://forms.gle/xxxxxxxx"
                id="input-gform-url"
              />
              <p className="section-subtitle" style={{ marginTop: 8 }}>
                In Google Forms click <strong>Send</strong> → link icon and paste it here. Set the form to accept
                responses from anyone with the link. Scores stay in your Google Forms responses; students confirm
                completion here to unlock the next topic.
              </p>
            </div>
          ) : (
            <>
              <div className="grid-2 mb-20" style={{ gap: 16 }}>
                <div className="form-group">
                  <label className="form-label">Time Limit (minutes)</label>
                  <input type="number" min={1} max={60} className="form-input" value={timeLimit} onChange={e => setTimeLimit(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Passing Score (%)</label>
                  <input type="number" min={1} max={100} className="form-input" value={passingScore} onChange={e => setPassingScore(e.target.value)} />
                </div>
              </div>

              <div className="flex items-center justify-between mb-16">
                <h3 className="section-subheading">Questions ({questions.length} / 50)</h3>
                <button type="button" className="btn btn-outline btn-sm flex items-center gap-6" onClick={addQuestion} disabled={questions.length >= 50}>
                  <Plus style={{ width: 14, height: 14 }} /> Add Question
                </button>
              </div>

              <div className="flex flex-col gap-20">
                {questions.map((q, qIdx) => (
                  <div key={qIdx} className="faculty-q-editor-card">
                    <div className="flex items-center justify-between mb-12">
                      <span className="badge badge-purple">Question #{qIdx + 1}</span>
                      {questions.length > 1 && (
                        <button type="button" className="btn btn-icon btn-outline btn-sm" onClick={() => removeQuestion(qIdx)} title="Remove question">
                          <Trash2 style={{ width: 14, height: 14, color: 'var(--accent-danger)' }} />
                        </button>
                      )}
                    </div>
                    <div className="form-group mb-12">
                      <input className="form-input" placeholder="Enter question prompt..." value={q.question} onChange={e => updateQuestion(qIdx, e.target.value)} />
                    </div>
                    <div className="options-grid-editor">
                      {q.options.map((opt, oIdx) => (
                        <div key={oIdx} className="flex items-center gap-8">
                          <input type="radio" name={`correct-${qIdx}`} checked={q.correctAnswer === oIdx} onChange={() => updateCorrect(qIdx, oIdx)} title="Mark as correct answer" />
                          <input className="form-input" placeholder={`Option ${String.fromCharCode(65 + oIdx)}`} value={opt} onChange={e => updateOption(qIdx, oIdx, e.target.value)} />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="modal-footer">
          {error && <span style={{ color: 'var(--accent-danger)', fontSize: 13, marginRight: 'auto' }}>{error}</span>}
          <button className="btn btn-outline" onClick={onClose}>Cancel</button>
          <button className="btn btn-gradient" onClick={handleSave} disabled={saving} id="btn-upload-quiz-db">
            {saving ? 'Publishing...' : mode === 'gform' ? 'Publish Google Form' : 'Publish Quiz'}
          </button>
        </div>
      </div>
    </div>
  )
}

