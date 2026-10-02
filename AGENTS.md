# freemotions-labs — AGENTS.md

> Proyecto independiente: visor de archivos C3D (captura de movimiento) en el navegador.
> Abrir el editor con cwd en `freemotions-labs/`, nunca en `Projects/`.
> Stack: JavaScript + Vite 5 + Three.js. Sin backend: el archivo se lee en el cliente y nunca se sube.
> Documento de proyecto (alcance, fases, decisiones): `freemotionsLabs.md` — actualizarlo al cerrar cada fase.

## Cómo correr
- `npm.cmd install` + `npm.cmd run dev` → `http://localhost:5180` (puerto propio con `strictPort`).
- `npm.cmd run build` → `dist/`. `npm.cmd run preview` para probar lo compilado.
- `npm.cmd run inspect` → lee `samples/` y por cada `.c3d` muestra formato, puntos, fotogramas, avisos y
  comprobaciones de coherencia (validez de puntos, rigidez de segmentos). Acepta otra carpeta: `node scripts/inspect.mjs <carpeta>`.

## Estructura
- `src/c3d/parser.js` — lector puro (sin DOM). Al abrir solo lee cabecera y parámetros; `getFrame(i, out)`
  decodifica cada fotograma bajo demanda (por eso un archivo de 100 MB abre al instante).
- `src/viewer/viewer.js` — escena Three.js: marcadores, huesos, rastro, cuadrícula, cámara, reproducción.
- `src/viewer/skeletons.js` — conjuntos de marcadores reconocidos (Plug-in Gait, Motion Analysis) para dibujar huesos.
- `src/examples.js` — lista de ejemplos (título, texto, crédito). Archivos en `public/examples/`, miniaturas en `public/examples/thumbs/`.
- `src/main.js` + `src/style.css` — interfaz (abrir/arrastrar, controles, panel de información).

## Reglas
- **`samples/` nunca va a git ni a la web**: los archivos de c3d.org no declaran licencia de redistribución.
- `public/examples/` (5 C3D + miniaturas) es la galería de la web y SÍ se publica: **antes de subirla al repo público hay que tener
  permiso de c3d.org o sustituir los archivos por otros con licencia clara** (p. ej. CMU Mocap). Lista en `src/examples.js`.
- El archivo del usuario **no sale del navegador**: nada de subidas ni analítica sobre su contenido.
- Sin comparar con otras librerías (decisión del dueño). Se verifica con `inspect`, paridad entre formatos
  (muestra 01 de c3d.org, cuando esté descargada) y revisión visual.
- Todo lo que venga del archivo (etiquetas, prefijos) se muestra con `textContent`, nunca con `innerHTML`.
- Textos de interfaz en español. Sin cifras inventadas en la ficha del portafolio: solo las medidas.
