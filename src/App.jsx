import { useState, useEffect } from 'react'
import { Menu } from 'lucide-react'
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
import Toast from './components/Toast.jsx'

function AppContent() {
  const { user, loading, selectedSubject, currentTopic, setCurrentTopic, toast } = useApp()
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

  return (
    <div className="app-layout">
      <button
        className="mobile-menu-btn"
        onClick={() => setMenuOpen(true)}
        aria-label="Open navigation menu"
        id="btn-open-menu"
      >
        <Menu />
      </button>
      {menuOpen && <div className="sidebar-backdrop" onClick={() => setMenuOpen(false)} />}

      <Sidebar currentPage={currentPage} setCurrentPage={navigate} open={menuOpen} />

      <main className="main-content">{renderPage()}</main>
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
