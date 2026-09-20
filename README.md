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

## Qué dice la cabecera del portal

Solo lo que cambia solo:

| Placa | Sale de | La escribe |
| --- | --- | --- |
| `Hoy: …` | el reloj del visitante | nadie |
| `Correo revisado …` | `docs/estado.js` | n8n, en cada corrida |

Hubo dos placas más, `Datos al …` y el texto largo de la ventana revisada, que
salían de dos strings escritos a mano en `data.js`. Se fueron: no envejecían, no
las verificaba nadie y terminaron contradiciéndose entre sí — la cabecera decía
"datos al 7 de septiembre" mientras la ventana declaraba correos revisados solo
hasta el 25 de agosto. Un dato que solo puede equivocarse hacia el lado
tranquilizador es peor que no tener el dato.

Lo que alcanza a cubrir la carga a mano quedó anotado en el comentario de
cabecera de `docs/data.js`, que es donde le sirve a quien edita el archivo, y no
como una promesa mostrada a los apoderados.

## Cómo saber si la revisión automática sigue viva

n8n reescribe `docs/estado.js` en **cada** corrida, también los días sin correos,
y la cabecera del portal lo muestra. Guarda tres cosas:

- `revisado`: cuándo corrió.
- `ventanaDesde`: desde qué momento buscó correos esa corrida (26 h antes).
- `correos`: cuántos encontró. `0` es un día tranquilo; `null` es "no se pudo
  saber", que no es lo mismo.

La placa se pone en rojo en dos casos: si pasan más de 30 horas sin corrida
(**"Sin revisar desde el …"**) o si el archivo no trae latido
(**"Revisión automática: sin latido"**). Ese segundo caso antes se mostraba en
gris, indistinguible de un día tranquilo, que es justo la confusión que esta
placa existe para evitar. `auto.js` no sirve para nada de esto, porque en un día
tranquilo tampoco cambia.

### Lo que el latido no prueba

Que el cron disparó, no que la revisión sirvió. El latido cuelga del Schedule
Trigger, **antes** de Gmail: si la credencial caduca, si una profesora cambia de
correo o si el colegio migra de dominio, la placa sigue verde. Por eso el latido
guarda además `correos`: varios días seguidos en `0` fuera de vacaciones son la
señal de ir a mirar la query del nodo de búsqueda.

Y ojo con el historial: n8n conserva solo las últimas ejecuciones (unos 7 días).
El registro de largo plazo de que esto corrió es el commit diario de
`docs/estado.js` en este repo, no la pestaña de ejecuciones.

## Actualizar la agenda

Se edita solo [`docs/data.js`](./docs/data.js). No hay build ni dependencias:
los cambios quedan publicados apenas se hace push.
