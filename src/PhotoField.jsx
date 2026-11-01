import { useRef } from 'react'
import { clampFocus } from './photoUtils'

const CROP_BOX_SIZE = 180

function RoundPhotoCrop({ photo, hint, onFocusChange }) {
  const dragStart = useRef(null)
  const { dataUrl, width, height, focus } = photo
  const scale = CROP_BOX_SIZE / Math.min(width, height)
  const shownWidth = width * scale
  const shownHeight = height * scale

  const handlePointerDown = (e) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    dragStart.current = { pointerX: e.clientX, pointerY: e.clientY, focus }
  }

  const handlePointerMove = (e) => {
    if (!dragStart.current) return
    const { pointerX, pointerY, focus: startFocus } = dragStart.current
    onFocusChange(clampFocus({
      x: startFocus.x - (e.clientX - pointerX) / shownWidth,
      y: startFocus.y - (e.clientY - pointerY) / shownHeight
    }, width, height))
  }

  const handlePointerUp = () => {
    dragStart.current = null
  }

  return (
    <div className="photo-crop">
      <div
        className="photo-crop-circle"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <img
          src={dataUrl}
          alt=""
          draggable={false}
          style={{
            width: shownWidth,
            height: shownHeight,
            left: CROP_BOX_SIZE / 2 - focus.x * shownWidth,
            top: CROP_BOX_SIZE / 2 - focus.y * shownHeight
          }}
        />
      </div>
      <p className="photo-hint">{hint}</p>
    </div>
  )
}

function PhotoField({ name, label, required, state, t, onChange, onFocusChange }) {
  const { photo, busy, error } = state

  return (
    <div className="form-group">
      <label htmlFor={name}>{label}</label>
      <input
        type="file"
        id={name}
        name={name}
        onChange={onChange}
        accept="image/*,.heic,.heif"
        required={required && !photo}
      />
      {busy && <p className="photo-hint">{t.photoProcessing}</p>}
      {error && <p className="photo-error" role="alert">{t[error]}</p>}
      {photo && !busy && (onFocusChange
        ? <RoundPhotoCrop photo={photo} hint={t.photoDrag} onFocusChange={onFocusChange} />
        : <img className="photo-preview" src={photo.dataUrl} alt="" />)}
    </div>
  )
}

export default PhotoField
