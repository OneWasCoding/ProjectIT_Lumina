import { useState, useEffect, useMemo } from 'react'
import { useApp } from '../context/AppContext.jsx'
import { exportToPDF, exportToSpreadsheet, printScores } from '../lib/exportUtils.js'
import {
  FileText,
  Table as TableIcon,
  Printer,
  Search,
  ArrowUpDown,
  CheckCircle2,
  XCircle,
  Filter,
  User,
  GraduationCap,
  Award,
} from 'lucide-react'

export default function ScoresPage() {
  const { profile, user, quizResults, allResults, fetchMyResults, fetchAllResults, showToast } = useApp()
  const isFaculty = profile?.role === 'faculty'

  // Fetch results based on role
  useEffect(() => {
    if (isFaculty) {
      fetchAllResults()
    } else {
      fetchMyResults()
    }
  }, [isFaculty, fetchAllResults, fetchMyResults])

  // Source records: faculty sees all, student sees own
  const rawData = isFaculty ? allResults : quizResults

  // Sort & filter state
  const [sortField, setSortField] = useState('date') // 'name' | 'score' | 'date'
  const [sortOrder, setSortOrder] = useState('desc') // 'asc' | 'desc'
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all') // 'all' | 'passed' | 'failed'

  // Normalize data for display and exports
  const normalizedRows = useMemo(() => {
    const items = (rawData || []).map(r => ({
      id: r.id,
      studentName: r.users_profile?.full_name || profile?.full_name || user?.email?.split('@')[0] || 'Student User',
      quizTitle: r.quizzes?.title || 'Topic Assessment Quiz',
      score: r.score,
      total: r.total_items || 10,
      percentage: r.percentage,
      passed: r.passed,
      submittedAt: r.submitted_at || new Date().toISOString(),
    }))

    // Filtering
    let filtered = items.filter(row => {
      const matchesSearch =
        row.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        row.quizTitle.toLowerCase().includes(searchQuery.toLowerCase())

      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'passed' && row.passed) ||
        (statusFilter === 'failed' && !row.passed)

      return matchesSearch && matchesStatus
    })

    // Sorting: By Name, By Score, or By Date
    filtered.sort((a, b) => {
      if (sortField === 'name') {
        const cmp = a.studentName.localeCompare(b.studentName)
        return sortOrder === 'asc' ? cmp : -cmp
      }
      if (sortField === 'score') {
        const cmp = a.percentage - b.percentage
        return sortOrder === 'asc' ? cmp : -cmp
      }
      if (sortField === 'date') {
        const cmp = new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime()
        return sortOrder === 'asc' ? cmp : -cmp
      }
      return 0
    })

    return filtered
  }, [rawData, profile, user, searchQuery, statusFilter, sortField, sortOrder])

  // Sorting handlers
  const handleSortByName = () => {
    if (sortField === 'name') {
      setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField('name')
      setSortOrder('asc')
    }
  }

  const handleSortByScore = () => {
    if (sortField === 'score') {
      setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField('score')
      setSortOrder('desc') // highest first by default
    }
  }

  // Export handlers (guard against exporting an empty report)
  const handleExportPDF = () => {
    if (!normalizedRows.length) return showToast('No score records to export yet', 'info')
    exportToPDF(normalizedRows, `${isFaculty ? 'All_Students' : 'My'}_Quiz_Scores_Summary`)
  }

  const handleExportSpreadsheet = () => {
    if (!normalizedRows.length) return showToast('No score records to export yet', 'info')
    exportToSpreadsheet(normalizedRows, `${isFaculty ? 'All_Students' : 'My'}_Quiz_Scores`)
  }

  const handlePrint = () => {
    if (!normalizedRows.length) return showToast('No score records to print yet', 'info')
    printScores(normalizedRows, `${isFaculty ? 'All Students' : 'My'} Quiz Scores Summary`)
  }

  // Overall statistics
  const totalSubmissions = normalizedRows.length
  const passedCount = normalizedRows.filter(r => r.passed).length
  const passRate = totalSubmissions > 0 ? Math.round((passedCount / totalSubmissions) * 100) : 0
  const avgScore = totalSubmissions > 0
    ? Math.round(normalizedRows.reduce((acc, r) => acc + r.percentage, 0) / totalSubmissions)
    : 0

  return (
    <div className="page-body">
      {/* Page Title & Export Toolbar */}
      <div className="page-header" style={{ marginBottom: 24, padding: 0 }}>
        <div className="flex items-center justify-between" style={{ flexWrap: 'wrap', gap: 16 }}>
          <div>
            <h1 className="page-title">
              {isFaculty ? 'Student Quiz Scores & Performance' : 'My Quiz Scores & Performance'}
            </h1>
            <p className="page-subtitle">
              Summary of all quizzes with sorting, filtering, and export capabilities.
            </p>
          </div>

          {/* Export Action Buttons */}
          <div className="export-btn-group">
            <button
              className="btn btn-outline flex items-center gap-6"
              onClick={handleExportPDF}
              id="btn-export-pdf"
              title="Save report as PDF"
            >
              <FileText style={{ width: 16, height: 16, color: '#ff4757' }} />
              Save PDF
            </button>

            <button
              className="btn btn-outline flex items-center gap-6"
              onClick={handleExportSpreadsheet}
              id="btn-export-spreadsheet"
              title="Save report as Excel Spreadsheet"
            >
              <TableIcon style={{ width: 16, height: 16, color: '#00d4aa' }} />
              Save Spreadsheet
            </button>

            <button
              className="btn btn-outline flex items-center gap-6"
              onClick={handlePrint}
              id="btn-print-scores"
              title="Print score summary"
            >
              <Printer style={{ width: 16, height: 16, color: '#7c5cfc' }} />
              Print
            </button>
          </div>
        </div>
      </div>

      {/* Stats Summary Cards */}
      <div className="grid-4 mb-24">
        <div className="stat-card">
          <div className="stat-icon purple">
            <Award />
          </div>
          <div>
            <div className="stat-value">{totalSubmissions}</div>
            <div className="stat-label">Total Submissions</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon green">
            <CheckCircle2 />
          </div>
          <div>
            <div className="stat-value">{passedCount}</div>
            <div className="stat-label">Passed (≥75%)</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon pink">
            <XCircle />
          </div>
          <div>
            <div className="stat-value">{totalSubmissions - passedCount}</div>
            <div className="stat-label">Failed (&lt;75%)</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon yellow">
            <GraduationCap />
          </div>
          <div>
            <div className="stat-value">{avgScore}%</div>
            <div className="stat-label">Average Score</div>
          </div>
        </div>
      </div>

      {/* Search, Filter & Sort Controls */}
      <div className="scores-control-bar card mb-20">
        <div className="flex items-center gap-12" style={{ flexWrap: 'wrap', width: '100%' }}>
          {/* Search Input */}
          <div className="input-with-icon" style={{ flex: 1, minWidth: 220 }}>
            <Search className="input-icon" />
            <input
              type="text"
              className="form-input form-input-icon"
              placeholder="Search by student name or quiz..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              id="input-search-scores"
            />
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-8">
            <Filter style={{ width: 16, height: 16, color: 'var(--text-muted)' }} />
            <select
              className="form-input"
              style={{ width: 'auto' }}
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              id="select-status-filter"
            >
              <option value="all">All Statuses</option>
              <option value="passed">Passed (≥75%)</option>
              <option value="failed">Failed (&lt;75%)</option>
            </select>
          </div>

          {/* Sort By Name */}
          <button
            className={`btn btn-sm ${sortField === 'name' ? 'btn-gradient' : 'btn-outline'} flex items-center gap-6`}
            onClick={handleSortByName}
            id="btn-sort-name"
          >
            <User style={{ width: 14, height: 14 }} />
            Sort by Name {sortField === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}
          </button>

          {/* Sort By Score */}
          <button
            className={`btn btn-sm ${sortField === 'score' ? 'btn-gradient' : 'btn-outline'} flex items-center gap-6`}
            onClick={handleSortByScore}
            id="btn-sort-score"
          >
            <ArrowUpDown style={{ width: 14, height: 14 }} />
            Sort by Score {sortField === 'score' && (sortOrder === 'asc' ? '↑' : '↓')}
          </button>
        </div>
      </div>

      {/* Main Scores Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="table-responsive">
          <table className="scores-table">
            <thead>
              <tr>
                <th style={{ width: 50 }}>#</th>
                <th onClick={handleSortByName} style={{ cursor: 'pointer' }}>
                  <div className="flex items-center gap-6">
                    Student Name
                    <ArrowUpDown style={{ width: 14, height: 14 }} />
                  </div>
                </th>
                <th>Topic / Quiz Title</th>
                <th onClick={handleSortByScore} style={{ cursor: 'pointer' }}>
                  <div className="flex items-center gap-6">
                    Score
                    <ArrowUpDown style={{ width: 14, height: 14 }} />
                  </div>
                </th>
                <th>Percentage</th>
                <th>Status</th>
                <th>Submission Date</th>
              </tr>
            </thead>
            <tbody>
              {normalizedRows.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '36px 0', color: 'var(--text-muted)' }}>
                    {rawData && rawData.length > 0
                      ? 'No quiz score records found matching your query.'
                      : 'No quiz attempts yet. Scores will appear here once a quiz is submitted.'}
                  </td>
                </tr>
              ) : (
                normalizedRows.map((row, idx) => (
                  <tr key={row.id || idx}>
                    <td style={{ color: 'var(--text-muted)' }}>{idx + 1}</td>
                    <td style={{ fontWeight: 600 }}>
                      <div className="flex items-center gap-8">
                        <div className="student-table-avatar">
                          {row.studentName.charAt(0).toUpperCase()}
                        </div>
                        {row.studentName}
                      </div>
                    </td>
                    <td>{row.quizTitle}</td>
                    <td style={{ fontFamily: 'var(--font-mono)' }}>
                      <strong>{row.score}</strong> / {row.total}
                    </td>
                    <td>
                      <span className={`badge ${row.passed ? 'badge-green' : 'badge-danger'}`}>
                        {row.percentage}%
                      </span>
                    </td>
                    <td>
                      {row.passed ? (
                        <span className="status-pill passed">
                          <CheckCircle2 style={{ width: 14, height: 14 }} /> PASSED
                        </span>
                      ) : (
                        <span className="status-pill failed">
                          <XCircle style={{ width: 14, height: 14 }} /> FAILED
                        </span>
                      )}
                    </td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
                      {new Date(row.submittedAt).toLocaleDateString()} at{' '}
                      {new Date(row.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
