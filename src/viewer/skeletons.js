// Detección de conjuntos de marcadores conocidos para dibujar "huesos" entre ellos.
// Si un archivo no encaja con ningún conjunto, solo se dibujan los marcadores.
import { shortLabel } from '../c3d/parser.js'

export const LEFT_COLOR = '#4da3ff'
export const RIGHT_COLOR = '#ff8a4d'
const GROUP_COLORS = ['#5ee6c8', '#ffd166', '#c792ea', '#7dd3fc', '#f9a8d4', '#a3e635']

// Marcadores de cuerpo completo tipo Plug-in Gait (Vicon), muy extendido en marcha.
const PLUG_IN_GAIT = {
  name: 'Plug-in Gait',
  min: 8,
  links: [
    // cabeza
    ['LFHD', 'RFHD'], ['RFHD', 'RBHD'], ['RBHD', 'LBHD'], ['LBHD', 'LFHD'],
    // tronco
    ['C7', 'CLAV'], ['CLAV', 'STRN'], ['C7', 'T10'], ['C7', 'RBAK'],
    ['LSHO', 'C7'], ['RSHO', 'C7'], ['LSHO', 'CLAV'], ['RSHO', 'CLAV'],
    ['T10', 'STRN'], ['T10', 'LPSI'], ['T10', 'RPSI'],
    // brazo izquierdo
    ['LSHO', 'LUPA'], ['LUPA', 'LELB'], ['LSHO', 'LELB'], ['LELB', 'LFRM'], ['LFRM', 'LWRA'], ['LELB', 'LWRA'],
    ['LELB', 'LWRB'], ['LWRA', 'LWRB'], ['LWRA', 'LFIN'], ['LWRB', 'LFIN'],
    // brazo derecho
    ['RSHO', 'RUPA'], ['RUPA', 'RELB'], ['RSHO', 'RELB'], ['RELB', 'RFRM'], ['RFRM', 'RWRA'], ['RELB', 'RWRA'],
    ['RELB', 'RWRB'], ['RWRA', 'RWRB'], ['RWRA', 'RFIN'], ['RWRB', 'RFIN'],
    // pelvis
    ['LASI', 'RASI'], ['LPSI', 'RPSI'], ['LASI', 'LPSI'], ['RASI', 'RPSI'], ['SACR', 'LPSI'], ['SACR', 'RPSI'],
    // pierna izquierda
    ['LASI', 'LTHI'], ['LTHI', 'LKNE'], ['LKNE', 'LTIB'], ['LTIB', 'LANK'], ['LKNE', 'LANK'],
    ['LANK', 'LHEE'], ['LANK', 'LTOE'], ['LHEE', 'LTOE'],
    // pierna derecha
    ['RASI', 'RTHI'], ['RTHI', 'RKNE'], ['RKNE', 'RTIB'], ['RTIB', 'RANK'], ['RKNE', 'RANK'],
    ['RANK', 'RHEE'], ['RANK', 'RTOE'], ['RHEE', 'RTOE'],
  ],
}

// Conjunto tipo Helen Hayes / Motion Analysis (Walk1, Sample_Jump2).
const MOTION_ANALYSIS = {
  name: 'Motion Analysis',
  min: 10,
  links: [
    ['THEA', 'FHEA'], ['FHEA', 'RHEA'], ['RHEA', 'THEA'],
    ['RSHO', 'LSHO'], ['RSHO', 'RELB'], ['RELB', 'RWRI'], ['LSHO', 'LELB'], ['LELB', 'LWRI'],
    ['RSHO', 'RASI'], ['LSHO', 'LASI'], ['RASI', 'LASI'], ['RASI', 'VSAC'], ['LASI', 'VSAC'],
    ['RASI', 'RTHI'], ['RTHI', 'RKNE'], ['RKNE', 'RSHA'], ['RSHA', 'RANK'], ['RANK', 'RHEE'], ['RANK', 'R.TO'], ['RHEE', 'R.TO'],
    ['LASI', 'LTHI'], ['LTHI', 'LKNE'], ['LKNE', 'LSHA'], ['LSHA', 'LANK'], ['LANK', 'LHEE'], ['LANK', 'L.TO'], ['LHEE', 'L.TO'],
  ],
}

// Conjunto de 41 marcadores de la base de datos de captura de la CMU (baile, deportes...).
// Sus archivos traen además cientos de puntos calculados (centros articulares, segmentos): solo se dibujan los 41 reales.
const CMU = {
  name: 'CMU',
  min: 30,
  only: true,
  links: [
    ['LFHD', 'RFHD'], ['RFHD', 'RBHD'], ['RBHD', 'LBHD'], ['LBHD', 'LFHD'],
    ['C7', 'CLAV'], ['CLAV', 'STRN'], ['C7', 'T10'], ['C7', 'RBAC'],
    ['LSHO', 'C7'], ['RSHO', 'C7'], ['LSHO', 'CLAV'], ['RSHO', 'CLAV'],
    ['LSHO', 'LUPA'], ['LUPA', 'LELB'], ['LELB', 'LFRM'], ['LFRM', 'LWRA'], ['LFRM', 'LWRB'], ['LWRA', 'LWRB'], ['LWRA', 'LFIN'], ['LWRB', 'LFIN'],
    ['RSHO', 'RUPA'], ['RUPA', 'RELB'], ['RELB', 'RFRM'], ['RFRM', 'RWRA'], ['RFRM', 'RWRB'], ['RWRA', 'RWRB'], ['RWRA', 'RFIN'], ['RWRB', 'RFIN'],
    ['T10', 'LBWT'], ['T10', 'RBWT'], ['STRN', 'LFWT'], ['STRN', 'RFWT'],
    ['LFWT', 'RFWT'], ['LBWT', 'RBWT'], ['LFWT', 'LBWT'], ['RFWT', 'RBWT'],
    ['LFWT', 'LTHI'], ['LTHI', 'LKNE'], ['LKNE', 'LSHN'], ['LSHN', 'LANK'], ['LANK', 'LHEE'], ['LANK', 'LTOE'], ['LHEE', 'LMT5'], ['LTOE', 'LMT5'],
    ['RFWT', 'RTHI'], ['RTHI', 'RKNE'], ['RKNE', 'RSHN'], ['RSHN', 'RANK'], ['RANK', 'RHEE'], ['RANK', 'RTOE'], ['RHEE', 'RMT5'], ['RTOE', 'RMT5'],
  ],
}

const PRESETS = [PLUG_IN_GAIT, MOTION_ANALYSIS, CMU]
for (const p of PRESETS) p.keys = [...new Set(p.links.flat())]

/**
 * @param {string[]} labels    etiquetas de todos los puntos
 * @param {boolean[]} derived  true = punto calculado (ángulo, fuerza...), no se dibuja
 * @returns {{ shown:number[], links:[number,number][], colors:string[], groups:{name:string,count:number,skeleton:string|null}[] }}
 */
export function analyzeMarkers(labels, derived) {
  const byPrefix = new Map()
  labels.forEach((label, i) => {
    if (derived[i]) return
    const k = label.lastIndexOf(':')
    const prefix = k >= 0 ? label.slice(0, k) : ''
    if (!byPrefix.has(prefix)) byPrefix.set(prefix, [])
    byPrefix.get(prefix).push(i)
  })

  const shown = []
  const links = []
  const colors = new Array(labels.length).fill(GROUP_COLORS[0])
  const groups = []
  let g = 0
  for (const [prefix, indices] of byPrefix) {
    const groupColor = GROUP_COLORS[g % GROUP_COLORS.length]
    g++
    const index = new Map()
    for (const i of indices) {
      const key = shortLabel(labels[i]).toUpperCase()
      if (!index.has(key)) index.set(key, i)
    }
    let best = null
    let bestHits = 0
    for (const preset of PRESETS) {
      const hits = preset.keys.filter((k) => index.has(k)).length
      if (hits >= preset.min && hits > bestHits) {
        best = preset
        bestHits = hits
      }
    }
    if (best && best.only) {
      const keep = indices.filter((i) => best.keys.includes(shortLabel(labels[i]).toUpperCase()))
      indices.length = 0
      indices.push(...keep)
    }
    shown.push(...indices)
    for (const i of indices) {
      const first = shortLabel(labels[i]).charAt(0).toUpperCase()
      colors[i] = best && first === 'L' ? LEFT_COLOR : best && first === 'R' ? RIGHT_COLOR : groupColor
    }
    if (best) {
      for (const [a, b] of best.links) {
        if (index.has(a) && index.has(b)) links.push([index.get(a), index.get(b)])
      }
    }
    groups.push({ name: prefix || 'Sin prefijo', count: indices.length, skeleton: best ? best.name : null })
  }
  shown.sort((a, b) => a - b)
  return { shown, links, colors, groups }
}
