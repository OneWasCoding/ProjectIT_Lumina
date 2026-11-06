import { useState, useEffect, useMemo } from 'react'
import { useApp } from '../context/AppContext.jsx'
import {
  exportGradebookToExcel,
  exportGradebookToPDF,
  printGradebook,
  getGradeEquivalents,
} from '../lib/exportUtils.js'
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
  ClipboardList,
  BookOpen,
  Sliders,
  Edit3,
  X,
} from 'lucide-react'

const WEIGHT_PRESETS = [
  { id: '50-50', label: '50% Quizzes / 50% Assignments', quizWeight: 50, assignmentWeight: 50, mode: 'weighted' },
  { id: '40-60', label: '40% Quizzes / 60% Assignments', quizWeight: 40, assignmentWeight: 60, mode: 'weighted' },
  { id: '60-40', label: '60% Quizzes / 40% Assignments', quizWeight: 60, assignmentWeight: 40, mode: 'weighted' },
  { id: '30-70', label: '30% Quizzes / 70% Assignments', quizWeight: 30, assignmentWeight: 70, mode: 'weighted' },
  { id: '70-30', label: '70% Quizzes / 30% Assignments', quizWeight: 70, assignmentWeight: 30, mode: 'weighted' },
  { id: 'points', label: 'Total Points (Raw Score Sum)', quizWeight: 50, assignmentWeight: 50, mode: 'points' },
]

export default function ScoresPage() {
  const {
    profile,
    user,
    selectedSubject,
    topics,
    quizzes,
    quizResults,
    allResults,
    assignments,
    submissions,
    fetchTopics,
    fetchSubjectQuizzes,
    fetchAssignments,
    fetchSubmissions,
    fetchMyResults,
    fetchAllResults,
    gradeSubmission,
    showToast,
  } = useApp()

  const isFaculty = profile?.role === 'faculty'
  const subjectId = selectedSubject?.id

  // Active tab: 'overall' | 'quizzes' | 'assignments'
  const [activeTab, setActiveTab] = useState('overall')
  const [weightPresetId, setWeightPresetId] = useState('50-50')
  const [strictMissingCategory, setStrictMissingCategory] = useState(false)

  // Sort & filter state
  const [sortField, setSortField] = useState('score') // 'name' | 'score' | 'date'
  const [sortOrder, setSortOrder] = useState('desc') // 'asc' | 'desc'
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all') // 'all' | 'passed' | 'failed'

  // Quick inline assignment grading modal for faculty
  const [gradingRow, setGradingRow] = useState(null)
  const [gradeScoreInput, setGradeScoreInput] = useState('')
  const [gradeFeedbackInput, setGradeFeedbackInput] = useState('')
  const [savingGrade, setSavingGrade] = useState(false)

  // Load all quiz results, assignments, submissions, and subject quizzes on mount
  useEffect(() => {
    if (isFaculty) {
      fetchAllResults()
    } else {
      fetchMyResults()
    }
    if (subjectId) {
      fetchTopics(subjectId)
      fetchAssignments(subjectId)
      fetchSubmissions(subjectId)
    }
  }, [isFaculty, subjectId, fetchAllResults, fetchMyResults, fetchTopics, fetchAssignments, fetchSubmissions])

  useEffect(() => {
    if (Array.isArray(topics) && topics.length > 0) {
      fetchSubjectQuizzes(topics.map(t => t.id))
    }
  }, [topics, fetchSubjectQuizzes])

  const activePreset = useMemo(
    () => WEIGHT_PRESETS.find(p => p.id === weightPresetId) || WEIGHT_PRESETS[0],
    [weightPresetId]
  )

  // Source quiz records: faculty sees all, student sees own
  const rawQuizData = isFaculty ? allResults : quizResults

  // Filter assignments & submissions to current subject (or all if none match)
  const subjectAssignments = useMemo(() => {
    if (!subjectId) return assignments || []
    const filtered = (assignments || []).filter(a => a.subject_id === subjectId)
    return filtered.length > 0 ? filtered : (assignments || [])
  }, [assignments, subjectId])

  const assignmentById = useMemo(() => {
    const map = {}
    ;(assignments || []).forEach(a => {
      if (a?.id) map[a.id] = a
    })
    return map
  }, [assignments])

  const rawSubmissionData = useMemo(() => {
    const base = (submissions || []).filter(s => !subjectId || !s.subject_id || s.subject_id === subjectId)
    if (isFaculty) return base
    return base.filter(s => s.student_id === user?.id)
  }, [submissions, subjectId, isFaculty, user?.id])

  // Normalize Quiz Rows
  const allNormalizedQuizzes = useMemo(() => {
    return (rawQuizData || []).map(r => {
      const isExternal = Boolean(r.answers?.external || r.quizzes?.quiz_type === 'gform')
      const studentName =
        r.users_profile?.full_name ||
        (!isFaculty ? profile?.full_name || user?.email?.split('@')[0] : null) ||
        'Student User'
      const studentNumber = r.users_profile?.student_id_number || (!isFaculty ? profile?.student_id_number : '') || ''
      const studentKey = r.student_id || studentName.toLowerCase().trim()
      const quizTitle = r.quizzes?.title || 'Topic Assessment Quiz'
      const quizKey = r.quiz_id || quizTitle

      return {
        id: r.id,
        studentId: r.student_id,
        studentKey,
        studentName,
        studentNumber,
        quizId: r.quiz_id,
        quizKey,
        quizTitle,
        score: Number(r.score ?? 0),
        total: Number(r.total_items || 10),
        percentage: Number(r.percentage ?? 0),
        passed: Boolean(r.passed),
        isExternal,
        submittedAt: r.submitted_at || new Date().toISOString(),
      }
    })
  }, [rawQuizData, isFaculty, profile, user])

  // Normalize Assignment Submission Rows
  const allNormalizedAssignments = useMemo(() => {
    return (rawSubmissionData || []).map(s => {
      const asg = assignmentById[s.assignment_id] || s.assignment_meta || {}
      const maxPoints = Number(asg.max_points || 100)
      const isGraded = s.status === 'graded' && s.score !== null && s.score !== undefined
      const numericScore = isGraded ? Number(s.score) : null
      const percentage = isGraded && maxPoints > 0 ? Math.round((numericScore / maxPoints) * 100) : null
      const passed = isGraded ? percentage >= 75 : false
      const studentName =
        s.student?.full_name ||
        (!isFaculty ? profile?.full_name || user?.email?.split('@')[0] : null) ||
        'Student User'
      const studentNumber = s.student?.student_id_number || (!isFaculty ? profile?.student_id_number : '') || ''
      const studentKey = s.student_id || studentName.toLowerCase().trim()
      const assignmentTitle = asg.title || 'Course Assignment'
      const assignmentKey = s.assignment_id || assignmentTitle

      return {
        id: s.id,
        rawSubmission: s,
        studentId: s.student_id,
        studentKey,
        studentName,
        studentNumber,
        assignmentId: s.assignment_id,
        assignmentKey,
        assignmentTitle,
        score: numericScore,
        maxPoints,
        percentage,
        passed,
        isGraded,
        status: s.status || 'submitted',
        feedback: s.feedback || '',
        submittedAt: s.submitted_at || new Date().toISOString(),
        gradedAt: s.graded_at || null,
      }
    })
  }, [rawSubmissionData, assignmentById, isFaculty, profile, user])

  // Columns for Excel export (distinct quizzes & assignments)
  const quizColumns = useMemo(() => {
    const map = new Map()
    ;(quizzes || []).forEach(q => {
      if (q?.id) map.set(q.id, { key: q.id, title: q.title || 'Quiz' })
    })
    allNormalizedQuizzes.forEach(r => {
      if (!map.has(r.quizKey)) {
        map.set(r.quizKey, { key: r.quizKey, title: r.quizTitle })
      }
    })
    return Array.from(map.values())
  }, [quizzes, allNormalizedQuizzes])

  const assignmentColumns = useMemo(() => {
    const map = new Map()
    subjectAssignments.forEach(a => {
      if (a?.id) map.set(a.id, { key: a.id, title: a.title || 'Assignment', maxPoints: Number(a.max_points || 100) })
    })
    allNormalizedAssignments.forEach(a => {
      if (!map.has(a.assignmentKey)) {
        map.set(a.assignmentKey, { key: a.assignmentKey, title: a.assignmentTitle, maxPoints: a.maxPoints })
      }
    })
    return Array.from(map.values())
  }, [subjectAssignments, allNormalizedAssignments])

  // Build Per-Student Overall Gradebook Rows
  const studentGrades = useMemo(() => {
    const studentsMap = new Map()

    const ensureStudent = (key, name, studentNumber, timestamp) => {
      if (!studentsMap.has(key)) {
        studentsMap.set(key, {
          studentKey: key,
          studentName: name || 'Student User',
          studentNumber: studentNumber || '',
          quizBestByKey: new Map(),
          quizAttemptsCount: 0,
          assignmentByKey: new Map(),
          latestActivity: timestamp || new Date(0).toISOString(),
        })
      } else {
        const entry = studentsMap.get(key)
        if ((!entry.studentName || entry.studentName === 'Student User') && name) entry.studentName = name
        if (!entry.studentNumber && studentNumber) entry.studentNumber = studentNumber
        if (timestamp && new Date(timestamp) > new Date(entry.latestActivity)) {
          entry.latestActivity = timestamp
        }
      }
      return studentsMap.get(key)
    }

    // 1. Aggregate Quiz Attempts (keep best score per distinct quiz so retakes reward mastery)
    allNormalizedQuizzes.forEach(q => {
      const st = ensureStudent(q.studentKey, q.studentName, q.studentNumber, q.submittedAt)
      st.quizAttemptsCount += 1
      const existing = st.quizBestByKey.get(q.quizKey)
      if (!existing || q.percentage > existing.percentage) {
        st.quizBestByKey.set(q.quizKey, q)
      }
    })

    // 2. Aggregate Assignment Submissions
    allNormalizedAssignments.forEach(a => {
      const st = ensureStudent(a.studentKey, a.studentName, a.studentNumber, a.gradedAt || a.submittedAt)
      st.assignmentByKey.set(a.assignmentKey, a)
    })

    const hasCourseQuizzes = allNormalizedQuizzes.length > 0
    const hasCourseGradedAssignments = allNormalizedAssignments.some(a => a.isGraded)

    // 3. Compute Quiz Average, Assignment Average, and Overall Grade per student
    const rows = Array.from(studentsMap.values()).map(st => {
      const distinctQuizzes = Array.from(st.quizBestByKey.values())
      const gradedQuizzes = distinctQuizzes.filter(q => !q.isExternal)
      const quizzesCount = distinctQuizzes.length
      const hasQuizzes = quizzesCount > 0

      const quizTotalScore = gradedQuizzes.reduce((sum, q) => sum + q.score, 0)
      const quizTotalPossible = gradedQuizzes.reduce((sum, q) => sum + q.total, 0)
      const quizAvg =
        gradedQuizzes.length > 0
          ? gradedQuizzes.reduce((sum, q) => sum + q.percentage, 0) / gradedQuizzes.length
          : hasQuizzes
          ? 100
          : 0

      const distinctAssignments = Array.from(st.assignmentByKey.values())
      const gradedAssignments = distinctAssignments.filter(a => a.isGraded)
      const assignmentsSubmittedCount = distinctAssignments.length
      const assignmentsGradedCount = gradedAssignments.length
      const hasAssignments = assignmentsGradedCount > 0

      const assignmentTotalScore = gradedAssignments.reduce((sum, a) => sum + (a.score || 0), 0)
      const assignmentTotalPossible = gradedAssignments.reduce((sum, a) => sum + (a.maxPoints || 100), 0)
      const assignmentAvg =
        gradedAssignments.length > 0
          ? gradedAssignments.reduce((sum, a) => sum + (a.percentage || 0), 0) / gradedAssignments.length
          : 0

      const hasAnyGraded = hasQuizzes || hasAssignments
      const qWeight = activePreset.quizWeight
      const aWeight = activePreset.assignmentWeight

      let overallPercentage = 0
      let quizWeightedContribution = 0
      let assignmentWeightedContribution = 0

      if (activePreset.mode === 'points') {
        const earned = quizTotalScore + assignmentTotalScore
        const possible = quizTotalPossible + assignmentTotalPossible
        overallPercentage = possible > 0 ? (earned / possible) * 100 : hasQuizzes ? quizAvg : 0
        quizWeightedContribution = possible > 0 ? (quizTotalScore / possible) * 100 : overallPercentage
        assignmentWeightedContribution = possible > 0 ? (assignmentTotalScore / possible) * 100 : 0
      } else if (strictMissingCategory || (hasQuizzes && hasAssignments)) {
        // Standard weighted formula when both categories exist (or strict mode is enabled)
        quizWeightedContribution = hasQuizzes ? (quizAvg * qWeight) / 100 : 0
        assignmentWeightedContribution = hasAssignments ? (assignmentAvg * aWeight) / 100 : 0
        overallPercentage = quizWeightedContribution + assignmentWeightedContribution
      } else if (hasQuizzes && !hasAssignments) {
        // Student only has quizzes graded so far
        if (hasCourseGradedAssignments && strictMissingCategory) {
          quizWeightedContribution = (quizAvg * qWeight) / 100
          overallPercentage = quizWeightedContribution
        } else {
          quizWeightedContribution = (quizAvg * qWeight) / 100
          overallPercentage = quizAvg
        }
      } else if (!hasQuizzes && hasAssignments) {
        // Student only has assignments graded so far
        if (hasCourseQuizzes && strictMissingCategory) {
          assignmentWeightedContribution = (assignmentAvg * aWeight) / 100
          overallPercentage = assignmentWeightedContribution
        } else {
          assignmentWeightedContribution = (assignmentAvg * aWeight) / 100
          overallPercentage = assignmentAvg
        }
      }

      const equiv = getGradeEquivalents(overallPercentage, hasAnyGraded)

      const quizMap = {}
      distinctQuizzes.forEach(q => {
        quizMap[q.quizKey] = q
      })
      const assignmentMap = {}
      distinctAssignments.forEach(a => {
        assignmentMap[a.assignmentKey] = a
      })

      return {
        studentKey: st.studentKey,
        studentName: st.studentName,
        studentNumber: st.studentNumber,
        quizzesCount,
        quizAttemptsCount: st.quizAttemptsCount,
        hasQuizzes,
        quizTotalScore,
        quizTotalPossible,
        quizAvg,
        quizWeightedContribution,
        assignmentsSubmittedCount,
        assignmentsGradedCount,
        hasAssignments,
        assignmentTotalScore,
        assignmentTotalPossible,
        assignmentAvg,
        assignmentWeightedContribution,
        hasAnyGraded,
        overallPercentage,
        collegeGrade: equiv.collegeGrade,
        letterGrade: equiv.letterGrade,
        descriptor: equiv.descriptor,
        remarks: equiv.remarks,
        passed: equiv.passed,
        latestActivity: st.latestActivity,
        quizMap,
        assignmentMap,
      }
    })

    // Filter & sort
    const filtered = rows.filter(r => {
      const q = searchQuery.toLowerCase()
      const matchesSearch =
        !q ||
        r.studentName.toLowerCase().includes(q) ||
        (r.studentNumber || '').toLowerCase().includes(q) ||
        r.remarks.toLowerCase().includes(q)
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'passed' && r.passed) ||
        (statusFilter === 'failed' && !r.passed)
      return matchesSearch && matchesStatus
    })

    filtered.sort((a, b) => {
      if (sortField === 'name') {
        const cmp = a.studentName.localeCompare(b.studentName)
        return sortOrder === 'asc' ? cmp : -cmp
      }
      if (sortField === 'score') {
        const cmp = a.overallPercentage - b.overallPercentage
        return sortOrder === 'asc' ? cmp : -cmp
      }
      if (sortField === 'date') {
        const cmp = new Date(a.latestActivity).getTime() - new Date(b.latestActivity).getTime()
        return sortOrder === 'asc' ? cmp : -cmp
      }
      return 0
    })

    return filtered
  }, [
    allNormalizedQuizzes,
    allNormalizedAssignments,
    activePreset,
    strictMissingCategory,
    searchQuery,
    statusFilter,
    sortField,
    sortOrder,
  ])

  // Filtered Quiz rows for Quizzes tab & exports
  const filteredQuizRows = useMemo(() => {
    const filtered = allNormalizedQuizzes.filter(row => {
      const q = searchQuery.toLowerCase()
      const matchesSearch =
        !q ||
        row.studentName.toLowerCase().includes(q) ||
        row.quizTitle.toLowerCase().includes(q)
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'passed' && row.passed) ||
        (statusFilter === 'failed' && !row.passed)
      return matchesSearch && matchesStatus
    })

    filtered.sort((a, b) => {
      if (sortField === 'name') {
        const cmp = a.studentName.localeCompare(b.studentName)
        return sortOrder === 'asc' ? cmp : -cmp
      }
      if (sortField === 'score') {
        const cmp = a.percentage - b.percentage
        return sortOrder === 'asc' ? cmp : -cmp
      }
      const cmp = new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime()
      return sortOrder === 'asc' ? cmp : -cmp
    })

    return filtered
  }, [allNormalizedQuizzes, searchQuery, statusFilter, sortField, sortOrder])

  // Filtered Assignment rows for Assignments tab & exports
  const filteredAssignmentRows = useMemo(() => {
    const filtered = allNormalizedAssignments.filter(row => {
      const q = searchQuery.toLowerCase()
      const matchesSearch =
        !q ||
        row.studentName.toLowerCase().includes(q) ||
        row.assignmentTitle.toLowerCase().includes(q)
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'passed' && row.passed) ||
        (statusFilter === 'failed' && !row.passed)
      return matchesSearch && matchesStatus
    })

    filtered.sort((a, b) => {
      if (sortField === 'name') {
        const cmp = a.studentName.localeCompare(b.studentName)
        return sortOrder === 'asc' ? cmp : -cmp
      }
      if (sortField === 'score') {
        const cmp = (a.percentage ?? -1) - (b.percentage ?? -1)
        return sortOrder === 'asc' ? cmp : -cmp
      }
      const cmp = new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime()
      return sortOrder === 'asc' ? cmp : -cmp
    })

    return filtered
  }, [allNormalizedAssignments, searchQuery, statusFilter, sortField, sortOrder])

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
      setSortOrder('desc')
    }
  }

  // Export metadata
  const exportMeta = useMemo(
    () => ({
      subjectName: selectedSubject?.name || 'All Courses',
      yearLevel: selectedSubject?.year_level || profile?.year_level || 'All Year Levels',
      facultyName: profile?.full_name || user?.email?.split('@')[0] || 'Faculty Instructor',
      quizWeight: activePreset.quizWeight,
      assignmentWeight: activePreset.assignmentWeight,
      weightingMode: activePreset.mode,
    }),
    [selectedSubject, profile, user, activePreset]
  )

  const hasAnyRecords =
    studentGrades.length > 0 || filteredQuizRows.length > 0 || filteredAssignmentRows.length > 0

  const handleExportSpreadsheet = async () => {
    if (!hasAnyRecords) return showToast('No grade records to export yet', 'info')
    await exportGradebookToExcel({
      studentGrades,
      quizRows: filteredQuizRows,
      assignmentRows: filteredAssignmentRows,
      quizColumns,
      assignmentColumns,
      meta: exportMeta,
    })
    showToast('Official Excel Gradebook (.xlsx) downloaded!', 'success')
  }

  const handleExportPDF = async () => {
    if (!hasAnyRecords) return showToast('No grade records to export yet', 'info')
    await exportGradebookToPDF({
      studentGrades,
      quizRows: filteredQuizRows,
      assignmentRows: filteredAssignmentRows,
      meta: exportMeta,
    })
    showToast('Official PDF Gradebook downloaded!', 'success')
  }

  const handlePrint = () => {
    if (!hasAnyRecords) return showToast('No grade records to print yet', 'info')
    printGradebook({
      studentGrades,
      quizRows: filteredQuizRows,
      assignmentRows: filteredAssignmentRows,
      meta: exportMeta,
    })
  }

  const handleOpenQuickGrade = (row) => {
    setGradingRow(row)
    setGradeScoreInput(row.score !== null && row.score !== undefined ? String(row.score) : String(row.maxPoints || 100))
    setGradeFeedbackInput(row.feedback || '')
  }

  const handleSaveQuickGrade = async () => {
    if (!gradingRow) return
    const numScore = Math.max(0, Math.min(Number(gradingRow.maxPoints || 100), Number(gradeScoreInput) || 0))
    setSavingGrade(true)
    const { error } = await gradeSubmission(gradingRow.rawSubmission, numScore, gradeFeedbackInput.trim())
    setSavingGrade(false)
    if (!error) {
      setGradingRow(null)
    }
  }

  // Summary KPIs
  const gradedStudentRows = studentGrades.filter(s => s.hasAnyGraded)
  const overallAvgPct =
    gradedStudentRows.length > 0
      ? Math.round(gradedStudentRows.reduce((sum, s) => sum + s.overallPercentage, 0) / gradedStudentRows.length)
      : 0
  const overallEquiv = getGradeEquivalents(overallAvgPct, gradedStudentRows.length > 0)

  const studentsWithQuizzes = studentGrades.filter(s => s.hasQuizzes)
  const classQuizAvgPct =
    studentsWithQuizzes.length > 0
      ? Math.round(studentsWithQuizzes.reduce((sum, s) => sum + s.quizAvg, 0) / studentsWithQuizzes.length)
      : 0

  const studentsWithAssignments = studentGrades.filter(s => s.hasAssignments)
  const classAssignmentAvgPct =
    studentsWithAssignments.length > 0
      ? Math.round(studentsWithAssignments.reduce((sum, s) => sum + s.assignmentAvg, 0) / studentsWithAssignments.length)
      : 0

  const passedStudentsCount = gradedStudentRows.filter(s => s.passed).length

  return (
    <>
      {/* Page Title & Export Toolbar */}
      <div className="page-header">
        <div className="page-header-inner" style={{ flexWrap: 'wrap', gap: 16 }}>
          <div>
            <h1 className="page-title">
              {isFaculty ? 'Class Gradebook & Overall Student Grades' : 'My Overall Grades & Performance'}
            </h1>
            <p className="page-subtitle">
              {selectedSubject?.name ? `${selectedSubject.name} · ` : ''}
              Combined computation of <strong>Quizzes ({activePreset.quizWeight}%)</strong> and{' '}
              <strong>Assignments ({activePreset.assignmentWeight}%)</strong> with multi-sheet Excel download.
            </p>
          </div>

          {/* Export Action Buttons */}
          <div className="export-btn-group">
            <button
              className="btn btn-gradient flex items-center gap-6"
              onClick={handleExportSpreadsheet}
              id="btn-export-spreadsheet"
              title="Download Multi-Sheet Official Excel Gradebook (.xlsx)"
            >
              <TableIcon style={{ width: 16, height: 16 }} />
              <span>Download Excel (.xlsx)</span>
            </button>

            <button
              className="btn btn-outline flex items-center gap-6"
              onClick={handleExportPDF}
              id="btn-export-pdf"
              title="Save Gradebook as PDF"
            >
              <FileText style={{ width: 16, height: 16, color: '#ff4757' }} />
              <span>Save PDF</span>
            </button>

            <button
              className="btn btn-outline flex items-center gap-6"
              onClick={handlePrint}
              id="btn-print-scores"
              title="Print Official Grade Sheet"
            >
              <Printer style={{ width: 16, height: 16, color: '#7c5cfc' }} />
              <span>Print</span>
            </button>
          </div>
        </div>
      </div>

      <div className="page-body">

      {/* KPI Summary Cards */}
      <div className="grid-4 mb-24">
        <div className="stat-card">
          <div className="stat-icon purple">
            <Award />
          </div>
          <div>
            <div className="stat-value">
              {gradedStudentRows.length > 0 ? `${overallAvgPct}%` : '—'}
            </div>
            <div className="stat-label">
              Overall Grade Avg {gradedStudentRows.length > 0 ? `(${overallEquiv.collegeGrade})` : ''}
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon green">
            <BookOpen />
          </div>
          <div>
            <div className="stat-value">
              {studentsWithQuizzes.length > 0 ? `${classQuizAvgPct}%` : '—'}
            </div>
            <div className="stat-label">
              Quiz Avg ({allNormalizedQuizzes.length} attempt{allNormalizedQuizzes.length === 1 ? '' : 's'})
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon yellow">
            <ClipboardList />
          </div>
          <div>
            <div className="stat-value">
              {studentsWithAssignments.length > 0 ? `${classAssignmentAvgPct}%` : '—'}
            </div>
            <div className="stat-label">
              Assignment Avg ({allNormalizedAssignments.filter(a => a.isGraded).length} graded)
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon pink">
            <GraduationCap />
          </div>
          <div>
            <div className="stat-value">
              {passedStudentsCount} / {gradedStudentRows.length}
            </div>
            <div className="stat-label">Passed Overall (≥75%)</div>
          </div>
        </div>
      </div>

      {/* View Mode Tabs & Weighting Configuration */}
      <div className="card mb-20" style={{ padding: 16 }}>
        <div className="flex items-center justify-between" style={{ flexWrap: 'wrap', gap: 14 }}>
          {/* View Tabs */}
          <div className="flex items-center gap-8" style={{ flexWrap: 'wrap' }}>
            <button
              type="button"
              className={`btn btn-sm ${activeTab === 'overall' ? 'btn-gradient' : 'btn-outline'} flex items-center gap-6`}
              onClick={() => setActiveTab('overall')}
              id="tab-overall-grades"
            >
              <GraduationCap style={{ width: 15, height: 15 }} />
              Overall Gradebook ({studentGrades.length})
            </button>
            <button
              type="button"
              className={`btn btn-sm ${activeTab === 'quizzes' ? 'btn-gradient' : 'btn-outline'} flex items-center gap-6`}
              onClick={() => setActiveTab('quizzes')}
              id="tab-quiz-scores"
            >
              <BookOpen style={{ width: 15, height: 15 }} />
              Quizzes Breakdown ({filteredQuizRows.length})
            </button>
            <button
              type="button"
              className={`btn btn-sm ${activeTab === 'assignments' ? 'btn-gradient' : 'btn-outline'} flex items-center gap-6`}
              onClick={() => setActiveTab('assignments')}
              id="tab-assignment-grades"
            >
              <ClipboardList style={{ width: 15, height: 15 }} />
              Assignments Breakdown ({filteredAssignmentRows.length})
            </button>
          </div>

          {/* Grading Formula Selector */}
          <div className="flex items-center gap-10" style={{ flexWrap: 'wrap' }}>
            <div className="flex items-center gap-6">
              <Sliders style={{ width: 15, height: 15, color: 'var(--text-muted)' }} />
              <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600 }}>Grading Formula:</span>
              <select
                className="form-input"
                style={{ width: 'auto', padding: '6px 10px', fontSize: 13 }}
                value={weightPresetId}
                onChange={e => setWeightPresetId(e.target.value)}
                id="select-grade-weights"
              >
                {WEIGHT_PRESETS.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>

            {activePreset.mode === 'weighted' && (
              <label
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: 12,
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  userSelect: 'none',
                }}
                title="When checked, a student with no graded assignments yet receives 0% for the assignment weight instead of scaling from quizzes alone."
              >
                <input
                  type="checkbox"
                  checked={strictMissingCategory}
                  onChange={e => setStrictMissingCategory(e.target.checked)}
                />
                Count ungraded category as 0%
              </label>
            )}
          </div>
        </div>
      </div>

      {/* Search, Filter & Sort Controls */}
      <div className="scores-control-bar card mb-20">
        <div className="flex items-center gap-12" style={{ flexWrap: 'wrap', width: '100%' }}>
          <div className="input-with-icon" style={{ flex: 1, minWidth: 220 }}>
            <Search className="input-icon" />
            <input
              type="text"
              className="form-input form-input-icon"
              placeholder="Search by student name, ID, quiz, or assignment..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              id="input-search-scores"
            />
          </div>

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

          <button
            className={`btn btn-sm ${sortField === 'name' ? 'btn-gradient' : 'btn-outline'} flex items-center gap-6`}
            onClick={handleSortByName}
            id="btn-sort-name"
          >
            <User style={{ width: 14, height: 14 }} />
            Sort by Name {sortField === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}
          </button>

          <button
            className={`btn btn-sm ${sortField === 'score' ? 'btn-gradient' : 'btn-outline'} flex items-center gap-6`}
            onClick={handleSortByScore}
            id="btn-sort-score"
          >
            <ArrowUpDown style={{ width: 14, height: 14 }} />
            Sort by Grade {sortField === 'score' && (sortOrder === 'asc' ? '↑' : '↓')}
          </button>
        </div>
      </div>

      {/* =====================================================================
          TAB 1: OVERALL STUDENT GRADEBOOK TABLE
      ===================================================================== */}
      {activeTab === 'overall' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="table-responsive">
            <table className="scores-table">
              <thead>
                <tr>
                  <th style={{ width: 48 }}>#</th>
                  <th onClick={handleSortByName} style={{ cursor: 'pointer' }}>
                    <div className="flex items-center gap-6">
                      Student
                      <ArrowUpDown style={{ width: 14, height: 14 }} />
                    </div>
                  </th>
                  <th>Quizzes ({activePreset.quizWeight}%)</th>
                  <th>Assignments ({activePreset.assignmentWeight}%)</th>
                  <th onClick={handleSortByScore} style={{ cursor: 'pointer' }}>
                    <div className="flex items-center gap-6">
                      Overall Grade (%)
                      <ArrowUpDown style={{ width: 14, height: 14 }} />
                    </div>
                  </th>
                  <th>Equivalent Grade</th>
                  <th>Final Remarks</th>
                </tr>
              </thead>
              <tbody>
                {studentGrades.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '38px 16px', color: 'var(--text-muted)' }}>
                      No student quiz or assignment records found yet. Once students submit quizzes or assignments, their
                      combined overall grades will appear here and in the Excel Gradebook export.
                    </td>
                  </tr>
                ) : (
                  studentGrades.map((row, idx) => (
                    <tr key={row.studentKey || idx}>
                      <td style={{ color: 'var(--text-muted)' }}>{idx + 1}</td>
                      <td style={{ fontWeight: 600 }}>
                        <div className="flex items-center gap-8">
                          <div className="student-table-avatar">
                            {row.studentName.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div>{row.studentName}</div>
                            {row.studentNumber && (
                              <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 400 }}>
                                ID: {row.studentNumber}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Quizzes Component */}
                      <td>
                        {row.hasQuizzes ? (
                          <div>
                            <span className={`badge ${row.quizAvg >= 75 ? 'badge-green' : 'badge-danger'}`}>
                              {row.quizAvg.toFixed(1)}%
                            </span>
                            <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 4 }}>
                              {row.quizzesCount} quiz{row.quizzesCount === 1 ? '' : 'zes'}
                              {row.quizTotalPossible > 0 ? ` · ${row.quizTotalScore}/${row.quizTotalPossible} pts` : ''}
                            </div>
                          </div>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>No quizzes taken</span>
                        )}
                      </td>

                      {/* Assignments Component */}
                      <td>
                        {row.hasAssignments ? (
                          <div>
                            <span className={`badge ${row.assignmentAvg >= 75 ? 'badge-green' : 'badge-danger'}`}>
                              {row.assignmentAvg.toFixed(1)}%
                            </span>
                            <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 4 }}>
                              {row.assignmentsGradedCount} graded · {row.assignmentTotalScore}/{row.assignmentTotalPossible} pts
                            </div>
                          </div>
                        ) : row.assignmentsSubmittedCount > 0 ? (
                          <div>
                            <span className="badge badge-yellow">Pending Grade</span>
                            <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 4 }}>
                              {row.assignmentsSubmittedCount} submitted (ungraded)
                            </div>
                          </div>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>No assignments yet</span>
                        )}
                      </td>

                      {/* Combined Overall Grade */}
                      <td>
                        {row.hasAnyGraded ? (
                          <div className="flex items-center gap-8">
                            <span
                              className={`badge ${row.passed ? 'badge-green' : 'badge-danger'}`}
                              style={{ fontSize: 14, fontWeight: 700, padding: '5px 10px' }}
                            >
                              {row.overallPercentage.toFixed(1)}%
                            </span>
                          </div>
                        ) : (
                          <span className="badge badge-yellow">INC</span>
                        )}
                      </td>

                      {/* College Grade Equivalent */}
                      <td>
                        <div style={{ fontWeight: 700, fontFamily: 'var(--font-mono)', fontSize: 14 }}>
                          {row.collegeGrade}{' '}
                          <span style={{ color: 'var(--text-secondary)', fontWeight: 500, fontSize: 12 }}>
                            ({row.letterGrade} · {row.descriptor})
                          </span>
                        </div>
                      </td>

                      {/* Final Status */}
                      <td>
                        {row.hasAnyGraded ? (
                          row.passed ? (
                            <span className="status-pill passed">
                              <CheckCircle2 style={{ width: 14, height: 14 }} /> PASSED
                            </span>
                          ) : (
                            <span className="status-pill failed">
                              <XCircle style={{ width: 14, height: 14 }} /> FAILED
                            </span>
                          )
                        ) : (
                          <span className="badge badge-yellow">INCOMPLETE</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 2: QUIZZES BREAKDOWN TABLE
      ===================================================================== */}
      {activeTab === 'quizzes' && (
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
                {filteredQuizRows.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '36px 0', color: 'var(--text-muted)' }}>
                      No quiz attempts recorded yet.
                    </td>
                  </tr>
                ) : (
                  filteredQuizRows.map((row, idx) => (
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
                        {row.isExternal ? (
                          <span className="badge badge-purple">Google Form</span>
                        ) : (
                          <>
                            <strong>{row.score}</strong> / {row.total}
                          </>
                        )}
                      </td>
                      <td>
                        {row.isExternal ? (
                          <span className="badge badge-green">Submitted</span>
                        ) : (
                          <span className={`badge ${row.passed ? 'badge-green' : 'badge-danger'}`}>
                            {row.percentage}%
                          </span>
                        )}
                      </td>
                      <td>
                        {row.passed ? (
                          <span className="status-pill passed">
                            <CheckCircle2 style={{ width: 14, height: 14 }} /> {row.isExternal ? 'COMPLETED' : 'PASSED'}
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
      )}

      {/* =====================================================================
          TAB 3: ASSIGNMENTS BREAKDOWN TABLE
      ===================================================================== */}
      {activeTab === 'assignments' && (
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
                  <th>Assignment Title</th>
                  <th onClick={handleSortByScore} style={{ cursor: 'pointer' }}>
                    <div className="flex items-center gap-6">
                      Score
                      <ArrowUpDown style={{ width: 14, height: 14 }} />
                    </div>
                  </th>
                  <th>Percentage</th>
                  <th>Status</th>
                  <th>Feedback</th>
                  <th>Submitted</th>
                  {isFaculty && <th>Action</th>}
                </tr>
              </thead>
              <tbody>
                {filteredAssignmentRows.length === 0 ? (
                  <tr>
                    <td colSpan={isFaculty ? 9 : 8} style={{ textAlign: 'center', padding: '36px 0', color: 'var(--text-muted)' }}>
                      No assignment submissions recorded yet.
                    </td>
                  </tr>
                ) : (
                  filteredAssignmentRows.map((row, idx) => (
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
                      <td>{row.assignmentTitle}</td>
                      <td style={{ fontFamily: 'var(--font-mono)' }}>
                        {row.isGraded ? (
                          <>
                            <strong>{row.score}</strong> / {row.maxPoints}
                          </>
                        ) : (
                          <span className="badge badge-yellow">Ungraded (/{row.maxPoints})</span>
                        )}
                      </td>
                      <td>
                        {row.isGraded ? (
                          <span className={`badge ${row.passed ? 'badge-green' : 'badge-danger'}`}>
                            {row.percentage}%
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>—</span>
                        )}
                      </td>
                      <td>
                        {row.isGraded ? (
                          row.passed ? (
                            <span className="status-pill passed">
                              <CheckCircle2 style={{ width: 14, height: 14 }} /> PASSED
                            </span>
                          ) : (
                            <span className="status-pill failed">
                              <XCircle style={{ width: 14, height: 14 }} /> FAILED
                            </span>
                          )
                        ) : (
                          <span className="badge badge-purple">{row.status.toUpperCase()}</span>
                        )}
                      </td>
                      <td style={{ maxWidth: 200, fontSize: 12.5, color: 'var(--text-secondary)' }}>
                        {row.feedback || '—'}
                      </td>
                      <td style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
                        {new Date(row.submittedAt).toLocaleDateString()}
                      </td>
                      {isFaculty && (
                        <td>
                          <button
                            type="button"
                            className="btn btn-outline btn-sm flex items-center gap-6"
                            onClick={() => handleOpenQuickGrade(row)}
                          >
                            <Edit3 style={{ width: 13, height: 13 }} />
                            {row.isGraded ? 'Edit Grade' : 'Grade'}
                          </button>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Quick Assignment Grading Modal for Faculty */}
      {gradingRow && isFaculty && (
        <div className="modal-overlay" onClick={() => setGradingRow(null)}>
          <div className="modal" style={{ maxWidth: 460 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Grade Assignment Submission</h2>
              <button className="btn btn-icon btn-outline" onClick={() => setGradingRow(null)}>
                <X />
              </button>
            </div>
            <div className="modal-body">
              <div className="flex flex-col gap-16">
                <div>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Student</div>
                  <div style={{ fontSize: 15, fontWeight: 700 }}>{gradingRow.studentName}</div>
                </div>
                <div>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Assignment</div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{gradingRow.assignmentTitle}</div>
                </div>
                <div className="form-group">
                  <label className="form-label">Score (out of {gradingRow.maxPoints} pts)</label>
                  <input
                    type="number"
                    min={0}
                    max={gradingRow.maxPoints}
                    className="form-input"
                    value={gradeScoreInput}
                    onChange={e => setGradeScoreInput(e.target.value)}
                    autoFocus
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Feedback (optional)</label>
                  <textarea
                    className="form-textarea"
                    rows={3}
                    value={gradeFeedbackInput}
                    onChange={e => setGradeFeedbackInput(e.target.value)}
                    placeholder="Add comments or feedback for the student..."
                  />
                </div>
                <div className="flex items-center justify-end gap-10">
                  <button type="button" className="btn btn-outline" onClick={() => setGradingRow(null)}>
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn btn-gradient"
                    onClick={handleSaveQuickGrade}
                    disabled={savingGrade}
                  >
                    {savingGrade ? 'Saving...' : 'Save Grade'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
    </>
  )
}
