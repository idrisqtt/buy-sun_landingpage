import { useState, useRef } from 'react'
import { motion } from 'framer-motion'
import { sendLead, honeypotProps } from './api'
import './Section9.css'

function Section9() {
  const [phone, setPhone] = useState('')
  const [status, setStatus] = useState('idle') // idle | sending | sent | error
  const [error, setError] = useState('')
  const formRef = useRef(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    const form = formRef.current
    // The button sits outside the <form>, so run the browser's check by hand
    if (!form.reportValidity() || status === 'sending') return
    setStatus('sending')
    try {
      await sendLead('callback', { phone, website: form.website.value })
      setStatus('sent')
      setPhone('')
    } catch (err) {
      setError(err.message)
      setStatus('error')
    }
  }

  const subText = {
    sent: 'Спасибо! Менеджер скоро перезвонит.',
    error,
    sending: 'Отправляем...',
  }[status] || 'И измените свою жизнь!'

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.1
      }
    }
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
        ease: [0.22, 1, 0.36, 1]
      }
    }
  }

  const titleVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        ease: [0.22, 1, 0.36, 1]
      }
    }
  }

  return (
    <section className="section9">
      <div className="section9-container">
        <motion.div 
          className="section9-box"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
        >
          {/* Top Section */}
          <motion.div 
            className="section9-top"
            variants={titleVariants}
          >
            <h2 className="section9-title">Сделаем вашу мечту реальностью!</h2>
            <div className="section9-divider"></div>
          </motion.div>

          {/* Middle Section - Contact Info */}
          <motion.div 
            className="section9-middle"
            variants={containerVariants}
          >
            <motion.div 
              className="section9-contact-column"
              variants={containerVariants}
            >
              <motion.div 
                className="section9-contact-item"
                variants={itemVariants}
              >
                <div className="section9-contact-label">Почта</div>
                <div className="section9-contact-value">BUYSUN.KZ@mail.ru</div>
              </motion.div>
              <motion.div 
                className="section9-contact-item"
                variants={itemVariants}
              >
                <div className="section9-contact-label">Телефон</div>
                <div className="section9-contact-value">
                  <div>+77777599489</div>
                  <div>+77026677171</div>
                </div>
              </motion.div>
            </motion.div>
            <motion.div 
              className="section9-contact-column"
              variants={containerVariants}
            >
              <motion.div 
                className="section9-contact-item"
                variants={itemVariants}
              >
                <div className="section9-contact-label">Адрес г. Алматы</div>
                <div className="section9-contact-value">БЦ Кунаев 5 этаж 518 офис</div>
              </motion.div>
              <motion.div 
                className="section9-contact-item"
                variants={itemVariants}
              >
                <div className="section9-contact-label">Адрес г. Астана</div>
                <div className="section9-contact-value">Кенесары 40, 21 этаж 2100 офис</div>
              </motion.div>
            </motion.div>
          </motion.div>

          <div className="section9-divider"></div>

          {/* Bottom Section - Form */}
          <motion.div 
            className="section9-bottom-box"
            variants={containerVariants}
          >
            <motion.div 
              className="section9-bottom"
              variants={containerVariants}
            >
              <motion.div 
                className="section9-form-text"
                variants={itemVariants}
              >
                <div className="section9-form-text-main">Укажите ваш номер телефона.</div>
                <div className={`section9-form-text-sub${status === 'error' ? ' error' : ''}`} role="status">{subText}</div>
              </motion.div>
              <motion.form 
                className="section9-form" 
                onSubmit={handleSubmit}
                ref={formRef}
                variants={itemVariants}
              >
                <input {...honeypotProps} />
                <input
                  type="tel"
                  name="phone"
                  className="section9-input"
                  value={phone}
                  onChange={(e) => { setPhone(e.target.value); if (status !== 'sending') setStatus('idle') }}
                  placeholder="+7 (777) 777 77 77"
                  aria-label="Номер телефона"
                  required
                  minLength={10}
                  title="Например, +7 777 123 45 67"
                />
              </motion.form>
              <motion.button 
                type="submit" 
                className="section9-button" 
                onClick={handleSubmit}
                disabled={status === 'sending'}
                variants={itemVariants}
                whileHover={{ scale: 1.05, boxShadow: "0 8px 24px rgba(0, 144, 255, 0.4)" }}
                whileTap={{ scale: 0.98 }}
              >
                ОТПРАВИТЬ
              </motion.button>
            </motion.div>
            <p className="section9-consent">Нажимая «Отправить», вы соглашаетесь на обработку персональных данных.</p>
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}

export default Section9