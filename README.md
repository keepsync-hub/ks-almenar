# ks-almenar

Automatizaciones y portal familiar para los correos del Colegio Almenar.

## Contenido

| Ruta | Qué es |
| --- | --- |
| [`docs/`](./docs) | Portal de agenda, recordatorios y evaluaciones (GitHub Pages) |
| [`n8n/`](./n8n) | Workflow que revisa Gmail una vez al día y envía un resumen |
| [`BUENAS-PRACTICAS-PORTAL.md`](./BUENAS-PRACTICAS-PORTAL.md) | Criterios de diseño y mantención del portal |

## Publicar el portal

En **Settings → Pages** del repositorio:

- **Source:** Deploy from a branch
- **Branch:** `main` · carpeta `/docs`

Queda en `https://keepsync-hub.github.io/ks-almenar/`.

> **Antes de publicar, leer la sección 10 de
> [BUENAS-PRACTICAS-PORTAL.md](./BUENAS-PRACTICAS-PORTAL.md).** El repositorio es
> público y el portal contiene nombres de niños y profesoras. La página lleva
> `noindex` y un `robots.txt` restrictivo, pero eso evita la indexación, no el
> acceso. Lo recomendable es repo privado, o despersonalizar `docs/data.js`.

## Actualizar la agenda

Se edita solo [`docs/data.js`](./docs/data.js). No hay build ni dependencias:
los cambios quedan publicados apenas se hace push.
