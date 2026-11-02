import { useEffect, useMemo } from 'react'
import { useApp } from '../context/AppContext.jsx'
import { timeAgo } from './AnnouncementsPage.jsx'
import { studentAssignmentStatus } from './AssignmentsPage.jsx'
import {
  Layers,
  Award,
  ClipboardList,
  Megaphone,
  GraduationCap,
  BookOpen,
  ArrowRight,
  Clock,
  CheckCircle2,
  Users,
} from 'lucide-react'

const formatDue = (iso) =>
  iso ? new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : 'No due date'

export default function DashboardPage({ onNavigate }) {
  const {
    user, profile, selectedSubject,
    topics, fetchTopics, quizzes, fetchSubjectQuizzes,
    quizResults, fetchMyResults, allResults, fetchAllResults,
    announcements, fetchAnnouncements,
    assignments, fetchAssignments,
    submissions, fetchSubmissions,
  } = useApp()

  const isFaculty = profile?.role === 'faculty'
  const subjectId = selectedSubject?.id

  useEffect(() => {
    if (!subjectId) return
    // Avoid refetching topics (it resets the open topic) if they are already loaded for this subject
    if (!topics.length || topics[0].subject_id !== subjectId) fetchTopics(subjectId)
    fetchAnnouncements(subjectId)
    fetchAssignments(subjectId)
    fetchSubmissions(subjectId)
    if (isFaculty) fetchAllResults()
    else fetchMyResults()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subjectId, isFaculty])

  // Know which topics actually have a quiz so progress is only measured against those
  useEffect(() => {
    if (topics.length && topics[0].subject_id === subjectId) fetchSubjectQuizzes(topics.map(t => t.id))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topics, subjectId])

  const subjectAnnouncements = useMemo(
    () =>
      announcements
        .filter(a => a.subject_id === subjectId)
        .sort((a, b) => Number(b.pinned) - Number(a.pinned) || new Date(b.created_at) - new Date(a.created_at)),
    [announcements, subjectId]
  )
  const subjectAssignments = useMemo(() => assignments.filter(a => a.subject_id === subjectId), [assignments, subjectId])
  const subjectSubmissions = useMemo(() => submissions.filter(s => s.subject_id === subjectId), [submissions, subjectId])

  const topicIds = useMemo(() => new Set(topics.map(t => t.id)), [topics])

  const firstName = (profile?.full_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'there').split(' ')[0]
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'

  const content = isFaculty
    ? <FacultyDashboard
        topics={topics}
        assignments={subjectAssignments}
        submissions={subjectSubmissions}
        announcements={subjectAnnouncements}
        results={allResults.filter(r => topicIds.has(r.quizzes?.topic_id))}
        onNavigate={onNavigate}
      />
    : <StudentDashboard
        user={user}
        topics={topics}
        quizzes={quizzes}
        assignments={subjectAssignments}
        submissions={subjectSubmissions}
        announcements={subjectAnnouncements}
        results={quizResults.filter(r => topicIds.has(r.quizzes?.topic_id))}
        onNavigate={onNavigate}
      />

  return (
    <>
      <div className="page-header">
        <div className="page-header-inner">
          <div>
            <h1 className="page-title">{greeting}, {firstName}</h1>
            <p className="page-subtitle">
              {selectedSubject?.name} · {selectedSubject?.year_level}
            </p>
          </div>
        </div>
      </div>
      <div className="page-body">{content}</div>
    </>
  )
}

function StatCard({ icon: Icon, tone, value, label }) {
  return (
    <div className="stat-card">
      <div className={`stat-icon ${tone}`}><Icon /></div>
      <div>
        <div className="stat-value">{value}</div>
        <div className="stat-label">{label}</div>
      </div>
    </div>
  )
}

function AnnouncementPreview({ announcements, onNavigate }) {
  return (
    <div className="section-card">
      <div className="flex items-center justify-between mb-16">
        <h2 className="section-subheading">Latest announcements</h2>
        <button className="link-btn" onClick={() => onNavigate('announcements')}>View all <ArrowRight /></button>
      </div>
      {announcements.length === 0 ? (
        <div className="empty-state-mini">No announcements yet.</div>
      ) : (
        <div className="mini-list">
          {announcements.slice(0, 3).map(a => (
            <div key={a.id} className="mini-item">
              <div className="mini-item-title">{a.title}</div>
              <div className="mini-item-sub">{a.author?.full_name || 'Instructor'} · {timeAgo(a.created_at)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function StudentDashboard({ user, topics, quizzes = [], assignments, submissions, announcements, results, onNavigate }) {
  const passedTopics = new Set(results.filter(r => r.passed).map(r => r.quizzes?.topic_id))
  // Only topics that have a quiz count towards progress (and can be "continued")
  const quizTopics = topics.filter(t => quizzes.some(q => q.topic_id === t.id))
  const doneCount = quizTopics.filter(t => passedTopics.has(t.id)).length
  const progress = quizTopics.length ? Math.round((doneCount / quizTopics.length) * 100) : 0
  const avg = (() => {
    const graded = results.filter(r => !r.answers?.external)
    return graded.length
      ? Math.round(graded.reduce((a, r) => a + (Number(r.percentage) || 0), 0) / graded.length)
      : 0
  })()

  const mine = submissions.filter(s => s.student_id === user?.id)
  const subFor = (id) => mine.find(s => s.assignment_id === id)
  const pending = assignments
    .filter(a => !subFor(a.id))
    .sort((a, b) => (a.due_date ? new Date(a.due_date) : Infinity) - (b.due_date ? new Date(b.due_date) : Infinity))

  const nextTopic = quizTopics.find(t => !passedTopics.has(t.id))

  return (
    <>
      <div className="grid-4 mb-24">
        <StatCard icon={Layers} tone="purple" value={`${progress}%`} label="Course progress" />
        <StatCard icon={GraduationCap} tone="yellow" value={`${avg}%`} label="Average quiz score" />
        <StatCard icon={ClipboardList} tone="pink" value={pending.length} label="Assignments to do" />
        <StatCard icon={Megaphone} tone="green" value={announcements.length} label="Announcements" />
      </div>

      <div className="card progress-card mb-24">
        <div className="flex items-center justify-between mb-12" style={{ flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h2 className="section-subheading">Your progress</h2>
            <p className="section-subtitle">
              {topics.length === 0
                ? 'No topics have been published for this subject yet.'
                : quizTopics.length === 0
                  ? `${topics.length} topic(s) published · no topic quizzes required yet`
                  : `${doneCount} of ${quizTopics.length} topic quiz${quizTopics.length === 1 ? '' : 'zes'} passed`}
            </p>
          </div>
          {nextTopic && (
            <button className="btn btn-gradient" onClick={() => onNavigate('toc')} id="btn-continue-learning">
              <BookOpen /> Continue: {nextTopic.title.length > 36 ? `${nextTopic.title.slice(0, 36)}…` : nextTopic.title}
            </button>
          )}
          {quizTopics.length > 0 && !nextTopic && (
            <span className="badge badge-green"><CheckCircle2 style={{ width: 12, height: 12, marginRight: 4 }} /> All topic quizzes passed</span>
          )}
        </div>
        <div className="quiz-progress"><div className="quiz-progress-fill" style={{ width: `${progress}%` }} /></div>
      </div>

      <div className="grid-2-custom">
        <div className="section-card">
          <div className="flex items-center justify-between mb-16">
            <h2 className="section-subheading">To do</h2>
            <button className="link-btn" onClick={() => onNavigate('assignments')}>All assignments <ArrowRight /></button>
          </div>
          {pending.length === 0 ? (
            <div className="empty-state-mini">You're all caught up. 🎉</div>
          ) : (
            <div className="mini-list">
              {pending.slice(0, 4).map(a => {
                const status = studentAssignmentStatus(a, undefined)
                return (
                  <button key={a.id} className="mini-item mini-item-btn" onClick={() => onNavigate('assignments')}>
                    <div className="mini-item-title">{a.title}</div>
                    <div className="mini-item-sub"><Clock /> {formatDue(a.due_date)} · {a.max_points} pts</div>
                    <span className={`badge ${status.cls}`}>{status.label}</span>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        <AnnouncementPreview announcements={announcements} onNavigate={onNavigate} />
      </div>
    </>
  )
}

function FacultyDashboard({ topics, assignments, submissions, announcements, results, onNavigate }) {
  const toGrade = submissions.filter(s => s.status !== 'graded')
  const studentCount = new Set(submissions.map(s => s.student_id).concat(results.map(r => r.student_id))).size
  const gradedResults = results.filter(r => !r.answers?.external)
  const classAvg = gradedResults.length
    ? Math.round(gradedResults.reduce((a, r) => a + (Number(r.percentage) || 0), 0) / gradedResults.length)
    : 0
  const titleOf = (id) => assignments.find(a => a.id === id)?.title || 'Assignment'

  return (
    <>
      <div className="grid-4 mb-24">
        <StatCard icon={BookOpen} tone="purple" value={topics.length} label="Topics" />
        <StatCard icon={ClipboardList} tone="pink" value={assignments.length} label="Assignments" />
        <StatCard icon={Award} tone="yellow" value={toGrade.length} label="Waiting to be graded" />
        <StatCard icon={Users} tone="green" value={studentCount} label="Active students" />
      </div>

      <div className="grid-2-custom">
        <div className="section-card">
          <div className="flex items-center justify-between mb-16">
            <h2 className="section-subheading">Needs grading</h2>
            <button className="link-btn" onClick={() => onNavigate('assignments')}>Open assignments <ArrowRight /></button>
          </div>
          {toGrade.length === 0 ? (
            <div className="empty-state-mini">Nothing waiting to be graded.</div>
          ) : (
            <div className="mini-list">
              {toGrade.slice(0, 5).map(s => (
                <button key={s.id} className="mini-item mini-item-btn" onClick={() => onNavigate('assignments')}>
                  <div className="mini-item-title">{s.student?.full_name || 'Student'}</div>
                  <div className="mini-item-sub">{titleOf(s.assignment_id)} · {timeAgo(s.submitted_at)}</div>
                  {s.status === 'late' && <span className="badge badge-yellow">Late</span>}
                </button>
              ))}
            </div>
          )}
          {results.length > 0 && (
            <p className="section-subtitle mt-16">Class quiz average: <strong>{classAvg}%</strong> across {results.length} attempt{results.length === 1 ? '' : 's'}.</p>
          )}
        </div>

        <AnnouncementPreview announcements={announcements} onNavigate={onNavigate} />
      </div>
    </>
  )
}

