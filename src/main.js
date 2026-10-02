import './style.css'
import { parseC3D, C3DError } from './c3d/parser.js'
import { Viewer } from './viewer/viewer.js'
import { EXAMPLES } from './examples.js'

const $ = (id) => document.getElementById(id)
const els = {
  viewer: $('viewer'),
  dropzone: $('dropzone'),
  dragHint: $('drag-hint'),
  status: $('status'),
  statusText: $('status-text'),
  statusProgress: $('status-progress'),
  info: $('info'),
  infoList: $('info-list'),
  warnings: $('warnings'),
  fileInput: $('file-input'),
  btnOpen: $('btn-open'),
  btnChoose: $('btn-choose'),
  btnPlay: $('btn-play'),
  btnStop: $('btn-stop'),
  btnReset: $('btn-reset'),
  seek: $('seek'),
  time: $('time'),
  speed: $('speed'),
  trail: $('trail'),
  up: $('up'),
  skeleton: $('skeleton'),
  follow: $('follow'),
  video: $('video'),
  videoBox: $('video-box'),
  galleryList: $('gallery-list'),
  galleryCredit: $('gallery-credit'),
}
const controlEls = [
  els.btnPlay, els.btnStop, els.btnReset, els.seek, els.speed, els.trail, els.up, els.skeleton, els.follow,
]

let viewer = null
let current = null // { meta } del archivo abierto

try {
  viewer = new Viewer(els.viewer, { onFrame, onPlayState })
} catch (err) {
  console.error(err)
  els.dropzone.hidden = true
  showStatus('Tu navegador no puede mostrar gráficos 3D (WebGL). Prueba con otro navegador o activa la aceleración por hardware.', {
    error: true,
  })
}

// ------------------------------------------------------------ estado / mensajes
function showStatus(text, { error = false, progress = null } = {}) {
  els.status.hidden = false
  els.status.classList.toggle('error', error)
  els.status.setAttribute('role', error ? 'alert' : 'status')
  els.statusText.textContent = text
  els.statusProgress.hidden = progress === null
  if (progress !== null) els.statusProgress.value = progress
}

function hideStatus() {
  els.status.hidden = true
}

function setControlsEnabled(on) {
  for (const el of controlEls) el.disabled = !on
}

// ------------------------------------------------------------ abrir archivos
function readFile(file, onProgress) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onprogress = (e) => e.lengthComputable && onProgress(e.loaded / e.total)
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(reader.error || new Error('No se pudo leer el archivo.'))
    reader.readAsArrayBuffer(file)
  })
}

const nextPaint = () => new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve, 0)))

async function openFile(file, example = null) {
  if (!file || !viewer) return
  markExample(example ? example.id : null)
  setVideo(example)
  els.dropzone.hidden = true
  showStatus(`Leyendo ${file.name}…`, { progress: 0 })
  try {
    const buffer = await readFile(file, (p) =>
      showStatus(`Leyendo ${file.name}… ${Math.round(p * 100)} %`, { progress: p })
    )
    showStatus('Interpretando el archivo…')
    await nextPaint()
    const c3d = parseC3D(buffer)
    present(c3d, file)
  } catch (err) {
    viewer.clear()
    current = null
    setControlsEnabled(false)
    els.info.hidden = true
    els.dropzone.hidden = false
    showStatus(
      err instanceof C3DError ? err.message : `No se pudo abrir el archivo: ${err && err.message ? err.message : err}`,
      { error: true }
    )
    console.error(err)
  }
}

function present(c3d, file) {
  const { meta } = c3d
  if (meta.pointCount === 0) {
    throw new C3DError(
      `Este archivo no tiene puntos 3D que dibujar${meta.analogChannels ? ` (solo ${meta.analogChannels} canales analógicos)` : ''}.`
    )
  }
  if (meta.frameCount === 0) throw new C3DError('El archivo no contiene fotogramas.')

  const shown = viewer.load(c3d)
  current = { meta, shown }

  els.seek.max = String(meta.frameCount - 1)
  els.seek.value = '0'
  els.skeleton.disabled = shown.links === 0
  els.skeleton.checked = shown.links > 0 && viewer.showSkeleton
  els.follow.checked = viewer.follow
  els.up.value = viewer.upAxis
  setControlsEnabled(true)
  els.skeleton.disabled = shown.links === 0

  fillInfo(c3d, file, shown)
  hideStatus()
  onFrame(0)

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (!reduceMotion) viewer.play()
}

function fillInfo(c3d, file, shown) {
  const { meta } = c3d
  const proc = { intel: 'Intel', dec: 'DEC', mips: 'SGI/MIPS' }[meta.processor] || meta.processor
  const hidden = meta.pointCount - shown.shown
  const rows = [
    ['Archivo', `${file.name} (${(file.size / 1e6).toFixed(file.size > 1e7 ? 0 : 1)} MB)`],
    ['Formato', `${proc} · datos ${meta.dataFormat}`],
    ['Marcadores', `${shown.shown} mostrados${hidden > 0 ? ` (${hidden} calculados, como ángulos o fuerzas, ocultos)` : ''}`],
    ['Fotogramas', String(meta.frameCount)],
    ['Frecuencia', `${round(meta.frameRate)} Hz`],
    ['Duración', `${round(meta.duration)} s`],
    ['Unidades', meta.units],
  ]
  if (meta.analogChannels) rows.push(['Analógicos', `${meta.analogChannels} canales (aún no se muestran)`])
  for (const g of shown.groups) {
    rows.push([
      shown.groups.length > 1 ? g.name : 'Conjunto',
      `${g.count} marcadores${g.skeleton ? ` · esqueleto ${g.skeleton}` : ' · sin esqueleto reconocido'}`,
    ])
  }
  els.infoList.replaceChildren(
    ...rows.flatMap(([k, v]) => {
      const dt = document.createElement('dt')
      dt.textContent = k
      const dd = document.createElement('dd')
      dd.textContent = v
      return [dt, dd]
    })
  )
  els.warnings.replaceChildren(
    ...c3d.warnings.map((w) => {
      const li = document.createElement('li')
      li.textContent = w
      return li
    })
  )
  els.info.hidden = false
}

const round = (v) => Number(v.toFixed(2)).toLocaleString('es-ES')

// ------------------------------------------------------------ vídeo de referencia (opcional)
// Si un ejemplo trae vídeo, se muestra junto al 3D y avanza al mismo tiempo. Si falta el archivo, simplemente no se muestra.
let hasVideo = false
let videoOffset = 0 // segundos que el vídeo va por delante del C3D (el vídeo empieza antes o después de la captura)

function setVideo(example) {
  const v = els.video
  hasVideo = false
  videoOffset = (example && example.videoOffset) || 0
  els.videoBox.hidden = true
  v.pause()
  v.removeAttribute('src')
  v.load()
  if (!example || !example.video) return
  v.onloadedmetadata = () => {
    hasVideo = true
    els.videoBox.hidden = false
    els.video.playbackRate = Number(els.speed.value)
    if (current) syncVideo(Number(els.seek.value), true)
    if (viewer?.playing) els.video.play().catch(() => {})
  }
  v.onerror = () => {
    hasVideo = false
    els.videoBox.hidden = true
  }
  v.src = `${import.meta.env.BASE_URL}examples/${example.video}`
}

function syncVideo(frame, force = false) {
  if (!hasVideo || !current) return
  const v = els.video
  const t = Math.min(Math.max(frame / current.meta.frameRate + videoOffset, 0), Math.max(v.duration - 0.05, 0))
  if (force || v.paused || Math.abs(v.currentTime - t) > 0.25) v.currentTime = t
}

// ------------------------------------------------------------ reproducción
function onFrame(i) {
  if (!current) return
  syncVideo(i)
  const { meta } = current
  els.seek.value = String(i)
  els.time.value = `Fotograma ${i + 1} / ${meta.frameCount} · ${(i / meta.frameRate).toFixed(2)} s`
}

function onPlayState(playing) {
  if (hasVideo) {
    if (playing) els.video.play().catch(() => {})
    else els.video.pause()
  }
  els.btnPlay.textContent = playing ? '❚❚' : '▶'
  els.btnPlay.setAttribute('aria-label', playing ? 'Pausar' : 'Reproducir')
}

els.btnPlay.addEventListener('click', () => viewer?.toggle())
els.btnStop.addEventListener('click', () => viewer?.stop())
els.btnReset.addEventListener('click', () => viewer?.resetView())
els.seek.addEventListener('input', () => viewer?.seek(Number(els.seek.value)))
els.speed.addEventListener('change', () => {
  viewer?.setSpeed(Number(els.speed.value))
  els.video.playbackRate = Number(els.speed.value)
})
els.trail.addEventListener('change', () => viewer?.setTrail(Number(els.trail.value)))
els.up.addEventListener('change', () => viewer?.setUpAxis(els.up.value))
els.skeleton.addEventListener('change', () => viewer?.setSkeleton(els.skeleton.checked))
els.follow.addEventListener('change', () => viewer?.setFollow(els.follow.checked))

window.addEventListener('keydown', (e) => {
  if (!viewer || !current) return
  if (e.target !== document.body && e.target !== viewer.renderer.domElement) return
  if (e.key === ' ') {
    e.preventDefault()
    viewer.toggle()
  } else if (e.key === 'ArrowLeft') viewer.step(-1)
  else if (e.key === 'ArrowRight') viewer.step(1)
  else if (e.key === 'Home') viewer.seek(0)
})

// ------------------------------------------------------------ galería de ejemplos
const exampleButtons = new Map()

function markExample(id) {
  for (const [key, btn] of exampleButtons) btn.setAttribute('aria-pressed', String(key === id))
  const ex = EXAMPLES.find((e) => e.id === id)
  els.galleryCredit.textContent = ex ? ex.credit : ''
}

async function openExample(ex) {
  if (!viewer) return
  els.dropzone.hidden = true
  showStatus(`Cargando «${ex.title}»…`)
  try {
    const res = await fetch(`${import.meta.env.BASE_URL}examples/${ex.file}`)
    if (!res.ok) throw new Error(`no se encontró ${ex.file}`)
    const blob = await res.blob()
    await openFile(new File([blob], ex.file, { type: 'application/octet-stream' }), ex)
  } catch (err) {
    console.error(err)
    markExample(null)
    els.dropzone.hidden = false
    showStatus(`No se pudo cargar el ejemplo: ${err.message}`, { error: true })
  }
}

for (const ex of EXAMPLES) {
  const li = document.createElement('li')
  const btn = document.createElement('button')
  btn.type = 'button'
  btn.className = 'example'
  btn.setAttribute('aria-pressed', 'false')
  const img = document.createElement('img')
  img.src = `${import.meta.env.BASE_URL}examples/thumbs/${ex.id}.jpg`
  img.alt = ''
  img.loading = 'lazy'
  img.width = 320
  img.height = 180
  const title = document.createElement('strong')
  title.textContent = ex.title
  const text = document.createElement('span')
  text.textContent = ex.text
  btn.append(img, title, text)
  btn.addEventListener('click', () => openExample(ex))
  li.append(btn)
  els.galleryList.append(li)
  exampleButtons.set(ex.id, btn)
}

// Al entrar, se muestra ya un ejemplo: quien no tiene un C3D ve el resultado sin hacer nada.
if (viewer) openExample(EXAMPLES[0])

// ------------------------------------------------------------ abrir / arrastrar
els.btnOpen.addEventListener('click', () => els.fileInput.click())
els.btnChoose.addEventListener('click', () => els.fileInput.click())
els.fileInput.addEventListener('change', () => {
  openFile(els.fileInput.files[0])
  els.fileInput.value = ''
})

let dragDepth = 0
window.addEventListener('dragenter', (e) => {
  e.preventDefault()
  dragDepth++
  els.dragHint.hidden = false
})
window.addEventListener('dragover', (e) => e.preventDefault())
window.addEventListener('dragleave', () => {
  dragDepth = Math.max(0, dragDepth - 1)
  if (!dragDepth) els.dragHint.hidden = true
})
window.addEventListener('drop', (e) => {
  e.preventDefault()
  dragDepth = 0
  els.dragHint.hidden = true
  openFile(e.dataTransfer && e.dataTransfer.files[0])
})
