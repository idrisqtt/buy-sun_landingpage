import { applyPdfFonts } from './pdfFonts'
import { cropSquarePhoto, fitInBox } from './photoUtils'

// The anketa for editing in Canva. Canva turns real text in a PDF into text
// boxes, so this file is kept simple: white pages, no background, no header or
// logo, every line is plain text, photos are separate pictures. The labels and
// values are the same as in the anketa PDF. The BUY SUN manager's name is left
// out, as in the file for a partner. Returns a Blob.

const has = (value) => value !== undefined && value !== null && String(value).trim() !== ''
const join = (a, b) => [a, b].filter(has).join(' - ')

// Sections in the order of the anketa PDF; rows without a value are skipped
function sections(f) {
  const start = f.startMonth && f.startDay && f.endMonth && f.endDay
    ? `${f.startMonth}/${f.startDay} - ${f.endMonth}/${f.endDay}` : ''
  const experience = [1, 2, 3]
    .filter((n) => has(f[`position${n}`]) || has(f[`company${n}`]) || has(f[`country${n}`]))
    .flatMap((n, i) => [
      ...(i > 0 ? [null] : []), // a gap between jobs
      ['Position', f[`position${n}`]],
      ['Place of work', f[`company${n}`]],
      ['Work period', join(f[`workStart${n}`], f[`workEnd${n}`])],
      ['Country', f[`country${n}`]],
    ])
  const extraLanguage = has(f.additionalLanguage)
    ? [f.additionalLanguage.charAt(0).toUpperCase() + f.additionalLanguage.slice(1), f.additionalLanguageLevel || '']
    : null

  return [
    ['PERSONAL DETAILS', [
      ['Date of birth', f.birthDate],
      ['Height', has(f.height) ? `${f.height} cm` : ''],
      ['Weight', has(f.weight) ? `${f.weight} kg` : ''],
      ['Marital status', f.maritalStatus],
      ['Start finish', start],
      ['Citizenship', f.citizenship],
      ['City', f.city],
      ['Father name', f.fatherName],
      ['Mother name', f.motherName],
    ]],
    ['EDUCATION', [
      ['Name of employer', f.institution],
      ['Major', f.specialty],
      ['Date', join(f.studyStart, f.studyEnd)],
    ]],
    ['EXPERIENCE', experience],
    ['LANGUAGES', [
      ['English', f.english],
      ['Turkish', f.turkish],
      ['Russian', f.russian],
      extraLanguage,
    ].filter(Boolean)],
    ['HOBBY AND INTERESTS', [
      ['', f.courses],
      ['', f.hobbies],
    ]],
  ]
    .map(([title, rows]) => [title, rows.filter((row) => row === null || has(row[1]))])
    .filter(([, rows]) => rows.some((row) => row !== null))
}

export async function buildCanvaPdf(formData) {
  const { default: jsPDF } = await import('jspdf')
  const pdf = new jsPDF('p', 'mm', 'a4')
  await applyPdfFonts(pdf)

  const pageWidth = 210
  const pageHeight = 297
  const margin = 15
  const bottom = pageHeight - margin
  const black = [20, 20, 20]
  const gray = [95, 95, 95]

  const style = (weight, size, color) => {
    pdf.setFont(undefined, weight)
    pdf.setFontSize(size)
    pdf.setTextColor(...color)
  }

  // Name, position and age on the left, the selfie as a square on the right
  const photoSize = 48
  if (formData.selfiePhoto) {
    const selfie = await cropSquarePhoto(formData.selfiePhoto)
    pdf.addImage(selfie, 'JPEG', pageWidth - margin - photoSize, margin, photoSize, photoSize)
  }
  const headWidth = pageWidth - margin * 2 - (formData.selfiePhoto ? photoSize + 8 : 0)
  style('bold', 28, black)
  const nameLines = pdf.splitTextToSize([formData.firstName, formData.lastName].filter(has).join(' '), headWidth)
  let headY = margin + 10
  pdf.text(nameLines, margin, headY)
  headY += nameLines.length * 11 + 2
  for (const [label, value] of [['Position', formData.desiredPosition], ['Years', formData.age]]) {
    if (!has(value)) continue
    style('bold', 13, gray)
    pdf.text(`${label}:`, margin, headY)
    style('normal', 15, black)
    pdf.text(String(value), margin + 28, headY)
    headY += 8
  }
  const top = Math.max(headY, formData.selfiePhoto ? margin + photoSize : 0) + 10

  // Two columns as in the anketa: personal details and education on the left,
  // experience, languages and hobbies on the right. Each column continues on
  // the next page by itself if it is long.
  const columns = {
    left: { x: margin, width: 70, labelAbove: true, page: 1, y: top },
    right: { x: margin + 70 + 10, width: pageWidth - margin * 2 - 80, labelAbove: false, page: 1, y: top },
  }
  const place = (col, height) => {
    if (col.y + height > bottom) {
      col.page += 1
      col.y = margin + 6
    }
    while (pdf.getNumberOfPages() < col.page) pdf.addPage()
    pdf.setPage(col.page)
  }

  const all = sections(formData)
  const leftTitles = ['PERSONAL DETAILS', 'EDUCATION']
  for (const [title, rows] of all) {
    const col = leftTitles.includes(title) ? columns.left : columns.right
    place(col, 22)
    style('bold', 16, black)
    pdf.text(title, col.x, col.y)
    col.y += 9

    for (const row of rows) {
      if (row === null) {
        col.y += 3
        continue
      }
      const [label, value] = row
      const valueX = !label || col.labelAbove ? col.x : col.x + 36
      style('normal', 13, black)
      const lines = pdf.splitTextToSize(String(value).trim(), col.width - (valueX - col.x))
      const lineHeight = 5.8
      const height = lines.length * lineHeight + (label && col.labelAbove ? 5.5 : 0) + 2
      place(col, height)
      if (label) {
        style('bold', 11, gray)
        pdf.text(`${label}:`, col.x, col.y)
        if (col.labelAbove) col.y += 5.5
      }
      style('normal', 13, black)
      pdf.text(lines, valueX, col.y)
      col.y += lines.length * lineHeight + 2
    }
    col.y += 7
  }

  // Full body and additional photo, each whole, on their own page, as in the anketa
  const photos = [formData.fullBodyPhoto, formData.additionalPhoto1].filter(Boolean)
  if (photos.length > 0) {
    pdf.addPage()
    const slotWidth = pageWidth - margin * 2
    const slotHeight = (pageHeight - margin * 2 - (photos.length - 1) * 6) / photos.length
    photos.forEach((photo, i) => {
      const size = fitInBox(photo.width, photo.height, slotWidth, slotHeight)
      const x = (pageWidth - size.width) / 2
      const y = margin + i * (slotHeight + 6) + (slotHeight - size.height) / 2
      pdf.addImage(photo.dataUrl, 'JPEG', x, y, size.width, size.height)
    })
  }

  return pdf.output('blob')
}
