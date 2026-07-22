// exceljs is dynamically imported so it only loads when someone actually
// downloads a spreadsheet, instead of bloating the main app bundle that
// loads on every page.
export async function downloadXlsx(filename, sheets) {
  const { default: ExcelJS } = await import('exceljs')
  const workbook = new ExcelJS.Workbook()

  for (const { name, rows } of sheets) {
    const worksheet = workbook.addWorksheet(name.slice(0, 31))
    if (rows.length === 0) {
      worksheet.addRow(['No data recorded yet'])
      continue
    }
    const headers = Object.keys(rows[0])
    worksheet.columns = headers.map((header) => ({
      header,
      key: header,
      width: Math.min(Math.max(header.length + 2, 14), 40),
    }))
    worksheet.addRows(rows)
    worksheet.getRow(1).font = { bold: true }
  }

  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const url = URL.createObjectURL(blob)

  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
