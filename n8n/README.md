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
| 1 | `Leer auto.js del repo` | GitHub `file:get` de `docs/auto.js` en `main` |
| 2 | `Leer data.js del repo` | GitHub `file:get` de `docs/data.js`, para que el extractor sepa qué ya está publicado |
| 3 | `Preparar contexto del portal` | Code: decodifica el base64 que devuelve la API |
| 4 | `Extraer novedades` | LLM + Structured Output Parser → `{eventos, recordatorios, evaluaciones}` |
| 5 | `Fusionar novedades` | Code: dedup por curso+fecha+título, poda lo vencido hace más de 45 días |
| 6 | `Solo si hay cambios` | Filter: si el archivo quedaría igual, no se hace commit |
| 7 | `Publicar auto.js en GitHub` | Escribe `docs/auto.js` en `main` con la credencial `GitHub OAuth2 API` |

**Por qué la API y no `raw.githubusercontent`:** el CDN de raw cachea 5 minutos. Leer de ahí hacía que el workflow trabajara sobre un `auto.js` viejo y pudiera reescribir encima ítems recién eliminados. La API de contenidos devuelve siempre la versión vigente.

### Tercera rama: el latido

`auto.js` solo se commitea cuando hay novedades reales, y además su rama entera
queda sin ejecutar los días en que Gmail no devuelve nada: la ejecución se
detiene en el nodo de búsqueda (verificado en la ejecución `469` del 31-08-2026,
0,6 s y `lastNodeExecuted: Buscar correos del colegio`). Resultado: mirando el
repo era imposible distinguir un día tranquilo de un workflow caído.

Por eso hay una rama que cuelga **del Schedule Trigger**, no del nodo de Gmail:

| Paso | Nodo | Detalle |
| --- | --- | --- |
| 1 | `Marcar revision` | Code: arma `docs/estado.js` con `revisado`, `ventanaDesde` y `correos` |
| 2 | `Publicar estado.js en GitHub` | GitHub `file:edit` de `docs/estado.js` en `main`, en cada corrida |

Sin filtro y sin condiciones: escribe siempre. Eso cuesta un commit y un deploy
de Pages por día, y ese es exactamente el precio de poder detectar una caída en
un sitio estático sin backend.

### Qué guarda el latido, y por qué no basta con la fecha

```js
const PORTAL_ESTADO = {
  "revisado": "2026-09-20T07:00:58.011-03:00",
  "ventanaDesde": "2026-09-19T05:00:58.011-03:00",
  "correos": 0
};
```

- `revisado` dice que el cron disparó.
- `ventanaDesde` dice hasta dónde alcanzó de verdad esa corrida. Es el mismo
  límite que usa el `receivedAfter` del nodo de Gmail (26 h). Comparado con el
  `revisado` de la corrida anterior muestra si quedó un hueco sin cubrir. Antes
  esta información vivía en un string escrito a mano en `data.js` que nadie
  verificaba y que solo podía equivocarse hacia el lado tranquilizador.
- `correos` distingue "revisé y no había nada" (`0`) de "no se pudo saber"
  (`null`). El conteo sale de `$("Buscar correos del colegio").all().length`,
  dentro de un `try`: esa rama corre antes porque `executionOrder: v1` ordena las
  ramas por posición y el nodo de búsqueda está más arriba. Si no hubiera
  corrido, queda `null` y no `0`.

**Si se cambia la ventana de 26 h en el nodo de Gmail, hay que cambiar también
`HORAS_VENTANA` en `Marcar revision`.** Si no, el portal promete una ventana que
no se buscó.

### Lo que el latido no prueba

Que el cron disparó, no que la revisión sirvió. Cuelga del trigger, antes de
Gmail: si la credencial caduca, si una profesora cambia de correo o si el colegio
migra de dominio, el latido sigue verde. `correos` es el contrapeso: varios días
seguidos en `0` fuera de vacaciones es la señal de ir a mirar la query.

### Ojo: publicar no es guardar

Esta rama estuvo escrita y guardada como borrador desde el 31-08-2026 **sin estar
publicada**, así que durante tres semanas no corrió: `docs/estado.js` se quedó con
`revisado: null` y el portal, que mostraba ese caso en gris, se veía tranquilo. En
n8n el borrador y la versión activa son cosas distintas; si `sameAsDraft` es
`false`, lo que corre no es lo que se está mirando en el editor.

El nodo va con `onError: continueRegularOutput` y 3 reintentos. El latido es un
extra: si GitHub falla, el resumen por correo tiene que salir igual. Y un latido
que no se escribe deja la cabecera del portal en alerta, que es justo la señal
correcta.

**Ojo con el orden al desplegar:** la operación es `edit`, que exige que el
archivo ya exista. `docs/estado.js` tiene que estar en `main` **antes** de
publicar esta versión del workflow.

**Garantía de seguridad:** cada rama escribe únicamente en su archivo
(`docs/auto.js` y `docs/estado.js`, respectivamente). `data.js` —donde vive el calendario de evaluaciones transcrito de los adjuntos— nunca se toca. Y si la lectura de `auto.js` falla, el Code node aborta sin escribir, para no publicar un archivo a medias.

El commit en `main` dispara el workflow de GitHub Actions
([`.github/workflows/pages.yml`](../.github/workflows/pages.yml)), que **valida los
datos antes de publicar**. Si una corrida de n8n produjera un `auto.js` malformado
—JSON roto, un curso inexistente, una fecha como `2026-02-31`— el despliegue se
detiene y el portal sigue mostrando la última versión buena.

Para ver si la última corrida publicó, la pestaña **Actions** del repositorio.

### Si una corrida falla: reintentos y avisos

**Lo que pasó el 22-09-2026 (ejecución `663`).** Llegó el correo de Francisca
Bravo con el horario de salida de la semana del Proyecto Institucional. El
resumen por correo salió, pero `Parser de novedades` rechazó la respuesta del
modelo y la rama del portal murió ahí. El parser armaba su schema a partir de un
JSON de ejemplo (`schemaType: fromJson`), y eso vuelve **obligatorio y de tipo
string** cada campo del ejemplo. El modelo devolvió `"hora": null` y
`"lugar": null`, que es lo correcto cuando el correo no los trae, y el schema lo
rechazó. Como la corrida siguiente solo busca desde 26 h atrás, ese correo nunca
iba a llegar al portal por sí solo. Nadie se enteró, porque el workflow no tenía
cómo avisar.

**Qué cambió (versión publicada el 23-09-2026):**

| Cambio | Dónde |
| --- | --- |
| Schema explícito (`schemaType: manual`): solo `curso` y `titulo`/`texto` son obligatorios, el resto acepta `null` | `Parser de novedades` |
| 3 intentos, 5 s entre cada uno | Nodos que llaman a Gmail, OpenRouter y GitHub |
| `errorWorkflow` = `Vigilancia resumen Colegio Almenar` | Settings del workflow |

El schema nuevo se probó antes de publicarlo: un workflow temporal le pasó
exactamente la salida que falló en la `663` y la aceptó (ejecución `671`). Ese
workflow ya está archivado.

## Vigilancia resumen Colegio Almenar

- **Workflow n8n:** `Vigilancia resumen Colegio Almenar` (ID `qmr586Iw4600vHAx`)
- **Fuente SDK:** [`vigilancia-colegio-almenar.ts`](./vigilancia-colegio-almenar.ts)

Cubre las dos formas de fallar que el resumen no puede avisar por sí mismo:

| Rama | Cuándo | Qué hace |
| --- | --- | --- |
| `Cuando falla el resumen` (Error Trigger) | Una ejecución de producción del resumen termina en error, aun después de los reintentos | Manda a cristian0907@gmail.com un correo `FALLA: …` con el nodo que falló, el error, el link a la ejecución y si el portal quedó sin actualizar |
| `Comprobar a las 09:00 que corrio` (Schedule) | Todos los días a las 09:00 America/Santiago | Lee `docs/estado.js` en `main`. Si `revisado` no es de hoy, manda un correo `SIN REVISION: …`. Si todo está bien, no manda nada |

La segunda rama existe porque el Error Trigger solo se dispara cuando una
ejecución empieza y falla. Si el cron no dispara, si el workflow queda
despublicado o si n8n está caído, no hay ejecución que falle y el Error Trigger
no se entera. El latido de `estado.js` sí lo muestra.

Usa las mismas credenciales que el resumen: `Gmail account` (cristian0907@gmail.com)
y `GitHub OAuth2 API`.

Probado el 23-09-2026 (ejecución `670`): leyó el latido de las 07:01 de ese día
y no mandó nada, que es lo esperado.

**Qué hacer cuando llega un aviso:** abrir la ejecución del link. Si el fallo fue
en la rama del portal, los correos de ese día no van a entrar solos al portal:
hay que cargarlos a mano en `data.js`. Pedírselo a Claude con el ID de la
ejecución también sirve, porque la ejecución guarda los correos que leyó.
