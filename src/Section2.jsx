import { motion } from 'framer-motion'
import './Section2.css'

function Section2() {
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

  const cardVariants = {
    hidden: { opacity: 0, y: 50, scale: 0.95 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        duration: 0.6,
        ease: [0.22, 1, 0.36, 1]
      }
    }
  }

  return (
    <section className="section2">
      <div className="section2-container">
        <motion.div 
          className="section2-cards"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
        >
          {/* Card 1: Официально */}
          <motion.div 
            className="section2-card"
            variants={cardVariants}
            whileHover={{ y: -10, scale: 1.02 }}
            transition={{ duration: 0.3 }}
          >
            <div className="section2-icon">
              <img src="/s2-1.png" alt="Официально" />
            </div>
            <div className="section2-description">
              Документация оформляется строго по законодательству Казахстана и Турции, включая подписание трудового договора и прочих необходимых соглашений.
            </div>
          </motion.div>

          {/* Card 2: Поддержка */}
          <motion.div 
            className="section2-card"
            variants={cardVariants}
            whileHover={{ y: -10, scale: 1.02 }}
            transition={{ duration: 0.3 }}
          >
            <div className="section2-icon">
              <img src="/s2-2.png" alt="Поддержка" />
            </div>
            <div className="section2-description">
              Комплексное ведение клиента: юридический консалтинг, помощь в сборе документации и оперативное решение любых сложностей в процессе трудоустройства.
            </div>
          </motion.div>

          {/* Card 3: Гарантия */}
          <motion.div 
            className="section2-card"
            variants={cardVariants}
            whileHover={{ y: -10, scale: 1.02 }}
            transition={{ duration: 0.3 }}
          >
            <div className="section2-icon">
              <img src="/s2-3.png" alt="Гарантия" />
            </div>
            <div className="section2-description">
              Строгое соблюдение сроков и объемов работ, прописанных в контракте. Мы гарантируем высокое качество сервиса и несем юридическую ответственность за свои обязательства.
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}

export default Section2