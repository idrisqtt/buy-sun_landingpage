import { useState } from 'react'
import { motion } from 'framer-motion'
import './ContactModal.css'

function ContactModal({ isOpen, onClose }) {
  const [formData, setFormData] = useState({
    name: '',
    phone: ''
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    const message = `Здравствуйте! Меня зовут ${formData.name}, мой телефон: ${formData.phone}. Хочу узнать подробнее о трудоустройстве.`
    const whatsappUrl = `https://wa.me/77026677171?text=${encodeURIComponent(message)}`
    window.open(whatsappUrl, '_blank')
    onClose()
  }

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  if (!isOpen) return null

  return (
    <motion.div 
      className="modal-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div 
        className="modal-content contact-modal"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
      >
        <button className="modal-close" onClick={onClose}>×</button>
        <h2 className="modal-title">Оставьте заявку</h2>
        <p className="modal-subtitle">Наши менеджеры перезвонят Вам</p>
        <form className="contact-form" onSubmit={handleSubmit}>
          <input
            type="text"
            name="name"
            placeholder="Имя"
            value={formData.name}
            onChange={handleChange}
            required
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
          <button type="submit" className="form-submit-btn">Отправить</button>
        </form>
      </motion.div>
    </motion.div>
  )
}

export default ContactModal
