# Cómo actualizar el portal

Todo el contenido está en **`data.js`**. No se toca ningún otro archivo.

## Agregar una actividad

Se añade un objeto a `eventos`:

```js
{
  fecha: '2026-09-15',        // AAAA-MM-DD. Si aún no hay fecha: null
  curso: 'cuartob',           // 'kinder' o 'cuartob'
  titulo: 'Salida pedagógica',
  tipo: 'Actividad',          // Actividad | Presentación | Proyecto | Actividad evaluada
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

## Agregar un recordatorio

```js
{
  id: 'autorizacion-salida',   // único y estable: es la llave que recuerda el "listo"
  curso: 'cuartob',
  texto: 'Firmar y enviar la autorización',
  prioridad: 'alta',           // urgente | alta | media | habito
  nota: 'Contexto opcional.',
  vence: '2026-09-12',         // o null
  origen: 'Francisca Bravo · 05-09-2026'
}
```

El `id` no se debe cambiar después: si cambia, quien ya lo marcó como hecho lo
verá aparecer de nuevo sin marcar.

## Agregar una evaluación

```js
{
  fecha: '2026-09-22',
  curso: 'cuartob',
  asignatura: 'Matemática',
  titulo: 'Prueba de fracciones',
  formato: 'Prueba escrita',
  estado: 'proxima',           // proxima | realizada
  detalle: 'Contenidos que entran.',
  origen: 'Lirmi · 05-09-2026'
}
```

**No inventar fechas de evaluaciones.** El calendario oficial está en Lirmi. Si un
dato no está confirmado, es preferible dejarlo fuera antes que ponerlo mal.

## Verificar antes de publicar

```sh
node --check docs/data.js
```

Y abrir `docs/index.html` en el navegador. Las cuentas regresivas se calculan solas
contra la fecha del día, así que no hay que actualizarlas nunca a mano.

---

## Los dos archivos de datos

| Archivo | Quién lo escribe | Qué contiene |
| --- | --- | --- |
| `data.js` | Una persona, a mano | Todo lo curado: agenda revisada, calendario de evaluaciones, recordatorios permanentes |
| `auto.js` | El workflow de n8n | Lo que detecta solo en los correos del día |

**n8n nunca toca `data.js`.** Esa es la garantía que hace segura la automatización:
una corrida automática no puede borrar el calendario de evaluaciones ni pisar una
fecha que se corrigió a mano.

En el navegador, `app.js` fusiona ambas listas. Si un ítem existe en las dos, **gana
el de `data.js`**. La comparación usa curso + fecha + título normalizado, así que
"Jeans Day" del 28 de agosto es el mismo ítem en ambos archivos aunque el texto del
detalle difiera.

Los ítems que vienen de `auto.js` se muestran con la etiqueta **"Detectado
automáticamente"**, para que se note de dónde salieron.

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

Tocar un día lo marca como día de estudio. Se guarda en `localStorage` del
navegador de cada persona: no viaja al repositorio ni se comparte con los demás
apoderados. Los días que quedan más de 60 días en el pasado se borran solos.

El plan cuenta, para cada evaluación, cuántos días marcados hay entre hoy y esa
fecha. Solo avisa en rojo si una evaluación de las próximas dos semanas no tiene
ninguno — marcar todo en rojo convertía el plan en un muro de alarma inútil.

### El PDF

El botón abre el diálogo de impresión del navegador con una hoja pensada para A4:
el resto del portal se oculta y queda solo el plan. Desde ahí se elige "Guardar
como PDF".

Se hace así a propósito, en vez de incluir una librería de PDF: son ~350 kB de
JavaScript para un botón, y el portal no tiene ninguna dependencia. La impresión
del navegador además da mejor tipografía y funciona igual en iOS y Android.

En la hoja impresa el color no se puede usar como señal, así que el día de estudio
se marca con fondo gris, una barra negra al costado y un ✓.
