# Automatizaciones n8n

## Resumen diario correos Colegio Almenar

- **Workflow n8n:** `Resumen diario correos Colegio Almenar` (ID `p0lab0hPbBHFoLgR`)
- **Fuente SDK:** [`resumen-diario-colegio-almenar.ts`](./resumen-diario-colegio-almenar.ts)
- **Proyecto n8n:** personal de Cristian Ignacio

### Qué hace

Una vez al día revisa la casilla de Gmail y resume los correos del colegio.

| Paso | Nodo | Detalle |
| --- | --- | --- |
| 1 | `Revisar cada dia a las 07:00` | Schedule Trigger diario, 07:00 America/Santiago |
| 2 | `Buscar correos del colegio` | Gmail → `message:getAll`, query `from:(cynthiaargandona@almenar.cl OR franbravo@almenar.cl)`, leídos y no leídos, recibidos en las últimas 26 h |
| 3 | `Preparar correos para el resumen` | Code node: normaliza remitente/asunto/fecha/cuerpo y etiqueta cada correo por curso |
| 4 | `Generar resumen diario` | Basic LLM Chain + OpenRouter: produce el resumen en HTML |
| 5 | `Enviar resumen por correo` | Gmail → `message:send` a cristian0907@gmail.com |

### Mapeo de remitentes

| Remitente | Curso | Hijo/a |
| --- | --- | --- |
| cynthiaargandona@almenar.cl | Kinder A | Agustín |
| franbravo@almenar.cl | 4to B | Olivia |

### Estructura del resumen

Por cada curso: **Temas más importantes**, **Compromisos**, **Fechas clave** (dd-mm-aaaa) y **Acciones a realizar** (verbo + plazo). Lo urgente para hoy o mañana se marca con el prefijo `URGENTE:`. Si un curso no tuvo correos, aparece como "Sin novedades".

### Estado: activo desde el 25-08-2026

Publicado y validado de punta a punta (ejecución manual `400`): encontró 3 correos, los clasificó, generó el resumen y envió el mail (`1a03932f124affff`).

### Credenciales: cuidado, hay dos de Gmail

La instancia tiene **dos** credenciales `gmailOAuth2` y apuntan a casillas distintas. Verificado con workflows de diagnóstico leyendo la cabecera `Delivered-To` (ejecuciones `398` y `399`, ambos workflows ya archivados):

| Credencial | ID | Cuenta real | Uso |
| --- | --- | --- | --- |
| `Gmail account` | `o7zgkcSK3TETNTZv` | **cristian0907@gmail.com** | La que usa este workflow |
| `Gmail OAuth2 API` | `cYhcyiH1LcyrXUWz` | cristian.molina@keepsync.ai | **No usar acá** |

El nombre de la credencial no dice a qué cuenta apunta. Si alguna vez hay dudas, la forma de comprobarlo es leer un par de mensajes con `simple: false` y mirar `headers['delivered-to']`.

### Notas de operación

- La ventana de búsqueda es de 26 h (no 24 h) para dar solapamiento y no perder correos si una ejecución se atrasa.
- Si no llegó ningún correo de esos dos remitentes, el workflow termina sin enviar nada.
- El cuerpo de cada correo se trunca a 4.000 caracteres antes de mandarlo al modelo.
- Credenciales usadas: `Gmail account` (`o7zgkcSK3TETNTZv`) y `OpenRouter account` (`bZDl6rzCKZZQsTQX`).
- Modelo: `anthropic/claude-sonnet-4.6` vía OpenRouter, temperatura 0.2. La corrida de validación consumió ~3.500 tokens con 3 correos.

### Cómo cambiar cosas

- **Hora:** editar el Schedule Trigger.
- **Destinatario:** campo `To` del nodo `Enviar resumen por correo`.
- **Remitentes vigilados:** parámetro `q` del nodo `Buscar correos del colegio`.
- **Modelo:** nodo `Modelo OpenRouter`.

### Segunda rama: publicar en el portal

Desde `Preparar correos para el resumen` sale una segunda rama que actualiza GitHub Pages:

| Paso | Nodo | Detalle |
| --- | --- | --- |
| 1 | `Leer auto.js publicado` | GET a raw.githubusercontent de `docs/auto.js` |
| 2 | `Leer data.js publicado` | GET de `docs/data.js`, para que el extractor sepa qué ya está publicado |
| 3 | `Extraer novedades` | LLM + Structured Output Parser → `{eventos, recordatorios, evaluaciones}` |
| 4 | `Fusionar novedades` | Code: dedup por curso+fecha+título, poda lo vencido hace más de 45 días |
| 5 | `Solo si hay cambios` | Filter: si el archivo quedaría igual, no se hace commit |
| 6 | `Publicar auto.js en GitHub` | Escribe `docs/auto.js` en `main` con la credencial `GitHub OAuth2 API` |

**Garantía de seguridad:** el workflow escribe únicamente en `docs/auto.js`. `data.js` —donde vive el calendario de evaluaciones transcrito de los adjuntos— nunca se toca. Y si la lectura de `auto.js` falla, el Code node aborta sin escribir, para no publicar un archivo a medias.

El commit en `main` dispara el rebuild de GitHub Pages automáticamente.
