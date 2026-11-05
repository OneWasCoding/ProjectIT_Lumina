// Heavy export libraries are loaded on demand so they don't bloat the initial bundle

function escapeHtml(val) {
  return String(val ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export function formatSafeDate(val, includeTime = false) {
  if (!val) return '-'
  try {
    const d = new Date(val)
    if (isNaN(d.getTime())) return '-'
    return includeTime
      ? `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
      : d.toLocaleDateString()
  } catch {
    return '-'
  }
}

/**
 * Convert a 0-100 percentage into Philippine college grade scale (1.00 - 5.00),
 * letter grade, descriptor, and pass/fail status (75% passing standard).
 */
export function getGradeEquivalents(percentage, hasGradedWork = true) {
  if (!hasGradedWork || percentage === null || percentage === undefined || Number.isNaN(Number(percentage))) {
    return {
      percentage: null,
      collegeGrade: 'INC',
      letterGrade: 'N/A',
      descriptor: 'Incomplete',
      remarks: 'INCOMPLETE',
      passed: false,
    }
  }

  const pct = Math.max(0, Math.min(100, Math.round(Number(percentage))))

  if (pct >= 97) return { percentage: pct, collegeGrade: '1.00', letterGrade: 'A+', descriptor: 'Excellent', remarks: 'PASSED', passed: true }
  if (pct >= 94) return { percentage: pct, collegeGrade: '1.25', letterGrade: 'A', descriptor: 'Very Good', remarks: 'PASSED', passed: true }
  if (pct >= 91) return { percentage: pct, collegeGrade: '1.50', letterGrade: 'A-', descriptor: 'Very Good', remarks: 'PASSED', passed: true }
  if (pct >= 88) return { percentage: pct, collegeGrade: '1.75', letterGrade: 'B+', descriptor: 'Good', remarks: 'PASSED', passed: true }
  if (pct >= 85) return { percentage: pct, collegeGrade: '2.00', letterGrade: 'B', descriptor: 'Good', remarks: 'PASSED', passed: true }
  if (pct >= 82) return { percentage: pct, collegeGrade: '2.25', letterGrade: 'B-', descriptor: 'Satisfactory', remarks: 'PASSED', passed: true }
  if (pct >= 79) return { percentage: pct, collegeGrade: '2.50', letterGrade: 'C+', descriptor: 'Satisfactory', remarks: 'PASSED', passed: true }
  if (pct >= 76) return { percentage: pct, collegeGrade: '2.75', letterGrade: 'C', descriptor: 'Fair', remarks: 'PASSED', passed: true }
  if (pct >= 75) return { percentage: pct, collegeGrade: '3.00', letterGrade: 'C-', descriptor: 'Passing', remarks: 'PASSED', passed: true }
  return { percentage: pct, collegeGrade: '5.00', letterGrade: 'F', descriptor: 'Failed', remarks: 'FAILED', passed: false }
}

function autoFitColumns(aoa, minWidth = 10, maxWidth = 42) {
  const colCount = aoa.reduce((max, row) => Math.max(max, Array.isArray(row) ? row.length : 0), 0)
  const cols = []
  for (let c = 0; c < colCount; c++) {
    let longest = minWidth
    // Start from row index 4 so wide merged banner rows at the top don't stretch column A
    const startRow = aoa.length > 5 ? 4 : 0
    for (let r = startRow; r < aoa.length; r++) {
      const cell = aoa[r]?.[c]
      if (cell === null || cell === undefined) continue
      const len = String(cell).length + 3
      if (len > longest) longest = len
    }
    cols.push({ wch: Math.min(maxWidth, Math.max(minWidth, longest)) })
  }
  return cols
}

/**
 * Export full multi-sheet Class Gradebook (Overall Grades + Quiz Breakdown + Assignment Breakdown) to Excel (.xlsx)
 */
export async function exportGradebookToExcel({
  studentGrades = [],
  quizRows = [],
  assignmentRows = [],
  quizColumns = [],
  assignmentColumns = [],
  meta = {},
}) {
  const XLSX = await import('xlsx')
  const wb = XLSX.utils.book_new()

  const subjectName = meta.subjectName || 'All Subjects'
  const yearLevel = meta.yearLevel || 'All Year Levels'
  const facultyName = meta.facultyName || 'Faculty Instructor'
  const quizWeight = meta.quizWeight ?? 50
  const assignmentWeight = meta.assignmentWeight ?? 50
  const weightingLabel =
    meta.weightingMode === 'points'
      ? 'Total Points Earned / Total Possible Points'
      : `Quizzes (${quizWeight}%) + Assignments (${assignmentWeight}%)`
  const generatedAt = new Date().toLocaleString()

  // =========================================================================
  // SHEET 1: OVERALL CLASS GRADEBOOK
  // =========================================================================
  const dynamicQuizHeaders = quizColumns.map((q, idx) => `Q${idx + 1}: ${q.title} (%)`)
  const dynamicAsgHeaders = assignmentColumns.map((a, idx) => `A${idx + 1}: ${a.title} (/${a.maxPoints})`)

  const overallHeaderRow = [
    'No.',
    'Student ID',
    'Student Name',
    ...dynamicQuizHeaders,
    'Quizzes Taken',
    'Quiz Raw Score',
    'Quiz Average (%)',
    `Quiz Weighted (${quizWeight}%)`,
    ...dynamicAsgHeaders,
    'Assignments Graded',
    'Assignment Raw Score',
    'Assignment Average (%)',
    `Assignment Weighted (${assignmentWeight}%)`,
    'OVERALL GRADE (%)',
    'Equivalent Grade (1.00-5.00)',
    'Letter Grade',
    'Academic Rating',
    'Final Remarks',
  ]

  const overallBodyRows = studentGrades.map((st, idx) => {
    const perQuizCells = quizColumns.map(q => {
      const scoreObj = st.quizMap?.[q.key]
      if (!scoreObj) return '—'
      return scoreObj.isExternal ? 'Completed' : Number(scoreObj.percentage ?? 0)
    })

    const perAsgCells = assignmentColumns.map(a => {
      const subObj = st.assignmentMap?.[a.key]
      if (!subObj) return 'Missing'
      if (subObj.status !== 'graded' || subObj.score === null || subObj.score === undefined) {
        return subObj.status === 'late' ? 'Submitted (Late)' : 'Submitted (Ungraded)'
      }
      return `${subObj.score}/${subObj.maxPoints} (${subObj.percentage}%)`
    })

    return [
      idx + 1,
      st.studentNumber || 'N/A',
      st.studentName,
      ...perQuizCells,
      `${st.quizzesCount}/${Math.max(quizColumns.length, st.quizzesCount)}`,
      st.quizTotalPossible > 0 ? `${st.quizTotalScore}/${st.quizTotalPossible}` : '—',
      st.hasQuizzes ? Number(st.quizAvg.toFixed(1)) : 'N/A',
      st.hasQuizzes ? Number(st.quizWeightedContribution.toFixed(2)) : 0,
      ...perAsgCells,
      `${st.assignmentsGradedCount}/${Math.max(assignmentColumns.length, st.assignmentsSubmittedCount)}`,
      st.assignmentTotalPossible > 0 ? `${st.assignmentTotalScore}/${st.assignmentTotalPossible}` : '—',
      st.hasAssignments ? Number(st.assignmentAvg.toFixed(1)) : 'N/A',
      st.hasAssignments ? Number(st.assignmentWeightedContribution.toFixed(2)) : 0,
      st.hasAnyGraded ? Number(st.overallPercentage.toFixed(1)) : 'INC',
      st.collegeGrade,
      st.letterGrade,
      st.descriptor,
      st.remarks,
    ]
  })

  // Class summary statistics for footer
  const gradedStudents = studentGrades.filter(s => s.hasAnyGraded)
  const passedStudents = gradedStudents.filter(s => s.passed)
  const classQuizAvg =
    gradedStudents.filter(s => s.hasQuizzes).length > 0
      ? Number(
          (
            gradedStudents.filter(s => s.hasQuizzes).reduce((acc, s) => acc + s.quizAvg, 0) /
            gradedStudents.filter(s => s.hasQuizzes).length
          ).toFixed(1)
        )
      : 0
  const classAsgAvg =
    gradedStudents.filter(s => s.hasAssignments).length > 0
      ? Number(
          (
            gradedStudents.filter(s => s.hasAssignments).reduce((acc, s) => acc + s.assignmentAvg, 0) /
            gradedStudents.filter(s => s.hasAssignments).length
          ).toFixed(1)
        )
      : 0
  const classOverallAvg =
    gradedStudents.length > 0
      ? Number((gradedStudents.reduce((acc, s) => acc + s.overallPercentage, 0) / gradedStudents.length).toFixed(1))
      : 0
  const classPassRate =
    gradedStudents.length > 0 ? Number(((passedStudents.length / gradedStudents.length) * 100).toFixed(1)) : 0
  const classEquiv = getGradeEquivalents(classOverallAvg, gradedStudents.length > 0)

  const sheet1Aoa = [
    ['LUMINA LMS — OFFICIAL CLASS GRADEBOOK (OVERALL STUDENT GRADES)'],
    [`Subject: ${subjectName} | Year Level: ${yearLevel} | Prepared by: ${facultyName}`],
    [`Grading Formula: ${weightingLabel} | Passing Standard: 75.0% (3.00) | Generated: ${generatedAt}`],
    [],
    overallHeaderRow,
    ...overallBodyRows,
    [],
    ['CLASS PERFORMANCE SUMMARY'],
    ['Total Students Listed', studentGrades.length, 'Students Passed (>=75%)', passedStudents.length],
    ['Students Graded', gradedStudents.length, 'Students Failed (<75%)', gradedStudents.length - passedStudents.length],
    ['Class Quiz Average (%)', `${classQuizAvg}%`, 'Class Pass Rate (%)', `${classPassRate}%`],
    ['Class Assignment Average (%)', `${classAsgAvg}%`, 'Class Overall Average (%)', `${classOverallAvg}% (${classEquiv.collegeGrade})`],
  ]

  const wsOverall = XLSX.utils.aoa_to_sheet(sheet1Aoa)
  wsOverall['!cols'] = autoFitColumns(sheet1Aoa, 12, 38)
  wsOverall['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: Math.min(overallHeaderRow.length - 1, 10) } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: Math.min(overallHeaderRow.length - 1, 10) } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: Math.min(overallHeaderRow.length - 1, 10) } },
  ]
  if (overallBodyRows.length > 0) {
    wsOverall['!autofilter'] = {
      ref: XLSX.utils.encode_range({
        s: { r: 4, c: 0 },
        e: { r: 4 + overallBodyRows.length, c: overallHeaderRow.length - 1 },
      }),
    }
  }
  XLSX.utils.book_append_sheet(wb, wsOverall, 'Overall Gradebook')

  // =========================================================================
  // SHEET 2: QUIZ SCORES BREAKDOWN
  // =========================================================================
  const quizHeaderRow = [
    'No.',
    'Student ID',
    'Student Name',
    'Topic / Quiz Title',
    'Quiz Type',
    'Raw Score',
    'Total Items',
    'Percentage (%)',
    'Equivalent Grade',
    'Status',
    'Submitted Date & Time',
  ]

  const quizBodyRows = quizRows.map((r, idx) => {
    const equiv = getGradeEquivalents(r.percentage, !r.isExternal)
    return [
      idx + 1,
      r.studentNumber || 'N/A',
      r.studentName || 'Student',
      r.quizTitle || 'Topic Quiz',
      r.isExternal ? 'Google Form' : 'Standard Quiz',
      r.isExternal ? 'Completed' : Number(r.score ?? 0),
      r.isExternal ? '-' : Number(r.total ?? 10),
      r.isExternal ? 100 : Number(r.percentage ?? 0),
      r.isExternal ? '1.00' : equiv.collegeGrade,
      r.passed ? 'PASSED' : 'FAILED',
      formatSafeDate(r.submittedAt, true),
    ]
  })

  const sheet2Aoa = [
    [`LUMINA LMS — QUIZ SCORES BREAKDOWN (${subjectName})`],
    [`Generated: ${generatedAt} | Total Quiz Submissions: ${quizRows.length}`],
    [],
    quizHeaderRow,
    ...(quizBodyRows.length > 0
      ? quizBodyRows
      : [['-', '-', 'No quiz submissions recorded yet', '-', '-', '-', '-', '-', '-', '-', '-']]),
  ]

  const wsQuizzes = XLSX.utils.aoa_to_sheet(sheet2Aoa)
  wsQuizzes['!cols'] = autoFitColumns(sheet2Aoa, 12, 38)
  wsQuizzes['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: quizHeaderRow.length - 1 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: quizHeaderRow.length - 1 } },
  ]
  if (quizBodyRows.length > 0) {
    wsQuizzes['!autofilter'] = {
      ref: XLSX.utils.encode_range({
        s: { r: 3, c: 0 },
        e: { r: 3 + quizBodyRows.length, c: quizHeaderRow.length - 1 },
      }),
    }
  }
  XLSX.utils.book_append_sheet(wb, wsQuizzes, 'Quiz Scores Detail')

  // =========================================================================
  // SHEET 3: ASSIGNMENT GRADES BREAKDOWN
  // =========================================================================
  const asgHeaderRow = [
    'No.',
    'Student ID',
    'Student Name',
    'Assignment Title',
    'Score Earned',
    'Max Points',
    'Percentage (%)',
    'Equivalent Grade',
    'Submission Status',
    'Remarks',
    'Faculty Feedback',
    'Submitted Date & Time',
    'Graded Date & Time',
  ]

  const asgBodyRows = assignmentRows.map((r, idx) => {
    const isGraded = r.status === 'graded' && r.score !== null && r.score !== undefined
    const equiv = getGradeEquivalents(r.percentage, isGraded)
    return [
      idx + 1,
      r.studentNumber || 'N/A',
      r.studentName || 'Student',
      r.assignmentTitle || 'Assignment',
      isGraded ? Number(r.score) : 'Pending',
      Number(r.maxPoints ?? 100),
      isGraded ? Number(r.percentage ?? 0) : 'Pending',
      isGraded ? equiv.collegeGrade : 'PENDING',
      (r.status || 'submitted').toUpperCase(),
      isGraded ? equiv.remarks : 'TO GRADE',
      r.feedback || '-',
      formatSafeDate(r.submittedAt, true),
      formatSafeDate(r.gradedAt, true),
    ]
  })

  const sheet3Aoa = [
    [`LUMINA LMS — ASSIGNMENT GRADES BREAKDOWN (${subjectName})`],
    [`Generated: ${generatedAt} | Total Assignment Submissions: ${assignmentRows.length}`],
    [],
    asgHeaderRow,
    ...(asgBodyRows.length > 0
      ? asgBodyRows
      : [['-', '-', 'No assignment submissions recorded yet', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-']]),
  ]

  const wsAssignments = XLSX.utils.aoa_to_sheet(sheet3Aoa)
  wsAssignments['!cols'] = autoFitColumns(sheet3Aoa, 12, 40)
  wsAssignments['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: asgHeaderRow.length - 1 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: asgHeaderRow.length - 1 } },
  ]
  if (asgBodyRows.length > 0) {
    wsAssignments['!autofilter'] = {
      ref: XLSX.utils.encode_range({
        s: { r: 3, c: 0 },
        e: { r: 3 + asgBodyRows.length, c: asgHeaderRow.length - 1 },
      }),
    }
  }
  XLSX.utils.book_append_sheet(wb, wsAssignments, 'Assignment Grades Detail')

  const safeSubject = subjectName.replace(/[^a-zA-Z0-9_-]+/g, '_').replace(/^_|_$/g, '') || 'Course'
  const dateStr = new Date().toISOString().slice(0, 10)
  XLSX.writeFile(wb, `Lumina_Gradebook_${safeSubject}_${dateStr}.xlsx`)
}

/**
 * Export full Class Gradebook to PDF (Overall Grades + Quiz Scores + Assignment Grades)
 */
export async function exportGradebookToPDF({
  studentGrades = [],
  quizRows = [],
  assignmentRows = [],
  meta = {},
}) {
  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ])
  const doc = new jsPDF({ orientation: 'landscape' })

  const subjectName = meta.subjectName || 'All Subjects'
  const yearLevel = meta.yearLevel || 'All Year Levels'
  const facultyName = meta.facultyName || 'Faculty Instructor'
  const quizWeight = meta.quizWeight ?? 50
  const assignmentWeight = meta.assignmentWeight ?? 50

  // Header
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.text('Lumina LMS — Official Class Gradebook & Overall Grades', 14, 18)

  doc.setFontSize(11)
  doc.setFont('helvetica', 'normal')
  doc.text(`Subject: ${subjectName} (${yearLevel})  |  Instructor: ${facultyName}`, 14, 26)

  doc.setFontSize(9)
  doc.setTextColor(100)
  doc.text(
    `Formula: Quizzes (${quizWeight}%) + Assignments (${assignmentWeight}%)  |  Passing Standard: 75% (3.00)  |  Generated: ${new Date().toLocaleString()}`,
    14,
    32
  )

  // Section 1: Overall Student Grades
  const overallBody = studentGrades.map((st, idx) => [
    idx + 1,
    st.studentNumber || '-',
    st.studentName,
    st.hasQuizzes ? `${st.quizAvg.toFixed(1)}% (${st.quizzesCount})` : '—',
    st.hasAssignments ? `${st.assignmentAvg.toFixed(1)}% (${st.assignmentsGradedCount})` : '—',
    st.hasAnyGraded ? `${st.overallPercentage.toFixed(1)}%` : 'INC',
    st.collegeGrade,
    st.letterGrade,
    st.remarks,
  ])

  autoTable(doc, {
    startY: 38,
    head: [[
      '#',
      'Student ID',
      'Student Name',
      `Quiz Avg (${quizWeight}%)`,
      `Assignment Avg (${assignmentWeight}%)`,
      'Overall Grade (%)',
      'Equiv. Grade',
      'Letter',
      'Remarks',
    ]],
    body: overallBody.length > 0 ? overallBody : [['-', '-', 'No student grade records yet', '-', '-', '-', '-', '-', '-']],
    theme: 'grid',
    headStyles: { fillColor: [124, 92, 252], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [246, 245, 255] },
    styles: { fontSize: 9, cellPadding: 3.5 },
    didParseCell: (cellData) => {
      if (cellData.column.index === 8 && cellData.section === 'body') {
        if (cellData.cell.raw === 'PASSED') {
          cellData.cell.styles.textColor = [0, 150, 100]
          cellData.cell.styles.fontStyle = 'bold'
        } else if (cellData.cell.raw === 'FAILED') {
          cellData.cell.styles.textColor = [220, 50, 50]
          cellData.cell.styles.fontStyle = 'bold'
        }
      }
    },
  })

  // Section 2: Quiz Breakdown
  if (quizRows.length > 0) {
    let nextY = (doc.lastAutoTable?.finalY || 60) + 12
    if (nextY > 170) {
      doc.addPage()
      nextY = 20
    }
    doc.setFontSize(12)
    doc.setTextColor(30)
    doc.setFont('helvetica', 'bold')
    doc.text('Quiz Scores Breakdown', 14, nextY)

    autoTable(doc, {
      startY: nextY + 4,
      head: [['#', 'Student Name', 'Quiz Title', 'Score', 'Percentage', 'Status', 'Date']],
      body: quizRows.map((r, i) => [
        i + 1,
        r.studentName,
        r.quizTitle,
        r.isExternal ? 'Google Form' : `${r.score}/${r.total}`,
        `${r.percentage}%`,
        r.passed ? 'PASSED' : 'FAILED',
        formatSafeDate(r.submittedAt),
      ]),
      theme: 'grid',
      headStyles: { fillColor: [0, 180, 145], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 8.5, cellPadding: 3 },
    })
  }

  // Section 3: Assignment Breakdown
  if (assignmentRows.length > 0) {
    let nextY = (doc.lastAutoTable?.finalY || 60) + 12
    if (nextY > 170) {
      doc.addPage()
      nextY = 20
    }
    doc.setFontSize(12)
    doc.setTextColor(30)
    doc.setFont('helvetica', 'bold')
    doc.text('Assignment Grades Breakdown', 14, nextY)

    autoTable(doc, {
      startY: nextY + 4,
      head: [['#', 'Student Name', 'Assignment Title', 'Score', 'Percentage', 'Status', 'Feedback', 'Date']],
      body: assignmentRows.map((r, i) => {
        const isGraded = r.status === 'graded' && r.score !== null && r.score !== undefined
        return [
          i + 1,
          r.studentName,
          r.assignmentTitle,
          isGraded ? `${r.score}/${r.maxPoints}` : 'Pending',
          isGraded ? `${r.percentage}%` : 'Pending',
          (r.status || 'submitted').toUpperCase(),
          r.feedback || '-',
          formatSafeDate(r.submittedAt),
        ]
      }),
      theme: 'grid',
      headStyles: { fillColor: [59, 130, 246], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 8.5, cellPadding: 3 },
    })
  }

  // Footer
  const pageCount = doc.internal.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.setTextColor(150)
    doc.text(
      `Lumina LMS Official Gradebook — Page ${i} of ${pageCount}`,
      doc.internal.pageSize.getWidth() / 2,
      doc.internal.pageSize.getHeight() - 8,
      { align: 'center' }
    )
  }

  const safeSubject = subjectName.replace(/[^a-zA-Z0-9_-]+/g, '_').replace(/^_|_$/g, '') || 'Course'
  doc.save(`Lumina_Gradebook_${safeSubject}_${new Date().toISOString().slice(0, 10)}.pdf`)
}

/**
 * Print Official Class Gradebook
 */
export function printGradebook({
  studentGrades = [],
  quizRows = [],
  assignmentRows = [],
  meta = {},
}) {
  const printWindow = window.open('', '_blank')
  if (!printWindow) return

  const subjectName = meta.subjectName || 'All Subjects'
  const yearLevel = meta.yearLevel || 'All Year Levels'
  const facultyName = meta.facultyName || 'Faculty Instructor'
  const quizWeight = meta.quizWeight ?? 50
  const assignmentWeight = meta.assignmentWeight ?? 50

  const overallRowsHtml = studentGrades
    .map(
      (st, idx) => `
      <tr>
        <td>${idx + 1}</td>
        <td>${escapeHtml(st.studentNumber || '-')}</td>
        <td><strong>${escapeHtml(st.studentName)}</strong></td>
        <td>${st.hasQuizzes ? `${st.quizAvg.toFixed(1)}% (${st.quizzesCount} quiz${st.quizzesCount === 1 ? '' : 'zes'})` : '—'}</td>
        <td>${st.hasAssignments ? `${st.assignmentAvg.toFixed(1)}% (${st.assignmentsGradedCount} graded)` : '—'}</td>
        <td><strong>${st.hasAnyGraded ? `${st.overallPercentage.toFixed(1)}%` : 'INC'}</strong></td>
        <td><strong>${escapeHtml(st.collegeGrade)}</strong> (${escapeHtml(st.letterGrade)})</td>
        <td style="color: ${st.passed ? '#00a868' : '#dc3232'}; font-weight: bold;">
          ${escapeHtml(st.remarks)}
        </td>
      </tr>
    `
    )
    .join('')

  const quizRowsHtml = quizRows
    .map(
      (r, idx) => `
      <tr>
        <td>${idx + 1}</td>
        <td>${escapeHtml(r.studentName)}</td>
        <td>${escapeHtml(r.quizTitle)}</td>
        <td>${r.isExternal ? 'Google Form' : `${r.score ?? 0}/${r.total ?? 10}`}</td>
        <td>${r.percentage ?? 0}%</td>
        <td style="color: ${r.passed ? '#00a868' : '#dc3232'}; font-weight: bold;">${r.passed ? 'PASSED' : 'FAILED'}</td>
        <td>${formatSafeDate(r.submittedAt)}</td>
      </tr>
    `
    )
    .join('')

  const asgRowsHtml = assignmentRows
    .map((r, idx) => {
      const isGraded = r.status === 'graded' && r.score !== null && r.score !== undefined
      return `
      <tr>
        <td>${idx + 1}</td>
        <td>${escapeHtml(r.studentName)}</td>
        <td>${escapeHtml(r.assignmentTitle)}</td>
        <td>${isGraded ? `${r.score}/${r.maxPoints}` : 'Pending'}</td>
        <td>${isGraded ? `${r.percentage}%` : 'Pending'}</td>
        <td>${escapeHtml((r.status || 'submitted').toUpperCase())}</td>
        <td>${escapeHtml(r.feedback || '-')}</td>
        <td>${formatSafeDate(r.submittedAt)}</td>
      </tr>
    `
    })
    .join('')

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Lumina LMS Gradebook — ${escapeHtml(subjectName)}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 24px; color: #222; }
        h1 { font-size: 20px; margin-bottom: 4px; color: #1e1b4b; }
        h2 { font-size: 15px; margin-top: 26px; margin-bottom: 8px; color: #312e81; }
        .subtitle { color: #555; font-size: 12px; margin-bottom: 16px; line-height: 1.5; }
        table { width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 16px; }
        th { background: #7c5cfc; color: white; padding: 9px 8px; text-align: left; }
        td { padding: 7px 8px; border-bottom: 1px solid #ddd; }
        tr:nth-child(even) { background: #f8f8fc; }
        .footer { margin-top: 28px; font-size: 11px; color: #777; text-align: center; border-top: 1px solid #eee; padding-top: 10px; }
      </style>
    </head>
    <body>
      <h1>Lumina LMS — Official Student Gradebook</h1>
      <div class="subtitle">
        <strong>Subject:</strong> ${escapeHtml(subjectName)} (${escapeHtml(yearLevel)}) &nbsp;|&nbsp;
        <strong>Instructor:</strong> ${escapeHtml(facultyName)}<br/>
        <strong>Grading Formula:</strong> Quizzes (${quizWeight}%) + Assignments (${assignmentWeight}%) &nbsp;|&nbsp;
        <strong>Passing Standard:</strong> 75% (3.00) &nbsp;|&nbsp;
        <strong>Generated:</strong> ${new Date().toLocaleString()}
      </div>

      <h2>1. Overall Student Grades Summary</h2>
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Student ID</th>
            <th>Student Name</th>
            <th>Quiz Average (${quizWeight}%)</th>
            <th>Assignment Average (${assignmentWeight}%)</th>
            <th>Overall Grade (%)</th>
            <th>Equivalent Grade</th>
            <th>Remarks</th>
          </tr>
        </thead>
        <tbody>${overallRowsHtml || '<tr><td colspan="8">No student grade records yet.</td></tr>'}</tbody>
      </table>

      ${
        quizRows.length > 0
          ? `
        <h2>2. Quiz Scores Breakdown</h2>
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Student Name</th>
              <th>Quiz Title</th>
              <th>Score</th>
              <th>Percentage</th>
              <th>Status</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>${quizRowsHtml}</tbody>
        </table>
      `
          : ''
      }

      ${
        assignmentRows.length > 0
          ? `
        <h2>3. Assignment Grades Breakdown</h2>
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Student Name</th>
              <th>Assignment Title</th>
              <th>Score</th>
              <th>Percentage</th>
              <th>Status</th>
              <th>Feedback</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>${asgRowsHtml}</tbody>
        </table>
      `
          : ''
      }

      <div class="footer">Printed from Lumina LMS Official Gradebook</div>
    </body>
    </html>
  `)

  printWindow.document.close()
  printWindow.focus()
  setTimeout(() => printWindow.print(), 300)
}

// Keep legacy single-table helpers for backwards compatibility
export async function exportToPDF(data, title = 'Quiz Score Report') {
  return exportGradebookToPDF({
    studentGrades: [],
    quizRows: data,
    assignmentRows: [],
    meta: { subjectName: title },
  })
}

export async function exportToSpreadsheet(data, title = 'Quiz Scores') {
  return exportGradebookToExcel({
    studentGrades: [],
    quizRows: data,
    assignmentRows: [],
    meta: { subjectName: title },
  })
}

export function printScores(data, title = 'Quiz Score Report') {
  return printGradebook({
    studentGrades: [],
    quizRows: data,
    assignmentRows: [],
    meta: { subjectName: title },
  })
}
