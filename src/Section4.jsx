import { motion } from 'framer-motion'
import './Section4.css'

function Section4() {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.1
      }
    }
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
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
    <section className="section4">
      <div className="section4-container">
        {/* Тарифы Section */}
        <motion.div 
          className="section4-tariffs"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
        >
          <motion.h2 
            className="section4-title"
            variants={titleVariants}
          >
            Тарифы
          </motion.h2>
          <motion.div 
            className="tariffs-grid"
            variants={containerVariants}
          >
            {/* Kazakhstan - Старым клиентам */}
            <motion.div 
              className="tariff-card"
              variants={itemVariants}
              whileHover={{ y: -5, scale: 1.02 }}
              transition={{ duration: 0.3 }}
            >
              <div className="tariff-country">Казахстан</div>
              <div className="tariff-client-type">Старым клиентам</div>
              <div className="tariff-price">160 000 ₸</div>
              <div className="tariff-details">
                <div>Консульский сбор 60 $</div>
                <div>Услуги визового центра 80 000 ₸</div>
              </div>
            </motion.div>

            {/* Kazakhstan - Новым клиентам */}
            <motion.div 
              className="tariff-card"
              variants={itemVariants}
              whileHover={{ y: -5, scale: 1.02 }}
              transition={{ duration: 0.3 }}
            >
              <div className="tariff-country">Казахстан</div>
              <div className="tariff-client-type">Новым клиентам</div>
              <div className="tariff-price">190 000 ₸</div>
              <div className="tariff-details">
                <div>Консульский сбор 60 $</div>
                <div>Услуги визового центра 80 000 ₸</div>
              </div>
            </motion.div>

            {/* Европа */}
            <motion.div 
              className="tariff-card"
              variants={itemVariants}
              whileHover={{ y: -5, scale: 1.02 }}
              transition={{ duration: 0.3 }}
            >
              <div className="tariff-country">Европа</div>
              <div className="tariff-price">300 $</div>
              <div className="tariff-details">
                <div>Консульский сбор 60-90 $</div>
                <div>Предоплата 50 $</div>
              </div>
            </motion.div>

            {/* Узбекистан */}
            <motion.div 
              className="tariff-card"
              variants={itemVariants}
              whileHover={{ y: -5, scale: 1.02 }}
              transition={{ duration: 0.3 }}
            >
              <div className="tariff-country">Узбекистан</div>
              <div className="tariff-price">300 $</div>
              <div className="tariff-details">
                <div>Консульский сбор 300 $</div>
                <div>Предоплата 100 $</div>
              </div>
            </motion.div>

            {/* Таджикистан */}
            <motion.div 
              className="tariff-card"
              variants={itemVariants}
              whileHover={{ y: -5, scale: 1.02 }}
              transition={{ duration: 0.3 }}
            >
              <div className="tariff-country">Таджикистан</div>
              <div className="tariff-price">500 $</div>
              <div className="tariff-details">
                <div>Консульский сбор 300 $</div>
                <div>Услуги визового центра 136 $</div>
                <div>Предоплата 100 $</div>
              </div>
            </motion.div>

            {/* Кыргызстан */}
            <motion.div 
              className="tariff-card"
              variants={itemVariants}
              whileHover={{ y: -5, scale: 1.02 }}
              transition={{ duration: 0.3 }}
            >
              <div className="tariff-country">Кыргызстан</div>
              <div className="tariff-price">350 $</div>
              <div className="tariff-details">
                <div>Консульский сбор 30 $</div>
                <div>Услуги визового центра 120 $</div>
                <div>Предоплата 100 $</div>
              </div>
            </motion.div>

            {/* Азербайджан */}
            <motion.div 
              className="tariff-card"
              variants={itemVariants}
              whileHover={{ y: -5, scale: 1.02 }}
              transition={{ duration: 0.3 }}
            >
              <div className="tariff-country">Азербайджан</div>
              <div className="tariff-price">350 $</div>
              <div className="tariff-details">
                <div>Услуги визового центра 200 $</div>
                <div>Предоплата 100 $</div>
              </div>
            </motion.div>

            {/* Россия */}
            <motion.div 
              className="tariff-card"
              variants={itemVariants}
              whileHover={{ y: -5, scale: 1.02 }}
              transition={{ duration: 0.3 }}
            >
              <div className="tariff-country">Россия</div>
              <div className="tariff-price">100 $</div>
              <div className="tariff-details">
                <div>Услуги визового центра 200-250 $</div>
                <div>Предоплата 50 $</div>
              </div>
            </motion.div>

            {/* Беларусь */}
            <motion.div 
              className="tariff-card"
              variants={itemVariants}
              whileHover={{ y: -5, scale: 1.02 }}
              transition={{ duration: 0.3 }}
            >
              <div className="tariff-country">Беларусь</div>
              <div className="tariff-price">300 $</div>
              <div className="tariff-details">
                <div>Консульский сбор 60 $</div>
                <div>Предоплата 50 $</div>
              </div>
            </motion.div>
          </motion.div>
        </motion.div>

        {/* Что включено Section */}
        <motion.div 
          className="section4-included"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
        >
          <motion.h2 
            className="section4-title"
            variants={titleVariants}
          >
            Что включено?
          </motion.h2>
          <motion.div 
            className="included-grid"
            variants={containerVariants}
          >
            <motion.div 
              className="included-card"
              variants={itemVariants}
              whileHover={{ y: -5, scale: 1.05 }}
              transition={{ duration: 0.3 }}
            >
              <div className="included-icon">
                <img src="/s4-1.png" alt="Сертификаты и благодарственные письма" />
              </div>
              <div className="included-text">Сертификаты и благодарственные письма</div>
            </motion.div>

            <motion.div 
              className="included-card"
              variants={itemVariants}
              whileHover={{ y: -5, scale: 1.05 }}
              transition={{ duration: 0.3 }}
            >
              <div className="included-icon">
                <img src="/s4-2.png" alt="Постоянный русскоязычный куратор в Турции" />
              </div>
              <div className="included-text">Постоянный русскоязычный куратор в Турции</div>
            </motion.div>

            <motion.div 
              className="included-card"
              variants={itemVariants}
              whileHover={{ y: -5, scale: 1.05 }}
              transition={{ duration: 0.3 }}
            >
              <div className="included-icon">
                <img src="/s4-3.png" alt="Собеседование в Алматы и в Астане" />
              </div>
              <div className="included-text">Собеседование в Алматы и в Астане</div>
            </motion.div>

            <motion.div 
              className="included-card"
              variants={itemVariants}
              whileHover={{ y: -5, scale: 1.05 }}
              transition={{ duration: 0.3 }}
            >
              <div className="included-icon">
                <img src="/s4-4.png" alt="Организация проживания" />
              </div>
              <div className="included-text">Организация проживания: а подбор отеля от работодаетля в Турции</div>
            </motion.div>

            <motion.div 
              className="included-card"
              variants={itemVariants}
              whileHover={{ y: -5, scale: 1.05 }}
              transition={{ duration: 0.3 }}
            >
              <div className="included-icon">
                <img src="/s4-5.png" alt="Консультация по всем вопросам" />
              </div>
              <div className="included-text">Консультация по всем вопросам трудоустройства и жилья</div>
            </motion.div>

            <motion.div 
              className="included-card"
              variants={itemVariants}
              whileHover={{ y: -5, scale: 1.05 }}
              transition={{ duration: 0.3 }}
            >
              <div className="included-icon">
                <img src="/s4-6.png" alt="Юридическая поддержка" />
              </div>
              <div className="included-text">Юридическая поддержка в оформлении рабочей визы</div>
            </motion.div>

            <motion.div 
              className="included-card"
              variants={itemVariants}
              whileHover={{ y: -5, scale: 1.05 }}
              transition={{ duration: 0.3 }}
            >
              <div className="included-icon">
                <img src="/s4-7.png" alt="Составление профессионального резюме" />
              </div>
              <div className="included-text">Составление профессонального резюме</div>
            </motion.div>

            <motion.div 
              className="included-card"
              variants={itemVariants}
              whileHover={{ y: -5, scale: 1.05 }}
              transition={{ duration: 0.3 }}
            >
              <div className="included-icon">
                <img src="/s4-8.png" alt="Тренинги и подготовка к вылету" />
              </div>
              <div className="included-text">Тренинги и подготовка к вылету от наших специалиство</div>
            </motion.div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}

export default Section4