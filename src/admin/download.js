// Aidana_Seitkalieva_CV.pdf: files that leave BUY SUN carry no BUY SUN in the name
export const pdfName = (answers, suffix) => {
  const name = [answers.firstName, answers.lastName].map((s) => (s || '').trim()).filter(Boolean).join('_')
  return `${name.replace(/[^\p{L}\p{N}_-]+/gu, '_') || 'Anketa'}_${suffix}.pdf`
}

export const downloadBlob = (blob, name) => {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = name
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 10000)
}
