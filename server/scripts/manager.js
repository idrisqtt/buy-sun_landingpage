#!/usr/bin/env node
// Managers of the cabinet, from the server's command line:
//
//   node scripts/manager.js add anna@buysun.kz "Анна Ли"   new manager, prints a temporary password
//   node scripts/manager.js reset anna@buysun.kz           lost phone or password: new temporary
//                                                          password, phone app set up again
//   node scripts/manager.js disable anna@buysun.kz         left the company: no access, logged out
//   node scripts/manager.js enable anna@buysun.kz
//   node scripts/manager.js list
//
// On the server: sudo -u buysun /opt/buysun/repo/deploy/manager.sh <same arguments>
require('dotenv/config')
const { loadConfig } = require('../src/config')
const { createPrisma } = require('../src/services/prisma')
const { hashPassword, generatePassword } = require('../src/services/auth')

async function main([command, email, ...nameParts]) {
  const prisma = createPrisma(loadConfig().databaseUrl)
  const normalized = String(email || '').trim().toLowerCase()
  const needEmail = () => {
    if (!/^\S+@\S+\.\S+$/.test(normalized)) throw new Error('Укажите email менеджера')
  }
  const temporary = async () => {
    const password = generatePassword()
    return { password, hash: await hashPassword(password) }
  }
  const printLogin = (password) => {
    console.log(`Временный пароль: ${password}`)
    console.log('При входе кабинет попросит сменить пароль и подключить код с телефона')
    console.log('(Google Authenticator, Яндекс Ключ или аналог).')
  }

  try {
    if (command === 'add') {
      needEmail()
      const name = nameParts.join(' ').trim()
      if (!name) throw new Error('Укажите имя: add email "Имя Фамилия"')
      const { password, hash } = await temporary()
      await prisma.user.create({ data: { email: normalized, name, password_hash: hash } })
      console.log(`Менеджер ${name} <${normalized}> добавлен.`)
      printLogin(password)
    } else if (command === 'reset') {
      needEmail()
      const { password, hash } = await temporary()
      const user = await prisma.user.update({
        where: { email: normalized },
        data: {
          password_hash: hash, must_change_password: true, totp_secret: null, totp_enabled: false,
          totp_last_step: null, failed_attempts: 0, locked_until: null, disabled: false,
        },
      })
      await prisma.session.deleteMany({ where: { user_id: user.id } })
      console.log(`Доступ ${user.name} <${normalized}> сброшен, все входы завершены.`)
      printLogin(password)
    } else if (command === 'disable' || command === 'enable') {
      needEmail()
      const user = await prisma.user.update({ where: { email: normalized }, data: { disabled: command === 'disable' } })
      if (command === 'disable') await prisma.session.deleteMany({ where: { user_id: user.id } })
      console.log(`${user.name} <${normalized}>: доступ ${command === 'disable' ? 'закрыт' : 'открыт'}.`)
    } else if (command === 'list') {
      const users = await prisma.user.findMany({ orderBy: { id: 'asc' } })
      if (!users.length) console.log('Менеджеров пока нет. Добавьте: add email "Имя"')
      for (const u of users) {
        const state = u.disabled ? 'доступ закрыт' : !u.totp_enabled ? 'ещё не вошёл' : 'активен'
        const last = u.last_login_at ? u.last_login_at.toLocaleString('ru-RU', { timeZone: 'Asia/Almaty' }) : '—'
        console.log(`${u.email}\t${u.name}\t${state}\tпоследний вход: ${last}`)
      }
    } else {
      console.log('Команды: add <email> "<имя>", reset <email>, disable <email>, enable <email>, list')
      process.exitCode = 1
    }
  } catch (err) {
    if (err.code === 'P2002') console.error('Такой email уже есть')
    else if (err.code === 'P2025') console.error('Менеджер с таким email не найден')
    else console.error(err.message)
    process.exitCode = 1
  } finally {
    await prisma.$disconnect()
  }
}

main(process.argv.slice(2))
