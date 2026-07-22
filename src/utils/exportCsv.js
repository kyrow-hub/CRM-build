function escapeCsvValue(value) {
  const str = String(value ?? '')
  return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str
}

export function downloadCsv(filename, rows) {
  if (!rows.length) return

  const headers = Object.keys(rows[0])
  const lines = [
    headers.join(','),
    ...rows.map((row) => headers.map((header) => escapeCsvValue(row[header])).join(',')),
  ]
  const blob = new Blob([lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)

  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export function partnersToMailMergeRows(partners) {
  return partners.flatMap((partner) =>
    (partner.contacts ?? []).map((contact) => ({
      'Business Name': partner.business_name,
      'Business Address': partner.address,
      'Business Phone': partner.phone,
      'Business Email': partner.email,
      'Contact Name': contact.name,
      'Contact Phone': contact.phone,
      'Contact Email': contact.email,
    })),
  )
}
