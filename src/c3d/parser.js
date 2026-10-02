// Lector de archivos C3D (captura de movimiento).
//
// Diseño:
//  - Solo lee la cabecera y los parámetros al abrir el archivo; los fotogramas
//    se decodifican bajo demanda con getFrame(). Así abrir un archivo de 100 MB
//    es casi instantáneo y no hay que guardar todos los puntos en memoria.
//  - Sin dependencias del navegador: funciona igual en Node (scripts/inspect.mjs).
//
// Formato (resumen): bloques de 512 bytes. Cabecera en el bloque 1, sección de
// parámetros a partir del bloque indicado en el byte 0, datos a partir de
// POINT:DATA_START. El orden de bytes lo da el 4.º byte de la sección de
// parámetros: 84 = Intel, 85 = DEC (decimales VAX), 86 = MIPS/SGI (big-endian).

const BLOCK = 512

export class C3DError extends Error {
  constructor(message) {
    super(message)
    this.name = 'C3DError'
  }
}

const POINT_KIND_LISTS = ['ANGLES', 'FORCES', 'MOMENTS', 'POWERS', 'SCALARS', 'REACTIONS']
const DERIVED_NAME = /(angles?|forces?|moments?|powers?|reactions?)$/i

export function parseC3D(buffer) {
  if (!(buffer instanceof ArrayBuffer)) {
    throw new C3DError('Se esperaba el contenido del archivo como ArrayBuffer.')
  }
  const size = buffer.byteLength
  if (size < BLOCK) throw new C3DError('El archivo es demasiado pequeño para ser un C3D.')

  const bytes = new Uint8Array(buffer)
  const view = new DataView(buffer)
  const warnings = []

  const paramBlock = bytes[0]
  if (bytes[1] !== 0x50) {
    throw new C3DError('No parece un archivo C3D: falta la marca 0x50 en la cabecera.')
  }
  const paramOffset = (paramBlock - 1) * BLOCK
  if (paramBlock < 1 || paramOffset + 4 > size) {
    throw new C3DError('La cabecera apunta a una sección de parámetros que no existe.')
  }

  // ---- Orden de bytes / tipo de procesador --------------------------------
  const procCode = bytes[paramOffset + 3]
  let processor = 'intel'
  if (procCode === 84) processor = 'intel'
  else if (procCode === 85) processor = 'dec'
  else if (procCode === 86) processor = 'mips'
  else warnings.push(`Tipo de procesador desconocido (${procCode}); se asume Intel.`)
  const little = processor !== 'mips'
  const isDec = processor === 'dec'

  const u16 = (o) => view.getUint16(o, little)
  const i16 = (o) => view.getInt16(o, little)
  const f32 = isDec
    ? (o) => {
        // Decimal VAX F: 2 palabras little-endian; 1 signo, 8 exponente (exceso 128), 23 fracción.
        const w0 = view.getUint16(o, true)
        const w1 = view.getUint16(o + 2, true)
        const e = (w0 >> 7) & 0xff
        if (e === 0) return 0
        const frac = ((w0 & 0x7f) << 16) | w1
        const v = (1 + frac / 8388608) * Math.pow(2, e - 129)
        return w0 & 0x8000 ? -v : v
      }
    : (o) => view.getFloat32(o, little)

  // ---- Cabecera -----------------------------------------------------------
  const hdr = {
    nPoints: u16(2),
    analogTotal: u16(4),
    first: u16(6),
    last: u16(8),
    scale: f32(12),
    dataStart: u16(16),
    analogPerFrame: u16(18),
    rate: f32(20),
  }

  // ---- Parámetros ---------------------------------------------------------
  const groups = new Map() // id -> { name }
  const params = [] // { group, name, type, dims, dataOffset, count }
  {
    let pos = paramOffset + 4
    for (let guard = 0; guard < 20000; guard++) {
      if (pos + 4 > size) break
      const nameLen = Math.abs(view.getInt8(pos))
      const id = view.getInt8(pos + 1)
      if (nameLen === 0) break
      const ptrPos = pos + 2 + nameLen
      if (ptrPos + 2 > size) break
      const name = readAscii(bytes, pos + 2, nameLen)
      const next = view.getUint16(ptrPos, little) // hacia delante; sin signo por si el bloque es grande
      if (id < 0) {
        groups.set(-id, { name })
      } else {
        const type = view.getInt8(ptrPos + 2)
        const nd = bytes[ptrPos + 3]
        const dims = []
        for (let d = 0; d < nd; d++) dims.push(bytes[ptrPos + 4 + d])
        const count = nd === 0 ? 1 : dims.reduce((a, b) => a * b, 1)
        const elem = type === -1 || type === 1 ? 1 : type === 2 ? 2 : type === 4 ? 4 : 0
        const dataOffset = ptrPos + 4 + nd
        if (elem && dataOffset + count * elem <= size) {
          params.push({ group: id, name, type, dims, dataOffset, count })
        }
      }
      if (next === 0) break
      pos = ptrPos + next
    }
  }
  if (!params.length) warnings.push('No se pudieron leer parámetros; se usará solo la cabecera.')

  const groupName = (gid) => (groups.get(gid) ? groups.get(gid).name : '')
  const norm = (s) => String(s).trim().toUpperCase()
  const findParam = (g, n) => {
    const G = norm(g)
    const N = norm(n)
    return params.find((p) => norm(groupName(p.group)) === G && norm(p.name) === N) || null
  }
  const readNumbers = (p, unsigned) => {
    const out = []
    for (let i = 0; i < p.count; i++) {
      if (p.type === 4) out.push(f32(p.dataOffset + i * 4))
      else if (p.type === 2) out.push(unsigned ? u16(p.dataOffset + i * 2) : i16(p.dataOffset + i * 2))
      else if (p.type === 1) out.push(bytes[p.dataOffset + i])
    }
    return out
  }
  const readStrings = (p) => {
    if (p.type !== -1) return []
    if (p.dims.length <= 1) return [readAscii(bytes, p.dataOffset, p.count)]
    const len = p.dims[0]
    const n = p.dims.slice(1).reduce((a, b) => a * b, 1)
    const out = []
    for (let i = 0; i < n; i++) out.push(readAscii(bytes, p.dataOffset + i * len, len))
    return out
  }
  const num = (g, n, unsigned = true) => {
    const p = findParam(g, n)
    if (!p || p.type === -1) return null
    const v = readNumbers(p, unsigned)[0]
    return Number.isFinite(v) ? v : null
  }
  const str = (g, n) => {
    const p = findParam(g, n)
    return p && p.type === -1 ? readStrings(p)[0] || '' : ''
  }
  const strs = (g, n) => {
    const p = findParam(g, n)
    return p ? readStrings(p) : []
  }

  // ---- Puntos -------------------------------------------------------------
  let nPoints = num('POINT', 'USED')
  if (nPoints === null) nPoints = hdr.nPoints

  let scale = num('POINT', 'SCALE', false)
  if (scale === null || !Number.isFinite(scale) || scale === 0) {
    scale = hdr.scale
    if (!Number.isFinite(scale) || scale === 0) {
      warnings.push('Factor de escala inválido; se asume datos decimales.')
      scale = -1
    }
  }
  const isFloat = scale < 0
  const absScale = Math.abs(scale)

  let rate = num('POINT', 'RATE', false)
  if (rate === null || !(rate > 0)) rate = hdr.rate
  if (!(rate > 0) || !Number.isFinite(rate)) {
    warnings.push('No se pudo leer la frecuencia; se asumen 100 Hz.')
    rate = 100
  }

  const units = (str('POINT', 'UNITS') || 'mm').trim() || 'mm'

  let dataStart = num('POINT', 'DATA_START')
  if (dataStart === null || dataStart < 1 || (dataStart - 1) * BLOCK >= size) {
    if (dataStart !== null) warnings.push('POINT:DATA_START inválido; se usa el de la cabecera.')
    dataStart = hdr.dataStart
  }
  const dataOffset = (dataStart - 1) * BLOCK
  if (dataOffset >= size) throw new C3DError('La sección de datos no existe: el archivo está truncado o dañado.')

  // ---- Analógicos (solo para calcular el tamaño de cada fotograma) ---------
  const valueBytes = isFloat ? 4 : 2
  const pointBytes = isFloat ? 16 : 8
  const analogUsed = num('ANALOG', 'USED') || 0
  const analogRate = num('ANALOG', 'RATE', false) || 0
  const ratio = analogRate > 0 ? Math.max(1, Math.round(analogRate / rate)) : hdr.analogPerFrame || 1
  const analogCandidates = [...new Set([hdr.analogTotal, analogUsed * ratio])]

  // ---- Número de fotogramas -----------------------------------------------
  const readCount = (n) => {
    const p = findParam('POINT', n)
    if (!p || p.type === -1) return null
    const v = readNumbers(p, true)[0]
    return Number.isFinite(v) ? Math.round(v) : null
  }
  let declared = readCount('LONG_FRAMES')
  if (!(declared > 0)) declared = readCount('FRAMES')
  let tooLong = false
  if (!(declared > 0) || declared === 65535) {
    tooLong = declared === 65535
    const fromHeader = hdr.last - hdr.first + 1
    declared = tooLong ? 0 : fromHeader > 0 ? fromHeader : 0
  }

  let analogPerFrameTotal = analogCandidates[0]
  if (analogCandidates.length > 1 && declared > 0) {
    let best = Infinity
    for (const a of analogCandidates) {
      const fb = nPoints * pointBytes + a * valueBytes
      const err = Math.abs((size - dataOffset) / fb - declared)
      if (err < best - 1e-9) {
        best = err
        analogPerFrameTotal = a
      }
    }
    if (analogPerFrameTotal !== analogCandidates[0]) {
      warnings.push('La cabecera y los parámetros no coinciden en los canales analógicos; se usa el que encaja con el tamaño del archivo.')
    }
  }
  const frameBytes = nPoints * pointBytes + analogPerFrameTotal * valueBytes
  const capacity = frameBytes > 0 ? Math.floor((size - dataOffset) / frameBytes) : 0

  let frameCount = declared
  if (frameCount <= 0) {
    frameCount = capacity
    if (capacity > 0) {
      warnings.push(
        tooLong
          ? 'Archivo con 65 535 fotogramas o más: el número exacto se calcula a partir del tamaño del archivo.'
          : 'No se pudo leer el número de fotogramas; se deduce del tamaño del archivo.'
      )
    }
  } else if (frameCount > capacity) {
    warnings.push(`El archivo declara ${frameCount} fotogramas pero solo caben ${capacity}: probablemente está truncado.`)
    frameCount = capacity
  }

  // ---- Etiquetas ----------------------------------------------------------
  let labels = []
  const first = strs('POINT', 'LABELS')
  labels = labels.concat(first)
  for (let k = 2; k < 40; k++) {
    const more = strs('POINT', `LABELS${k}`)
    if (!more.length) break
    labels = labels.concat(more)
  }
  labels = labels.slice(0, nPoints)
  while (labels.length < nPoints) labels.push(`Punto ${labels.length + 1}`)
  labels = labels.map((l, i) => l || `Punto ${i + 1}`)

  // Salidas calculadas (ángulos, fuerzas...): no son posiciones en el espacio.
  const derivedNames = new Set()
  for (const k of POINT_KIND_LISTS) for (const s of strs('POINT', k)) if (s) derivedNames.add(s)
  const derived = labels.map((l) => derivedNames.has(l) || DERIVED_NAME.test(shortLabel(l)))

  // ---- Estructura devuelta ------------------------------------------------
  const meta = {
    processor,
    dataFormat: isFloat ? 'decimal' : 'entero',
    pointCount: nPoints,
    markerCount: derived.filter((d) => !d).length,
    frameCount,
    frameRate: rate,
    firstFrame: hdr.first,
    duration: frameCount / rate,
    units,
    scale,
    analogChannels: analogUsed,
    analogRate,
    hasAnalogGroup: !!findParam('ANALOG', 'USED'),
    fileSize: size,
    groups: [...groups.values()].map((g) => g.name),
  }

  const state = { ignoreResiduals: false }

  function getFrame(index, out) {
    // Rellena `out` (Float32Array de nPoints*3) con X,Y,Z en las unidades del archivo; NaN = punto inválido.
    const base = dataOffset + index * frameBytes
    let valid = 0
    for (let p = 0; p < nPoints; p++) {
      const o = base + p * pointBytes
      let x, y, z, bad
      if (isFloat) {
        x = f32(o)
        y = f32(o + 4)
        z = f32(o + 8)
        const r = f32(o + 12)
        bad = !(r >= 0)
      } else {
        x = i16(o) * absScale
        y = i16(o + 2) * absScale
        z = i16(o + 4) * absScale
        bad = i16(o + 6) < 0
      }
      if (state.ignoreResiduals) bad = false
      if (bad || !Number.isFinite(x + y + z) || (x === 0 && y === 0 && z === 0)) {
        out[p * 3] = out[p * 3 + 1] = out[p * 3 + 2] = NaN
      } else {
        out[p * 3] = x
        out[p * 3 + 1] = y
        out[p * 3 + 2] = z
        valid++
      }
    }
    return valid
  }

  // Si prácticamente todos los puntos salen inválidos por el residuo, se ignora el residuo.
  if (frameCount > 0 && nPoints > 0) {
    const probe = new Float32Array(nPoints * 3)
    const idx = [0, Math.floor(frameCount / 2), frameCount - 1]
    let valid = 0
    for (const i of idx) valid += getFrame(i, probe)
    if (valid === 0) {
      state.ignoreResiduals = true
      let alt = 0
      for (const i of idx) alt += getFrame(i, probe)
      if (alt > 0) {
        warnings.push('Todos los puntos marcaban residuo inválido; se muestran igualmente sus coordenadas.')
      } else {
        state.ignoreResiduals = false
      }
    }
  }

  return { meta, labels, derived, warnings, getFrame }
}

function readAscii(bytes, offset, length) {
  let s = ''
  for (let i = 0; i < length; i++) {
    const c = bytes[offset + i]
    if (c === 0) break
    s += String.fromCharCode(c)
  }
  return s.trim()
}

// "Sujeto:LASI" -> "LASI"
export function shortLabel(label) {
  const k = label.lastIndexOf(':')
  return k >= 0 ? label.slice(k + 1) : label
}
