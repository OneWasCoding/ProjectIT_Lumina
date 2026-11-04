import { useState, useCallback } from 'react'
import { useApp } from '../context/AppContext.jsx'
import { generateQuizFromSlides, slidesToText } from '../lib/groqClient.js'
import { Sparkles, BrainCircuit, RotateCcw, Trash2, Plus, X, CheckCircle2, Save, AlertCircle } from 'lucide-react'

const LETTERS = ['A', 'B', 'C', 'D']

export default function AiQuizGenerator({ slides, topicId, topicTitle, onClose, onSave }) {
  const { addQuiz, showToast } = useApp()
  const defaultTitle = `${topicTitle || 'Topic'} Quiz (AI Generated)`

  const [stage, setStage] = useState('config')
  const [quizTitle, setQuizTitle] = useState(defaultTitle)
  const [questionCount, setQuestionCount] = useState(8)
  const [subjectOverride, setSubjectOverride] = useState('')
  const [questions, setQuestions] = useState([])
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const isConfigured = Boolean(import.meta.env.VITE_GROQ_API_KEY)

  const handleGenerate = useCallback(async () => {
    setError('')
    if (!slides || slides.length === 0) return setError('No slide content available to generate a quiz from.')
    setGenerating(true)
    setStage('generating')
    try {
      const { questions: generated } = await generateQuizFromSlides(slides, {
        count: questionCount,
        subject: subjectOverride.trim() || undefined,
        topic: topicTitle || '',
      })
      if (generated.length === 0) throw new Error('Groq did not return any usable questions. Try again.')
      setQuestions(generated.map(q => ({ ...q, id: `ai-${Date.now()}-${Math.random().toString(36).slice(2, 7)}` })))
      setStage('review')
    } catch (err) {
      setError(err.message || 'Quiz generation failed. Please try again.')
      setStage('config')
    } finally {
      setGenerating(false)
    }
  }, [slides, questionCount, subjectOverride, topicTitle])

  const addQuestion = () => {
    if (questions.length >= 50) return
    setQuestions(prev => [
      ...prev,
      {
        id: `ai-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        question: '',
        options: ['', '', '', ''],
        correctAnswer: 0,
        explanation: '',
      },
    ])
  }
  const removeQuestion = idx => {
    if (questions.length <= 1) return
    setQuestions(prev => prev.filter((_, i) => i !== idx))
  }
  const updateQuestion = (idx, text) =>
    setQuestions(prev => prev.map((q, i) => (i === idx ? { ...q, question: text } : q)))
  const updateOption = (qIdx, oIdx, text) =>
    setQuestions(prev =>
      prev.map((q, i) => (i === qIdx ? { ...q, options: q.options.map((o, j) => (j === oIdx ? text : o)) } : q))
    )
  const updateCorrect = (qIdx, oIdx) =>
    setQuestions(prev => prev.map((q, i) => (i === qIdx ? { ...q, correctAnswer: oIdx } : q)))
  const updateExplanation = (qIdx, text) =>
    setQuestions(prev => prev.map((q, i) => (i === qIdx ? { ...q, explanation: text } : q)))

  const handleSave = async () => {
    setError('')
    if (!topicId) return setError('Missing topic context.')
    if (questions.length === 0) return setError('Add at least one question before publishing.')
    const incomplete = questions.filter(
      q => !q.question.trim() || q.options.some(o => !o.trim()) || q.correctAnswer === undefined
    )
    if (incomplete.length > 0) {
      return setError(
        `${incomplete.length} question(s) are incomplete. Fill in the prompt, all four options, and pick the correct answer, or remove them.`
      )
    }
    setSaving(true)
    try {
      const cleanedQuestions = questions.map(q => ({
        question: q.question.trim(),
        options: q.options.map(o => o.trim()),
        correctAnswer: Number(q.correctAnswer) || 0,
      }))
      const { error: err } = await addQuiz(
        topicId,
        (quizTitle || defaultTitle).trim(),
        10,
        cleanedQuestions.length,
        75,
        cleanedQuestions,
        { quizType: 'internal' }
      )
      if (err) throw err
      setStage('saved')
      if (onSave) onSave()
    } catch (err) {
      setError(err.message || 'Failed to save quiz. Please try again.')
      if (showToast) showToast(err.message || 'Failed to save quiz.', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handlePublishAgain = () => {
    setError('')
    setQuestions([])
    setStage('config')
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title flex items-center gap-10">
            <Sparkles style={{ width: 20, height: 20, color: 'var(--accent-primary)' }} /> Generate AI Quiz from Presentation
          </h2>
          <button className="btn btn-icon btn-outline" onClick={onClose}>
            <X style={{ width: 16, height: 16 }} />
          </button>
        </div>

        {stage === 'config' && (
          <div className="modal-body" style={{ maxHeight: '64vh', overflowY: 'auto' }}>
            {error && (
              <div
                className="mb-16"
                style={{
                  padding: 10,
                  borderRadius: 'var(--radius-md)',
                  background: 'rgba(255,71,87,0.10)',
                  border: '1px solid rgba(255,71,87,0.25)',
                  color: 'var(--accent-danger)',
                  fontSize: 13,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <AlertCircle style={{ width: 16, height: 16, flexShrink: 0 }} /> {error}
              </div>
            )}
            {!isConfigured && (
              <div
                className="mb-16"
                style={{
                  padding: 10,
                  borderRadius: 'var(--radius-md)',
                  background: 'rgba(124,92,252,0.10)',
                  border: '1px solid rgba(124,92,252,0.25)',
                  color: 'var(--accent-primary)',
                  fontSize: 13,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <AlertCircle style={{ width: 16, height: 16, flexShrink: 0 }} /> Groq API key not configured. Add VITE_GROQ_API_KEY to .env to enable AI generation.
              </div>
            )}
            <div className="form-group mb-16">
              <label className="form-label">Quiz Title</label>
              <input
                className="form-input"
                value={quizTitle}
                onChange={e => setQuizTitle(e.target.value)}
                id="ai-quiz-title"
              />
              <p className="form-hint" style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                Title shown to students when they take the quiz.
              </p>
            </div>
            <div className="grid-2 mb-20" style={{ gap: 16 }}>
              <div className="form-group">
                <label className="form-label">Number of Questions</label>
                <input
                  type="number"
                  min={3}
                  max={50}
                  className="form-input"
                  value={questionCount}
                  onChange={e => setQuestionCount(Math.min(Math.max(Number(e.target.value) || 3, 3), 50))}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Subject (optional context for Groq)</label>
                <input
                  className="form-input"
                  placeholder="e.g. Database Systems"
                  value={subjectOverride}
                  onChange={e => setSubjectOverride(e.target.value)}
                />
              </div>
            </div>
            <div className="form-group mb-20">
              <label className="form-label">Source Content</label>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8 }}>
                {slides.length} slide(s) detected from the uploaded presentation. Groq will read the slide titles and bullet points to build the questions.
              </p>
              <div
                className="form-input"
                style={{
                  padding: 12,
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-muted)',
                  border: '1px solid var(--border-color)',
                  fontSize: 12,
                  color: 'var(--text-muted)',
                  maxHeight: 140,
                  overflowY: 'auto',
                  fontFamily: 'var(--font-mono)',
                  lineHeight: 1.5,
                  whiteSpace: 'pre-wrap',
                }}
                id="ai-source-preview"
              >
                {slidesToText(slides)}
              </div>
            </div>
            <div className="modal-footer flex justify-between gap-10">
              <button className="btn btn-outline" onClick={onClose} disabled={generating}>
                Cancel
              </button>
              <button
                className="btn btn-gradient flex items-center gap-8"
                onClick={handleGenerate}
                disabled={generating || !isConfigured}
                id="btn-generate-ai-quiz"
              >
                {generating ? (
                  <>
                    <RotateCcw style={{ width: 16, height: 16, animation: 'spin 1s linear infinite' }} /> Generating with Groq...
                  </>
                ) : (
                  <>
                    <BrainCircuit style={{ width: 16, height: 16 }} /> Generate Quiz - {questionCount} Questions
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {stage === 'generating' && (
          <div
            className="modal-body"
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 40,
              textAlign: 'center',
            }}
          >
            <BrainCircuit
              style={{
                width: 48,
                height: 48,
                color: 'var(--accent-primary)',
                marginBottom: 16,
                animation: 'spin 1.2s linear infinite',
              }}
            />
            <h3 style={{ marginBottom: 8, color: 'var(--text-primary)' }}>Generating quiz with Groq…</h3>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', maxWidth: 300, margin: '0 auto' }}>
              Reading your slides and drafting multiple-choice questions. This usually takes a few seconds.
            </p>
          </div>
        )}

        {stage === 'review' && (
          <div className="modal-body" style={{ maxHeight: '64vh', overflowY: 'auto' }}>
            <div className="mb-20">
              <div className="flex items-center justify-between mb-12">
                <div>
                  <h3 className="section-subheading">Review &amp; Edit Questions ({questions.length})</h3>
                  <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                    Edit any question, option, or correct answer before publishing.
                  </p>
                </div>
                <div className="flex items-center gap-8">
                  <button
                    type="button"
                    className="btn btn-outline btn-sm flex items-center gap-6"
                    onClick={addQuestion}
                    disabled={questions.length >= 50 || saving}
                  >
                    <Plus style={{ width: 14, height: 14 }} /> Add
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline btn-sm flex items-center gap-6"
                    onClick={handleGenerate}
                    disabled={generating || saving}
                  >
                    <RotateCcw style={{ width: 14, height: 14 }} /> Regenerate All
                  </button>
                </div>
              </div>
              {error && (
                <div
                  className="mb-16"
                  style={{
                    padding: 10,
                    borderRadius: 'var(--radius-md)',
                    background: 'rgba(255,71,87,0.10)',
                    border: '1px solid rgba(255,71,87,0.25)',
                    color: 'var(--accent-danger)',
                    fontSize: 13,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <AlertCircle style={{ width: 16, height: 16, flexShrink: 0 }} /> {error}
                </div>
              )}
              {questions.map((q, qIdx) => (
                <div key={q.id} className="faculty-q-editor-card mb-16">
                  <div className="flex items-center justify-between mb-12">
                    <span className="badge badge-purple">Question #{qIdx + 1}</span>
                    <button
                      type="button"
                      className="btn btn-icon btn-outline btn-sm"
                      onClick={() => removeQuestion(qIdx)}
                      title="Remove question"
                      disabled={questions.length <= 1}
                    >
                      <Trash2 style={{ width: 14, height: 14, color: 'var(--accent-danger)' }} />
                    </button>
                  </div>
                  <div className="form-group mb-12">
                    <label className="form-label">Question</label>
                    <input
                      className="form-input"
                      placeholder="Enter your question…"
                      value={q.question}
                      onChange={e => updateQuestion(qIdx, e.target.value)}
                    />
                  </div>
                  <div className="form-group mb-12">
                    <label className="form-label">Options</label>
                    {q.options.map((opt, oIdx) => (
                      <div key={oIdx} className="flex items-center gap-8 mb-8">
                        <button
                          type="button"
                          onClick={() => updateCorrect(qIdx, oIdx)}
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: 'var(--radius-full)',
                            background: q.correctAnswer === oIdx ? 'var(--accent-secondary)' : 'var(--bg-input)',
                            border: `2px solid ${q.correctAnswer === oIdx ? 'var(--accent-secondary)' : 'var(--border-color)'}`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                            cursor: 'pointer',
                          }}
                          title="Mark as correct answer"
                        >
                          {q.correctAnswer === oIdx && <CheckCircle2 style={{ width: 14, height: 14, color: 'white' }} />}
                        </button>
                        <span
                          style={{
                            width: 20,
                            display: 'inline-block',
                            fontWeight: 700,
                            color: 'var(--text-muted)',
                            fontSize: 13,
                            flexShrink: 0,
                          }}
                        >
                          {LETTERS[oIdx]}
                        </span>
                        <input
                          className="form-input"
                          placeholder={`Option ${LETTERS[oIdx]}`}
                          value={opt}
                          onChange={e => updateOption(qIdx, oIdx, e.target.value)}
                          style={{ flex: 1 }}
                        />
                      </div>
                    ))}
                  </div>
                  <div className="form-group">
                    <label className="form-label">Explanation (shown after answering)</label>
                    <textarea
                      className="form-input"
                      rows={2}
                      placeholder="Briefly explain why the correct answer is right…"
                      value={q.explanation || ''}
                      onChange={e => updateExplanation(qIdx, e.target.value)}
                    />
                  </div>
                </div>
              ))}
            </div>
            <div className="modal-footer flex justify-between gap-10">
              <button className="btn btn-outline" onClick={() => setStage('config')} disabled={saving}>
                Back
              </button>
              <button
                className="btn btn-gradient flex items-center gap-8"
                onClick={handleSave}
                disabled={saving}
                id="btn-save-ai-quiz"
              >
                {saving ? (
                  'Publishing…'
                ) : (
                  <>
                    <Save style={{ width: 16, height: 16 }} /> Publish Quiz
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {stage === 'saved' && (
          <div
            className="modal-body"
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 40,
              textAlign: 'center',
            }}
          >
            <CheckCircle2 style={{ width: 56, height: 56, color: '#10b981', marginBottom: 16 }} />
            <h3 style={{ marginBottom: 8, color: 'var(--text-primary)' }}>Quiz Published!</h3>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', maxWidth: 300, margin: '0 auto 24px' }}>
              Your AI-generated quiz has been saved and is available to students in this topic.
            </p>
            <div className="flex items-center gap-10">
              <button className="btn btn-outline" onClick={handlePublishAgain}>
                Create Another
              </button>
              <button className="btn btn-gradient" onClick={onClose}>
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
