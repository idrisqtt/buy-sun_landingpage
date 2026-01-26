import { useState } from 'react'
import { motion } from 'framer-motion'
import ContactModal from './ContactModal'
import ResumeModal from './ResumeModal'
import './Hero.css'

function Hero() {
  const [isContactModalOpen, setIsContactModalOpen] = useState(false)
  const [isResumeModalOpen, setIsResumeModalOpen] = useState(false)
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
        delayChildren: 0.1
      }
    }
  }

  const itemVariants = {
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

  const imageVariants = {
    hidden: { opacity: 0, scale: 0.9, x: 50 },
    visible: {
      opacity: 1,
      scale: 1,
      x: 0,
      transition: {
        duration: 0.8,
        ease: [0.22, 1, 0.36, 1]
      }
    }
  }

  return (
    <section className="hero">
      <video 
        className="hero-video"
        autoPlay
        loop
        muted
        playsInline
      >
        <source src="/hero.mp4" type="video/mp4" />
      </video>
      <div className="hero-video-overlay"></div>
      <div className="hero-container">
        {/* Header Section */}
        <motion.header 
          className="hero-header"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <motion.div className="hero-social" variants={itemVariants}>
            <motion.div 
              className="social-icons"
              variants={containerVariants}
            >
              <motion.a 
                href="https://t.me/buysunkz" 
                target="_blank"
                rel="noopener noreferrer"
                className="social-icon" 
                aria-label="Telegram"
                whileHover={{ scale: 1.1, y: -2 }}
                whileTap={{ scale: 0.95 }}
                variants={itemVariants}
              >
                <img src="/tg.png" alt="Telegram" />
              </motion.a>
              <motion.a 
                href="https://www.tiktok.com/@buysun.kz" 
                target="_blank"
                rel="noopener noreferrer"
                className="social-icon" 
                aria-label="TikTok"
                whileHover={{ scale: 1.1, y: -2 }}
                whileTap={{ scale: 0.95 }}
                variants={itemVariants}
              >
                <img src="/tt.png" alt="TikTok" />
              </motion.a>
              <motion.a 
                href="https://wa.me/77026677171" 
                target="_blank"
                rel="noopener noreferrer"
                className="social-icon" 
                aria-label="WhatsApp"
                whileHover={{ scale: 1.1, y: -2 }}
                whileTap={{ scale: 0.95 }}
                variants={itemVariants}
              >
                <img src="/wa.png" alt="WhatsApp" />
              </motion.a>
              <motion.a 
                href="https://www.instagram.com/buysun.kz/" 
                target="_blank"
                rel="noopener noreferrer"
                className="social-icon" 
                aria-label="Instagram"
                whileHover={{ scale: 1.1, y: -2 }}
                whileTap={{ scale: 0.95 }}
                variants={itemVariants}
              >
                <img src="/inst.png" alt="Instagram" />
              </motion.a>
            </motion.div>
            <motion.a 
              href="mailto:buysun.kz@mail.ru" 
              className="hero-email"
              whileHover={{ opacity: 0.8, x: 5 }}
              variants={itemVariants}
            >
              buysun.kz@mail.ru
            </motion.a>
          </motion.div>
          <motion.div 
            className="hero-brand"
            variants={itemVariants}
          >
            BUY SUN
          </motion.div>
          <motion.button 
            className="hero-contact-btn"
            whileHover={{ scale: 1.05, boxShadow: "0 8px 24px rgba(0, 144, 255, 0.4)" }}
            whileTap={{ scale: 0.98 }}
            variants={itemVariants}
            onClick={() => setIsContactModalOpen(true)}
          >
            Связаться
          </motion.button>
        </motion.header>

        {/* Main Content */}
        <div className="hero-content">
          <motion.div 
            className="hero-text"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            <motion.h1 
              className="hero-greeting"
              variants={itemVariants}
            >
              Привет! Меня зовут Ахмед
            </motion.h1>
            <motion.p 
              className="hero-service"
              variants={itemVariants}
            >
              Я ОТПРАВЛЯЮ НА РАБОТУ ЛЮДЕЙ В ПРЕМИАЛЬНЫЕ ОТЕЛИ ТУРЦИИ!
            </motion.p>
            <motion.p 
              className="hero-announcement"
              variants={itemVariants}
            >
              ОТКРЫТ НАБОР НА СЕЗОН 2026!
            </motion.p>
            <motion.button 
              className="hero-cta-btn"
              whileHover={{ scale: 1.05, boxShadow: "0 8px 24px rgba(0, 144, 255, 0.4)" }}
              whileTap={{ scale: 0.98 }}
              variants={itemVariants}
              onClick={() => setIsResumeModalOpen(true)}
            >
              ЗАПОЛНИТЬ АНКЕТУ
            </motion.button>
          </motion.div>
          <motion.div 
            className="hero-image"
            variants={imageVariants}
            initial="hidden"
            animate="visible"
          >
            <motion.img 
              src="/man1.png" 
              alt="Ахмед"
            />
          </motion.div>
        </div>
      </div>
      <ContactModal 
        isOpen={isContactModalOpen} 
        onClose={() => setIsContactModalOpen(false)} 
      />
      <ResumeModal 
        isOpen={isResumeModalOpen} 
        onClose={() => setIsResumeModalOpen(false)} 
      />
    </section>
  )
}

export default Hero