import { useState, useEffect, useCallback } from 'react'
import { useApp } from '../context/AppContext.jsx'
import {
  BookOpen,
  CheckCircle2,
  XCircle,
  Circle,
  ArrowLeft,
  Plus,
  X,
  ChevronRight,
  Lock,
  Play,
  Award,
} from 'lucide-react'

export default function TableOfContents({ onSelectTopic }) {
  const {
    profile, selectedSubject, setSelectedSubject,
    topics, fetchTopics, addTopic, quizResults, fetchMyResults, quizzes, fetchSubjectQuizzes,
    showToast,
  } = useApp()
  const [showCreate, setShowCreate] = useState(false)
  const [topicStatuses, setTopicStatuses] = useState({})
  const [quizzesLoaded, setQuizzesLoaded] = useState(false)
  const isFaculty = profile?.role === 'faculty'

  useEffect(() => {
    if (selectedSubject) {
      fetchTopics(selectedSubject.id)
      if (!isFaculty) fetchMyResults()
    }
  }, [selectedSubject, fetchTopics, fetchMyResults, isFaculty])

  // Load which topics have a quiz so topics without one never block progress
  useEffect(() => {
    if (topics.length && !isFaculty) {
      setQuizzesLoaded(false)
      fetchSubjectQuizzes(topics.map(t => t.id)).then(() => setQuizzesLoaded(true))
    }
  }, [topics, isFaculty, fetchSubjectQuizzes])

  // Check pass/fail status for each topic
  useEffect(() => {
    if (!topics.length || isFaculty) return

    const statuses = {}
    topics.forEach(topic => {
      if (quizzesLoaded && !quizzes.some(q => q.topic_id === topic.id)) {
        statuses[topic.id] = 'no_quiz'
        return
      }
      const topicResults = quizResults.filter(r => r.quizzes?.topic_id === topic.id)

      if (topicResults.length === 0) {
        statuses[topic.id] = 'not_taken'
      } else {
        const hasPassed = topicResults.some(r => r.passed)
        statuses[topic.id] = hasPassed ? 'passed' : 'failed'
      }
    })
    setTopicStatuses(statuses)
  }, [topics, quizzes, quizzesLoaded, quizResults, isFaculty])

  // Determine if a topic is locked (previous topics not passed with 75%)
  const isTopicLocked = useCallback((topicIndex) => {
    if (isFaculty) return false
    if (topicIndex === 0) return false // Topic 1 is always unlocked

    for (let i = 0; i < topicIndex; i++) {
      const prevTopic = topics[i]
      const status = topicStatuses[prevTopic.id]
      if (status !== 'passed' && status !== 'no_quiz') {
        return true
      }
    }
    return false
  }, [topics, topicStatuses, isFaculty])

  const handleSelectTopic = (topic, index) => {
    if (isTopicLocked(index)) {
      showToast('❌ Locked: You must score at least 75% on the previous topic quiz to unlock this unit!', 'error')
      return
    }
    onSelectTopic(topic)
  }

  const getStatusBadge = (topicId) => {
    const status = topicStatuses[topicId]
    if (status === 'no_quiz') {
      return <span className="badge badge-purple">No quiz yet</span>
    }
    if (status === 'passed') {
      return (
        <span className="badge badge-green flex items-center gap-4">
          <CheckCircle2 style={{ width: 12, height: 12 }} /> Passed (≥75%)
        </span>
      )
    }
    if (status === 'failed') {
      return (
        <span className="badge badge-danger flex items-center gap-4">
          <XCircle style={{ width: 12, height: 12 }} /> Failed (&lt;75%)
        </span>
      )
    }
    return (
      <span className="badge badge-yellow flex items-center gap-4">
        <Circle style={{ width: 10, height: 10 }} /> Not Taken
      </span>
    )
  }

  const firstTopic = topics[0]

  return (
    <>
      <div className="page-header">
        <div className="page-header-inner">
          <div className="flex items-center gap-12">
            <button
              className="btn btn-icon btn-outline"
              onClick={() => setSelectedSubject(null)}
              title="Back to subjects"
              id="btn-back-subjects"
            >
              <ArrowLeft />
            </button>
            <div>
              <h1 className="page-title">{selectedSubject?.name}</h1>
              <p className="page-subtitle">
                {selectedSubject?.year_level} · Table of Contents & Lesson Sequence
              </p>
            </div>
          </div>
          {isFaculty && (
            <button className="btn btn-gradient" onClick={() => setShowCreate(true)} id="btn-create-topic">
              <Plus /> Add Topic
            </button>
          )}
        </div>
      </div>

      <div className="page-body">
        {/* Default Selection Quick-Card (Requirement: "Default to number 1 selection") */}
        {firstTopic && (
          <div className="toc-default-hero card mb-24">
            <div className="toc-default-glow" />
            <div className="flex items-center justify-between" style={{ flexWrap: 'wrap', gap: 16 }}>
              <div>
                <div className="flex items-center gap-8 mb-6">
                  <span className="badge badge-purple">Default Selection</span>
                  <span className="badge badge-green">Ready to Study</span>
                  {!isFaculty && getStatusBadge(firstTopic.id)}
                </div>
                <h2 className="toc-hero-heading">{firstTopic.title}</h2>
                <p className="toc-hero-sub">
                  {firstTopic.summary || 'Start here! Read lesson notes, review presentation slides, write custom insights, and complete the 10-minute quiz.'}
                </p>
              </div>

              <button
                className="btn btn-gradient btn-lg flex items-center gap-8"
                onClick={() => handleSelectTopic(firstTopic, 0)}
                id="btn-open-topic-1"
              >
                <Play style={{ width: 18, height: 18 }} />
                Open Topic 1
              </button>
            </div>
          </div>
        )}

        {/* Topic List */}
        <div className="flex items-center justify-between mb-16">
          <h2 className="section-title">All Topics & Learning Modules</h2>
          <span className="text-muted" style={{ fontSize: 13 }}>
            Passing score of 75% required to unlock subsequent topics
          </span>
        </div>

        {topics.length === 0 ? (
          <div className="empty-state">
            <BookOpen />
            <h3>No Topics Yet</h3>
            <p>
              {isFaculty
                ? 'Add your first topic to this subject.'
                : 'No lessons are available for this subject yet.'}
            </p>
          </div>
        ) : (
          <div className="toc-list">
            {topics.map((topic, index) => {
              const locked = isTopicLocked(index)
              const isDefault = index === 0

              return (
                <div
                  key={topic.id}
                  className={`toc-item ${locked ? 'locked' : ''} ${isDefault ? 'default-first' : ''}`}
                  onClick={() => handleSelectTopic(topic, index)}
                  id={`topic-${topic.id}`}
                >
                  <div className="toc-number">
                    {locked ? <Lock style={{ width: 20, height: 20 }} /> : topic.order_number}
                  </div>

                  <div className="toc-info">
                    <div className="flex items-center gap-8 mb-4">
                      <h3 className="toc-title">{topic.title}</h3>
                      {isDefault && <span className="badge badge-purple" style={{ fontSize: 10 }}>Default #1</span>}
                      {!isFaculty && !locked && getStatusBadge(topic.id)}
                    </div>
                    {topic.summary && (
                      <p className="toc-summary">{topic.summary}</p>
                    )}
                    {locked && (
                      <p className="toc-locked-hint">
                        🔒 Locked: Pass Topic #{index} assessment with ≥75% to unlock
                      </p>
                    )}
                  </div>

                  <div className="toc-right">
                    {locked ? (
                      <div className="badge badge-danger flex items-center gap-4">
                        <Lock style={{ width: 12, height: 12 }} /> Locked
                      </div>
                    ) : (
                      <div className="flex items-center gap-8">
                        <span className="toc-open-label">Open Topic</span>
                        <ChevronRight style={{ width: 18, height: 18, color: 'var(--accent-primary)' }} />
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Create Topic Modal */}
      {showCreate && (
        <CreateTopicModal
          subjectId={selectedSubject.id}
          nextOrder={topics.length + 1}
          onClose={() => setShowCreate(false)}
          onSave={addTopic}
        />
      )}
    </>
  )
}

function CreateTopicModal({ subjectId, nextOrder, onClose, onSave }) {
  const [title, setTitle] = useState('')
  const [summary, setSummary] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!title.trim()) return
    setSaving(true)
    const { error } = await onSave(subjectId, title.trim(), summary.trim(), nextOrder)
    setSaving(false)
    if (!error) onClose()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Add New Topic</h2>
          <button className="btn btn-icon btn-outline" onClick={onClose}><X /></button>
        </div>
        <div className="modal-body">
          <div className="flex flex-col gap-20">
            <div className="form-group">
              <label className="form-label">Topic Title</label>
              <input
                className="form-input"
                placeholder="e.g. Topic 4: Cloud Infrastructure & Networking"
                value={title}
                onChange={e => setTitle(e.target.value)}
                id="input-topic-title"
                autoFocus
              />
            </div>
            <div className="form-group">
              <label className="form-label">Summary (optional)</label>
              <textarea
                className="form-textarea"
                rows={4}
                placeholder="Brief summary of what this topic covers..."
                value={summary}
                onChange={e => setSummary(e.target.value)}
                id="input-topic-summary"
              />
            </div>
            <div className="badge badge-purple" style={{ alignSelf: 'flex-start' }}>
              Assigned Order: Topic #{nextOrder}
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-outline" onClick={onClose}>Cancel</button>
          <button
            className="btn btn-gradient"
            onClick={handleSave}
            disabled={!title.trim() || saving}
            id="btn-save-topic"
          >
            {saving ? <span className="btn-loader" /> : 'Create Topic'}
          </button>
        </div>
      </div>
    </div>
  )
}
