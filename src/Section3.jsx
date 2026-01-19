import { motion } from 'framer-motion'
import './Section3.css'

function Section3() {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.1
      }
    }
  }

  const itemVariants = {
    hidden: { opacity: 0, x: -30 },
    visible: {
      opacity: 1,
      x: 0,
      transition: {
        duration: 0.6,
        ease: [0.22, 1, 0.36, 1]
      }
    }
  }

  const imageVariants = {
    hidden: { opacity: 0, x: 50, scale: 0.95 },
    visible: {
      opacity: 1,
      x: 0,
      scale: 1,
      transition: {
        duration: 0.8,
        ease: [0.22, 1, 0.36, 1]
      }
    }
  }

  return (
    <section className="section3">
      <div className="section3-container">
        <div className="section3-content">
          <motion.div 
            className="section3-image"
            variants={imageVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
          >
            <motion.img 
              src="/s3-2.png" 
              alt="Команда BUY SUN"
              whileHover={{ scale: 1.05 }}
              transition={{ duration: 0.3 }}
            />
          </motion.div>
          <motion.div 
            className="section3-text"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
          >
            <motion.h2 
              className="section3-title"
              variants={itemVariants}
            >
              Надёжный подход к работе<br />в Турции
            </motion.h2>
            <motion.div 
              className="section3-paragraphs"
              variants={containerVariants}
            >
              <motion.p 
                className="section3-text-p"
                variants={itemVariants}
              >
                Мой 7-летний стаж работы <strong>гидом</strong> в Турции дал мне глубокое понимание местного рынка и специфики региона. Дополнительно, <strong>5 лет опыта в сфере трудоустройства</strong> позволили мне чётко определить, что наиболее важно для наших клиентов.
              </motion.p>
              <motion.p 
                className="section3-text-p"
                variants={itemVariants}
              >
                Моя главная задача — <strong>обеспечить</strong> каждому соискателю максимально комфортное и <strong>безопасное</strong> пребывание на рабочем месте в Турции. Мы уделяем особое внимание деталям, чтобы <strong>гарантировать</strong> одинаково благоприятные и <strong>надёжные</strong> условия для всех наших клиентов.
              </motion.p>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}

export default Section3