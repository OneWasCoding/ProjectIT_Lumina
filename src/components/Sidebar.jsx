import { useApp } from '../context/AppContext.jsx'
import Avatar from './Avatar.jsx'
import {
  BookOpen,
  Layers,
  Award,
  LogOut,
  ArrowLeftRight,
  LayoutDashboard,
  ClipboardList,
  Megaphone,
  UserCircle,
  ChevronRight,
  X,
} from 'lucide-react'

export default function Sidebar({ currentPage, setCurrentPage, open, onClose }) {
  const { profile, user, logout, selectedSubject, setSelectedSubject, currentTopic } = useApp()

  const displayName = profile?.full_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User'
  const displayRole = profile?.role || user?.user_metadata?.role || 'student'
  const displayYear = profile?.year_level || user?.user_metadata?.year_level || ''

  const navItems = selectedSubject
    ? [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'toc', label: 'Lessons', icon: Layers },
        ...(currentTopic
          ? [{ id: 'study', label: `Topic #${currentTopic.order_number}: Study`, icon: BookOpen }]
          : []),
        { id: 'assignments', label: 'Assignments', icon: ClipboardList },
        { id: 'announcements', label: 'Announcements', icon: Megaphone },
        { id: 'scores', label: 'Scores & Reports', icon: Award },
      ]
    : [{ id: 'dashboard', label: 'My Subjects', icon: Layers }]

  return (
    <aside className={`sidebar ${open ? 'open' : ''}`} aria-label="Main navigation">
      {/* Brand Header */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">L</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <span className="sidebar-logo-text">Lumina</span>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 500, letterSpacing: '0.04em' }}>
            LEARNING SYSTEM
          </div>
        </div>
        {onClose && (
          <button
            type="button"
            className="sidebar-close-btn"
            onClick={onClose}
            aria-label="Close navigation menu"
          >
            <X style={{ width: 18, height: 18 }} />
          </button>
        )}
      </div>

      {/* Current Active Subject Card */}
      {selectedSubject && (
        <div className="sidebar-subject-pill">
          <div className="subject-pill-label">CURRENT SUBJECT</div>
          <div className="subject-pill-name">{selectedSubject.name}</div>
          <div className="subject-pill-year">{selectedSubject.year_level}</div>
          <button
            className="subject-pill-switch-btn"
            onClick={() => {
              setSelectedSubject(null)
              setCurrentPage('dashboard')
            }}
            id="btn-switch-subject"
          >
            <ArrowLeftRight style={{ width: 12, height: 12 }} />
            Switch Subject
          </button>
        </div>
      )}

      {/* Main Navigation Links */}
      <nav className="sidebar-nav">
        <span className="sidebar-section-label">{selectedSubject ? 'Course' : 'Navigation'}</span>
        {navItems.map((item) => (
          <button
            key={item.id}
            className={`nav-link ${currentPage === item.id ? 'active' : ''}`}
            onClick={() => setCurrentPage(item.id)}
            id={`nav-${item.id}`}
          >
            <item.icon style={{ width: 18, height: 18 }} />
            {item.label}
          </button>
        ))}

        <span className="sidebar-section-label">Account</span>
        <button
          className={`nav-link ${currentPage === 'profile' ? 'active' : ''}`}
          onClick={() => setCurrentPage('profile')}
          id="nav-profile"
        >
          <UserCircle style={{ width: 18, height: 18 }} />
          Profile & Settings
        </button>
      </nav>

      {/* User Info & Logout Footer */}
      <div className="sidebar-footer">
        <button className="sidebar-user" onClick={() => setCurrentPage('profile')} title="Open your profile">
          <Avatar name={displayName} url={profile?.avatar_url} size={36} />
          <div className="sidebar-user-info">
            <div className="sidebar-user-name">{displayName}</div>
            <div className="sidebar-user-role">
              {displayRole} {displayYear && `· ${displayYear}`}
            </div>
          </div>
          <ChevronRight style={{ width: 16, height: 16, color: 'var(--text-muted)' }} />
        </button>

        <button
          className="nav-link mt-8"
          onClick={logout}
          id="btn-logout"
          style={{ color: 'var(--accent-danger)' }}
        >
          <LogOut style={{ width: 18, height: 18 }} />
          Sign Out
        </button>
      </div>
    </aside>
  )
}
