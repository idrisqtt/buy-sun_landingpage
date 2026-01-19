import { motion } from 'framer-motion'
import './Section5.css'

function Section5() {
  const cards = [
    {
      number: 1,
      icon: '/s5-1.png',
      text: 'Авиаперелет туда и обратно'
    },
    {
      number: 2,
      icon: '/s5-2.png',
      text: 'Трансфер от общежития до отеля'
    },
    {
      number: 3,
      icon: '/s5-3.png',
      text: 'Проживание в общежитии'
    },
    {
      number: 4,
      icon: '/s5-4.png',
      text: 'Дополнительный заработок'
    },
    {
      number: 5,
      icon: '/s5-5.png',
      text: 'Медицинское страхование на территории Турции',
      textParts: ['Медицинское страхование', 'на территории Турции']
    },
    {
      number: 6,
      icon: '/s5-6.png',
      text: 'Заработная плата 750-1200$ США'
    },
    {
      number: 7,
      icon: '/s5-7.png',
      text: 'Униформа и материалы для успешной работы',
      textParts: ['Униформа и материалы', 'для успешной работы']
    },
    {
      number: 8,
      icon: '/s5-8.png',
      text: '3-х разовое питание'
    }
  ]

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2
      }
    }
  }

  const cardVariants = {
    hidden: { opacity: 0, y: 40, scale: 0.9 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
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
    <section className="section5">
      <div className="section5-overlay"></div>
      <div className="section5-container">
        <motion.div 
          className="section5-title-banner"
          variants={titleVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
        >
          <h2 className="section5-title">Работодатель представляет</h2>
        </motion.div>
        <motion.div 
          className="section5-cards"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
        >
          {cards.map((card) => (
            <motion.div 
              key={card.number} 
              className="section5-card"
              variants={cardVariants}
              whileHover={{ y: -8, scale: 1.03, rotate: 1 }}
              transition={{ duration: 0.3 }}
            >
              <div className="section5-card-number">{card.number}</div>
              <div className="section5-card-icon">
                <img src={card.icon} alt={card.text} />
              </div>
              <div className="section5-card-text">
                {card.textParts ? (
                  <>
                    {card.textParts[0]}<br />{card.textParts[1]}
                  </>
                ) : (
                  card.text
                )}
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}

export default Section5