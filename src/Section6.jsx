import { motion } from 'framer-motion'
import './Section6.css'

function Section6() {
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

  const imageVariants = {
    hidden: { opacity: 0, x: -50, scale: 0.95 },
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

  const textVariants = {
    hidden: { opacity: 0, x: 50 },
    visible: {
      opacity: 1,
      x: 0,
      transition: {
        duration: 0.6,
        ease: [0.22, 1, 0.36, 1]
      }
    }
  }

  return (
    <section className="section6">
      <div className="section6-container">
        <div className="section6-content">
          <motion.div 
            className="section6-image"
            variants={imageVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
          >
            <motion.img 
              src="/s6.png" 
              alt="Ахмед"
              whileHover={{ scale: 1.05 }}
              transition={{ duration: 0.3 }}
            />
          </motion.div>
          <motion.div 
            className="section6-text"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
          >
            <motion.h2 
              className="section6-title"
              variants={textVariants}
            >
              Кто я?
            </motion.h2>
            <motion.p 
              className="section6-paragraph"
              variants={textVariants}
            >
              Я Мусаев Ахмед трудоустраиваю со всех стран в лучшие отели Турции.
            </motion.p>
            <motion.p 
              className="section6-paragraph"
              variants={textVariants}
            >
              Работая в Турции сам на протяжении <strong>7 лет</strong> в различных регионах и отелях Турции и <strong>5 лет в сфере трудоустройства</strong> я четко знаю что нужно тебе что является важным для тебя. Испытывая на себе <strong>сложности</strong> поиска работы в Турции самостоятельно мы создали <strong>систему</strong> в которой тебе <strong>не нужно</strong> ни о чем <strong>думать</strong>. Поиск работодателя, сопровождение на каждом этапе трудоустройства вплоть до вашего обратного вылета на родину. Мы даем <strong>гарантию трудоустройства</strong> и <strong>гарантию безопасности</strong> в период сезона в Турции
            </motion.p>
          </motion.div>
        </div>
      </div>
    </section>
  )
}

export default Section6