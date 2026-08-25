# Buenas prácticas de diseño del Portal Almenar

Propuesta de criterios para mantener el portal (`docs/`) coherente y confiable
a medida que crece. No son reglas genéricas de diseño web: son las decisiones
concretas que sostienen *este* portal.

---

## 1. El neo-brutalismo solo funciona como sistema, no como adorno

El estilo se ve intencional cuando es reproducible. Cuatro reglas, sin excepciones:

| Regla | Valor | Por qué |
| --- | --- | --- |
| Borde | `3px solid #16130F` en todo objeto | Es lo que define el lenguaje. Un borde de 1px lo rompe. |
| Sombra | `6px 6px 0` sin difuminar | El `blur` es de otro lenguaje visual (material/soft UI). |
| Radio | `0` | Única excepción: los chips, que usan `999px` para leerse como etiquetas. |
| Fondo | Color plano | Nada de degradados ni transparencias. |

Están centralizadas en variables CSS (`--borde`, `--sombra`, `--paso`). Si hay
que cambiar el grosor del borde, se cambia en un solo lugar.

**Antipatrón:** agregar una sombra suave "porque se ve más elegante". Mezclar
los dos lenguajes hace que el portal parezca a medio terminar.

## 2. El color codifica información, nunca decora

Cada color tiene un significado asignado y uno solo:

| Color | Significa |
| --- | --- |
| Celeste `#A5D8FF` | Kínder A · Agustín |
| Amarillo `#FFE45C` | 4° B · Olivia |
| Rosa `#FFB3B3` | Urgente |
| Durazno `#FFD8A8` | Tiene plazo / prioridad alta |
| Menta `#A7E8C4` | Acción a realizar / ya realizado |
| Lila `#D8C9FF` | Fuente oficial externa (Lirmi) |

Consecuencia práctica: **mirar el portal de reojo ya dice de qué hijo es cada
cosa**, sin leer.

**Regla dura de accesibilidad:** el color nunca es la única señal. Cada chip
lleva texto además de color, porque un apoderado daltónico no distingue celeste
de amarillo. Si algún día se agrega un estado nuevo, va con etiqueta, no solo
con color.

## 3. Contraste: acá está la trampa del estilo

El neo-brutalismo tiende al color saturado, y ahí se suele perder legibilidad.
La salida elegida es **texto casi negro sobre pasteles claros**, que en todas las
combinaciones del portal queda muy por sobre el mínimo AA (4.5:1).

Dos prohibiciones que se derivan:
- Nada de texto blanco sobre los pasteles. Se ve "de moda" y es ilegible.
- Nada de gris claro para texto secundario. El tono suave (`--tinta-suave`) es
  `#55504A`, no `#999`.

El foco de teclado usa `outline: 4px` con offset. En un diseño de bordes gruesos,
un foco fino simplemente no se ve.

## 4. Separar el dato del marcado

Todo el contenido vive en `docs/data.js`; `app.js` solo lo renderiza.

Actualizar la agenda es editar un objeto, no tocar HTML. Esto tiene tres
beneficios que importan:

1. Se puede actualizar sin saber HTML.
2. El workflow de n8n puede escribir ese archivo automáticamente más adelante,
   sin reescribir la página.
3. Un error de contenido nunca puede romper el layout.

**Nunca** escribir un evento directamente en `index.html`.

## 5. Las fechas se calculan, no se escriben

"En 3 días" está calculado contra `new Date()` en cada carga. Si estuviera escrito
en el dato, el portal empezaría a mentir al día siguiente — y un portal de
recordatorios que miente sobre plazos es peor que no tenerlo.

Cuidado específico ya resuelto en `app.js`: `new Date('2026-08-28')` se interpreta
como **UTC** y en Chile muestra el día anterior. Por eso las fechas se parsean a
mano como fecha local:

```js
var p = texto.split('-');
return new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]));
```

## 6. No inventar datos: la sección de Evaluaciones es el caso crítico

El calendario oficial de evaluaciones vive en **Lirmi** y llegó como archivo
adjunto, así que el portal **no lo tiene**. La tentación sería rellenar la tabla
con fechas plausibles.

La decisión fue la contraria: la sección abre declarando que la fuente oficial es
Lirmi (con enlace al tutorial) y la tabla solo lista lo que apareció explícito en
los correos. Cuatro filas reales valen más que veinte inventadas.

El mismo criterio en la agenda: la presentación del proyecto de kínder tiene
`fecha: null` y aparece como **"Por confirmar"**, con la acción "Confirmar la
fecha con la profesora". Un dato faltante que se muestra como faltante es
información útil; uno inventado destruye la confianza en todo lo demás.

## 7. Ordenar por urgencia, no por fecha de llegada

Los recordatorios se ordenan por prioridad (`urgente → alta → media → hábito`),
no por cuándo llegó el correo. Lo que hay que hacer hoy va arriba.

> Bug real encontrado al construir esto: el peso de `urgente` era `0`, y el
> código usaba `PESO[p] || 9`. Como `0` es *falsy*, lo urgente se iba al final.
> Ahora se usa `hasOwnProperty`. Vale como advertencia: **nunca uses `||` para
> valores por defecto cuando el `0` es legítimo.**

## 8. Diseñar los estados vacíos

Filtrar por Kínder A deja varias secciones con poco o nada. Cada lista tiene su
estado vacío explícito con borde punteado ("No hay actividades próximas para este
filtro"), en vez de un hueco silencioso que parece un error de carga.

## 9. Accesibilidad, concretamente

Lo que ya está resuelto:

- Landmarks semánticos (`header`, `nav`, `main`, `section`, `footer`) y un solo `h1`.
- Los botones de filtro usan `aria-pressed`, no una clase CSS.
- Los cambios de filtro se anuncian por `aria-live` a lectores de pantalla.
- Tabla real con `<caption>`, `<thead>` y `scope="col"` — no divs simulando tabla.
- `prefers-reduced-motion` desactiva las transiciones.
- La tabla ancha hace scroll horizontal dentro de su contenedor; el `body` nunca.

Pendiente conocido, por honestidad: las casillas de recordatorio miden 30px. El
mínimo cómodo en móvil es 44px. Toda la fila es clickeable porque está envuelta
en un `<label>`, así que en la práctica funciona, pero subir la casilla a 44px
sería mejor.

## 10. Privacidad: decidido que el portal es público y compartido

El repositorio `keepsync-hub/ks-almenar` es público, y la decisión tomada es
mantenerlo así: el portal se comparte con los demás apoderados de Kínder A y 4° B.
Eso cambia quién es la audiencia, y por lo tanto qué corresponde publicar.

Consecuencias aplicadas al contenido:

- **Las etiquetas son por curso, no por hijo.** Los chips dicen "Kínder A" y
  "4° B", no "Kínder A · Agustín". Si el portal lo lee el curso completo, rotular
  por hijo propio es a la vez raro y una exposición innecesaria.
- **Fuera los registros individuales.** El correo con la rúbrica y las
  observaciones de la disertación de un alumno, y el documento de reconocimiento
  personal de otra alumna, **no** están en el portal. Son información de esa
  familia, no del curso. Este es el criterio general: si un dato identifica el
  desempeño o la situación particular de un niño, no va.
- **Se mantiene `noindex` y `robots.txt`.** Compartible por enlace no es lo mismo
  que indexable en Google. Si algún día se quiere que aparezca en buscadores, se
  quitan esas dos líneas; mientras tanto el portal circula entre quienes reciben
  la URL.

Lo que sí queda publicado: actividades del curso, fechas, evaluaciones, materiales
pedidos y recordatorios generales — todo lo que las profesoras ya enviaron a
todas las familias del curso por correo.

**Regla para quien mantenga esto:** antes de agregar algo a `data.js`, preguntarse
si la profesora lo mandó a todo el curso o solo a una familia. Si fue solo a una
familia, no va.

## 11. Cero build, cero dependencias

Tres archivos estáticos y nada más: sin framework, sin bundler, sin `npm install`.
Un portal familiar que necesita mantención de toolchain se abandona en tres meses.

La única dependencia externa es la tipografía Space Grotesk desde Google Fonts, y
va con una pila de respaldo completa. **Verificado:** con la fuente bloqueada la
página se ve correcta igual.

## 12. Pensado para imprimirse

Hay una hoja de estilos `@media print` que oculta navegación, filtros y sombras.
La agenda del refrigerador sigue siendo una interfaz legítima.

---

## Hacia dónde puede crecer

En orden de valor por esfuerzo:

1. **Que n8n escriba `data.js`.** El workflow diario ya extrae y estructura los
   correos; falta que confirme contra la GitHub API. El portal se actualizaría solo.
2. **Exportar a calendario (.ics).** Un botón "agregar a mi calendario" por evento
   vale más que cualquier mejora visual.
3. **Marca de última sincronización.** Mostrar cuándo corrió la última
   actualización, para saber si el dato está fresco.
4. **Historial por curso.** Archivo navegable de lo ya ocurrido, hoy solo atenuado.
