# ks-almenar

Automatizaciones y portal familiar para los correos del Colegio Almenar.

## Contenido

| Ruta | Qué es |
| --- | --- |
| [`docs/`](./docs) | Portal de agenda, recordatorios y evaluaciones (GitHub Pages) |
| [`n8n/`](./n8n) | Workflow que revisa Gmail una vez al día, envía un resumen y deja constancia de la corrida |
| [`BUENAS-PRACTICAS-PORTAL.md`](./BUENAS-PRACTICAS-PORTAL.md) | Criterios de diseño y mantención del portal |

## Publicar el portal

El despliegue lo hace GitHub Actions: [`.github/workflows/pages.yml`](./.github/workflows/pages.yml).

Cada push a `main` que toque `docs/` —incluidos los commits que hace n8n en su
corrida diaria— dispara dos jobs:

1. **Verificar los datos del portal.** Chequea la sintaxis de `data.js`, `auto.js`
   y `app.js`, y valida el contenido: cursos conocidos, fechas que existen de
   verdad, prioridades y estados dentro de los valores permitidos, ids de
   recordatorio sin repetir. Si algo falla, **no se publica**.
2. **Publicar en GitHub Pages.** Empaqueta `docs/` y despliega.

En los pull requests corre solo el primer job, así un dato malo se ve antes de
mergear.

El sitio queda en `https://keepsync-hub.github.io/ks-almenar/`.

> El workflow usa `actions/configure-pages` con `enablement: true`, así que
> habilita Pages solo en la primera corrida. Si la organización no permite que
> Actions lo habilite, hay que ir una vez a **Settings → Pages** y elegir
> **Source: GitHub Actions** (no "Deploy from a branch").

### Por qué hay una verificación antes de publicar

`docs/auto.js` y `docs/estado.js` los escribe n8n sin que nadie los revise. Sin
este control, una corrida que produjera algo malformado rompería el portal para
todos los apoderados hasta que alguien lo notara. El job lo detiene antes.

## Cómo saber si la revisión automática sigue viva

n8n reescribe `docs/estado.js` en **cada** corrida, también los días sin correos,
y la cabecera del portal lo muestra. Si pasan más de 30 horas sin corrida, la
placa se pone en rojo con **"Sin revisar desde el …"**. Esa es la única señal de
que el workflow se cayó: `auto.js` no sirve para eso, porque en un día tranquilo
tampoco cambia.

## Actualizar la agenda

Se edita solo [`docs/data.js`](./docs/data.js). No hay build ni dependencias:
los cambios quedan publicados apenas se hace push.
