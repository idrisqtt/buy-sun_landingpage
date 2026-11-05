const MAX_PHOTO_SIDE = 1600
const MAX_FILE_SIZE = 50 * 1024 * 1024
const JPEG_QUALITY = 0.85
const SELFIE_SIZE = 600
const HEIC_BRANDS = ['heic', 'heix', 'hevc', 'hevx', 'heim', 'heis', 'mif1', 'msf1']

export class PhotoError extends Error {
  constructor(code) {
    super(code)
    this.code = code
  }
}

const loadImage = (src) => new Promise((resolve, reject) => {
  const img = new Image()
  img.onload = () => resolve(img)
  img.onerror = () => reject(new PhotoError('format'))
  img.src = src
})

const isHeicFile = async (file) => {
  const header = new Uint8Array(await file.slice(0, 12).arrayBuffer())
  const text = String.fromCharCode(...header)
  return text.slice(4, 8) === 'ftyp' && HEIC_BRANDS.includes(text.slice(8, 12))
}

// Browsers other than Safari can't open HEIC, so the decoder is loaded only when it's needed
const convertHeic = async (file) => {
  try {
    const { heicTo } = await import('heic-to')
    return await heicTo({ blob: file, type: 'image/jpeg', quality: JPEG_QUALITY })
  } catch (err) {
    console.error('Could not convert HEIC:', err)
    throw new PhotoError('heic')
  }
}

const canvasToJpeg = (canvas, quality) => {
  const dataUrl = canvas.toDataURL('image/jpeg', quality)
  // A canvas over the device's memory limit returns an empty result instead of throwing
  if (!dataUrl.startsWith('data:image/jpeg')) throw new PhotoError('tooLarge')
  return dataUrl
}

const decodeAndResize = async (blob) => {
  const url = URL.createObjectURL(blob)
  try {
    const img = await loadImage(url)
    const scale = Math.min(1, MAX_PHOTO_SIDE / Math.max(img.naturalWidth, img.naturalHeight))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(img.naturalWidth * scale)
    canvas.height = Math.round(img.naturalHeight * scale)
    const ctx = canvas.getContext('2d')
    // White background: JPEG has no transparency, which would otherwise turn black
    ctx.fillStyle = '#fff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
    return { dataUrl: canvasToJpeg(canvas, JPEG_QUALITY), width: canvas.width, height: canvas.height }
  } finally {
    URL.revokeObjectURL(url)
  }
}

// Turns any selected file into a resized JPEG, or throws PhotoError with a reason to show the user
export const processPhoto = async (file) => {
  if (file.size > MAX_FILE_SIZE) throw new PhotoError('tooLarge')
  try {
    return await decodeAndResize(file)
  } catch (err) {
    if (err.code === 'format' && await isHeicFile(file)) {
      return decodeAndResize(await convertHeic(file))
    }
    throw err
  }
}

// Default crop for the round photo: faces are usually near the top of a portrait shot
export const defaultFocus = (width, height) => {
  const size = Math.min(width, height)
  const top = Math.min(height * 0.05, height - size)
  return { x: 0.5, y: (top + size / 2) / height }
}

export const clampFocus = ({ x, y }, width, height) => {
  const size = Math.min(width, height)
  const halfX = size / 2 / width
  const halfY = size / 2 / height
  return {
    x: Math.min(1 - halfX, Math.max(halfX, x)),
    y: Math.min(1 - halfY, Math.max(halfY, y))
  }
}

// The selfie cut to a square around the face; round: inside a circle on the
// given background colour, as in the anketa PDF
const cropSelfie = async ({ dataUrl, width, height, focus }, { round, background } = {}) => {
  const img = await loadImage(dataUrl)
  const sourceSize = Math.min(width, height)
  const outputSize = Math.min(sourceSize, SELFIE_SIZE)
  const center = focus || defaultFocus(width, height)
  const canvas = document.createElement('canvas')
  canvas.width = outputSize
  canvas.height = outputSize
  const ctx = canvas.getContext('2d')
  if (round) {
    // Filled with the PDF column colour instead of transparency to keep the file small
    ctx.fillStyle = `rgb(${background.join(',')})`
    ctx.fillRect(0, 0, outputSize, outputSize)
    ctx.beginPath()
    ctx.arc(outputSize / 2, outputSize / 2, outputSize / 2, 0, Math.PI * 2)
    ctx.clip()
  }
  ctx.drawImage(
    img,
    center.x * width - sourceSize / 2,
    center.y * height - sourceSize / 2,
    sourceSize,
    sourceSize,
    0,
    0,
    outputSize,
    outputSize
  )
  return canvasToJpeg(canvas, 0.9)
}

export const cropRoundPhoto = (photo, background) => cropSelfie(photo, { round: true, background })

export const cropSquarePhoto = (photo) => cropSelfie(photo)

export const fitInBox = (width, height, boxWidth, boxHeight) => {
  const scale = Math.min(boxWidth / width, boxHeight / height)
  return { width: width * scale, height: height * scale }
}
