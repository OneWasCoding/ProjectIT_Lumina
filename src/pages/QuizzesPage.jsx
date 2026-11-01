import { useState } from 'react'
import { useApp } from '../context/AppContext.jsx'
import {
  Plus,
  BrainCircuit,
  X,
  Clock,
  HelpCircle,
  CheckCircle2,
  XCircle,
  Trash2,
  Trophy,
  ArrowRight,
  RotateCcw,
} from 'lucide-react'

export default function QuizzesPage() {
  const { user, quizzes, addQuiz, deleteQuiz, submitQuizResult } = useApp()
  const [showCreate, setShowCreate] = useState(false)
  const [takingQuiz, setTakingQuiz] = useState(null)
  const [quizState, setQuizState] = useState(null) // { currentQ, answers, submitted }

  const isTeacher = user?.role === 'teacher'

  const startQuiz = (quiz) => {
    setTakingQuiz(quiz)
    setQuizState({
      currentQ: 0,
      answers: {},
      submitted: false,
      score: 0,
    })
  }

  const selectAnswer = (questionId, answerIdx) => {
    if (quizState.submitted) return
    setQuizState(prev => ({
      ...prev,
      answers: { ...prev.answers, [questionId]: answerIdx },
    }))
  }

  const nextQuestion = () => {
    if (quizState.currentQ < takingQuiz.questions.length - 1) {
      setQuizState(prev => ({ ...prev, currentQ: prev.currentQ + 1 }))
    }
  }

  const prevQuestion = () => {
    if (quizState.currentQ > 0) {
      setQuizState(prev => ({ ...prev, currentQ: prev.currentQ - 1 }))
    }
  }

  const submitQuiz = () => {
    let score = 0
    takingQuiz.questions.forEach(q => {
      if (quizState.answers[q.id] === q.correctAnswer) {
        score++
      }
    })
    setQuizState(prev => ({ ...prev, submitted: true, score }))
    submitQuizResult({
      quizId: takingQuiz.id,
      quizTitle: takingQuiz.title,
      score,
      total: takingQuiz.questions.length,
      answers: quizState.answers,
    })
  }

  return (
    <>
      <div className="page-header">
        <div className="page-header-inner">
          <div>
            <h1 className="page-title">Quizzes</h1>
            <p className="page-subtitle">
              {isTeacher ? 'Create and manage quizzes for your students' : 'Test your knowledge with interactive quizzes'}
            </p>
          </div>
          {isTeacher && (
            <button className="btn btn-gradient" onClick={() => setShowCreate(true)} id="btn-create-quiz">
              <Plus /> Create Quiz
            </button>
          )}
        </div>
      </div>

      <div className="page-body">
        {quizzes.length === 0 ? (
          <div className="empty-state">
            <BrainCircuit />
            <h3>No Quizzes Yet</h3>
            <p>
              {isTeacher
                ? 'Create your first quiz to test your students\' knowledge.'
                : 'No quizzes are available at the moment.'}
            </p>
          </div>
        ) : (
          <div className="grid-3">
            {quizzes.map((quiz) => (
              <div key={quiz.id} className="card" id={`quiz-${quiz.id}`}>
                <div className="flex items-center gap-12 mb-16">
                  <div style={{
                    width: 44,
                    height: 44,
                    borderRadius: 'var(--radius-md)',
                    background: 'rgba(0, 212, 170, 0.12)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <BrainCircuit style={{ width: 22, height: 22, color: 'var(--accent-secondary)' }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 2 }}>{quiz.title}</h3>
                    <span className="badge badge-purple" style={{ fontSize: 11 }}>{quiz.subject}</span>
                  </div>
                </div>

                <div className="flex items-center gap-16 mb-16" style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                  <span className="flex items-center gap-8">
                    <HelpCircle style={{ width: 14, height: 14 }} />
                    {quiz.questions.length} questions
                  </span>
                  <span className="flex items-center gap-8">
                    <Clock style={{ width: 14, height: 14 }} />
                    {quiz.timeLimit} min
                  </span>
                </div>

                <div className="flex items-center gap-8">
                  <button
                    className="btn btn-gradient btn-sm"
                    onClick={() => startQuiz(quiz)}
                    style={{ flex: 1, justifyContent: 'center' }}
                  >
                    {isTeacher ? 'Preview' : 'Take Quiz'}
                  </button>
                  {isTeacher && (
                    <button
                      className="btn btn-icon btn-outline btn-sm"
                      onClick={() => deleteQuiz(quiz.id)}
                      id={`delete-quiz-${quiz.id}`}
                    >
                      <Trash2 style={{ width: 14, height: 14, color: 'var(--accent-danger)' }} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Quiz Modal */}
      {showCreate && (
        <CreateQuizModal onClose={() => setShowCreate(false)} onSave={addQuiz} />
      )}

      {/* Quiz Taking Modal */}
      {takingQuiz && quizState && (
        <QuizTaker
          quiz={takingQuiz}
          state={quizState}
          onSelect={selectAnswer}
          onNext={nextQuestion}
          onPrev={prevQuestion}
          onSubmit={submitQuiz}
          onClose={() => { setTakingQuiz(null); setQuizState(null); }}
        />
      )}
    </>
  )
}

function QuizTaker({ quiz, state, onSelect, onNext, onPrev, onSubmit, onClose }) {
  const question = quiz.questions[state.currentQ]
  const total = quiz.questions.length
  const progress = ((state.currentQ + 1) / total) * 100
  const allAnswered = Object.keys(state.answers).length === total

  if (state.submitted) {
    const pct = Math.round((state.score / total) * 100)
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal" onClick={e => e.stopPropagation()}>
          <div className="modal-header">
            <h2 className="modal-title">Quiz Results</h2>
            <button className="btn btn-icon btn-outline" onClick={onClose}><X /></button>
          </div>
          <div className="modal-body">
            <div className="score-display">
              <div className="score-circle" style={{ '--score-pct': `${pct}%` }}>
                <div className="score-circle-inner">
                  <div className="score-value">{pct}%</div>
                  <div className="score-label">Score</div>
                </div>
              </div>
              <h3 style={{ fontSize: 20, fontFamily: 'var(--font-display)', fontWeight: 700, marginBottom: 8 }}>
                {pct >= 80 ? '🎉 Excellent!' : pct >= 60 ? '👍 Good job!' : pct >= 40 ? '📚 Keep studying!' : '💪 Don\'t give up!'}
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: 15 }}>
                You got <strong>{state.score}</strong> out of <strong>{total}</strong> questions correct.
              </p>
            </div>

            {/* Review Answers */}
            <div className="flex flex-col gap-12 mt-24">
              {quiz.questions.map((q, idx) => {
                const userAnswer = state.answers[q.id]
                const isCorrect = userAnswer === q.correctAnswer
                return (
                  <div key={q.id} style={{
                    padding: 16,
                    borderRadius: 'var(--radius-md)',
                    background: isCorrect ? 'rgba(0, 212, 170, 0.06)' : 'rgba(255, 71, 87, 0.06)',
                    border: `1px solid ${isCorrect ? 'rgba(0, 212, 170, 0.2)' : 'rgba(255, 71, 87, 0.2)'}`,
                  }}>
                    <div className="flex items-center gap-8" style={{ marginBottom: 6 }}>
                      {isCorrect
                        ? <CheckCircle2 style={{ width: 16, height: 16, color: 'var(--accent-secondary)' }} />
                        : <XCircle style={{ width: 16, height: 16, color: 'var(--accent-danger)' }} />}
                      <span style={{ fontSize: 13, fontWeight: 600 }}>Q{idx + 1}: {q.question}</span>
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--text-secondary)', paddingLeft: 24 }}>
                      {!isCorrect && userAnswer !== undefined && (
                        <div>Your answer: <span style={{ color: 'var(--accent-danger)' }}>{q.options[userAnswer]}</span></div>
                      )}
                      <div>Correct: <span style={{ color: 'var(--accent-secondary)' }}>{q.options[q.correctAnswer]}</span></div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
          <div className="modal-footer">
            <button className="btn btn-gradient" onClick={onClose}>
              Done
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">{quiz.title}</h2>
          <button className="btn btn-icon btn-outline" onClick={onClose}><X /></button>
        </div>
        <div className="modal-body">
          {/* Progress */}
          <div style={{ marginBottom: 24 }}>
            <div className="flex items-center justify-between" style={{ marginBottom: 8 }}>
              <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                Question {state.currentQ + 1} of {total}
              </span>
              <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                {Object.keys(state.answers).length}/{total} answered
              </span>
            </div>
            <div className="quiz-progress">
              <div className="quiz-progress-fill" style={{ width: `${progress}%` }} />
            </div>
          </div>

          {/* Question */}
          <h3 style={{
            fontSize: 18,
            fontWeight: 600,
            fontFamily: 'var(--font-display)',
            marginBottom: 20,
            lineHeight: 1.5,
          }}>
            {question.question}
          </h3>

          {/* Options */}
          <div className="flex flex-col gap-12">
            {question.options.map((opt, idx) => {
              const letters = ['A', 'B', 'C', 'D']
              const isSelected = state.answers[question.id] === idx
              return (
                <div
                  key={idx}
                  className={`quiz-option ${isSelected ? 'selected' : ''}`}
                  onClick={() => onSelect(question.id, idx)}
                >
                  <div className="quiz-option-letter">{letters[idx]}</div>
                  <span style={{ fontSize: 14, fontWeight: 500 }}>{opt}</span>
                </div>
              )
            })}
          </div>
        </div>

        <div className="modal-footer">
          <button
            className="btn btn-outline"
            onClick={onPrev}
            disabled={state.currentQ === 0}
          >
            Previous
          </button>
          <div style={{ flex: 1 }} />
          {state.currentQ < total - 1 ? (
            <button className="btn btn-primary" onClick={onNext}>
              Next <ArrowRight style={{ width: 16, height: 16 }} />
            </button>
          ) : (
            <button
              className="btn btn-gradient"
              onClick={onSubmit}
              disabled={!allAnswered}
              title={allAnswered ? '' : 'Answer all questions first'}
            >
              <Trophy style={{ width: 16, height: 16 }} /> Submit Quiz
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function CreateQuizModal({ onClose, onSave }) {
  const [title, setTitle] = useState('')
  const [subject, setSubject] = useState('')
  const [timeLimit, setTimeLimit] = useState(10)
  const [questions, setQuestions] = useState([
    { id: 'new-1', question: '', options: ['', '', '', ''], correctAnswer: 0 },
  ])

  const addQuestion = () => {
    setQuestions(prev => [...prev, {
      id: 'new-' + (prev.length + 1),
      question: '',
      options: ['', '', '', ''],
      correctAnswer: 0,
    }])
  }

  const updateQuestion = (idx, field, value) => {
    setQuestions(prev => prev.map((q, i) => i === idx ? { ...q, [field]: value } : q))
  }

  const updateOption = (qIdx, optIdx, value) => {
    setQuestions(prev => prev.map((q, i) => {
      if (i !== qIdx) return q
      const opts = [...q.options]
      opts[optIdx] = value
      return { ...q, options: opts }
    }))
  }

  const removeQuestion = (idx) => {
    if (questions.length <= 1) return
    setQuestions(prev => prev.filter((_, i) => i !== idx))
  }

  const handleSave = () => {
    if (!title.trim()) return
    const validQs = questions.filter(q => q.question.trim() && q.options.every(o => o.trim()))
    if (validQs.length === 0) return
    onSave({
      title: title.trim(),
      subject: subject.trim() || 'General',
      timeLimit,
      questions: validQs,
    })
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-lg" onClick={e => e.stopPropagation()} style={{ maxHeight: '90vh' }}>
        <div className="modal-header">
          <h2 className="modal-title">Create New Quiz</h2>
          <button className="btn btn-icon btn-outline" onClick={onClose}><X /></button>
        </div>
        <div className="modal-body">
          <div className="flex flex-col gap-20">
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Quiz Title</label>
                <input
                  className="form-input"
                  placeholder="e.g. HTML Fundamentals"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  id="input-quiz-title"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Subject</label>
                <input
                  className="form-input"
                  placeholder="e.g. Web Development"
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                  id="input-quiz-subject"
                />
              </div>
            </div>

            <div className="form-group" style={{ maxWidth: 200 }}>
              <label className="form-label">Time Limit (minutes)</label>
              <input
                type="number"
                className="form-input"
                value={timeLimit}
                onChange={e => setTimeLimit(Number(e.target.value))}
                min={1}
                max={120}
                id="input-quiz-time"
              />
            </div>

            {/* Questions */}
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, fontFamily: 'var(--font-display)' }}>
                Questions ({questions.length})
              </h3>

              <div className="flex flex-col gap-20">
                {questions.map((q, qIdx) => (
                  <div
                    key={q.id}
                    style={{
                      padding: 20,
                      background: 'var(--bg-card)',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-color)',
                    }}
                  >
                    <div className="flex items-center justify-between mb-16">
                      <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent-primary)' }}>
                        Question {qIdx + 1}
                      </span>
                      {questions.length > 1 && (
                        <button
                          className="btn btn-icon btn-outline btn-sm"
                          onClick={() => removeQuestion(qIdx)}
                        >
                          <Trash2 style={{ width: 14, height: 14, color: 'var(--accent-danger)' }} />
                        </button>
                      )}
                    </div>

                    <div className="form-group mb-16">
                      <input
                        className="form-input"
                        placeholder="Enter your question..."
                        value={q.question}
                        onChange={e => updateQuestion(qIdx, 'question', e.target.value)}
                      />
                    </div>

                    <div className="flex flex-col gap-8">
                      {q.options.map((opt, optIdx) => (
                        <div key={optIdx} className="flex items-center gap-8">
                          <button
                            onClick={() => updateQuestion(qIdx, 'correctAnswer', optIdx)}
                            style={{
                              width: 28,
                              height: 28,
                              borderRadius: 'var(--radius-full)',
                              background: q.correctAnswer === optIdx
                                ? 'var(--accent-secondary)'
                                : 'var(--bg-input)',
                              border: `2px solid ${q.correctAnswer === optIdx
                                ? 'var(--accent-secondary)'
                                : 'var(--border-color)'}`,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                              cursor: 'pointer',
                              transition: 'all 0.2s ease',
                            }}
                            title="Mark as correct answer"
                          >
                            {q.correctAnswer === optIdx && (
                              <CheckCircle2 style={{ width: 14, height: 14, color: 'white' }} />
                            )}
                          </button>
                          <input
                            className="form-input"
                            placeholder={`Option ${['A', 'B', 'C', 'D'][optIdx]}`}
                            value={opt}
                            onChange={e => updateOption(qIdx, optIdx, e.target.value)}
                            style={{ flex: 1 }}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <button className="btn btn-outline mt-16" onClick={addQuestion}>
                <Plus /> Add Question
              </button>
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-outline" onClick={onClose}>Cancel</button>
          <button className="btn btn-gradient" onClick={handleSave} id="btn-save-quiz">
            <BrainCircuit style={{ width: 16, height: 16 }} /> Create Quiz
          </button>
        </div>
      </div>
    </div>
  )
}
