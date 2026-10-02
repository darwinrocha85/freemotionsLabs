# Research & IA Solutions — sección del portafolio

> Documento de trabajo para reemplazar la sección *IA Solutions* de `darwin-rocha-portfolio`.
> Estado: propuesta (2026-09-30). **No tocar el portafolio hasta tener un issue explícito** (regla de `ROADMAP.md`).
> Texto pensado para copiarse a `src/data/content.js` (única fuente). Español por defecto; versión en inglés al final.

---

## 1. La idea en una frase

**No vendo un producto: enseño cómo llevo a la IA a resolver problemas que no son un CRUD de cliente.**

Todo el mundo sabe que la IA ayuda a programar. Lo que casi nadie puede demostrar es lo que hay *alrededor*: elegir el problema, decidir qué significa «está bien», detectar cuándo la IA se equivoca y no dejar pasar nada sin comprobarlo. Esa es la parte que se enseña aquí, con casos reales que se pueden abrir y probar.

**Lo que esta sección debe conseguir en 30 segundos:** que quien la vea piense «este perfil no usa la IA para escribir endpoints más rápido; sabe dirigirla hacia problemas difíciles y comprobar el resultado».

## 2. Qué no es

- No es una galería de demos con IA generativa ni un chatbot más.
- No es «hice X en Y horas con IA» sin nada que lo respalde.
- No son casos de negocio con datos de clientes (eso ya está en el resto del portafolio).
- No presume de cifras que no se hayan medido.

## 3. Descripción para la web

### Título de la sección
**Research & IA Solutions**

### Subtítulo (una línea)
Problemas fuera del CRUD, resueltos con IA dirigida y comprobados con datos reales.

### Texto introductorio (≈ 60 palabras)
> Aquí no hay demos de «mira qué hace la IA». Hay tres problemas difíciles —leer un formato binario de captura de movimiento, reconocer emociones en vídeo, reconstruir el código de un videojuego— y cómo los abordé guiando a la IA: qué decidí yo, qué propuso ella, cómo comprobé cada resultado y qué salió mal por el camino.

### Interruptor RRHH / técnico
Igual que en Merlin, cada ficha tiene dos lecturas:
- **RRHH:** qué problema era, qué se puede ver/tocar en dos minutos, qué demuestra de mí.
- **Técnico:** decisiones, formato de los datos, cómo se verificó, errores encontrados, límites.

## 4. Los tres casos

Cada ficha sigue la misma plantilla: **problema → qué es difícil → qué guié yo → cómo lo comprobé → qué falló → lo que se puede probar**.

### Caso 1 — freemotionsLabs: visor de captura de movimiento (C3D) en el navegador
*Estado: prototipo funcionando; pendiente publicar.*

- **Problema.** El C3D es el formato estándar de la captura de movimiento (laboratorios de biomecánica, cine, deporte). Es binario, con más de un orden de bytes y variantes antiguas. Mi tesis de grado (2013) ya era un visor de estos archivos; el código no se conserva. Ahora se rehace desde cero como **producto**, no como tesis.
- **Por qué no es un CRUD.** Hay que interpretar un formato de finales de los años 80 con tres arquitecturas de procesador (Intel, DEC/VAX, SGI/MIPS), números decimales en formato VAX, archivos de más de 100 MB y datos que pueden venir corruptos o incompletos.
- **Lo que decidí yo (no la IA):**
  - que fuera un producto que se pueda usar, no la presentación de una tesis;
  - que todo ocurra en el navegador y el archivo no salga del equipo (privacidad y coste cero);
  - que **no se compare con otras librerías**: el objetivo es que se vea la acción que hay en el archivo, y se verifica con coherencia interna y revisión visual;
  - que un visitante sin archivos propios vea el resultado en el primer segundo (galería de ejemplos con vídeo de la cámara);
  - qué archivos entran o no según su licencia.
- **Lo que hizo la IA:** el lector del formato, el visor 3D, las iteraciones visuales, los scripts de comprobación y la documentación, siempre con revisión mía.
- **Cómo se comprobó (todo medido, sin otra librería):**
  - `npm run inspect` sobre 20 archivos de muestra: abren los 20 sin fallos inesperados;
  - los marcadores de un mismo segmento rígido mantienen su distancia (p. ej. `LPSI–RPSI` varía un 0,08 % en las muestras largas): si el lector leyera mal, ese número se dispararía;
  - archivos de 102 y 113 MB con más de 70 000 fotogramas: abren en menos de 0,5 s y se puede saltar a mitad de archivo (lectura bajo demanda, sin Web Worker);
  - casos malos —archivo aleatorio, texto, truncado, solo analógicos— dan un mensaje claro y no se rompen;
  - revisión visual: se reconocen marchas, un salto, dos jugadores, una bailarina.
- **Qué falló por el camino (material para la ficha técnica):**
  - un archivo que el propio léame decía que era DEC resultó ser Intel; se corrigió la documentación, no el dato;
  - la cuadrícula del suelo desaparecía en el render por software: las líneas largas se descartaban; se rehízo con segmentos cortos;
  - un cilindro gigante aparecía en archivos sin esqueleto (una instancia sin transformar); se limitó el número de huesos dibujados;
  - los archivos de la CMU traen 331 puntos y solo 41 son marcadores reales: se añadió un conjunto que oculta el resto.
- **Lo que se puede probar:** la demo en línea (pendiente de publicar) con 7 ejemplos y la opción de abrir un archivo propio.
- **Límites reconocidos:** probado en Chromium sin GPU real; falta Firefox, Safari y Edge; los datos analógicos y plataformas de fuerza aún no se muestran; el sincronizado del vídeo con el 3D es aproximado en algunos ejemplos.

**Quién hizo qué (para la ficha):**

| Yo | La IA |
|---|---|
| Definir el producto y el público (RRHH que no sabe qué es un C3D) | Escribir el lector y el visor |
| Decidir qué es «correcto» y cómo comprobarlo | Proponer scripts de comprobación y ejecutarlos |
| Elegir los ejemplos y descartar los que no impresionaban | Renderizar candidatos y montar la galería |
| Aceptar o rechazar cada cambio; llevar el registro de decisiones | Iterar con los fallos que aparecían |
| Cuidar licencias y privacidad | Señalar el riesgo cuando lo veía y documentarlo |

### Caso 2 — Reconocimiento de emociones en vídeo (tesis de máster)
*Estado: pendiente de material (falta el PDF de la tesis). Ficha por escribir.*

- **Problema.** Algoritmo que reconoce emociones a partir de vídeo.
- **Cómo se enfoca aquí (no repetir la tesis, sino un producto verificable):**
  - demostración **en el dispositivo**, sin subir vídeo a ningún servidor;
  - consentimiento explícito antes de usar la cámara;
  - lenguaje prudente: no se «lee» a nadie; se muestran expresiones con su incertidumbre.
- **Cuidado legal y ético:** el reglamento europeo de IA restringe el reconocimiento de emociones en el trabajo y la educación. La ficha debe explicar por qué esta demo es legítima (uso voluntario y personal, sin evaluar a terceros) y qué usos no se defienden.
- **Por completar:** qué dice la tesis, qué modelo/datos usó, qué resultados se pueden citar tal cual.

### Caso 3 — Merlin (descompilación de Homeworld 2)
*Estado: hecho; ficha ya existente en el portafolio.*

- Sirve de **precedente del método**: verificar contra una referencia, revertir arreglos que empeoran el resultado y anotarlo.
- **Por completar:** enlazar la ficha existente y resumir en 3 líneas qué aportó al método (sin repetir toda la ficha).

## 5. Cómo trabajo con IA (el hilo común)

Estos cinco principios aparecen en las tres fichas y se apoyan en ejemplos reales:

1. **Primero defino qué significa «bien».** Antes de pedir código: qué archivo debe abrir, qué medida debe cumplirse. *Ejemplo:* la distancia entre marcadores rígidos casi no varía; si varía, el lector está mal.
2. **La IA propone, yo decido.** Todo cambio pasa por mí. *Ejemplo:* descarté ergonomía y una cara cantando de la galería porque no impresionaban; elegí el baile porque el vídeo y el 3D juntos se entienden sin explicación.
3. **Nada se da por bueno sin un dato real.** Ni el formato ni el léame ni lo que dice la IA. *Ejemplo:* el archivo «DEC» que en realidad era Intel.
4. **Si un arreglo empeora, se revierte y se anota.** El error se documenta, no se esconde.
5. **Pienso en quien lo va a ver.** Un producto que solo entiende un especialista no sirve para un portafolio. *Ejemplo:* la galería de ejemplos nace de que RRHH no sabe qué es un C3D ni tendrá uno.

## 6. Fases

| Fase | Trabajo | Sale cuando | Estado |
|---|---|---|---|
| **F0** | Elegir los casos y definir el mensaje (esta página) | Hay documento aprobado por mí | En curso |
| **F1** | Caso 1: lector y visor C3D | 20 muestras abren; marcas de coherencia estables; casos malos controlados | Hecho (prototipo) |
| **F2** | Caso 1: galería de ejemplos con vídeo para quien no tiene archivos | Se ve movimiento al abrir la página, sin hacer nada | Hecho (7 ejemplos) |
| **F3** | Caso 1: pulido y publicación | Probado en Chrome/Firefox/Safari/Edge y móvil; licencias de ejemplos resueltas; demo en línea | Pendiente |
| **F4** | Caso 1: ficha del portafolio (RRHH / técnico, «Mis decisiones», «Quién hizo qué») | Ficha con solo cifras medidas y enlace directo (`?tab=lab-c3d`) | Pendiente |
| **F5** | Caso 2: leer la tesis, decidir el alcance de la demo y sus límites legales | Documento de alcance aprobado | Pendiente (falta el PDF) |
| **F6** | Caso 2: prototipo en el dispositivo + ficha | Demo funciona sin subir vídeo; ficha con consentimiento y límites | Pendiente |
| **F7** | Caso 3: enlazar la ficha de Merlin dentro de la sección | Aparece con 3 líneas de contexto | Pendiente |
| **F8** | Integrar la sección en el portafolio (reemplaza *IA Solutions*) | Issue abierto; contenido en `content.js`; contexto del asistente regenerado; publicación y post de LinkedIn | Pendiente (necesita issue) |

Regla de salida general: **cada fase termina con algo que se puede abrir o comprobar**, no con «hecho».

## 7. Cifras que debo aportar yo

No las invento; solo las mías o las medidas del proyecto.

- [ ] Tiempo que tardó la tesis original de 2013 (dijiste «varios meses»): ¿cuántos y con qué dedicación?
- [ ] Tiempo real de esta versión (desde el primer commit hasta el prototipo) — medirlo con el historial de git, no de memoria.
- [ ] Qué parte del código revisé línea a línea y cuál solo con pruebas (para «Quién hizo qué» sin exagerar).
- [ ] Resultados de la tesis de máster que se puedan citar tal cual.
- [ ] Para Merlin: los datos que ya tienes en su ficha.

> Ojo con la comparación «antes: meses / ahora: X». Solo se pone si las dos cifras están medidas; si no, se dice lo que se sabe («entonces me llevó varios meses») sin fingir precisión.

## 8. Riesgos

| Riesgo | Cómo se controla |
|---|---|
| Que suene a «hice X con IA» sin sustancia | Cada afirmación lleva su comprobación medible o su fallo documentado |
| Licencia de los ejemplos (c3d.org no declara licencia; la CMU sí, con reconocimiento) | Antes de publicar: pedir permiso a c3d.org o sustituir sus archivos por datos de la CMU |
| Emociones en vídeo: regulación y percepción | Uso voluntario, en el dispositivo, sin evaluar a terceros; explicarlo en la ficha |
| Sobreprometer lo probado | Sección «Límites» visible en cada ficha (p. ej. navegadores sin probar) |
| Dispersión: demasiados proyectos | Máximo tres casos, cada uno con un mensaje distinto (formato binario / IA con límites éticos / verificación contra referencia) |

## 9. Pendientes para arrancar

1. Aprobar este documento (o decir qué cambiar).
2. Pasar el PDF de la tesis de máster (Caso 2).
3. Decidir la licencia de los ejemplos y cerrar la F3 del caso 1.
4. Abrir el issue en el portafolio antes de tocar código (F8).

## 10. English version (short)

**Research & IA Solutions**
*Problems beyond CRUD, solved by steering AI and checked against real data.*

> Everyone knows AI helps you write code. Few people can show the part around it: picking a hard problem, defining what "correct" means, spotting when the AI is wrong, and verifying every result. Here are three real cases you can open and try — a binary motion-capture format reader that runs entirely in the browser, emotion recognition on-device, and a game decompilation — with what I decided, what the AI proposed, how I verified it, and what went wrong.
