// Heavy export libraries are loaded on demand so they don't bloat the initial bundle

function escapeHtml(val) {
  return String(val ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function formatSafeDate(val) {
  if (!val) return '-'
  try {
    const d = new Date(val)
    return isNaN(d.getTime()) ? '-' : d.toLocaleDateString()
  } catch {
    return '-'
  }
}

/**
 * Export score data to PDF
 * @param {Array} data - Array of { studentName, quizTitle, score, total, percentage, passed, submittedAt }
 * @param {string} title - Report title
 */
export async function exportToPDF(data, title = 'Quiz Score Report') {
  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ])
  const doc = new jsPDF()

  // Header
  doc.setFontSize(20)
  doc.setFont('helvetica', 'bold')
  doc.text('Lumina LMS', 14, 20)

  doc.setFontSize(14)
  doc.setFont('helvetica', 'normal')
  doc.text(title, 14, 30)

  doc.setFontSize(10)
  doc.setTextColor(100)
  doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 38)

  // Table
  const tableData = data.map((row, idx) => [
    idx + 1,
    row.studentName || row.student_name || 'Unknown',
    row.quizTitle || row.quiz_title || '-',
    `${row.score ?? 0}/${row.total ?? 10}`,
    `${row.percentage ?? 0}%`,
    row.passed ? 'PASSED' : 'FAILED',
    formatSafeDate(row.submittedAt || row.submitted_at),
  ])

  autoTable(doc, {
    startY: 45,
    head: [['#', 'Student Name', 'Quiz', 'Score', 'Percentage', 'Status', 'Date']],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: [124, 92, 252],
      textColor: 255,
      fontStyle: 'bold',
    },
    alternateRowStyles: {
      fillColor: [245, 245, 255],
    },
    styles: {
      fontSize: 9,
      cellPadding: 4,
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 12 },
      4: { halign: 'center' },
      5: { halign: 'center' },
    },
    didParseCell: (data) => {
      if (data.column.index === 5 && data.section === 'body') {
        if (data.cell.raw === 'PASSED') {
          data.cell.styles.textColor = [0, 150, 100]
          data.cell.styles.fontStyle = 'bold'
        } else {
          data.cell.styles.textColor = [220, 50, 50]
          data.cell.styles.fontStyle = 'bold'
        }
      }
    },
  })

  // Footer
  const pageCount = doc.internal.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.setTextColor(150)
    doc.text(
      `Page ${i} of ${pageCount}`,
      doc.internal.pageSize.getWidth() / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'center' }
    )
  }

  doc.save(`${title.replace(/\s+/g, '_')}_${Date.now()}.pdf`)
}

/**
 * Export score data to Excel spreadsheet
 * @param {Array} data - Same format as exportToPDF
 * @param {string} title - Sheet name / file name
 */
export async function exportToSpreadsheet(data, title = 'Quiz Scores') {
  const XLSX = await import('xlsx')
  const wsData = [
    ['#', 'Student Name', 'Quiz', 'Score', 'Total', 'Percentage', 'Status', 'Date'],
    ...data.map((row, idx) => [
      idx + 1,
      row.studentName || row.student_name || 'Unknown',
      row.quizTitle || row.quiz_title || '-',
      row.score ?? 0,
      row.total ?? 10,
      row.percentage ?? 0,
      row.passed ? 'PASSED' : 'FAILED',
      formatSafeDate(row.submittedAt || row.submitted_at),
    ]),
  ]

  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.aoa_to_sheet(wsData)

  // Column widths
  ws['!cols'] = [
    { wch: 5 },
    { wch: 25 },
    { wch: 30 },
    { wch: 8 },
    { wch: 8 },
    { wch: 12 },
    { wch: 10 },
    { wch: 15 },
  ]

  XLSX.utils.book_append_sheet(wb, ws, title.slice(0, 31))
  XLSX.writeFile(wb, `${title.replace(/\s+/g, '_')}_${Date.now()}.xlsx`)
}

/**
 * Print score data using browser print dialog
 * @param {Array} data - Same format as above
 * @param {string} title - Report title
 */
export function printScores(data, title = 'Quiz Score Report') {
  const printWindow = window.open('', '_blank')
  if (!printWindow) return

  const rows = data
    .map(
      (row, idx) => `
    <tr>
      <td>${idx + 1}</td>
      <td>${escapeHtml(row.studentName || row.student_name || 'Unknown')}</td>
      <td>${escapeHtml(row.quizTitle || row.quiz_title || '-')}</td>
      <td>${row.score ?? 0}/${row.total ?? 10}</td>
      <td>${row.percentage ?? 0}%</td>
      <td style="color: ${row.passed ? '#00a868' : '#dc3232'}; font-weight: bold;">
        ${row.passed ? 'PASSED' : 'FAILED'}
      </td>
      <td>${formatSafeDate(row.submittedAt || row.submitted_at)}</td>
    </tr>
  `
    )
    .join('')

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>${escapeHtml(title)}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; color: #333; }
        h1 { font-size: 22px; margin-bottom: 4px; }
        .subtitle { color: #666; font-size: 13px; margin-bottom: 20px; }
        table { width: 100%; border-collapse: collapse; font-size: 13px; }
        th { background: #7c5cfc; color: white; padding: 10px 8px; text-align: left; }
        td { padding: 8px; border-bottom: 1px solid #ddd; }
        tr:nth-child(even) { background: #f8f8fc; }
        .footer { margin-top: 20px; font-size: 11px; color: #999; text-align: center; }
      </style>
    </head>
    <body>
      <h1>Lumina LMS — ${escapeHtml(title)}</h1>
      <div class="subtitle">Generated: ${new Date().toLocaleString()}</div>
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Student Name</th>
            <th>Quiz</th>
            <th>Score</th>
            <th>Percentage</th>
            <th>Status</th>
            <th>Date</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      <div class="footer">Printed from Lumina LMS</div>
    </body>
    </html>
  `)

  printWindow.document.close()
  printWindow.focus()
  setTimeout(() => printWindow.print(), 300)
}
