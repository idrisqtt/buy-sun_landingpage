import { motion } from 'framer-motion'
import './Section7.css'

function Section7() {
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
    hidden: { opacity: 0, y: 50, scale: 0.8 },
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
    <section className="section7">
      <div className="section7-container">
        <motion.div 
          className="section7-stats"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
        >
          <motion.div 
            className="stat-item"
            variants={itemVariants}
            whileHover={{ scale: 1.1, y: -10 }}
            transition={{ duration: 0.3 }}
          >
            <div className="stat-number">100+</div>
            <div className="stat-label">партнеров</div>
          </motion.div>
          <motion.div 
            className="stat-item"
            variants={itemVariants}
            whileHover={{ scale: 1.1, y: -10 }}
            transition={{ duration: 0.3 }}
          >
            <div className="stat-number">2000+</div>
            <div className="stat-label">клиентов</div>
          </motion.div>
          <motion.div 
            className="stat-item"
            variants={itemVariants}
            whileHover={{ scale: 1.1, y: -10 }}
            transition={{ duration: 0.3 }}
          >
            <div className="stat-number">5 лет</div>
            <div className="stat-label">с 2020 года</div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}

export default Section7