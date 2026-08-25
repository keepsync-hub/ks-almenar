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

### Notas de operación

- La ventana de búsqueda es de 26 h (no 24 h) para dar solapamiento y no perder correos si una ejecución se atrasa.
- Si no llegó ningún correo de esos dos remitentes, el workflow termina sin enviar nada.
- El cuerpo de cada correo se trunca a 4.000 caracteres antes de mandarlo al modelo.
- Credenciales usadas: `Gmail OAuth2 API` (`cYhcyiH1LcyrXUWz`) y `OpenRouter account` (`bZDl6rzCKZZQsTQX`).

### Cómo cambiar cosas

- **Hora:** editar el Schedule Trigger.
- **Destinatario:** campo `To` del nodo `Enviar resumen por correo`.
- **Remitentes vigilados:** parámetro `q` del nodo `Buscar correos del colegio`.
- **Modelo:** nodo `Modelo OpenRouter`.
