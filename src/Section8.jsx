import { motion } from 'framer-motion'
import './Section8.css'

function Section8() {
  return (
    <section className="section8">
      <div className="section8-container">
        <motion.div 
          className="section8-scroll-wrapper"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
        >
          <motion.div 
            className="section8-scroll-content"
            animate={{
              x: [0, -50]
            }}
            transition={{
              x: {
                repeat: Infinity,
                repeatType: "loop",
                duration: 20,
                ease: "linear"
              }
            }}
          >
            <img src="/s8.png" alt="Логотипы отелей" className="section8-image" />
            <img src="/s8.png" alt="Логотипы отелей" className="section8-image" />
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}

export default Section8