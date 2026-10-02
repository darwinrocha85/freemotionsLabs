# freemotionsLabs — visor de archivos C3D en el navegador

> Documento de trabajo del proyecto. Se actualiza en cada fase. Creado 2026-09-30.
> Estado: **prototipo v1 funcionando** (lector C3D + visor 3D con reproducción). Ver sección 15.

## 1. En una frase

Un programa web, abierto y gratuito, que abre un archivo C3D (captura de movimiento) **directamente en el navegador**, sin instalar nada, sin servidor y sin que el archivo salga del equipo, y lo muestra en 3D con controles de reproducción.

## 2. Qué es y qué no es

**Es** un producto: una herramienta que alguien del área (biomecánica, deporte, ergonomía, animación) pueda usar hoy.

**No es** la presentación de una tesis. La tesis de grado (FREEMotionLibs, 2013) es el origen de la idea y se menciona en una línea; el proyecto se construye desde cero y se juzga por lo que hace, no por lo que fue.

**No reutiliza código antiguo**: el lector C3D original no se conserva. Se escribe de nuevo a partir de la especificación del formato.

## 3. Problema y usuario

- Muchos programas para ver y analizar C3D son propietarios, caros o exigen instalación.
- Quien solo quiere **mirar** un archivo (revisar una captura, comprobar que un archivo no está corrupto, enseñar un movimiento) no debería necesitar una licencia.
- Usuario objetivo: investigador, estudiante o técnico de laboratorio que recibe un `.c3d` y quiere verlo ya.

## 4. Alcance por versiones

### v1 — visor (lo mínimo que ya impresiona)
- Arrastrar y soltar un `.c3d` (o botón de selección).
- Lectura completa en el navegador, con barra de progreso.
- Vista 3D de los marcadores, con cámara orbital (rotar, acercar, desplazar).
- Reproducción: play, pausa, stop, control de velocidad, barra para saltar a un fotograma, contador de fotograma y tiempo.
- Panel de información del archivo: número de marcadores, fotogramas, frecuencia, unidades, nombres de marcadores.
- Mensajes de error claros si el archivo no es válido o usa algo no soportado.

### v2 — más lectura del archivo
- Datos analógicos (por ejemplo plataformas de fuerza) en gráficas simples.
- Selección de marcadores, ocultar/mostrar, rastro de trayectoria.
- Conexiones entre marcadores (segmentos) cuando el conjunto de marcadores es reconocible.
- Exportar a CSV lo que se está viendo.

### Fuera de alcance (por ahora)
- Cálculos biomecánicos (ángulos articulares, análisis de marcha, cinética).
- Archivos de morfología/parámetros de la tesis original.
- Cuentas de usuario, base de datos o cualquier servidor.

## 5. Arquitectura propuesta (a confirmar)

- **Todo en el cliente.** El archivo se lee con `File`/`ArrayBuffer`; nunca se sube.
- **Parser C3D puro**: un módulo sin dependencias del navegador, para poder probarlo con Node.
- **Lectura bajo demanda**: al abrir solo se leen cabecera y parámetros; cada fotograma se decodifica al mostrarlo. Un archivo de 100 MB abre en menos de medio segundo y no hace falta Web Worker.
- **Render 3D con Three.js** (WebGL).
- Stack: JavaScript + Vite 5 + Three.js (igual que el portafolio). Sin backend.
- Despliegue: Firebase Hosting (sitio propio, independiente del portafolio). Por decidir: proyecto propio o sitio adicional.

## 6. Formato C3D — notas de trabajo

> Escritas de memoria como punto de partida. **Verificar cada dato contra la especificación oficial del formato antes de codificar.**

Un C3D tiene tres bloques:
1. **Cabecera** (primer bloque de 512 bytes): puntero al inicio de los parámetros, número de puntos 3D, medidas analógicas por fotograma, primer y último fotograma, factor de escala, inicio de los datos, muestras analógicas por fotograma, frecuencia de video.
2. **Sección de parámetros**: grupos y parámetros con nombre (por ejemplo `POINT:LABELS`, `POINT:RATE`, `POINT:UNITS`, `POINT:SCALE`, `ANALOG:*`). Indica también el tipo de procesador, que decide el orden de bytes.
3. **Sección de datos**: por fotograma, los puntos (X, Y, Z y un valor de residuo/máscara) y luego las muestras analógicas.

Puntos delicados a comprobar contra la especificación:
- Orden de bytes según el tipo de procesador (Intel, DEC, SGI/MIPS). Los archivos más comunes son Intel, pero hay que soportar o rechazar los otros con un mensaje claro.
- El **signo del factor de escala** decide si los datos vienen como enteros escalados o como decimales.
- Valores inválidos/ocluidos (marcadores que no se vieron en un fotograma) y cómo se representan.
- Diferencias entre fabricantes (Vicon, Qualisys, Motion Analysis, etc.).

Otros puntos delicados que aparecen en las descripciones del banco de pruebas de c3d.org (sección 7.1; aún no comprobados abriendo los archivos):
- Algunos valores de cabecera y parámetros deben leerse **sin signo**. Un archivo de prueba tiene `POINT:DATA_START = 188`, que se rompe si se lee como entero de 8 bits con signo.
- `POINT:FRAMES` puede venir como entero o como decimal (necesario para más de 65 535 fotogramas).
- Las secciones (parámetros y datos) pueden estar en ubicaciones distintas de las habituales.
- Parámetros ausentes, corruptos, vacíos o que no coinciden con los datos reales (por ejemplo frecuencias declaradas distintas de las reales).
- Residuos en −1 en todos los puntos (datos inválidos).

## 7. Verificación — qué significa "terminado"

Decisión del 2026-09-30: **no se compara con otras librerías**. El objetivo es un visor que muestre el movimiento del archivo, y se comprueba por coherencia interna y a simple vista.

1. **Corpus de pruebas de c3d.org** (sección 7.1). Anotar en `samples/README` de dónde sale cada archivo y qué prueba.
2. **Coherencia interna** (`npm run inspect`): cada archivo abre sin errores, tiene puntos válidos y las distancias entre marcadores del mismo segmento rígido casi no cambian de un fotograma a otro. Si un dato se decodificara mal, saldría ruido.
3. **Paridad entre formatos**: los seis archivos idénticos de la muestra 01 (DEC, Intel, SGI; entero y decimal) deben dar exactamente la misma salida. Pendiente de descargar.
4. **Revisión visual**: una marcha se ve como una marcha (piernas alternando, pelvis avanzando). Se revisa con capturas del visor.
5. **Casos malos**: archivos que no son C3D, truncados, sin puntos o sin grupos opcionales muestran un mensaje claro y nunca cuelgan el visor.
6. Registrar qué archivos **no** se pudieron leer y por qué. Un límite documentado suma credibilidad.

### 7.1 Corpus de pruebas — https://www.c3d.org/sampledata.html

La página ofrece archivos `SampleNN.zip` pensados para probar la compatibilidad de software (`https://www.c3d.org/data/SampleNN.zip`). Lo que sigue sale de las descripciones de la página; **hay que abrir los archivos para confirmarlo**.

**Prueba de fuego del lector**

| Muestra | Qué contiene | Qué prueba |
|---|---|---|
| 01 | Seis archivos idénticos en DEC, Intel y SGI/MIPS, en decimal y en entero | Los seis deben dar **exactamente la misma salida**: orden de bytes y formato de datos |
| 02 | Seis archivos idénticos (Intel, SGI, DEC) de hardware Vicon 370, con eventos en cabecera | Lo mismo, con eventos |
| 00 | Implementaciones actuales de 7 fabricantes (ART, Codamotion, Cometa, Innovative Sports Training, Motion Analysis, NextGen Ergonomics, Vicon) | Compatibilidad con archivos modernos reales |
| 03 | Marcha humana Vicon 370: `gait-raw` (DEC, entero), `gait-pig` (DEC, entero, con eventos, cinemática y cinética) y `gait-pig-nz` (el `readme` dice DEC decimal, pero su cabecera declara Intel; se lee según la cabecera; con eventos y tiempo de inicio distinto de cero) | Caso de uso principal y **formato DEC** (`gait-raw` y `gait-pig` son DEC entero; el decimal DEC usa formato VAX, aún sin archivo de prueba) |
| 26 | Marcha Qualisys, decimal PC | Otro fabricante |
| 08 | Secciones en distinta ubicación | Robustez ante estructura no habitual |
| 33 | `DATA_START = 188` | Lectura sin signo |
| 19 | Requiere leer la cabecera sin signo | Igual |
| 36 | 18 124, 36 220 y 72 610 fotogramas | `POINT:FRAMES` entero o decimal |
| 31 | `large01.c3d` (102 MB) y `large02.c3d` (112 MB), más de 65 535 fotogramas de puntos | Archivos largos: exigen el número de fotogramas por parámetro, no por cabecera |

**Casos malos** (deben leerse con tolerancia o fallar con un mensaje claro, nunca colgarse): 16 (residuos en −1), 18 (parámetros corruptos), 20 (sin parámetros descriptivos), 21 (datos que no coinciden con los parámetros), 24 (etiquetas vacías), 15 (falta `ANALOG:FORCE_PLATFORM`), 06 y 13 (errores de parámetros), 29 (pequeños errores de formato, NaturalPoint).

**Rendimiento**: 12 (364 marcadores, 18 178 fotogramas, más de 100 MB).

**Para v2 (analógicos y fuerza)**: 05, 07, 10, 17, 27, 28, 30, 35. **Otros**: 22 (2D, exoesqueleto), 34 (IMU Xsens), 37 (ART).

**Licencia — importante**: la página **no indica licencia ni condiciones de redistribución** para casi ninguno de estos archivos (solo la base HDM05, enlazada aparte, declara una licencia Creative Commons «para fines de investigación»). Por tanto:
- Los archivos se usan **solo en local para pruebas**, en `samples/` y **fuera de git** (`.gitignore`).
- La demo pública **no los incluye**: el usuario arrastra su propio archivo, y se enlaza a c3d.org para descargar ejemplos.
- Opcional: pedir permiso por escrito a los responsables de c3d.org para incluir uno o dos archivos en la demo.
- HDM05: revisar la licencia exacta antes de plantearse usarlo; «fines de investigación» puede no cubrir un portafolio.

### 7.2 Estado del corpus local (2026-09-30)

Carpeta `samples/` (fuera de git). Según los `readme` que acompañan a los archivos:

**Ya descargado**
- Muestra 00: carpetas de ART, Codamotion, Cometa, Innovative Sports Training, Motion Analysis, NexGen Ergonomics y Vicon. El `readme` dice que los fabricantes los enviaron a C3D.ORG en 2019 para demostrar su implementación; no menciona licencia.
- Muestra 03: `gait-raw`, `gait-pig`, `gait-pig-nz` (Vicon 370, formato DEC). Nota del `readme`: `FORCE_PLATFORM:ORIGIN` viene con el origen en valor positivo.
- Muestra 29 (NaturalPoint): `Facial-Sing.c3d`, `OptiTrack-IITSEC2007.c3d`. Sin datos analógicos y **sin los grupos `ANALOG` ni `FORCE_PLATFORM`**: el lector debe tolerar esos grupos ausentes.
- `128analogchannels.c3d` (por el nombre, probablemente la muestra 17: 14 plataformas de fuerza y 128 canales analógicos; sin confirmar).
- Muestra 31: `large01.c3d` y `large02.c3d`.

**Falta (son las más valiosas para verificar el lector)**
- **01** (seis archivos idénticos en DEC/Intel/SGI, decimal y entero): la prueba de paridad.
- **08** (secciones en otra ubicación), **33** (`DATA_START = 188`), **36** (`POINT:FRAMES` entero o decimal), **19** (cabecera sin signo), **26** (Qualisys), **02**.
- Los casos malos (16, 18, 20, 21, 24, 15) cuando se llegue a la fase de robustez.

## 8. Uso de la IA y reglas de trabajo

- La IA propone código y tests; **yo decido qué entra y lo verifico**.
- Ningún dato del formato se da por bueno hasta contrastarlo con la especificación o con archivos reales.
- Si un arreglo empeora el resultado, se revierte y se anota (como en Merlin).
- Llevar un registro breve de decisiones (sección 13) y de qué hizo cada parte, sin exagerar.
- **Nunca se usan datos de pacientes** ni archivos sin licencia clara. Los 50 casos de la tesis original no se publican.

## 9. Backlog heredado del feedback de 2012

Un investigador del laboratorio LMAM (EPFL) probó la versión de la tesis y dejó estas observaciones. Son la primera lista de mejoras de v1:

- [x] La carga tardaba demasiado y no informaba de lo que ocurría → barra de progreso al leer el archivo y mensajes de estado. Abrir es casi instantáneo (lectura bajo demanda).
- [ ] En Firefox algunos marcadores quedaban tapados por cuadrados → los marcadores ahora son esferas de Three.js; **pendiente de probar en Firefox, Safari y Edge** (solo se ha probado en Chromium).
- [x] Faltaba una barra de control (play, pausa, stop) → hecha: reproducir/pausar, volver al inicio, barra de fotogramas, velocidad, rastro, esqueleto, seguir al sujeto, eje vertical y restablecer vista.

Además, la propia tesis recomendaba quitar carga al servidor y pasarla al cliente con JavaScript y WebGL. Este proyecto lo hace.

## 10. Fases y criterio de salida

| Fase | Trabajo | Sale cuando |
|---|---|---|
| F0 | Carpeta, repo, herramientas, corpus descargado en `samples/` (sin versionar), script de referencia | Están las muestras base (01, 03, 08, 26, 33, 36) y su JSON de referencia |
| F1 | Parser C3D + tests contra la referencia | Coinciden todos los archivos de muestra dentro de la tolerancia documentada |
| F2 | Visor 3D: marcadores, cámara, reproducción, panel de información | Se abre un archivo de muestra y se reproduce fluido |
| F3 | Pulido: progreso, errores, arrastrar y soltar, navegadores, accesibilidad, rendimiento | Pasa la lista de navegadores y los casos malos |
| F4 | Publicación y ficha en el portafolio | Demo en línea + ficha con métricas reales |

## 11. Integración con el portafolio

Se sumará como uno de los proyectos de la sección **Laboratorio** de `darwin-rocha-portfolio` (que reemplaza a *IA Solutions*).

- Contenido en `src/data/content.js` (única fuente); si se añaden campos, actualizar también `scripts/generate-agent-context.mjs` para que el asistente los conozca.
- Ficha con interruptor RRHH / técnico, tabla «Mis decisiones» y «Quién hizo qué», igual que Merlin.
- Enlace directo tipo `?tab=lab-c3d` y post de LinkedIn corto, según la regla de `AGENTS.md`.
- Solo cifras que se hayan medido (tiempo de lectura, tamaño de archivo, error máximo frente a la referencia). Nada inventado.
- Según `ROADMAP.md`, no tocar el portafolio hasta tener un issue explícito.

## 12. Riesgos y cuidados

- **Errores silenciosos del parser**: un dato mal interpretado se ve "casi bien". Por eso se comprueba la coherencia interna y la paridad entre formatos.
- **Variedad de archivos reales**: cada fabricante escribe C3D a su manera. Empezar con lo común y documentar lo no soportado.
- **Archivos grandes**: medir memoria y tiempo; el Web Worker y la lectura por partes se añaden si hace falta.
- **Licencias** de archivos de muestra y de cualquier librería usada.
- **Alcance**: la tentación es sumar cálculos biomecánicos. Se dejan para después de una v1 sólida.
- **Superlativos**: no decir «pionero» ni similares; contar solo lo comprobable.

## 13. Registro de decisiones

| Fecha | Decisión | Motivo |
|---|---|---|
| 2026-09-30 | Es un producto, no la presentación de una tesis | Objetivo: que el CV destaque por lo que se puede usar |
| 2026-09-30 | Se escribe desde cero (no hay lector C3D previo) | El código original no se conserva |
| 2026-09-30 | 100 % en el navegador, sin servidor | Privacidad, coste cero y cumple la recomendación de la tesis |
| 2026-09-30 | Verificar contra una librería de referencia | Misma disciplina que Merlin |
| 2026-09-30 | Sin datos de pacientes | Privacidad y licencias |
| 2026-09-30 | Usar el corpus de c3d.org para probar el lector | Incluye casos límite y malos que cubren justo los riesgos del formato |
| 2026-09-30 | No redistribuir las muestras (ni en git ni en la demo) | La página no declara licencia de redistribución |
| 2026-09-30 | No comparar con otras librerías (ezc3d/BTK) | Decisión del dueño: el objetivo es ver el movimiento; se verifica por coherencia interna, paridad entre formatos y revisión visual |
| 2026-09-30 | JavaScript en vez de TypeScript | Coherente con el resto de proyectos y con menos herramientas que mantener |
| 2026-09-30 | Lectura bajo demanda, sin Web Worker | Los fotogramas se decodifican al mostrarlos; abrir 100 MB tarda menos de medio segundo |

## 14. Preguntas abiertas

- ¿Nombre final del producto y del dominio? (`freemotionsLabs` es provisional).
- ¿Repositorio público desde el inicio o privado hasta tener v1?
- ¿Qué licencia tendrá el proyecto (MIT u otra)?
- ¿Sitio propio en Firebase o dentro del proyecto del portafolio?
- ¿Se pide permiso a los responsables de c3d.org para incluir uno o dos archivos de ejemplo en la demo? Mientras no haya respuesta, la demo no los incluye.
- Las muestras 31 (`large01/02`) pesan 102 y 112 MB: ¿la demo las admite (con Web Worker y progreso) o se fija un límite de tamaño con un mensaje claro?
- Conexión con la tesis de máster (reconocimiento de emociones): ¿proyecto aparte dentro del Laboratorio o parte de este mismo?

## 15. Estado (2026-09-30)

**Hecho — prototipo v1 en `freemotions-labs/`**
- Lector C3D (`src/c3d/parser.js`): Intel, DEC (incluidos los decimales VAX de cabecera y parámetros) y SGI/MIPS; datos enteros y decimales; número de fotogramas por parámetro (más de 65 535); tolera grupos ausentes; residuos inválidos; puntos calculados (ángulos, fuerzas) se separan de los marcadores.
- Visor 3D (`src/viewer/`): marcadores, huesos para Plug-in Gait y Motion Analysis, cuadrícula de suelo, cámara orbital, reproducción, rastro, seguir al sujeto, eje vertical Z/Y.
- Interfaz en español: arrastrar y soltar, progreso de lectura, panel de información con avisos, mensajes de error claros.

**Pruebas realizadas** (en un Chromium sin GPU real, con render por software; no en otros navegadores)
- `npm run inspect` sobre las 20 muestras descargadas: 20 abren sin fallos inesperados. Las distancias entre marcadores del mismo segmento rígido se mantienen estables (por ejemplo LPSI–RPSI varía un 0,08 % en las muestras largas), y los archivos DEC (`gait-raw`, `gait-pig`) se leen igual de bien.
- `large01` (102 MB, 73 285 fotogramas) y `large02` (112 MB, 72 610): abren en menos de 0,5 s y se puede saltar a la mitad del archivo.
- Revisión visual: se reconocen marchas con esqueleto en `gait-raw`, `gait-pig`, `Walk1`, `large01`; dos jugadores y una mesa en `TableTennis`.
- Casos malos (archivo aleatorio, archivo de texto, archivo truncado, solo analógicos): mensaje claro, sin fallos.

**Pendiente**
- Descargar y probar las muestras 01 (paridad entre formatos), 08, 33, 36, 19 y 26; y algún archivo con decimales DEC (VAX), que aún no tenemos.
- Probar en navegadores reales (Chrome, Firefox, Safari, Edge) y con GPU.
- Esqueleto para más conjuntos de marcadores (Codamotion, OptiTrack, ART); hoy esos archivos se ven como puntos.
- Datos analógicos y plataformas de fuerza (v2).
- Publicar la demo y crear la ficha en la sección Laboratorio del portafolio (con solo cifras medidas).
