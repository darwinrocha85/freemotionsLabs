// Lee todos los .c3d de una carpeta (por defecto ./samples) y muestra un resumen.
// Uso:  node scripts/inspect.mjs [carpeta]      (o: npm run inspect)
//
// No compara con otro software. Comprueba que lo leído es coherente por sí mismo:
//  - hay puntos válidos y sin NaN raros,
//  - las distancias entre marcadores del mismo segmento rígido casi no cambian
//    de un fotograma a otro (si se decodificara mal, saldría ruido).
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { parseC3D, C3DError } from '../src/c3d/parser.js'

const root = process.argv[2] || 'samples'

function walk(dir) {
  const out = []
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) out.push(...walk(p))
    else if (name.toLowerCase().endsWith('.c3d')) out.push(p)
  }
  return out.sort()
}

function toArrayBuffer(buf) {
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength)
}

function rigidityReport(c3d) {
  const { meta, labels, derived, getFrame } = c3d
  const idx = []
  for (let i = 0; i < meta.pointCount && idx.length < 40; i++) if (!derived[i]) idx.push(i)
  const nFrames = Math.min(40, meta.frameCount)
  if (idx.length < 3 || nFrames < 5) return null
  const tmp = new Float32Array(meta.pointCount * 3)
  const frames = []
  for (let k = 0; k < nFrames; k++) {
    const f = Math.floor((k * (meta.frameCount - 1)) / (nFrames - 1))
    getFrame(f, tmp)
    frames.push(Float32Array.from(tmp))
  }
  let best = { cv: Infinity }
  let rigid = 0
  let pairs = 0
  for (let a = 0; a < idx.length; a++) {
    for (let b = a + 1; b < idx.length; b++) {
      const d = []
      for (const fr of frames) {
        const i = idx[a] * 3
        const j = idx[b] * 3
        const x = fr[i] - fr[j]
        const y = fr[i + 1] - fr[j + 1]
        const z = fr[i + 2] - fr[j + 2]
        const v = Math.hypot(x, y, z)
        if (Number.isFinite(v)) d.push(v)
      }
      if (d.length < nFrames * 0.8) continue
      pairs++
      const mean = d.reduce((s, v) => s + v, 0) / d.length
      if (mean <= 0) continue
      const sd = Math.sqrt(d.reduce((s, v) => s + (v - mean) ** 2, 0) / d.length)
      const cv = sd / mean
      if (cv < 0.015) rigid++
      if (cv < best.cv) best = { cv, a: labels[idx[a]], b: labels[idx[b]], mean }
    }
  }
  return { pairs, rigid, best }
}

function extent(c3d) {
  const { meta, getFrame, derived } = c3d
  const tmp = new Float32Array(meta.pointCount * 3)
  const min = [Infinity, Infinity, Infinity]
  const max = [-Infinity, -Infinity, -Infinity]
  let valid = 0
  let total = 0
  const n = Math.min(30, meta.frameCount)
  for (let k = 0; k < n; k++) {
    getFrame(Math.floor((k * (meta.frameCount - 1)) / Math.max(1, n - 1)), tmp)
    for (let p = 0; p < meta.pointCount; p++) {
      if (derived[p]) continue
      total++
      if (Number.isNaN(tmp[p * 3])) continue
      valid++
      for (let c = 0; c < 3; c++) {
        const v = tmp[p * 3 + c]
        if (v < min[c]) min[c] = v
        if (v > max[c]) max[c] = v
      }
    }
  }
  return { min, max, validPct: total ? Math.round((100 * valid) / total) : 0 }
}

let failures = 0
for (const file of walk(root)) {
  const name = relative(root, file)
  const t0 = performance.now()
  try {
    const c3d = parseC3D(toArrayBuffer(readFileSync(file)))
    const ms = Math.round(performance.now() - t0)
    const { meta } = c3d
    console.log(`\n${name}  (${(meta.fileSize / 1e6).toFixed(1)} MB, abre en ${ms} ms)`)
    console.log(
      `  ${meta.processor}/${meta.dataFormat} · ${meta.pointCount} puntos (${meta.markerCount} marcadores) · ${meta.frameCount} fotogramas @ ${meta.frameRate} Hz (${meta.duration.toFixed(1)} s) · unidades ${meta.units} · analógicos ${meta.analogChannels}`
    )
    console.log(`  etiquetas: ${c3d.labels.slice(0, 8).join(', ')}${c3d.labels.length > 8 ? ' …' : ''}`)
    for (const w of c3d.warnings) console.log(`  ⚠ ${w}`)
    if (meta.pointCount > 0 && meta.frameCount > 0) {
      const e = extent(c3d)
      const r = rigidityReport(c3d)
      const f = (v) => v.map((x) => Math.round(x)).join(', ')
      console.log(`  válidos ${e.validPct}% · min [${f(e.min)}] · max [${f(e.max)}]`)
      if (r) {
        console.log(
          `  rigidez: ${r.rigid}/${r.pairs} pares con variación < 1.5 %; mejor ${r.best.a}–${r.best.b}: ${(r.best.cv * 100).toFixed(2)} % (media ${Math.round(r.best.mean)})`
        )
      }
    } else {
      console.log('  sin puntos 3D para dibujar')
    }
  } catch (err) {
    failures++
    console.log(`\n${name}\n  ✗ ${err instanceof C3DError ? err.message : err.stack}`)
  }
}
console.log(`\nFallos inesperados: ${failures}`)
