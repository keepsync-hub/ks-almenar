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
