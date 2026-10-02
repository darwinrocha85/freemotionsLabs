// Visor 3D (Three.js) para los datos de un C3D ya interpretado (ver src/c3d/parser.js).
// Dibuja los marcadores como esferas, los "huesos" entre marcadores reconocidos,
// una cuadrícula en el suelo y, opcionalmente, el rastro de los últimos fotogramas.
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { analyzeMarkers } from './skeletons.js'

const UNIT_TO_METERS = { mm: 0.001, cm: 0.01, m: 1, in: 0.0254 }
const BACKGROUND = '#0b1020'
const NICE_STEPS = [0.01, 0.02, 0.05, 0.1, 0.2, 0.5, 1, 2]
const UP = new THREE.Vector3(0, 1, 0)

// Cuadrícula del suelo. Cada línea se parte en tramos de una celda para que ningún
// extremo quede muy lejos de la pantalla (algunos controladores gráficos descartan
// líneas largas que salen del encuadre, y entonces el suelo no se veía).
function buildGrid(step, half, mainColor, subColor) {
  const positions = []
  const colors = []
  const color = new THREE.Color()
  for (let i = -half; i <= half; i++) {
    color.set(i === 0 ? mainColor : subColor)
    for (let j = -half; j < half; j++) {
      positions.push(j * step, 0, i * step, (j + 1) * step, 0, i * step)
      positions.push(i * step, 0, j * step, i * step, 0, (j + 1) * step)
      for (let k = 0; k < 4; k++) colors.push(color.r, color.g, color.b)
    }
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  return new THREE.LineSegments(geometry, new THREE.LineBasicMaterial({ vertexColors: true }))
}

export class Viewer {
  constructor(host, { onFrame, onPlayState } = {}) {
    this.host = host
    this.onFrame = onFrame
    this.onPlayState = onPlayState

    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    this.renderer.domElement.setAttribute('role', 'img')
    this.renderer.domElement.setAttribute('aria-label', 'Vista 3D de la captura de movimiento')
    host.appendChild(this.renderer.domElement)

    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color(BACKGROUND)
    this.scene.add(new THREE.HemisphereLight(0xdfe8ff, 0x1a2238, 1.6))
    const sun = new THREE.DirectionalLight(0xffffff, 1.6)
    sun.position.set(3, 6, 4)
    this.scene.add(sun)

    this.camera = new THREE.PerspectiveCamera(45, 1, 0.01, 100)
    this.camera.position.set(2, 1.5, 3)
    this.controls = new OrbitControls(this.camera, this.renderer.domElement)
    this.controls.enableDamping = true
    this.controls.dampingFactor = 0.12
    this.controls.addEventListener('change', () => (this.dirty = true))

    // Estado de reproducción y opciones
    this.c3d = null
    this.playing = false
    this.frame = 0
    this.shownFrame = -1
    this.speed = 1
    this.loop = true
    this.upAxis = 'z'
    this.follow = false
    this.showSkeleton = true
    this.trailLength = 0
    this.dirty = true
    this.lastTime = 0
    this.dummy = new THREE.Object3D()
    this.tmpA = new THREE.Vector3()
    this.tmpB = new THREE.Vector3()

    this.resizeObserver = new ResizeObserver(() => this.resize())
    this.resizeObserver.observe(host)
    this.resize()
    this.renderer.setAnimationLoop(this.tick)
  }

  // ---------------------------------------------------------------- carga
  load(c3d) {
    this.clear()
    const { meta, labels, derived } = c3d
    this.c3d = c3d
    this.n = meta.pointCount
    this.frameCount = meta.frameCount
    this.rate = meta.frameRate
    this.unit = UNIT_TO_METERS[String(meta.units).toLowerCase()] ?? 0.001
    this.raw = new Float32Array(this.n * 3)
    this.pos = new Float32Array(this.n * 3)

    const analysis = analyzeMarkers(labels, derived)
    this.shown = analysis.shown
    this.links = analysis.links
    this.colors = analysis.colors
    this.groups = analysis.groups

    this.measure()
    this.follow = this.pathSize > 2.5 * this.subjectSize
    this.buildMeshes()
    this.frame = 0
    this.applyFraming()
    this.showFrame(0, true)
    this.renderer.domElement.setAttribute(
      'aria-label',
      `Vista 3D de ${this.shown.length} marcadores y ${this.frameCount} fotogramas`
    )
    return { shown: this.shown.length, links: this.links.length, groups: this.groups, follow: this.follow }
  }

  clear() {
    this.pause()
    for (const obj of [this.markerMesh, this.boneMesh, this.trailLines, this.grid]) {
      if (!obj) continue
      this.scene.remove(obj)
      obj.geometry?.dispose()
      obj.material?.dispose?.()
    }
    this.markerMesh = this.boneMesh = this.trailLines = this.grid = null
    this.trailBufs = null
    this.c3d = null
    this.shownFrame = -1
    this.dirty = true
  }

  // Convierte un fotograma a metros y al sistema de Three.js (Y hacia arriba).
  poseAt(i, out) {
    this.c3d.getFrame(i, this.raw)
    const raw = this.raw
    const s = this.unit
    const zUp = this.upAxis === 'z'
    for (const p of this.shown) {
      const o = p * 3
      const x = raw[o] * s
      const y = raw[o + 1] * s
      const z = raw[o + 2] * s
      if (zUp) {
        out[o] = x
        out[o + 1] = z
        out[o + 2] = -y
      } else {
        out[o] = x
        out[o + 1] = y
        out[o + 2] = z
      }
    }
  }

  // Mide el tamaño del sujeto y el recorrido con unos 40 fotogramas repartidos por el archivo.
  measure() {
    const samples = Math.min(40, this.frameCount)
    const min = new THREE.Vector3(Infinity, Infinity, Infinity)
    const max = new THREE.Vector3(-Infinity, -Infinity, -Infinity)
    const diagonals = []
    const buf = new Float32Array(this.n * 3)
    for (let k = 0; k < samples; k++) {
      this.poseAt(Math.floor((k * (this.frameCount - 1)) / Math.max(1, samples - 1)), buf)
      const fmin = new THREE.Vector3(Infinity, Infinity, Infinity)
      const fmax = new THREE.Vector3(-Infinity, -Infinity, -Infinity)
      let valid = 0
      for (const p of this.shown) {
        const o = p * 3
        if (Number.isNaN(buf[o])) continue
        valid++
        fmin.min(this.tmpA.set(buf[o], buf[o + 1], buf[o + 2]))
        fmax.max(this.tmpA)
      }
      if (!valid) continue
      diagonals.push(fmin.distanceTo(fmax))
      min.min(fmin)
      max.max(fmax)
    }
    if (!diagonals.length) {
      min.set(-1, 0, -1)
      max.set(1, 1.8, 1)
      diagonals.push(2)
    }
    diagonals.sort((a, b) => a - b)
    this.subjectSize = Math.max(diagonals[Math.floor(diagonals.length / 2)], 0.05)
    this.pathSize = min.distanceTo(max)
    this.center = min.clone().add(max).multiplyScalar(0.5)
    this.floorY = min.y > -0.3 && min.y < 0.3 ? 0 : min.y - 0.02 * this.subjectSize
    this.markerRadius = Math.min(Math.max(this.subjectSize * 0.013, 0.002), 0.04)
  }

  buildMeshes() {
    for (const obj of [this.markerMesh, this.boneMesh]) {
      if (!obj) continue
      this.scene.remove(obj)
      obj.geometry.dispose()
      obj.material.dispose()
    }
    const count = Math.max(this.shown.length, 1)
    this.markerMesh = new THREE.InstancedMesh(
      new THREE.SphereGeometry(1, 12, 8),
      new THREE.MeshLambertMaterial({ color: 0xffffff }),
      count
    )
    const color = new THREE.Color()
    this.shown.forEach((p, k) => this.markerMesh.setColorAt(k, color.set(this.colors[p])))
    if (this.markerMesh.instanceColor) this.markerMesh.instanceColor.needsUpdate = true
    this.markerMesh.frustumCulled = false
    this.scene.add(this.markerMesh)

    this.boneMesh = new THREE.InstancedMesh(
      new THREE.CylinderGeometry(1, 1, 1, 8, 1),
      new THREE.MeshLambertMaterial({ color: 0x8ea3c7 }),
      Math.max(this.links.length, 1)
    )
    this.boneMesh.frustumCulled = false
    this.boneMesh.count = this.links.length // sin huesos, no se dibuja ninguno
    this.markerMesh.count = this.shown.length
    this.scene.add(this.boneMesh)
    this.buildTrails()
  }

  buildTrails() {
    if (this.trailLines) {
      this.scene.remove(this.trailLines)
      this.trailLines.geometry.dispose()
      this.trailLines.material.dispose()
      this.trailLines = null
    }
    const T = this.trailLength
    if (!T || !this.c3d) return
    const geometry = new THREE.BufferGeometry()
    const size = this.shown.length * T * 2 * 3
    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(size), 3))
    geometry.setAttribute('color', new THREE.BufferAttribute(new Float32Array(size), 3))
    this.trailLines = new THREE.LineSegments(geometry, new THREE.LineBasicMaterial({ vertexColors: true }))
    this.trailLines.frustumCulled = false
    this.scene.add(this.trailLines)
    this.trailBufs = Array.from({ length: T + 1 }, () => new Float32Array(this.n * 3))
    this.trailColors = this.shown.map((p) => new THREE.Color(this.colors[p]))
  }

  // Cuadrícula y cámara según el tamaño del sujeto.
  applyFraming() {
    const size = this.subjectSize
    const step = NICE_STEPS.find((s) => s >= size / 8) ?? 2
    this.gridStep = step
    if (this.grid) {
      this.scene.remove(this.grid)
      this.grid.geometry.dispose()
      this.grid.material.dispose?.()
    }
    this.grid = buildGrid(step, 60, 0x5a70a8, 0x2b3d69)
    this.grid.position.y = this.floorY
    this.scene.add(this.grid)

    this.camera.near = size / 100
    this.camera.far = size * 400 + this.pathSize * 4
    this.camera.updateProjectionMatrix()

    const target = this.center.clone()
    if (this.follow) {
      const c = this.centroidAt(Math.floor(this.frame))
      if (c) {
        target.x = c.x
        target.z = c.z
      }
    }
    const distance = size * 1.25 + (this.follow ? 0 : this.pathSize * 0.3)
    const direction = new THREE.Vector3(0.9, 0.55, 1.3).normalize()
    this.controls.target.copy(target)
    this.camera.position.copy(target).addScaledVector(direction, distance)
    this.controls.minDistance = size * 0.15
    this.controls.maxDistance = distance * 12
    // La niebla difumina el borde lejano de la cuadrícula.
    this.scene.fog = new THREE.Fog(BACKGROUND, distance * 1.4, distance * 6 + size * 2)
    this.controls.update()
    this.snapGrid()
    this.dirty = true
  }

  centroidAt(i) {
    const buf = new Float32Array(this.n * 3)
    this.poseAt(i, buf)
    let sx = 0
    let sz = 0
    let cnt = 0
    for (const p of this.shown) {
      const o = p * 3
      if (Number.isNaN(buf[o])) continue
      sx += buf[o]
      sz += buf[o + 2]
      cnt++
    }
    return cnt ? { x: sx / cnt, z: sz / cnt } : null
  }

  snapGrid() {
    if (!this.grid) return
    const s = this.gridStep
    this.grid.position.x = Math.round(this.controls.target.x / s) * s
    this.grid.position.z = Math.round(this.controls.target.z / s) * s
  }

  // ---------------------------------------------------------- dibujo
  showFrame(i, snap = false) {
    if (!this.c3d) return
    i = Math.min(Math.max(i, 0), this.frameCount - 1)
    this.poseAt(i, this.pos)
    const pos = this.pos
    const dummy = this.dummy
    const r = this.markerRadius

    let sx = 0
    let sz = 0
    let cnt = 0
    this.shown.forEach((p, k) => {
      const o = p * 3
      if (Number.isNaN(pos[o])) {
        dummy.position.set(0, 0, 0)
        dummy.scale.setScalar(0)
      } else {
        dummy.position.set(pos[o], pos[o + 1], pos[o + 2])
        dummy.scale.setScalar(r)
        sx += pos[o]
        sz += pos[o + 2]
        cnt++
      }
      dummy.quaternion.identity()
      dummy.updateMatrix()
      this.markerMesh.setMatrixAt(k, dummy.matrix)
    })
    this.markerMesh.instanceMatrix.needsUpdate = true

    const boneR = r * 0.45
    this.links.forEach(([a, b], k) => {
      const oa = a * 3
      const ob = b * 3
      if (!this.showSkeleton || Number.isNaN(pos[oa]) || Number.isNaN(pos[ob])) {
        dummy.position.set(0, 0, 0)
        dummy.scale.setScalar(0)
        dummy.quaternion.identity()
      } else {
        this.tmpA.set(pos[oa], pos[oa + 1], pos[oa + 2])
        this.tmpB.set(pos[ob], pos[ob + 1], pos[ob + 2])
        const length = this.tmpA.distanceTo(this.tmpB)
        dummy.position.copy(this.tmpA).add(this.tmpB).multiplyScalar(0.5)
        dummy.quaternion.setFromUnitVectors(UP, this.tmpB.sub(this.tmpA).normalize())
        dummy.scale.set(boneR, Math.max(length, 1e-6), boneR)
      }
      dummy.updateMatrix()
      this.boneMesh.setMatrixAt(k, dummy.matrix)
    })
    this.boneMesh.instanceMatrix.needsUpdate = true

    if (this.trailLines) this.updateTrails(i)

    if (this.follow && cnt > 0) {
      const target = this.controls.target
      let dx = sx / cnt - target.x
      let dz = sz / cnt - target.z
      const k = snap || Math.hypot(dx, dz) > this.subjectSize * 1.5 ? 1 : 0.25
      dx *= k
      dz *= k
      target.x += dx
      target.z += dz
      this.camera.position.x += dx
      this.camera.position.z += dz
      this.snapGrid()
    }

    this.shownFrame = i
    this.dirty = true
    if (this.onFrame) this.onFrame(i)
  }

  updateTrails(i) {
    const T = this.trailLength
    const attr = this.trailLines.geometry.attributes
    const P = attr.position.array
    const C = attr.color.array
    const bufs = this.trailBufs
    const first = Math.max(0, i - T)
    const last = i
    const steps = last - first // segmentos por marcador
    for (let t = 0; t <= steps; t++) this.poseAt(first + t, bufs[t])
    let used = 0
    this.shown.forEach((p, k) => {
      const o = p * 3
      const base = this.trailColors[k]
      for (let t = 0; t < steps; t++) {
        const a = bufs[t]
        const b = bufs[t + 1]
        if (Number.isNaN(a[o]) || Number.isNaN(b[o])) continue
        const w = 0.2 + 0.8 * ((t + 1) / Math.max(steps, 1))
        const v = used * 6
        P[v] = a[o]
        P[v + 1] = a[o + 1]
        P[v + 2] = a[o + 2]
        P[v + 3] = b[o]
        P[v + 4] = b[o + 1]
        P[v + 5] = b[o + 2]
        C[v] = C[v + 3] = base.r * w
        C[v + 1] = C[v + 4] = base.g * w
        C[v + 2] = C[v + 5] = base.b * w
        used++
      }
    })
    attr.position.needsUpdate = true
    attr.color.needsUpdate = true
    this.trailLines.geometry.setDrawRange(0, used * 2)
  }

  tick = (time) => {
    const dt = this.lastTime ? Math.min((time - this.lastTime) / 1000, 0.1) : 0
    this.lastTime = time
    if (this.playing && this.c3d && this.frameCount > 1) {
      this.frame += dt * this.rate * this.speed
      if (this.frame >= this.frameCount) {
        if (this.loop) this.frame %= this.frameCount
        else {
          this.frame = this.frameCount - 1
          this.pause()
        }
      }
      const i = Math.floor(this.frame)
      if (i !== this.shownFrame) this.showFrame(i)
    }
    const moved = this.controls.update()
    if (this.dirty || moved) {
      this.renderer.render(this.scene, this.camera)
      this.dirty = false
    }
  }

  resize() {
    const w = Math.max(this.host.clientWidth, 1)
    const h = Math.max(this.host.clientHeight, 1)
    this.renderer.setSize(w, h, false)
    this.camera.aspect = w / h
    this.camera.updateProjectionMatrix()
    this.dirty = true
  }

  // ------------------------------------------------------------ control
  play() {
    if (!this.c3d) return
    if (this.frame >= this.frameCount - 1) this.frame = 0
    this.playing = true
    this.onPlayState?.(true)
  }

  pause() {
    if (!this.playing) return
    this.playing = false
    this.onPlayState?.(false)
  }

  toggle() {
    this.playing ? this.pause() : this.play()
  }

  stop() {
    this.pause()
    this.seek(0)
  }

  seek(i) {
    if (!this.c3d) return
    this.frame = Math.min(Math.max(i, 0), this.frameCount - 1)
    this.showFrame(Math.floor(this.frame), true)
  }

  step(delta) {
    this.pause()
    this.seek(Math.round(this.frame) + delta)
  }

  setSpeed(v) {
    this.speed = v
  }

  setTrail(length) {
    this.trailLength = length
    this.buildTrails()
    if (this.c3d) this.showFrame(Math.floor(this.frame), true)
  }

  setSkeleton(on) {
    this.showSkeleton = on
    if (this.c3d) this.showFrame(Math.floor(this.frame), true)
  }

  setFollow(on) {
    this.follow = on
    if (this.c3d) this.showFrame(Math.floor(this.frame), true)
  }

  setUpAxis(axis) {
    this.upAxis = axis
    if (!this.c3d) return
    this.measure()
    this.buildMeshes()
    this.applyFraming()
    this.showFrame(Math.floor(this.frame), true)
  }

  resetView() {
    if (!this.c3d) return
    this.applyFraming()
    this.showFrame(Math.floor(this.frame), true)
  }

  dispose() {
    this.renderer.setAnimationLoop(null)
    this.resizeObserver.disconnect()
    this.clear()
    this.controls.dispose()
    this.renderer.dispose()
    this.renderer.domElement.remove()
  }
}
