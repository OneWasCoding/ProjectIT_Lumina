import { useApp } from '../context/AppContext.jsx'
import {
  Presentation,
  BrainCircuit,
  ImageIcon,
  Trophy,
  TrendingUp,
  Clock,
} from 'lucide-react'

export default function Dashboard() {
  const { user, presentations, quizzes, gallery, quizResults } = useApp()

  const myResults = quizResults.filter(r => r.studentName === user?.name)
  const avgScore = myResults.length > 0
    ? Math.round(myResults.reduce((s, r) => s + (r.score / r.total) * 100, 0) / myResults.length)
    : 0

  return (
    <>
      <div className="page-header">
        <div className="page-header-inner">
          <div>
            <h1 className="page-title">
              Welcome back, {user?.name} 👋
            </h1>
            <p className="page-subtitle">
              Here's what's happening in your learning space
            </p>
          </div>
        </div>
      </div>

      <div className="page-body">
        {/* Stat Cards */}
        <div className="grid-4 mb-24">
          <div className="stat-card animate-in stagger-1" style={{ opacity: 0 }}>
            <div className="stat-icon purple">
              <Presentation />
            </div>
            <div>
              <div className="stat-value">{presentations.length}</div>
              <div className="stat-label">Presentations</div>
            </div>
          </div>

          <div className="stat-card animate-in stagger-2" style={{ opacity: 0 }}>
            <div className="stat-icon green">
              <BrainCircuit />
            </div>
            <div>
              <div className="stat-value">{quizzes.length}</div>
              <div className="stat-label">Quizzes Available</div>
            </div>
          </div>

          <div className="stat-card animate-in stagger-3" style={{ opacity: 0 }}>
            <div className="stat-icon pink">
              <ImageIcon />
            </div>
            <div>
              <div className="stat-value">{gallery.length}</div>
              <div className="stat-label">Gallery Posts</div>
            </div>
          </div>

          <div className="stat-card animate-in stagger-4" style={{ opacity: 0 }}>
            <div className="stat-icon yellow">
              <Trophy />
            </div>
            <div>
              <div className="stat-value">
                {user?.role === 'student' ? `${avgScore}%` : myResults.length}
              </div>
              <div className="stat-label">
                {user?.role === 'student' ? 'Avg. Score' : 'Quiz Submissions'}
              </div>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="grid-2">
          {/* Recent Presentations */}
          <div className="card">
            <div className="flex items-center justify-between mb-16">
              <h2 style={{ fontSize: 18, fontFamily: 'var(--font-display)', fontWeight: 700 }}>
                Recent Presentations
              </h2>
              <Presentation style={{ width: 20, height: 20, color: 'var(--accent-primary)' }} />
            </div>
            {presentations.slice(0, 3).map((pres) => (
              <div
                key={pres.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '12px 0',
                  borderBottom: '1px solid var(--border-color)',
                }}
              >
                <div style={{
                  width: 40,
                  height: 40,
                  borderRadius: 'var(--radius-sm)',
                  background: 'rgba(124, 92, 252, 0.12)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <Presentation style={{ width: 20, height: 20, color: 'var(--accent-primary)' }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {pres.title}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    {pres.slideCount} slides · {pres.uploadedAt}
                  </div>
                </div>
              </div>
            ))}
            {presentations.length === 0 && (
              <p style={{ color: 'var(--text-muted)', fontSize: 14, padding: '20px 0', textAlign: 'center' }}>
                No presentations yet
              </p>
            )}
          </div>

          {/* Recent Quizzes */}
          <div className="card">
            <div className="flex items-center justify-between mb-16">
              <h2 style={{ fontSize: 18, fontFamily: 'var(--font-display)', fontWeight: 700 }}>
                Available Quizzes
              </h2>
              <BrainCircuit style={{ width: 20, height: 20, color: 'var(--accent-secondary)' }} />
            </div>
            {quizzes.slice(0, 3).map((quiz) => (
              <div
                key={quiz.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '12px 0',
                  borderBottom: '1px solid var(--border-color)',
                }}
              >
                <div style={{
                  width: 40,
                  height: 40,
                  borderRadius: 'var(--radius-sm)',
                  background: 'rgba(0, 212, 170, 0.12)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <BrainCircuit style={{ width: 20, height: 20, color: 'var(--accent-secondary)' }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {quiz.title}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    {quiz.questions.length} questions · {quiz.subject}
                  </div>
                </div>
                <span className="badge badge-green">{quiz.timeLimit}m</span>
              </div>
            ))}
            {quizzes.length === 0 && (
              <p style={{ color: 'var(--text-muted)', fontSize: 14, padding: '20px 0', textAlign: 'center' }}>
                No quizzes yet
              </p>
            )}
          </div>
        </div>

        {/* Quick Actions for Teachers */}
        {user?.role === 'teacher' && (
          <div className="mt-24">
            <h2 style={{ fontSize: 18, fontFamily: 'var(--font-display)', fontWeight: 700, marginBottom: 16 }}>
              Quick Actions
            </h2>
            <div className="grid-3">
              <div className="card" style={{ cursor: 'pointer', textAlign: 'center', padding: 32 }}>
                <Presentation style={{ width: 40, height: 40, color: 'var(--accent-primary)', margin: '0 auto 12px' }} />
                <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>Upload Presentation</h3>
                <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Share slides with your class</p>
              </div>
              <div className="card" style={{ cursor: 'pointer', textAlign: 'center', padding: 32 }}>
                <BrainCircuit style={{ width: 40, height: 40, color: 'var(--accent-secondary)', margin: '0 auto 12px' }} />
                <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>Create Quiz</h3>
                <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Test your students' knowledge</p>
              </div>
              <div className="card" style={{ cursor: 'pointer', textAlign: 'center', padding: 32 }}>
                <ImageIcon style={{ width: 40, height: 40, color: 'var(--accent-tertiary)', margin: '0 auto 12px' }} />
                <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>Post Activity</h3>
                <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Share photos & activities</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
