// jsPDF's built-in fonts only cover Latin-1, so Russian, Kazakh and Turkish
// letters turn into garbage. We embed BuySun Sans (Liberation Sans subset,
// same metrics as Helvetica, so the existing layout does not move).
export const PDF_FONT = 'BuySunSans'

const FONT_FILES = {
  normal: '/fonts/BuySunSans-Regular.ttf',
  bold: '/fonts/BuySunSans-Bold.ttf',
}

let fontsPromise = null

const toBase64 = (buffer) => {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000))
  }
  return btoa(binary)
}

// Starts the download once and reuses it; call early so the PDF is ready faster.
export const loadPdfFonts = () => {
  if (!fontsPromise) {
    fontsPromise = Promise.all(
      Object.entries(FONT_FILES).map(async ([style, url]) => {
        const response = await fetch(url)
        if (!response.ok) throw new Error(`Font ${url}: HTTP ${response.status}`)
        return [style, toBase64(await response.arrayBuffer())]
      })
    ).catch((err) => {
      fontsPromise = null // allow a retry, e.g. after the connection comes back
      throw err
    })
  }
  return fontsPromise
}

// Registers the fonts on a jsPDF document and makes them the current font.
// Later calls like pdf.setFont(undefined, 'bold') keep this font family.
export const applyPdfFonts = async (pdf) => {
  const fonts = await loadPdfFonts()
  for (const [style, data] of fonts) {
    const fileName = `${PDF_FONT}-${style}.ttf`
    pdf.addFileToVFS(fileName, data)
    pdf.addFont(fileName, PDF_FONT, style)
  }
  pdf.setFont(PDF_FONT, 'normal')
}
