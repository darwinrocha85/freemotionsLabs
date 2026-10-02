// Archivos de ejemplo que se cargan con un clic. Fuente única: la galería y las miniaturas salen de aquí.
// Los archivos viven en public/examples/. Ver LICENCIAS.md en esa carpeta.
// Solo se incluyen archivos con licencia de redistribución clara (CMU).
// Las muestras de c3d.org se usan solo en local (carpeta samples/, fuera de git)
// porque no declaran licencia de redistribución.
export const EXAMPLES = [
  {
    id: 'baile',
    file: 'baile.c3d',
    video: 'baile.mp4', // opcional: vídeo de la sesión, sincronizado con el 3D
    videoOffset: 1.07, // s; calculado comparando el movimiento del vídeo con el de los marcadores
    title: 'Baile',
    text: 'Un salto de baile captado con 41 marcadores, junto a la cámara de la sesión.',
    credit: 'CMU Graphics Lab Motion Capture Database, sujeto 05 toma 08 (mocap.cs.cmu.edu)',
  },
  {
    id: 'baile-2',
    file: 'baile-2.c3d',
    video: 'baile-2.mp4',
    videoOffset: -0.67, // estimado comparando movimiento; puede haber un pequeño desfase
    title: 'Baile 2',
    text: 'Otra toma de la misma sesión de baile, con su cámara.',
    credit: 'CMU Graphics Lab Motion Capture Database, sujeto 05 toma 02 (mocap.cs.cmu.edu)',
  },
  {
    id: 'baile-3',
    file: 'baile-3.c3d',
    video: 'baile-3.mp4',
    videoOffset: -0.7, // estimado; puede haber un pequeño desfase
    title: 'Baile 3',
    text: 'Una tercera toma, con la bailarina caminando hacia la cámara.',
    credit: 'CMU Graphics Lab Motion Capture Database, sujeto 05 toma 14 (mocap.cs.cmu.edu)',
  },
  {
    id: 'baloncesto',
    file: 'baloncesto.c3d',
    video: 'baloncesto.mp4',
    videoOffset: -0.93, // estimado; puede haber un pequeño desfase
    title: 'Balón',
    text: 'Una persona botando un balón, con su cámara.',
    credit: 'CMU Graphics Lab Motion Capture Database, sujeto 06 toma 07 (mocap.cs.cmu.edu)',
  },
]
