import { applyPdfFonts } from './pdfFonts'
import { cropRoundPhoto, fitInBox } from './photoUtils'
import logoAnketa from '/logo_anketa.png'

// The partner's logo, header and contacts in the place of the BUY SUN logo.
// box: the area at the top of the right column, in mm.
function drawPartnerHeader(pdf, { logo, header, contacts }, box) {
  const headerText = (header || '').trim()
  const contactLines = (contacts || '').split('\n').map((l) => l.trim()).filter(Boolean)
  const hasText = Boolean(headerText || contactLines.length)

  let textX = box.x
  let textWidth = box.width
  if (logo) {
    // Next to the text the logo takes the left part, alone it is centered
    const size = fitInBox(logo.width, logo.height, hasText ? 48 : 80, box.height)
    const x = hasText ? box.x : box.x + (box.width - size.width) / 2
    pdf.addImage(logo.dataUrl, 'PNG', x, box.y + (box.height - size.height) / 2, size.width, size.height)
    textX = box.x + size.width + 6
    textWidth = box.width - size.width - 6
  }
  if (!hasText) return

  const ptToMm = 0.3528 * 1.15
  // The header on one line if it fits down to 12 pt, otherwise two lines of 14 pt
  pdf.setFont(undefined, 'bold')
  let headerSize = 14
  let headerLines = []
  if (headerText) {
    const oneLine = [16, 15, 14, 13, 12].find((size) => {
      pdf.setFontSize(size)
      return pdf.getTextWidth(headerText) <= textWidth
    })
    if (oneLine) {
      headerSize = oneLine
      headerLines = [headerText]
    } else {
      pdf.setFontSize(headerSize)
      headerLines = pdf.splitTextToSize(headerText, textWidth).slice(0, 2)
    }
  }
  pdf.setFont(undefined, 'normal')
  pdf.setFontSize(10)
  const contactRows = contactLines.flatMap((l) => pdf.splitTextToSize(l, textWidth)).slice(0, 4)
  const headerHeight = headerLines.length * headerSize * ptToMm
  const gap = headerLines.length && contactRows.length ? 1.5 : 0
  const height = headerHeight + gap + contactRows.length * 10 * ptToMm

  const center = !logo
  const x = center ? box.x + box.width / 2 : textX
  const options = { baseline: 'top', align: center ? 'center' : 'left' }
  let y = box.y + Math.max(0, (box.height - height) / 2)
  if (headerLines.length) {
    pdf.setFont(undefined, 'bold')
    pdf.setFontSize(headerSize)
    pdf.setTextColor(20, 20, 20)
    pdf.text(headerLines, x, y, options)
    y += headerHeight + gap
  }
  if (contactRows.length) {
    pdf.setFont(undefined, 'normal')
    pdf.setFontSize(10)
    pdf.setTextColor(90, 90, 90)
    pdf.text(contactRows, x, y, options)
  }
}

// The anketa PDF exactly as candidates get it. Used by the form on the site
// and by the manager cabinet, so an edited anketa looks the same.
// formData: the anketa answers plus selfiePhoto, fullBodyPhoto and
// additionalPhoto1 as { dataUrl, width, height, focus? }. Returns a Blob.
// partner: { logo: { dataUrl, width, height } | null, header, contacts } makes
// the file for a partner: their header instead of BUY SUN, no service fields.
export async function buildAnketaPdf(formData, { partner } = {}) {
  // Loaded only when needed: keeps 400 KB of PDF code out of the first page load
  const { default: jsPDF } = await import('jspdf')
  const pdf = new jsPDF('p', 'mm', 'a4')
  await applyPdfFonts(pdf)
  const pageWidth = 210
  const pageHeight = 297
  const leftColWidth = 85
  const rightColStart = leftColWidth
  const rightColWidth = pageWidth - leftColWidth
  const leftPadding = 8
  const rightPadding = 10
  const leftCenter = leftColWidth / 2
  const rightCenter = rightColStart + rightColWidth / 2

  // Colors
  const darkBlue = [3, 72, 125] // #03487D
  const gold = [218, 165, 32] // Gold for logo
  const white = [255, 255, 255]
  const black = [0, 0, 0]
  const gray = [100, 100, 100]

  // Draw left column background (dark blue)
  pdf.setFillColor(...darkBlue)
  pdf.rect(0, 0, leftColWidth, pageHeight, 'F')

  // ========== LEFT COLUMN ==========
  let leftY = 15

  if (formData.selfiePhoto) {
    const roundPhoto = await cropRoundPhoto(formData.selfiePhoto, darkBlue)
    // Add circular photo (60x60mm - 20% larger)
    pdf.addImage(roundPhoto, 'JPEG', leftColWidth / 2 - 30, leftY, 60, 60)
  }

  leftY += 70

  // Calculate right column position for EXPERIENCE to align with PERSONAL DETAILS
  // rightY starts at 15, +30 for logo, +9 for name, +6 for divider, +5 for spacing = 65
  // Then EXPERIENCE title starts at 65
  // So leftY should also be at 65 for PERSONAL DETAILS
  const experienceStartY = 15 + 30 + 9 + 6 + 5 // Logo + name + divider + spacing
  if (leftY < experienceStartY) {
    leftY = experienceStartY
  }

  // PERSONAL DETAILS section - aligned with EXPERIENCE (same title size)
  pdf.setTextColor(...white)
  pdf.setFontSize(20)
  pdf.setFont(undefined, 'bold')
  pdf.text('PERSONAL DETAILS', leftCenter, leftY, { align: 'center' })
  leftY += 14

  pdf.setFontSize(17)
  pdf.setFont(undefined, 'bold')

  const addLeftField = (label, value) => {
    // Skip empty fields
    if (!value || value.trim() === '' || value === '-' || value === ' - ') return
    pdf.setFontSize(15) // Changed from 17
    pdf.setFont(undefined, 'bold')
    // Label on current line
    pdf.text(`${label}:`, leftPadding, leftY)
    leftY += 6  // Move to next line

    pdf.setFontSize(17)
    pdf.setFont(undefined, 'normal')
    
    // Wrap text to fit column width
    const availableWidth = leftColWidth - leftPadding * 2
    const valueLines = pdf.splitTextToSize(String(value), availableWidth)
    
    // Value on next line(s), same level (left-aligned)
    pdf.text(valueLines, leftPadding, leftY)
    pdf.setFont(undefined, 'bold')
    
    // Move Y by number of lines * line height
    leftY += valueLines.length * 6  // 6 is the line height
  }

  addLeftField('DATE OF BIRTH', formData.birthDate)
  addLeftField('HEIGHT', formData.height ? `${formData.height} cm` : '')
  addLeftField('WEIGHT', formData.weight ? `${formData.weight} kg` : '')
  addLeftField('MARITAL STATUS', formData.maritalStatus)
  // Only show START FINISH if both dates are filled
  if (formData.startMonth && formData.startDay && formData.endMonth && formData.endDay) {
    addLeftField('START FINISH', `${formData.startMonth}/${formData.startDay} - ${formData.endMonth}/${formData.endDay}`)
  }
  addLeftField('CITIZENSHIP', formData.citizenship)
  addLeftField('CITY', formData.city)
  addLeftField('FATHER NAME', formData.fatherName)
  addLeftField('MOTHER NAME', formData.motherName)

  leftY += 10

  // The BUY SUN manager who advised the candidate is a service field: never in a partner's file
  const manager = partner ? '' : formData.manager

  // EDUCATION section - only show if there's education data (same title size as EXPERIENCE)
  const hasEducation = formData.institution || formData.specialty || formData.studyStart || formData.studyEnd || manager
  if (hasEducation) {
    pdf.setFontSize(20)
    pdf.setFont(undefined, 'bold')
    pdf.text('EDUCATION', leftCenter, leftY, { align: 'center' })
    leftY += 14

    pdf.setFontSize(17)
    addLeftField('NAME OF EMPLOYER', formData.institution)
    addLeftField('MAJOR', formData.specialty)
    // Only show DATE if both start and end are filled
    if (formData.studyStart && formData.studyEnd) {
      addLeftField('DATE', `${formData.studyStart} - ${formData.studyEnd}`)
    } else if (formData.studyStart) {
      addLeftField('DATE', formData.studyStart)
    } else if (formData.studyEnd) {
      addLeftField('DATE', formData.studyEnd)
    }
    addLeftField('MANAGER', manager)
  }

  // ========== RIGHT COLUMN ==========
  let rightY = 15
  const rightX = rightColStart + rightPadding
  const rightValueX = rightX + 58 // Value start position so label and value don't blend

  if (partner) {
    drawPartnerHeader(pdf, partner, { x: rightX, y: rightY, width: pageWidth - rightPadding - rightX, height: 28 })
  } else {
    try {
      // BUY SUN Logo (image) - larger size, centered
      pdf.addImage(logoAnketa, 'PNG', rightCenter - 35, rightY, 70, 28)
    } catch (err) {
      // Fallback to text if image fails
      pdf.setTextColor(3, 72, 125) // #03487D
      pdf.setFontSize(29)
      pdf.setFont(undefined, 'bold')
      pdf.text('BUY', rightCenter - 28, rightY + 16)
      pdf.setTextColor(218, 165, 32)
      pdf.text('SUN', rightCenter + 4, rightY + 16)
    }
  }

  rightY += 45

  // Helper to add field on the right with label and optional wrapping value
  const addRightField = (label, value) => {
    if (!value || String(value).trim() === '') return
    pdf.setFontSize(15)
    pdf.setFont(undefined, 'bold')
    pdf.setTextColor(...black)
    pdf.text(`${label}: `, rightX, rightY)
    
    pdf.setFontSize(17)
    pdf.setFont(undefined, 'normal')
    
    const availableWidth = pageWidth - rightPadding - rightValueX
    const valueLines = pdf.splitTextToSize(String(value), availableWidth)
    pdf.text(valueLines, rightValueX, rightY)
    
    // Update rightY based on number of lines
    rightY += Math.max(valueLines.length * 6, 8) 
  }

  // Name and position (no label, just value)
  pdf.setTextColor(...black)
  pdf.setFontSize(28)
  pdf.setFont(undefined, 'bold')
  const name = `${formData.firstName} ${formData.lastName}`
  const nameLines = pdf.splitTextToSize(name, pageWidth - rightPadding - rightX)
  pdf.text(nameLines, rightX, rightY)
  rightY += nameLines.length * 9
  
  // Divider line
  pdf.setDrawColor(...gray)
  pdf.setLineWidth(0.7) // 2px line
  pdf.line(rightX, rightY, pageWidth - rightPadding, rightY)
  rightY += 8

  // Fields with labels
  addRightField('Position', formData.desiredPosition)
  addRightField('Years', formData.age)
  
  rightY += 5

  // EXPERIENCE section - helper to add experience block only if has data
  const addExpBlock = (position, company, workStart, workEnd, country) => {
    // Skip completely if no meaningful data (check for empty strings too)
    const hasPosition = position && position.trim() !== ''
    const hasCompany = company && company.trim() !== ''
    const hasCountry = country && country.trim() !== ''
    const hasWorkStart = workStart && workStart.trim() !== ''
    const hasWorkEnd = workEnd && workEnd.trim() !== ''
    
    if (!hasPosition && !hasCompany && !hasCountry) return false
    
    pdf.setFontSize(17) // Same as other labels and values
    pdf.setFont(undefined, 'bold')
    
    const availableValueWidth = pageWidth - rightPadding - rightValueX

    if (hasPosition) {
      pdf.setFontSize(15)
      pdf.setFont(undefined, 'bold')
      pdf.text('Position: ', rightX, rightY)
      pdf.setFontSize(17)
      pdf.setFont(undefined, 'normal')
      const posLines = pdf.splitTextToSize(position, availableValueWidth)
      pdf.text(posLines, rightValueX, rightY)
      rightY += Math.max(posLines.length * 6, 8)
    }
    
    if (hasCompany) {
      pdf.setFontSize(15)
      pdf.setFont(undefined, 'bold')
      pdf.text('Place of work: ', rightX, rightY)
      pdf.setFontSize(17)
      pdf.setFont(undefined, 'normal')
      const companyLines = pdf.splitTextToSize(company, availableValueWidth)
      pdf.text(companyLines, rightValueX, rightY)
      rightY += Math.max(companyLines.length * 6, 8)
    }
    
    if (hasWorkStart || hasWorkEnd) {
      pdf.setFontSize(15)
      pdf.setFont(undefined, 'bold')
      pdf.text('Work period: ', rightX, rightY)
      pdf.setFontSize(17)
      pdf.setFont(undefined, 'normal')
      let periodText = ''
      if (hasWorkStart && hasWorkEnd) periodText = `${workStart} - ${workEnd}`
      else if (hasWorkStart) periodText = workStart
      else periodText = workEnd
      
      const periodLines = pdf.splitTextToSize(periodText, availableValueWidth)
      pdf.text(periodLines, rightValueX, rightY)
      rightY += Math.max(periodLines.length * 6, 8)
    }
    
    if (hasCountry) {
      pdf.setFontSize(15)
      pdf.setFont(undefined, 'bold')
      pdf.text('Country: ', rightX, rightY)
      pdf.setFontSize(17)
      pdf.setFont(undefined, 'normal')
      const countryLines = pdf.splitTextToSize(country, availableValueWidth)
      pdf.text(countryLines, rightValueX, rightY)
      rightY += Math.max(countryLines.length * 6, 8)
    }
    rightY += 4

    // Divider only if block was rendered
    pdf.setDrawColor(...gray)
    pdf.setLineWidth(0.7) // 2px line
    pdf.line(rightX, rightY, pageWidth - rightPadding, rightY)
    rightY += 6
    return true
  }

  // Check if any experience exists (with proper empty string check)
  const hasExp1 = (formData.position1 && formData.position1.trim()) || 
                  (formData.company1 && formData.company1.trim()) || 
                  (formData.country1 && formData.country1.trim())
  const hasExp2 = (formData.position2 && formData.position2.trim()) || 
                  (formData.company2 && formData.company2.trim()) || 
                  (formData.country2 && formData.country2.trim())
  const hasExp3 = (formData.position3 && formData.position3.trim()) || 
                  (formData.company3 && formData.company3.trim()) || 
                  (formData.country3 && formData.country3.trim())
  const hasAnyExperience = hasExp1 || hasExp2 || hasExp3

  if (hasAnyExperience) {
    pdf.setTextColor(...black) // Black color
    pdf.setFontSize(20) // Increased from 17
    pdf.setFont(undefined, 'bold')
    pdf.text('EXPERIENCE', rightCenter, rightY, { align: 'center' })
    rightY += 14

    pdf.setTextColor(...black)
    pdf.setFontSize(17)

    if (hasExp1) addExpBlock(formData.position1, formData.company1, formData.workStart1, formData.workEnd1, formData.country1)
    if (hasExp2) addExpBlock(formData.position2, formData.company2, formData.workStart2, formData.workEnd2, formData.country2)
    if (hasExp3) addExpBlock(formData.position3, formData.company3, formData.workStart3, formData.workEnd3, formData.country3)
  }

  rightY += 10 // Reduced space between sections

  // LANGUAGES section - only show if any language is filled
  const hasLanguages = formData.english || formData.turkish || formData.russian || formData.additionalLanguage
  if (hasLanguages) {
    pdf.setTextColor(...black) // Black color
    pdf.setFontSize(20) // Increased from 17
    pdf.setFont(undefined, 'bold')
    pdf.text('LANGUAGES:', rightCenter, rightY, { align: 'center' })
    rightY += 14

    pdf.setTextColor(...black)
    pdf.setFontSize(15) // Increased from 13

    pdf.setFont(undefined, 'bold')

    if (formData.english) {
      addRightField('English', formData.english)
    }

    if (formData.turkish) {
      addRightField('Turkish', formData.turkish)
    }

    if (formData.russian) {
      addRightField('Russian', formData.russian)
    }

    if (formData.additionalLanguage) {
      const langLabel = formData.additionalLanguage.charAt(0).toUpperCase() + formData.additionalLanguage.slice(1)
      addRightField(langLabel, formData.additionalLanguageLevel || '')
    }
    rightY += 4 // Reduced space after sections
  }

  // HOBBY AND INTERESTS section - combined courses and hobbies
  const hasHobbyInterests = (formData.courses && formData.courses.trim()) || 
                            (formData.hobbies && formData.hobbies.trim())
  if (hasHobbyInterests) {
    pdf.setTextColor(...black) // Black color
    pdf.setFontSize(20) // Increased from 17
    pdf.setFont(undefined, 'bold')
    pdf.text('HOBBY AND INTERESTS', rightCenter, rightY, { align: 'center' })
    rightY += 14

    pdf.setTextColor(...black)
    pdf.setFontSize(17) // Increased from 14
    pdf.setFont(undefined, 'normal')
    
    // Display courses and hobbies on separate lines
    if (formData.courses && formData.courses.trim()) {
      const coursesLines = pdf.splitTextToSize(formData.courses.trim(), rightColWidth - rightPadding * 2)
      pdf.text(coursesLines, rightX, rightY, { lineHeightFactor: 1.5 })
      rightY += coursesLines.length * 6 * 1.5 + 2 // Small space after courses
    }
    
    if (formData.hobbies && formData.hobbies.trim()) {
      const hobbiesLines = pdf.splitTextToSize(formData.hobbies.trim(), rightColWidth - rightPadding * 2)
      pdf.text(hobbiesLines, rightX, rightY, { lineHeightFactor: 1.5 })
    }
  }

  // ========== PHOTO PAGES ==========
  // Only full-body photo and additional photo on photo pages (not selfie)
  const photos = [formData.fullBodyPhoto, formData.additionalPhoto1].filter(Boolean)

  if (photos.length > 0) {
    pdf.addPage()
    const pageMargin = 5 // Small margin for spacing
    const slotWidth = pageWidth - pageMargin * 2
    const slotHeight = (pageHeight - pageMargin * 2) / photos.length

    // The whole photo fits in its slot, so a head or feet are never cut off
    photos.forEach((photo, i) => {
      const { width, height } = fitInBox(photo.width, photo.height, slotWidth, slotHeight)
      const photoX = (pageWidth - width) / 2
      const photoY = pageMargin + i * slotHeight + (slotHeight - height) / 2
      pdf.addImage(photo.dataUrl, 'JPEG', photoX, photoY, width, height)
    })
  }

  return pdf.output('blob')
}
