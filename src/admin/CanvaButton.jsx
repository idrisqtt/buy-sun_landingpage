import { useState } from 'react'
import { buildCanvaPdf } from '../canvaPdf'
import { downloadBlob, pdfName } from './download'

// "Для Canva": a plain PDF of the anketa as it is on the screen. In Canva:
// Create a design → Import file, and every line becomes editable text.
function CanvaButton({ builder }) {
  const [state, setState] = useState('')

  const download = async () => {
    const current = builder.current?.()
    if (!current) return
    if (current.waiting) return setState('wait')
    setState('busy')
    try {
      const blob = await buildCanvaPdf({ ...current.answers, ...current.photos })
      downloadBlob(blob, pdfName(current.answers, 'Canva'))
      setState('')
    } catch {
      setState('error')
    }
  }

  return (
    <div className="cab-canva">
      <button
        type="button"
        className="cab-btn secondary"
        onClick={download}
        disabled={state === 'busy'}
        title="PDF с обычным текстом: Canva откроет его, и текст можно править"
      >
        {state === 'busy' ? 'Создаём…' : 'Для Canva'}
      </button>
      {state === 'wait' && <small className="cab-hint">Фото ещё загружаются, нажмите через секунду</small>}
      {state === 'error' && <small className="cab-error">Не удалось создать файл</small>}
    </div>
  )
}

export default CanvaButton
