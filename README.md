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

El portal es público a propósito: está pensado para compartirse por enlace con los
demás apoderados de Kínder A y 4° B. Lleva `noindex` y un `robots.txt` restrictivo,
así que se comparte por URL pero no aparece en buscadores.

> **Criterio de contenido:** solo va lo que las profesoras enviaron a todo el curso.
> Los correos dirigidos a una familia en particular (rúbricas individuales,
> reconocimientos personales) quedan fuera. Detalle en la sección 10 de
> [BUENAS-PRACTICAS-PORTAL.md](./BUENAS-PRACTICAS-PORTAL.md).

## Actualizar la agenda

Se edita solo [`docs/data.js`](./docs/data.js). No hay build ni dependencias:
los cambios quedan publicados apenas se hace push.
