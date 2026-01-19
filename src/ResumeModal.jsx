import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import jsPDF from 'jspdf'
import './ResumeModal.css'
import logoAnketa from '/logo_anketa.png'

function ResumeModal({ isOpen, onClose }) {
  const [currentStep, setCurrentStep] = useState(1)
  const [language, setLanguage] = useState('ru')
  const [pdfUrl, setPdfUrl] = useState(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const formRef = useRef(null)

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    city: '',
    age: '',
    birthDate: '',
    fullYears: '',
    maritalStatus: '',
    citizenship: '',
    nationality: '',
    gender: '',
    height: '',
    weight: '',
    russian: '',
    english: '',
    turkish: '',
    additionalLanguage: '',
    additionalLanguageLevel: '',
    institution: '',
    specialty: '',
    studyStart: '',
    studyEnd: '',
    company1: '',
    country1: '',
    position1: '',
    workStart1: '',
    workEnd1: '',
    company2: '',
    country2: '',
    position2: '',
    workStart2: '',
    workEnd2: '',
    company3: '',
    country3: '',
    position3: '',
    workStart3: '',
    workEnd3: '',
    isStudent: '',
    desiredPosition: '',
    readyToWorkPermanently: false,
    startMonth: '',
    startDay: '',
    endMonth: '',
    endDay: '',
    fatherName: '',
    motherName: '',
    hobbies: '',
    courses: '',
    selfiePhoto: null,
    instagram: '',
    source: ''
  })

  const translations = {
    ru: {
      title: 'ЗАПОЛНИТЬ АНКЕТУ',
      subtitle: 'ОТКРЫТ НАБОР НА СЕЗОН 2026!',
      step1Title: 'Заполните анкету',
      step1Desc: 'Введите данные без ошибок',
      step2Title: 'Отправьте анкету',
      step2Desc: 'Нажмите Submit',
      step3Title: 'Скачайте PDF',
      step3Desc: 'Файл создаётся автоматически',
      step4Title: 'Отправьте в WhatsApp',
      step4Desc: 'PDF + фото (4x4)',
      allFieldsRequired: 'Все поля обязательны',
      startForm: 'Начать заполнение',
      downloadPdf: 'Скачать PDF',
      sendWhatsApp: 'Отправить в WhatsApp',
      generating: 'Генерация PDF...',
      back: 'Назад',
      submit: 'Отправить резюме'
    },
    en: {
      title: 'FILL OUT THE FORM',
      subtitle: 'RECRUITMENT FOR SEASON 2026 IS OPEN!',
      step1Title: 'Fill out the form',
      step1Desc: 'Enter data without errors',
      step2Title: 'Submit the form',
      step2Desc: 'Click Submit',
      step3Title: 'Download PDF',
      step3Desc: 'File is created automatically',
      step4Title: 'Send to WhatsApp',
      step4Desc: 'PDF + photo (4x4)',
      allFieldsRequired: 'All fields are required',
      startForm: 'Start filling',
      downloadPdf: 'Download PDF',
      sendWhatsApp: 'Send to WhatsApp',
      generating: 'Generating PDF...',
      back: 'Back',
      submit: 'Submit Resume'
    }
  }

  const t = translations[language]

  const handleChange = (e) => {
    const { name, value, type, checked, files } = e.target
    if (type === 'file') {
      setFormData({
        ...formData,
        [name]: files[0]
      })
    } else if (type === 'checkbox') {
      setFormData({
        ...formData,
        [name]: checked
      })
    } else {
      setFormData({
        ...formData,
        [name]: value
      })
    }
  }

  const generatePDF = async () => {
    setIsGenerating(true)
    
    try {
      const pdf = new jsPDF('p', 'mm', 'a4')
      const pageWidth = 210
      const pageHeight = 297
      const leftColWidth = 85
      const rightColStart = leftColWidth
      const rightColWidth = pageWidth - leftColWidth
      const leftPadding = 8
      const rightPadding = 10

      // Colors
      const darkBlue = [30, 58, 95] // #1E3A5F
      const gold = [218, 165, 32] // Gold for logo
      const white = [255, 255, 255]
      const black = [0, 0, 0]
      const gray = [100, 100, 100]

      // Draw left column background (dark blue)
      pdf.setFillColor(...darkBlue)
      pdf.rect(0, 0, leftColWidth, pageHeight, 'F')

      // ========== LEFT COLUMN ==========
      let leftY = 15

      // Add selfie photo as circle using canvas crop
      if (formData.selfiePhoto) {
        try {
          const photoData = await new Promise((resolve) => {
            const reader = new FileReader()
            reader.onload = (e) => resolve(e.target.result)
            reader.onerror = () => resolve(null)
            reader.readAsDataURL(formData.selfiePhoto)
          })
          if (photoData) {
            // Create circular crop using canvas
            const circularPhotoData = await new Promise((resolve) => {
              const img = new Image()
              img.onload = () => {
                const size = Math.min(img.width, img.height)
                const canvas = document.createElement('canvas')
                canvas.width = size
                canvas.height = size
                const ctx = canvas.getContext('2d')
                
                // Draw circular clip
                ctx.beginPath()
                ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2)
                ctx.closePath()
                ctx.clip()
                
                // Draw image centered
                const offsetX = (img.width - size) / 2
                const offsetY = (img.height - size) / 2
                ctx.drawImage(img, offsetX, offsetY, size, size, 0, 0, size, size)
                
                resolve(canvas.toDataURL('image/png'))
              }
              img.onerror = () => resolve(null)
              img.src = photoData
            })
            
            if (circularPhotoData) {
              // Add circular photo (60x60mm - 20% larger)
              pdf.addImage(circularPhotoData, 'PNG', leftColWidth / 2 - 30, leftY, 60, 60)
            }
          }
        } catch (err) {
          console.log('Could not add photo:', err)
        }
      }

      leftY += 70

      // PERSONAL DETAILS section
      pdf.setTextColor(...white)
      pdf.setFontSize(12)
      pdf.setFont(undefined, 'bold')
      pdf.text('PERSONAL DETAILS', leftPadding, leftY)
      leftY += 8

      pdf.setFontSize(9)
      pdf.setFont(undefined, 'bold')

      const addLeftField = (label, value) => {
        // Skip empty fields
        if (!value || value.trim() === '' || value === '-' || value === ' - ') return
        pdf.setFont(undefined, 'bold')
        pdf.text(`${label}:`, leftPadding, leftY)
        leftY += 5
        pdf.setFont(undefined, 'normal')
        pdf.text(value, leftPadding + 2, leftY)
        leftY += 7
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

      // EDUCATION section - only show if there's education data
      const hasEducation = formData.institution || formData.specialty || formData.studyStart || formData.studyEnd
      if (hasEducation) {
        pdf.setFontSize(12)
        pdf.setFont(undefined, 'bold')
        pdf.text('EDUCATION', leftPadding, leftY)
        leftY += 8

        pdf.setFontSize(9)
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
      }

      // ========== RIGHT COLUMN ==========
      let rightY = 15
      const rightX = rightColStart + rightPadding

      // BUY SUN Logo (image)
      try {
        pdf.addImage(logoAnketa, 'PNG', rightX, rightY, 50, 20)
      } catch (err) {
        // Fallback to text if image fails
        pdf.setTextColor(30, 58, 95)
        pdf.setFontSize(28)
        pdf.setFont(undefined, 'bold')
        pdf.text('BUY', rightX, rightY + 15)
        pdf.setTextColor(218, 165, 32)
        pdf.text('SUN', rightX + 30, rightY + 15)
      }

      rightY += 30

      // Name and position
      pdf.setTextColor(...black)
      pdf.setFontSize(10)
      pdf.setFont(undefined, 'normal')
      pdf.text(`${formData.firstName} ${formData.lastName}`, rightX, rightY)
      rightY += 5
      
      // Divider line
      pdf.setDrawColor(...gray)
      pdf.setLineWidth(0.3)
      pdf.line(rightX, rightY, pageWidth - rightPadding, rightY)
      rightY += 6

      // Only show POSITION if filled
      if (formData.desiredPosition) {
        pdf.setFont(undefined, 'bold')
        pdf.text('POSITION:', rightX, rightY)
        pdf.setFont(undefined, 'normal')
        pdf.text(formData.desiredPosition, rightX + 25, rightY)
        rightY += 6
      }

      // Only show YEARS if filled
      if (formData.age) {
        pdf.setFont(undefined, 'bold')
        pdf.text('YEARS:', rightX, rightY)
        pdf.setFont(undefined, 'normal')
        pdf.text(formData.age, rightX + 18, rightY)
        rightY += 6
      }
      rightY += 4

      // EXPERIENCE section - helper to add experience block only if has data
      const addExpBlock = (position, company, workStart, workEnd, country) => {
        // Skip completely if no meaningful data (check for empty strings too)
        const hasPosition = position && position.trim() !== ''
        const hasCompany = company && company.trim() !== ''
        const hasCountry = country && country.trim() !== ''
        const hasWorkStart = workStart && workStart.trim() !== ''
        const hasWorkEnd = workEnd && workEnd.trim() !== ''
        
        if (!hasPosition && !hasCompany && !hasCountry) return false
        
        if (hasPosition) {
          pdf.setFont(undefined, 'bold')
          pdf.text('POSITION:', rightX, rightY)
          pdf.setFont(undefined, 'normal')
          pdf.text(position, rightX + 25, rightY)
          rightY += 5
        }
        
        if (hasCompany) {
          pdf.setFont(undefined, 'bold')
          pdf.text('PLACE OF WORK:', rightX, rightY)
          pdf.setFont(undefined, 'normal')
          pdf.text(company, rightX + 35, rightY)
          rightY += 5
        }
        
        if (hasWorkStart && hasWorkEnd) {
          pdf.setFont(undefined, 'bold')
          pdf.text('WORK PERIOD:', rightX, rightY)
          pdf.setFont(undefined, 'normal')
          pdf.text(`${workStart} - ${workEnd}`, rightX + 30, rightY)
          rightY += 5
        } else if (hasWorkStart) {
          pdf.setFont(undefined, 'bold')
          pdf.text('WORK PERIOD:', rightX, rightY)
          pdf.setFont(undefined, 'normal')
          pdf.text(workStart, rightX + 30, rightY)
          rightY += 5
        } else if (hasWorkEnd) {
          pdf.setFont(undefined, 'bold')
          pdf.text('WORK PERIOD:', rightX, rightY)
          pdf.setFont(undefined, 'normal')
          pdf.text(workEnd, rightX + 30, rightY)
          rightY += 5
        }
        
        if (hasCountry) {
          pdf.setFont(undefined, 'bold')
          pdf.text('COUNTRY:', rightX, rightY)
          pdf.setFont(undefined, 'normal')
          pdf.text(country, rightX + 22, rightY)
          rightY += 5
        }
        rightY += 3

        // Divider only if block was rendered
        pdf.setDrawColor(...gray)
        pdf.line(rightX, rightY, pageWidth - rightPadding, rightY)
        rightY += 5
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
        pdf.setTextColor(30, 58, 95)
        pdf.setFontSize(14)
        pdf.setFont(undefined, 'bold')
        pdf.text('EXPERIENCE', rightX, rightY)
        rightY += 8

        pdf.setTextColor(...black)
        pdf.setFontSize(9)

        if (hasExp1) addExpBlock(formData.position1, formData.company1, formData.workStart1, formData.workEnd1, formData.country1)
        if (hasExp2) addExpBlock(formData.position2, formData.company2, formData.workStart2, formData.workEnd2, formData.country2)
        if (hasExp3) addExpBlock(formData.position3, formData.company3, formData.workStart3, formData.workEnd3, formData.country3)
      }

      rightY += 5

      // LANGUAGES section - only show if any language is filled
      const hasLanguages = formData.english || formData.turkish || formData.russian
      if (hasLanguages) {
        pdf.setTextColor(30, 58, 95)
        pdf.setFontSize(14)
        pdf.setFont(undefined, 'bold')
        pdf.text('LANGUAGES', rightX, rightY)
        rightY += 8

        pdf.setTextColor(...black)
        pdf.setFontSize(9)

        if (formData.english) {
          pdf.setFont(undefined, 'bold')
          pdf.text('ENGLISH:', rightX, rightY)
          pdf.setFont(undefined, 'normal')
          pdf.text(formData.english, rightX + 22, rightY)
          rightY += 5
        }

        if (formData.turkish) {
          pdf.setFont(undefined, 'bold')
          pdf.text('TURKCE:', rightX, rightY)
          pdf.setFont(undefined, 'normal')
          pdf.text(formData.turkish, rightX + 20, rightY)
          rightY += 5
        }

        if (formData.russian) {
          pdf.setFont(undefined, 'bold')
          pdf.text('RUSSIAN:', rightX, rightY)
          pdf.setFont(undefined, 'normal')
          pdf.text(formData.russian, rightX + 22, rightY)
          rightY += 5
        }
        rightY += 5
      }

      // COURSES AND INTERESTS section - only show if there's data
      const hasCourses = formData.courses || formData.hobbies
      if (hasCourses) {
        pdf.setTextColor(30, 58, 95)
        pdf.setFontSize(14)
        pdf.setFont(undefined, 'bold')
        pdf.text('COURSES AND INTERESTS', rightX, rightY)
        rightY += 8

        pdf.setTextColor(...black)
        pdf.setFontSize(9)
        pdf.setFont(undefined, 'normal')
        
        const parts = []
        if (formData.courses) parts.push(formData.courses)
        if (formData.hobbies) parts.push(formData.hobbies)
        const coursesText = parts.join(', ')
        const coursesLines = pdf.splitTextToSize(coursesText, rightColWidth - rightPadding * 2)
        pdf.text(coursesLines, rightX, rightY)
      }

      // Generate blob URL
      const pdfBlob = pdf.output('blob')
      const url = URL.createObjectURL(pdfBlob)
      setPdfUrl(url)
      
      setCurrentStep(3)
    } catch (error) {
      console.error('Error generating PDF:', error)
      alert('Error generating PDF. Please try again.')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    await generatePDF()
  }

  const handleDownloadPDF = () => {
    if (pdfUrl) {
      const link = document.createElement('a')
      link.href = pdfUrl
      link.download = `BuySun_Resume_${formData.firstName}_${formData.lastName}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }
  }

  const handleSendWhatsApp = () => {
    const message = `Hello! My name is ${formData.firstName} ${formData.lastName}. I am sending my resume for employment.

Contact details:
Phone: ${formData.phone}
Email: ${formData.email}

Desired position: ${formData.desiredPosition}
Work period: ${formData.startMonth}/${formData.startDay} - ${formData.endMonth}/${formData.endDay}

Please consider my application. PDF resume is downloaded and ready to be sent.`
    
    const whatsappUrl = `https://wa.me/77026677171?text=${encodeURIComponent(message)}`
    window.open(whatsappUrl, '_blank')
  }

  const handleClose = () => {
    setCurrentStep(1)
    setPdfUrl(null)
    onClose()
  }

  if (!isOpen) return null

  return (
    <motion.div 
      className="modal-overlay resume-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={handleClose}
    >
      <motion.div 
        className="modal-content resume-modal"
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        onClick={(e) => e.stopPropagation()}
      >
        <button className="modal-close" onClick={handleClose}>×</button>
        
        {/* Header with brand */}
        <div className="resume-header">
          <div className="resume-brand">BUY<br/>SUN</div>
          <div className="resume-header-content">
            <h1 className="resume-main-title">{t.title}</h1>
            <p className="resume-main-subtitle">{t.subtitle}</p>
          </div>
          <div className="language-switcher">
            <button 
              className={`lang-btn ${language === 'ru' ? 'active' : ''}`}
              onClick={() => setLanguage('ru')}
            >
              RU
            </button>
            <button 
              className={`lang-btn ${language === 'en' ? 'active' : ''}`}
              onClick={() => setLanguage('en')}
            >
              EN
            </button>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {/* Step 1: Instructions */}
          {currentStep === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="resume-step step-instructions"
            >
              <div className="steps-container">
                <div className="step-card">
                  <div className="step-number">1</div>
                  <div className="step-icon">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                      <polyline points="14,2 14,8 20,8"/>
                      <line x1="16" y1="13" x2="8" y2="13"/>
                      <line x1="16" y1="17" x2="8" y2="17"/>
                      <polyline points="10,9 9,9 8,9"/>
                    </svg>
                  </div>
                  <h3 className="step-title">{t.step1Title}</h3>
                  <p className="step-desc">{t.step1Desc}</p>
                </div>

                <div className="step-card">
                  <div className="step-number">2</div>
                  <div className="step-icon">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                      <polyline points="17,8 12,3 7,8"/>
                      <line x1="12" y1="3" x2="12" y2="15"/>
                    </svg>
                  </div>
                  <h3 className="step-title">{t.step2Title}</h3>
                  <p className="step-desc">{t.step2Desc}</p>
                </div>

                <div className="step-card">
                  <div className="step-number">3</div>
                  <div className="step-icon">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                      <polyline points="7,10 12,15 17,10"/>
                      <line x1="12" y1="15" x2="12" y2="3"/>
                    </svg>
                  </div>
                  <h3 className="step-title">{t.step3Title}</h3>
                  <p className="step-desc">{t.step3Desc}</p>
                </div>

                <div className="step-card">
                  <div className="step-number">4</div>
                  <div className="step-icon">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
                    </svg>
                  </div>
                  <h3 className="step-title">{t.step4Title}</h3>
                  <p className="step-desc">{t.step4Desc}</p>
                </div>
              </div>

              <p className="all-fields-note">{t.allFieldsRequired}</p>

              <button 
                className="start-form-btn"
                onClick={() => setCurrentStep(2)}
              >
                {t.startForm}
              </button>
            </motion.div>
          )}

          {/* Step 2: Form */}
          {currentStep === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="resume-step step-form"
            >
              <button className="back-btn" onClick={() => setCurrentStep(1)}>
                ← {t.back}
              </button>

              <form className="resume-form" onSubmit={handleSubmit} ref={formRef}>
                <h2 className="resume-form-title">Заполните резюме</h2>
                
                <section className="form-section">
                  <h3 className="section-title">Основная информация</h3>
                  
                  <div className="form-row">
                    <div className="form-group">
                      <label>Имя (на англ.)</label>
                      <input type="text" name="firstName" value={formData.firstName} onChange={handleChange} placeholder="Введите ваше имя" required />
                    </div>
                    <div className="form-group">
                      <label>Фамилия (на англ.)</label>
                      <input type="text" name="lastName" value={formData.lastName} onChange={handleChange} placeholder="Введите вашу фамилию" required />
                    </div>
                  </div>
                  
                  <div className="form-row">
                    <div className="form-group">
                      <label>Номер телефона</label>
                      <input type="tel" name="phone" value={formData.phone} onChange={handleChange} placeholder="Введите ваш номер телефона" required />
                    </div>
                    <div className="form-group">
                      <label>Email</label>
                      <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="Введите ваш email" required />
                    </div>
                  </div>
                  
                  <div className="form-row">
                    <div className="form-group">
                      <label>Город проживания (на английском)</label>
                      <input type="text" name="city" value={formData.city} onChange={handleChange} placeholder="e.g. Almaty, Astana" required />
                    </div>
                    <div className="form-row-inline">
                      <div className="form-group">
                        <label>Возраст</label>
                        <input type="number" name="age" value={formData.age} onChange={handleChange} required />
                      </div>
                      <div className="form-group">
                        <label>Дата рождения</label>
                        <input type="date" name="birthDate" value={formData.birthDate} onChange={handleChange} required />
                      </div>
                      <div className="form-group">
                        <label>Полных лет</label>
                        <input type="number" name="fullYears" value={formData.fullYears} onChange={handleChange} required />
                      </div>
                    </div>
                  </div>
                  
                  <div className="form-row">
                    <div className="form-group">
                      <label>Семейное положение</label>
                      <select name="maritalStatus" value={formData.maritalStatus} onChange={handleChange} required>
                        <option value="">---</option>
                        <option value="single">Холост/Не замужем</option>
                        <option value="married">Женат/Замужем</option>
                        <option value="divorced">Разведен/Разведена</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Гражданство (на английском)</label>
                      <input type="text" name="citizenship" value={formData.citizenship} onChange={handleChange} placeholder="e.g. Kazakhstan, Russia" required />
                    </div>
                    <div className="form-group">
                      <label>Национальность (на английском)</label>
                      <input type="text" name="nationality" value={formData.nationality} onChange={handleChange} placeholder="e.g. Kazakh, Russian" required />
                    </div>
                    <div className="form-group">
                      <label>Пол</label>
                      <select name="gender" value={formData.gender} onChange={handleChange} required>
                        <option value="">---</option>
                        <option value="male">Мужской</option>
                        <option value="female">Женский</option>
                      </select>
                    </div>
                  </div>
                  
                  <div className="form-row">
                    <div className="form-group">
                      <label>Рост (см)</label>
                      <input type="number" name="height" value={formData.height} onChange={handleChange} required />
                    </div>
                    <div className="form-group">
                      <label>Вес (кг)</label>
                      <input type="number" name="weight" value={formData.weight} onChange={handleChange} required />
                    </div>
                  </div>
                </section>

                <section className="form-section">
                  <h3 className="section-title">Уровень владения языками</h3>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Русский</label>
                      <select name="russian" value={formData.russian} onChange={handleChange} required>
                        <option value="">---</option>
                        <option value="native">Родной</option>
                        <option value="fluent">Свободно</option>
                        <option value="good">Хорошо</option>
                        <option value="basic">Базовый</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Английский</label>
                      <select name="english" value={formData.english} onChange={handleChange} required>
                        <option value="">---</option>
                        <option value="native">Родной</option>
                        <option value="fluent">Свободно</option>
                        <option value="good">Хорошо</option>
                        <option value="basic">Базовый</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Турецкий</label>
                      <select name="turkish" value={formData.turkish} onChange={handleChange} required>
                        <option value="">---</option>
                        <option value="native">Родной</option>
                        <option value="fluent">Свободно</option>
                        <option value="good">Хорошо</option>
                        <option value="basic">Базовый</option>
                      </select>
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Дополнительный язык</label>
                      <input type="text" name="additionalLanguage" value={formData.additionalLanguage} onChange={handleChange} />
                    </div>
                    <div className="form-group">
                      <label>Уровень владения дополнительным языком</label>
                      <select name="additionalLanguageLevel" value={formData.additionalLanguageLevel} onChange={handleChange}>
                        <option value="">---</option>
                        <option value="native">Родной</option>
                        <option value="fluent">Свободно</option>
                        <option value="good">Хорошо</option>
                        <option value="basic">Базовый</option>
                      </select>
                    </div>
                  </div>
                </section>

                <section className="form-section">
                  <h3 className="section-title">Образование</h3>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Учебное учреждение (на англ.)</label>
                      <input type="text" name="institution" value={formData.institution} onChange={handleChange} placeholder="Введите название учебного учреждения" required />
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Специальность (на англ.)</label>
                      <input type="text" name="specialty" value={formData.specialty} onChange={handleChange} placeholder="Введите специальность" required />
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Начало учебы (только год)</label>
                      <input type="number" name="studyStart" value={formData.studyStart} onChange={handleChange} min="1950" max="2026" required />
                    </div>
                    <div className="form-group">
                      <label>Окончание учебы (только год)</label>
                      <input type="number" name="studyEnd" value={formData.studyEnd} onChange={handleChange} min="1950" max="2030" required />
                    </div>
                  </div>
                </section>

                <section className="form-section">
                  <h3 className="section-title">Опыт работы</h3>
                  
                  <div className="work-experience-block">
                    <h4>Опыт работы</h4>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Название компании (на англ.)</label>
                        <input type="text" name="company1" value={formData.company1} onChange={handleChange} placeholder="Введите название компании" required />
                      </div>
                      <div className="form-group">
                        <label>Страна компании</label>
                        <select name="country1" value={formData.country1} onChange={handleChange} required>
                          <option value="">---</option>
                          <option value="Kazakhstan">Казахстан</option>
                          <option value="Turkey">Турция</option>
                          <option value="Russia">Россия</option>
                          <option value="Other">Другое</option>
                        </select>
                      </div>
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Должность (на англ.)</label>
                        <input type="text" name="position1" value={formData.position1} onChange={handleChange} placeholder="Введите должность" required />
                      </div>
                      <div className="form-row-inline">
                        <div className="form-group">
                          <label>Начало работы (только год)</label>
                          <input type="number" name="workStart1" value={formData.workStart1} onChange={handleChange} min="1950" max="2026" required />
                        </div>
                        <div className="form-group">
                          <label>Окончание работы (только год)</label>
                          <input type="number" name="workEnd1" value={formData.workEnd1} onChange={handleChange} min="1950" max="2026" required />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="work-experience-block">
                    <h4>Опыт работы (Второе место)</h4>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Название компании (на англ.)</label>
                        <input type="text" name="company2" value={formData.company2} onChange={handleChange} />
                      </div>
                      <div className="form-group">
                        <label>Страна компании</label>
                        <select name="country2" value={formData.country2} onChange={handleChange}>
                          <option value="">---</option>
                          <option value="Kazakhstan">Казахстан</option>
                          <option value="Turkey">Турция</option>
                          <option value="Russia">Россия</option>
                          <option value="Other">Другое</option>
                        </select>
                      </div>
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Должность (на англ.)</label>
                        <input type="text" name="position2" value={formData.position2} onChange={handleChange} />
                      </div>
                      <div className="form-row-inline">
                        <div className="form-group">
                          <label>Начало работы (только год)</label>
                          <input type="number" name="workStart2" value={formData.workStart2} onChange={handleChange} min="1950" max="2026" />
                        </div>
                        <div className="form-group">
                          <label>Окончание работы (только год)</label>
                          <input type="number" name="workEnd2" value={formData.workEnd2} onChange={handleChange} min="1950" max="2026" />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="work-experience-block">
                    <h4>Опыт работы (Третье место)</h4>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Название компании (на англ.)</label>
                        <input type="text" name="company3" value={formData.company3} onChange={handleChange} />
                      </div>
                      <div className="form-group">
                        <label>Страна компании</label>
                        <select name="country3" value={formData.country3} onChange={handleChange}>
                          <option value="">---</option>
                          <option value="Kazakhstan">Казахстан</option>
                          <option value="Turkey">Турция</option>
                          <option value="Russia">Россия</option>
                          <option value="Other">Другое</option>
                        </select>
                      </div>
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Должность (на англ.)</label>
                        <input type="text" name="position3" value={formData.position3} onChange={handleChange} />
                      </div>
                      <div className="form-row-inline">
                        <div className="form-group">
                          <label>Начало работы (только год)</label>
                          <input type="number" name="workStart3" value={formData.workStart3} onChange={handleChange} min="1950" max="2026" />
                        </div>
                        <div className="form-group">
                          <label>Окончание работы (только год)</label>
                          <input type="number" name="workEnd3" value={formData.workEnd3} onChange={handleChange} min="1950" max="2026" />
                        </div>
                      </div>
                    </div>
                  </div>
                </section>

                <section className="form-section">
                  <h3 className="section-title">Дополнительная информация</h3>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Являетесь ли вы студентом?</label>
                      <select name="isStudent" value={formData.isStudent} onChange={handleChange} required>
                        <option value="">---</option>
                        <option value="yes">Да</option>
                        <option value="no">Нет</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Желаемая вакансия</label>
                      <select name="desiredPosition" value={formData.desiredPosition} onChange={handleChange} required>
                        <option value="">---</option>
                        <option value="waiter">Официант</option>
                        <option value="bartender">Бармен</option>
                        <option value="receptionist">Ресепшн</option>
                        <option value="housekeeping">Горничная</option>
                        <option value="kitchen">Кухня</option>
                        <option value="animator">Аниматор</option>
                        <option value="other">Другое</option>
                      </select>
                    </div>
                  </div>
                  <div className="form-group checkbox-group">
                    <label>
                      <input type="checkbox" name="readyToWorkPermanently" checked={formData.readyToWorkPermanently} onChange={handleChange} />
                      Готов работать постоянно
                    </label>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>С какого месяца вы готовы начать работу?</label>
                      <div className="form-row-inline">
                        <select name="startMonth" value={formData.startMonth} onChange={handleChange} required>
                          <option value="">Выберите месяц</option>
                          <option value="01">Январь</option>
                          <option value="02">Февраль</option>
                          <option value="03">Март</option>
                          <option value="04">Апрель</option>
                          <option value="05">Май</option>
                          <option value="06">Июнь</option>
                          <option value="07">Июль</option>
                          <option value="08">Август</option>
                          <option value="09">Сентябрь</option>
                          <option value="10">Октябрь</option>
                          <option value="11">Ноябрь</option>
                          <option value="12">Декабрь</option>
                        </select>
                        <select name="startDay" value={formData.startDay} onChange={handleChange} required>
                          <option value="">Выберите день</option>
                          {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                            <option key={day} value={String(day).padStart(2, '0')}>{day}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="form-group">
                      <label>До какого месяца планируете работать?</label>
                      <div className="form-row-inline">
                        <select name="endMonth" value={formData.endMonth} onChange={handleChange} required>
                          <option value="">Выберите месяц</option>
                          <option value="01">Январь</option>
                          <option value="02">Февраль</option>
                          <option value="03">Март</option>
                          <option value="04">Апрель</option>
                          <option value="05">Май</option>
                          <option value="06">Июнь</option>
                          <option value="07">Июль</option>
                          <option value="08">Август</option>
                          <option value="09">Сентябрь</option>
                          <option value="10">Октябрь</option>
                          <option value="11">Ноябрь</option>
                          <option value="12">Декабрь</option>
                        </select>
                        <select name="endDay" value={formData.endDay} onChange={handleChange} required>
                          <option value="">Выберите день</option>
                          {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                            <option key={day} value={String(day).padStart(2, '0')}>{day}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Имя отца (на англ.)</label>
                      <input type="text" name="fatherName" value={formData.fatherName} onChange={handleChange} placeholder="Введите имя отца" required />
                    </div>
                    <div className="form-group">
                      <label>Имя матери (на англ.)</label>
                      <input type="text" name="motherName" value={formData.motherName} onChange={handleChange} placeholder="Введите имя матери" required />
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Ваши хобби</label>
                      <input type="text" name="hobbies" value={formData.hobbies} onChange={handleChange} placeholder="Введите ваши хобби" required />
                    </div>
                    <div className="form-group">
                      <label>Пройденные курсы или сертификаты</label>
                      <input type="text" name="courses" value={formData.courses} onChange={handleChange} placeholder="Введите курсы" required />
                    </div>
                  </div>
                </section>

                <section className="form-section">
                  <h3 className="section-title">Фотография</h3>
                  <div className="form-group">
                    <label>Ваша фотография (лицо)</label>
                    <input type="file" name="selfiePhoto" onChange={handleChange} accept="image/*" required />
                  </div>
                  <div className="form-group">
                    <label>Логин в Instagram (без @)</label>
                    <input type="text" name="instagram" value={formData.instagram} onChange={handleChange} placeholder="Введите ваш логин в Instagram" />
                  </div>
                  <div className="form-group">
                    <label>Откуда вы о нас узнали?</label>
                    <select name="source" value={formData.source || ''} onChange={handleChange} required>
                      <option value="">---</option>
                      <option value="social">Социальные сети</option>
                      <option value="friend">От друзей</option>
                      <option value="advertisement">Реклама</option>
                      <option value="other">Другое</option>
                    </select>
                  </div>
                </section>

                <div className="form-submit-section">
                  <button type="submit" className="resume-submit-btn" disabled={isGenerating}>
                    {isGenerating ? t.generating : t.submit}
                  </button>
                  <p className="submit-note">При нажатии кнопки «Отправить резюме» вы соглашаетесь с достоверностью указанной информации.</p>
                </div>
              </form>
            </motion.div>
          )}

          {/* Step 3: Result */}
          {currentStep === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="resume-step step-result"
            >
              <div className="result-content">
                <div className="success-icon">
                  <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="#0090FF" strokeWidth="2">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                    <polyline points="22,4 12,14.01 9,11.01"/>
                  </svg>
                </div>
                <h2 className="result-title">Анкета готова!</h2>
                <p className="result-desc">Ваша анкета успешно создана. Скачайте PDF и отправьте его нам в WhatsApp.</p>

                <div className="result-buttons">
                  <button className="download-btn" onClick={handleDownloadPDF}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                      <polyline points="7,10 12,15 17,10"/>
                      <line x1="12" y1="15" x2="12" y2="3"/>
                    </svg>
                    {t.downloadPdf}
                  </button>
                  <button className="whatsapp-btn" onClick={handleSendWhatsApp}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                    </svg>
                    {t.sendWhatsApp}
                  </button>
                </div>

                <button className="back-to-start-btn" onClick={() => {
                  setCurrentStep(1)
                  setPdfUrl(null)
                }}>
                  Заполнить новую анкету
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  )
}

export default ResumeModal
