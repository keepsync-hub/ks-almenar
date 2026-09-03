# Cómo actualizar el portal

Todo el contenido está en **`data.js`**. No se toca ningún otro archivo.

## Agregar una actividad

Se añade un objeto a `eventos`:

```js
{
  fecha: '2026-09-15',        // AAAA-MM-DD. Si aún no hay fecha: null
  curso: 'cuartob',           // 'kinder', 'cuartob' o 'colegio'
  titulo: 'Salida pedagógica',
  tipo: 'Actividad',          // Actividad | Presentación | Proyecto | Actividad evaluada | Reunión | Ceremonia | Sin clases
  detalle: 'Descripción breve de lo que hay que saber.',
  accion: 'Enviar autorización firmada',   // o null si no hay que hacer nada
  origen: 'Francisca Bravo · 05-09-2026'
}
```

Si la fecha no está confirmada:

```js
fecha: null,
fechaTexto: 'Fecha por confirmar',
```

### Lo que dura varios días

Se agrega `fechaFin` con el último día incluido:

```js
fecha: '2026-11-03',
fechaFin: '2026-11-05',
```

Mientras el rango esté corriendo, el portal lo sigue mostrando como vigente y le
pone el chip "En curso". Sin `fechaFin`, la actividad dura un día.

### Lo que vale para todo el colegio

`curso: 'colegio'` es para lo que no es de un curso en particular: feriados, actos,
reuniones de apoderados, celebraciones. **Se muestra siempre**, incluso con el filtro
puesto en Kínder A o en 4° B: filtrar por curso no puede esconder que el lunes no
hay clases.

### Feriados y vacaciones

Van como evento con `tipo: 'Sin clases'` y `accion: null`. Además de salir en la
agenda, quedan marcados en el calendario de planificación. **No se bloquean como
días de estudio**: en vacaciones igual se puede estudiar en casa.

```js
{
  fecha: '2026-09-14',
  fechaFin: '2026-09-18',
  curso: 'colegio',
  titulo: 'Vacaciones de Fiestas Patrias',
  tipo: 'Sin clases',
  detalle: 'Del lunes 14 al jueves 17 son vacaciones y el viernes 18 es feriado.',
  accion: null,
  origen: 'Cronograma 2° semestre'
}
```

### Cuando un evento y una evaluación son la misma cosa

La agenda muestra los eventos **más** las evaluaciones, en orden cronológico. Pero
a veces la misma cosa está anotada en los dos lados: la Feria Científica es una
actividad del curso y además la evaluación de Ciencias.

Para que no salga dos veces, se les pone el mismo `ref` a ambos:

```js
// en eventos
{ fecha: '2026-09-01', ref: 'feria-cientifica', curso: 'cuartob', titulo: 'Feria Científica', ... }

// en evaluaciones.items
{ fecha: '2026-09-01', ref: 'feria-cientifica', curso: 'cuartob', asignatura: 'Ciencias Naturales', ... }
```

Con eso la agenda muestra solo el evento, y la evaluación sigue apareciendo en su
sección y en el calendario de estudio.

**No se deduplica por fecha + curso**, aunque parezca más cómodo: el 28 de agosto
conviven el Jeans Day y la prueba de Ciencias de 4° B, que son cosas distintas y
tienen que verse las dos. El vínculo tiene que ser explícito.

Si una evaluación no tiene evento equivalente, no lleva `ref` y se muestra en la
agenda por derecho propio.

## Agregar un recordatorio

```js
{
  id: 'autorizacion-salida',   // único y estable: es la llave que recuerda el "listo"
  curso: 'cuartob',
  texto: 'Firmar y enviar la autorización',
  prioridad: 'alta',           // urgente | alta | media | habito
  nota: 'Contexto opcional.',
  vence: '2026-09-12',         // o null, ver abajo
  origen: 'Francisca Bravo · 05-09-2026'
}
```

El `id` no se debe cambiar después: si cambia, quien ya lo marcó como hecho lo
verá aparecer de nuevo sin marcar.

### `vence` decide hasta cuándo se ve

- **Con fecha**: se muestra normal hasta ese día inclusive. Al día siguiente sale
  de la lista activa y del contador, y baja a un grupo **"Vencidos"**, atenuado,
  donde se queda 30 días. Después desaparece solo. No hay que borrarlo a mano.
- **`vence: null`**: no caduca nunca. Es para las reglas permanentes del curso
  ("mandar la agenda escolar todos los días", "no enviar juguetes"), que siguen
  siendo verdad mientras nadie las cambie. El validador avisa cada vez que
  encuentra uno, justamente para que la decisión sea consciente.

Una tarea con final —firmar algo, enviar dinero— siempre debería llevar `vence`,
aunque la fecha sea aproximada: si no, se queda en el portal para siempre.

Los recordatorios que detecta n8n nunca quedan sin `vence`: si el correo no trae
fecha, el workflow les pone 30 días.

## Agregar una evaluación

```js
{
  fecha: '2026-09-22',
  curso: 'cuartob',
  asignatura: 'Matemática',
  titulo: 'Prueba de fracciones',
  formato: 'Prueba escrita',
  detalle: 'Contenidos que entran.',
  origen: 'Lirmi · 05-09-2026'
}
```

**No se escribe `estado`.** El portal deduce solo si una evaluación ya pasó, mirando
la fecha contra el día de hoy. Antes se escribía a mano y quedaba viejo apenas nadie
editaba el archivo. El validador rechaza el campo si aparece en `data.js`.

**No inventar fechas de evaluaciones.** El calendario oficial está en Lirmi. Si un
dato no está confirmado, es preferible dejarlo fuera antes que ponerlo mal.

## Verificar antes de publicar

```sh
node --check docs/data.js
node .github/scripts/validar-datos.mjs
```

Y abrir `docs/index.html` en el navegador. Las cuentas regresivas se calculan solas
contra la fecha del día, así que no hay que actualizarlas nunca a mano.

---

## Los tres archivos de datos

| Archivo | Quién lo escribe | Qué contiene |
| --- | --- | --- |
| `data.js` | Una persona, a mano | Todo lo curado: agenda revisada, calendario de evaluaciones, recordatorios permanentes |
| `auto.js` | El workflow de n8n | Lo que detecta solo en los correos del día |
| `estado.js` | El workflow de n8n | Solo la fecha de la última corrida. No lleva contenido |

**n8n nunca toca `data.js`.** Esa es la garantía que hace segura la automatización:
una corrida automática no puede borrar el calendario de evaluaciones ni pisar una
fecha que se corrigió a mano.

En el navegador, `app.js` fusiona ambas listas. Si un ítem existe en las dos, **gana
el de `data.js`**. La comparación usa curso + fecha + título normalizado, así que
"Jeans Day" del 28 de agosto es el mismo ítem en ambos archivos aunque el texto del
detalle difiera.

Los ítems que vienen de `auto.js` se muestran con la etiqueta **"Detectado
automáticamente"**, para que se note de dónde salieron.

### Para qué sirve `estado.js`

`auto.js` solo cambia los días que hay novedades, que son los menos. Entonces
mirarlo no sirve para saber si el proceso sigue vivo: un archivo quieto puede
significar "no pasó nada" o "n8n lleva una semana caído".

`estado.js` resuelve eso. n8n lo reescribe en **cada** corrida, aunque no haya
llegado ningún correo, y la cabecera del portal lo usa para mostrar:

- **"Revisado hoy 07:00 · sin novedades nuevas"** — todo bien, día tranquilo.
- **"Revisado hoy 07:00 · última novedad: 25 de ago."** — corrió y hay contenido
  automático de esa fecha.
- **"Sin revisar desde el vie 28 de ago."**, en rojo — pasaron más de 30 horas
  sin corrida. Hay que ir a mirar el workflow en n8n.

Igual que `auto.js`, no se edita a mano: la siguiente corrida lo pisa.

### Cómo "ascender" un ítem automático

Si n8n detectó algo y quieres corregirlo o dejarlo fijo:

1. Copia el ítem desde `auto.js` a `data.js`.
2. Ajústalo (fecha, redacción, prioridad).
3. Listo: desde ese momento gana tu versión y la automática se ignora sola.

No hace falta borrar nada de `auto.js`; el workflow lo va limpiando cuando los
ítems quedan más de 45 días en el pasado.

---

## La vista de calendario

La sección de Evaluaciones tiene dos vistas: **Calendario** (por defecto) y **Lista
completa**. El calendario muestra tres semanas de lunes a domingo y sale de los
mismos datos: no hay nada que mantener aparte.

Para que una evaluación aparezca en el calendario necesita `fecha` y un `curso`
válido. Las que están `realizada` salen tachadas.

### Días de estudio

La asignación va en dos pasos: **primero se elige la evaluación**, después se marcan
los días. Sin ese orden un día marcado no diría para qué se estudia, que es
justamente lo que hace falta saber al planificar.

- El selector de arriba lista las evaluaciones por delante. La activa queda en
  negro y es la que recibe los clics.
- El chip **"Planificar estudio"** de cada evaluación en la agenda es un atajo:
  deja esa evaluación elegida, cambia a la vista de calendario si hacía falta y
  baja hasta ahí, así solo queda marcar las fechas.
- En el calendario solo se pueden marcar días entre **hoy y el día de esa prueba**:
  estudiar después no sirve, así que esos días quedan bloqueados.
- Los días asignados a **otras** evaluaciones se ven igual, como marcas pequeñas,
  para no perder la vista del plan completo mientras se edita una sola.
- Un mismo día puede servir a varias evaluaciones, que es lo que pasa de verdad
  cuando hay dos pruebas seguidas.

Todo se guarda en `localStorage` del navegador de cada persona, bajo la clave
`portal-almenar:planEstudio`. No viaja al repositorio ni se comparte con los demás
apoderados. Los días que quedan más de 60 días en el pasado se borran solos.

El plan avisa en rojo solo si una evaluación de las próximas dos semanas no tiene
ningún día asignado — marcar todo en rojo convertía el plan en un muro de alarma
inútil.

### El PDF

El botón abre el diálogo de impresión del navegador con una hoja pensada para A4:
el resto del portal se oculta y queda solo el plan. Desde ahí se elige "Guardar
como PDF".

Se hace así a propósito, en vez de incluir una librería de PDF: son ~350 kB de
JavaScript para un botón, y el portal no tiene ninguna dependencia. La impresión
del navegador además da mejor tipografía y funciona igual en iOS y Android.

En la hoja impresa el color no se puede usar como señal, así que el día de estudio
se marca con fondo gris, una barra negra al costado y un ✓.
