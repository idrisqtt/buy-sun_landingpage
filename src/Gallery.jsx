import { motion } from 'framer-motion'
import './Gallery.css'

function Gallery() {
  const rows = [
    // Первый ряд
    ['s9-1', 's9-2', 's9-3', 's9-4', 's9-5', 's9-6'],
    // Второй ряд
    ['s9-7', 's9-8', 's9-9', 's9-10', 's9-11', 's9-12', 's9-13'],
    // Третий ряд
    ['s9-14', 's9-15', 's9-16', 's9-17'],
    // Четвертый ряд
    ['s9-18', 's9-19', 's9-20', 's9-21']
  ]

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
        delayChildren: 0.1
      }
    }
  }

  const itemVariants = {
    hidden: { opacity: 0, scale: 0.8, y: 20 },
    visible: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: {
        duration: 0.4,
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
    <section className="gallery">
      <div className="gallery-container">
        <motion.h2 
          className="gallery-title"
          variants={titleVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
        >
          Галерея
        </motion.h2>
        <motion.div 
          className="gallery-rows"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
        >
          {rows.map((row, rowIndex) => (
            <div key={rowIndex} className="gallery-row">
              {row.map((imageName) => (
                <motion.div 
                  key={imageName} 
                  className="gallery-item"
                  variants={itemVariants}
                  whileHover={{ scale: 1.1, zIndex: 10 }}
                  transition={{ duration: 0.3 }}
                >
                  <img src={`/${imageName}.png`} alt={`Галерея ${imageName}`} />
                </motion.div>
              ))}
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}

export default Gallery