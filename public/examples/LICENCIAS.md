# Licencias de los ejemplos (`public/examples/`)

Estos archivos **sí** se publican con la web (van a git y a `dist/`), así que
solo se incluye material con permiso de redistribución.

## CMU Graphics Lab Motion Capture Database (mocap.cs.cmu.edu)

| Archivo local | Origen CMU | Uso |
|---|---|---|
| `baile.c3d` + `baile.mp4` | sujeto 05, toma 08 (`05_08.c3d`) | demo |
| `baile-2.c3d` + `baile-2.mp4` | sujeto 05, toma 02 (`05_02.c3d`) | demo |
| `baile-3.c3d` + `baile-3.mp4` | sujeto 05, toma 14 (`05_14.c3d`) | demo |
| `baloncesto.c3d` + `baloncesto.mp4` | sujeto 06, toma 07 (`06_07.c3d`) | demo |

La base de datos CMU permite el uso libre de estos datos con atribución al
«CMU Graphics Lab Motion Capture Database». Cada ejemplo muestra su crédito
en la interfaz (campo `credit` en `src/examples.js`). Los `.mp4` son
conversiones locales de los vídeos de la sesión para acompañar el 3D.

Miniaturas en `thumbs/*.jpg`: capturas propias del visor, sin restricción.

## Lo que NO se incluye (y por qué)

Las muestras de https://www.c3d.org/sampledata.html **no declaran licencia
de redistribución**, así que no van ni a git ni a la web. Se usan solo en
local, en `samples/` (ignorado por git), para `npm run inspect`:

- `Walk1.c3d`, `Sample_Jump2.c3d` (Motion Analysis Corporation)
- `pyCGM2 lower limb CGM24 Walking01.c3d` (Vicon / pyCGM2)
- `Facial-Sing.c3d`, `OptiTrack-IITSEC2007.c3d` (NaturalPoint / OptiTrack)
- `test1.c3d` (NexGen Ergonomics), `TableTennis.c3d`, `large01/02.c3d`, etc.

Si se quiere añadir un ejemplo nuevo a la demo, comprobar primero que su
licencia permite redistribuirlo y anotarlo en esta tabla.
