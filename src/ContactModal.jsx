import { useState } from 'react'
import { motion } from 'framer-motion'
import { sendLead, whatsappLink, honeypotProps } from './api'
import './ContactModal.css'

function ContactModal({ isOpen, onClose }) {
  const [formData, setFormData] = useState({
    name: '',
    phone: ''
  })
  const [status, setStatus] = useState('idle') // idle | sending | sent | error
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setStatus('sending')
    try {
      await sendLead('quick', { ...formData, website: e.target.website.value })
      setStatus('sent')
    } catch (err) {
      setError(err.message)
      setStatus('error')
    }
  }

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleClose = () => {
    if (status === 'sent') {
      setFormData({ name: '', phone: '' })
      setStatus('idle')
    }
    onClose()
  }

  const whatsappText = `Здравствуйте! Меня зовут ${formData.name}, мой телефон: ${formData.phone}. Хочу узнать подробнее о трудоустройстве.`

  if (!isOpen) return null

  return (
    <motion.div
      className="modal-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={handleClose}
    >
      <motion.div
        className="modal-content contact-modal"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
      >
        <button className="modal-close" onClick={handleClose}>×</button>
        {status === 'sent' ? (
          <div className="contact-sent" role="status">
            <h2 className="modal-title">Спасибо!</h2>
            <p className="modal-subtitle">Заявка отправлена. Менеджер перезвонит вам в ближайшее время.</p>
            <button type="button" className="form-submit-btn" onClick={handleClose}>Закрыть</button>
          </div>
        ) : (
          <>
            <h2 className="modal-title">Оставьте заявку</h2>
            <p className="modal-subtitle">Наши менеджеры перезвонят Вам</p>
            <form className="contact-form" onSubmit={handleSubmit}>
              <input {...honeypotProps} />
              <input
                type="text"
                name="name"
                placeholder="Имя"
                value={formData.name}
                onChange={handleChange}
                required
                maxLength={100}
                className="form-input"
              />
              <input
                type="tel"
                name="phone"
                placeholder="Телефон"
                value={formData.phone}
                onChange={handleChange}
                required
                className="form-input"
              />
              <button type="submit" className="form-submit-btn" disabled={status === 'sending'}>
                {status === 'sending' ? 'Отправляем...' : 'Отправить'}
              </button>
              {status === 'error' && (
                <p className="form-error" role="alert">
                  {error}{' '}
                  <a href={whatsappLink(whatsappText)} target="_blank" rel="noopener noreferrer">Написать в WhatsApp</a>
                </p>
              )}
              <p className="form-consent">Нажимая «Отправить», вы соглашаетесь на обработку персональных данных.</p>
            </form>
          </>
        )}
      </motion.div>
    </motion.div>
  )
}

export default ContactModal
