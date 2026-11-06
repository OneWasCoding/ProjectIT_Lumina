import { useState, useEffect } from 'react'
import {
  Menu,
  LayoutDashboard,
  Layers,
  ClipboardList,
  Megaphone,
  Award,
  UserCircle,
  ArrowLeftRight,
} from 'lucide-react'
import { AppProvider, useApp } from './context/AppContext.jsx'
import LoginPage from './pages/LoginPage.jsx'
import SubjectSelector from './pages/SubjectSelector.jsx'
import DashboardPage from './pages/DashboardPage.jsx'
import TableOfContents from './pages/TableOfContents.jsx'
import TopicStudyPage from './pages/TopicStudyPage.jsx'
import AssignmentsPage from './pages/AssignmentsPage.jsx'
import AnnouncementsPage from './pages/AnnouncementsPage.jsx'
import ScoresPage from './pages/ScoresPage.jsx'
import ProfilePage from './pages/ProfilePage.jsx'
import Sidebar from './components/Sidebar.jsx'
import Avatar from './components/Avatar.jsx'
import Toast from './components/Toast.jsx'

function AppContent() {
  const {
    user,
    profile,
    loading,
    selectedSubject,
    setSelectedSubject,
    currentTopic,
    setCurrentTopic,
    toast,
  } = useApp()

  // 'dashboard' | 'toc' | 'study' | 'assignments' | 'announcements' | 'scores' | 'profile'
  const [currentPage, setCurrentPage] = useState('dashboard')
  const [menuOpen, setMenuOpen] = useState(false)
  const subjectId = selectedSubject?.id

  // Land on the dashboard whenever a different subject is opened (but never yank the profile page away)
  useEffect(() => {
    setCurrentPage(page => (page === 'profile' ? page : 'dashboard'))
  }, [subjectId])

  // Reset navigation on sign out
  useEffect(() => {
    if (!user) {
      setCurrentPage('dashboard')
      setMenuOpen(false)
    }
  }, [user])

  const navigate = (page) => {
    setCurrentPage(page)
    setMenuOpen(false)
    window.scrollTo({ top: 0 })
  }

  // Wait for the stored session to be restored so logged-in users don't see a login flash
  if (loading) {
    return (
      <div className="app-layout-guest">
        <span className="btn-loader" style={{ width: 36, height: 36, borderWidth: 3 }} />
      </div>
    )
  }

  // Not authenticated: show Login / Signup
  if (!user) {
    return (
      <div className="app-layout-guest">
        <LoginPage />
        {toast && <Toast message={toast.message} type={toast.type} />}
      </div>
    )
  }

  const displayName =
    profile?.full_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User'

  const handleSelectTopic = (topic) => {
    setCurrentTopic(topic)
    navigate('study')
  }

  const renderPage = () => {
    if (currentPage === 'profile') return <ProfilePage />

    // No subject yet: every other page starts by choosing one
    if (!selectedSubject) {
      return (
        <div className="page-body">
          <SubjectSelector />
        </div>
      )
    }

    switch (currentPage) {
      case 'toc':
        return <TableOfContents onSelectTopic={handleSelectTopic} />
      case 'study':
        return currentTopic
          ? <TopicStudyPage onBackToTOC={() => navigate('toc')} />
          : <TableOfContents onSelectTopic={handleSelectTopic} />
      case 'assignments':
        return <AssignmentsPage />
      case 'announcements':
        return <AnnouncementsPage />
      case 'scores':
        return <ScoresPage />
      case 'dashboard':
      default:
        return <DashboardPage onNavigate={navigate} />
    }
  }

  const mobileBottomItems = selectedSubject
    ? [
        { id: 'dashboard', label: 'Home', icon: LayoutDashboard, active: currentPage === 'dashboard' },
        {
          id: 'toc',
          label: 'Lessons',
          icon: Layers,
          active: currentPage === 'toc' || currentPage === 'study',
        },
        { id: 'assignments', label: 'Tasks', icon: ClipboardList, active: currentPage === 'assignments' },
        { id: 'announcements', label: 'Updates', icon: Megaphone, active: currentPage === 'announcements' },
        { id: 'scores', label: 'Grades', icon: Award, active: currentPage === 'scores' },
      ]
    : [
        { id: 'dashboard', label: 'Subjects', icon: Layers, active: currentPage !== 'profile' },
        { id: 'profile', label: 'Profile', icon: UserCircle, active: currentPage === 'profile' },
      ]

  return (
    <div className="app-layout">
      {menuOpen && <div className="sidebar-backdrop" onClick={() => setMenuOpen(false)} />}

      <Sidebar
        currentPage={currentPage}
        setCurrentPage={navigate}
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
      />

      <main className="main-content">
        {/* Sticky Mobile App Header (visible on <= 768px) */}
        <header className="mobile-topbar">
          <button
            type="button"
            className="mobile-menu-btn"
            onClick={() => setMenuOpen(true)}
            aria-label="Open navigation menu"
            id="btn-open-menu"
          >
            <Menu />
          </button>

          <div className="mobile-topbar-center">
            <div className="mobile-topbar-brand">
              <span className="mobile-topbar-logo">L</span>
              <span className="mobile-topbar-title">
                {selectedSubject ? selectedSubject.name : 'Lumina LMS'}
              </span>
            </div>
            {selectedSubject && (
              <span className="mobile-topbar-sub">{selectedSubject.year_level}</span>
            )}
          </div>

          <div className="mobile-topbar-actions">
            {selectedSubject && (
              <button
                type="button"
                className="mobile-switch-subject-btn"
                onClick={() => {
                  setSelectedSubject(null)
                  navigate('dashboard')
                }}
                title="Switch Subject"
              >
                <ArrowLeftRight style={{ width: 14, height: 14 }} />
                <span>Switch</span>
              </button>
            )}
            <button
              type="button"
              className="mobile-avatar-btn"
              onClick={() => navigate('profile')}
              aria-label="Open profile"
            >
              <Avatar name={displayName} url={profile?.avatar_url} size={32} />
            </button>
          </div>
        </header>

        <div className="main-content-inner">{renderPage()}</div>
      </main>

      {/* Sticky Mobile Bottom Tab Bar (visible on <= 768px) */}
      <nav className="mobile-bottom-nav" aria-label="Mobile quick navigation">
        {mobileBottomItems.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`mobile-bottom-tab ${item.active ? 'active' : ''}`}
            onClick={() => navigate(item.id)}
            id={`mobile-nav-${item.id}`}
          >
            <item.icon className="mobile-bottom-icon" />
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      {toast && <Toast message={toast.message} type={toast.type} />}
    </div>
  )
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  )
}
