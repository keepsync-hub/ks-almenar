/* Contenido del portal. Editar SOLO este archivo para actualizar la agenda.
   Fuentes: correos y adjuntos de las profesoras jefe (julio y agosto 2026).
   Formato de fecha: AAAA-MM-DD. Sin fecha confirmada: fecha: null + fechaTexto. */

const PORTAL = {
  actualizado: '2026-08-25',
  ventanaRevisada: 'Correos y adjuntos del 1 de julio al 25 de agosto de 2026',

  cursos: {
    kinder:  { nombre: 'Kínder A', profesora: 'Cynthia Argandoña', tono: 'celeste' },
    cuartob: { nombre: '4° B',     profesora: 'Francisca Bravo',   tono: 'amarillo' }
  },

  /* ---------------- AGENDA ----------------
     La agenda muestra estos eventos MÁS las evaluaciones. Cuando un evento y
     una evaluación son la misma cosa (la Feria Científica es a la vez actividad
     y evaluación) se les pone el mismo `ref` y la agenda muestra solo el evento.
     No se deduplica por fecha+curso: el 28 de agosto conviven el Jeans Day y una
     prueba de Ciencias, que son cosas distintas. */
  eventos: [
    {
      fecha: '2026-08-28',
      hora: '08:30',
      lugar: 'Gimnasio del colegio',
      curso: 'kinder',
      titulo: 'Presentación proyecto kínder (ABP)',
      tipo: 'Presentación',
      detalle: 'Cierre del proyecto "Almenar aprende y crece a cada instante". Los niños comparten los descubrimientos y resultados del proceso. Se pide asistencia obligatoria de al menos un adulto por niño.',
      accion: 'Asistir — mínimo un adulto por niño',
      origen: 'Adjunto "Invitación Kinder A.jpg" · Cynthia Argandoña · 14-08-2026'
    },
    {
      fecha: '2026-08-28',
      curso: 'cuartob',
      titulo: 'Jeans Day',
      tipo: 'Actividad',
      detalle: 'Jeans Day con aporte de $500. Los fondos van al Centro de Estudiantes (CEAM).',
      accion: 'Enviar $500',
      origen: 'Adjunto "JEANS DAY.PNG" · Francisca Bravo · 24-08-2026'
    },
    {
      fecha: '2026-09-01',
      ref: 'feria-cientifica',
      curso: 'cuartob',
      titulo: 'Feria Científica',
      tipo: 'Actividad evaluada',
      detalle: 'Feria Científica del curso: investigación de un sistema, maqueta, afiche y exposición oral con vocabulario científico.',
      nota: 'El calendario de julio la marcaba el 5 de agosto, pero el correo del 10 de agosto la reprogramó al 1 de septiembre. Vale la fecha nueva.',
      accion: 'Apoyar la preparación de la maqueta y el afiche',
      origen: 'Francisca Bravo · 10-08-2026'
    },
    {
      fecha: '2026-09-10',
      curso: 'cuartob',
      titulo: 'Día de la Chilenidad',
      tipo: 'Presentación',
      detalle: '4° B participa representando la Cacharpaya. Los detalles de vestuario y presentación los enviaron José Luis y Sol, de Educación Física.',
      accion: 'Revisar el correo de Ed. Física con los detalles',
      origen: 'Francisca Bravo · 10-08-2026'
    },
    {
      fecha: '2026-09-21',
      curso: 'cuartob',
      titulo: 'Proyecto Institucional: Cine sin Fronteras',
      tipo: 'Proyecto',
      detalle: 'Comienza al volver de Fiestas Patrias. Cada niño participa en un taller con compañeros de otros cursos. A 4° B le toca la Alianza Ciencia Ficción, color rojo.',
      accion: null,
      origen: 'Francisca Bravo · 10-08-2026'
    },
    {
      fecha: '2026-10-14',
      ref: 'english-day-kinder',
      curso: 'kinder',
      titulo: 'English Day — ciclo Rilan',
      tipo: 'Presentación',
      detalle: 'Kínder A presenta la obra "Are you my mom?" y canta un tema de la temática. Los niños deben venir caracterizados según el rol asignado. El guión y la canción vinieron adjuntos para practicar en casa.',
      accion: 'Preparar disfraz y practicar la canción',
      origen: 'Cynthia Argandoña · 12-08-2026'
    }
  ],

  /* ---------------- RECORDATORIOS ---------------- */
  recordatorios: [
    {
      id: 'estudiar-27ago',
      curso: 'cuartob',
      texto: 'Preparar la prueba de Lenguaje del jueves 27',
      prioridad: 'urgente',
      nota: 'Prueba de lectura del libro "El túnel". La de Inglés que iba el mismo día se movió al 2 de septiembre.',
      vence: '2026-08-27',
      origen: 'Adjunto "CALENDARIO 4°B.jpg" · Francisca Bravo · 24-07-2026'
    },
    {
      id: 'presentacion-kinder-asistir',
      curso: 'kinder',
      texto: 'Asistir a la presentación del proyecto de kínder',
      prioridad: 'urgente',
      nota: 'Viernes 28 a las 08:30 en el Gimnasio. Asistencia obligatoria de al menos un adulto por niño.',
      vence: '2026-08-28',
      origen: 'Adjunto "Invitación Kinder A.jpg" · Cynthia Argandoña · 14-08-2026'
    },
    {
      id: 'pediculosis',
      curso: 'cuartob',
      texto: 'Revisar el cabello por pediculosis y tratar si hay piojos o liendres',
      prioridad: 'urgente',
      nota: 'Aviso preventivo y general del curso. Mantener revisiones posteriores para que no vuelva a aparecer.',
      vence: null,
      origen: 'Francisca Bravo · 25-08-2026'
    },
    {
      id: 'estudiar-28ago',
      curso: 'cuartob',
      texto: 'Preparar la prueba de Ciencias del viernes 28',
      prioridad: 'alta',
      nota: 'Propiedades de la materia.',
      vence: '2026-08-28',
      origen: 'Adjunto "CALENDARIO 4°B.jpg" · Francisca Bravo · 24-07-2026'
    },
    {
      id: 'leer-skateboarder',
      curso: 'cuartob',
      texto: 'Terminar de leer "The Skateboarder" para la prueba de Inglés',
      prioridad: 'alta',
      nota: 'Es el libro del Book 2. La evaluación quedó para el miércoles 2 de septiembre, corrida desde el 27 de agosto.',
      vence: '2026-09-02',
      origen: 'Patricia Alvarado, profesora de Inglés'
    },
    {
      id: 'jeansday-500',
      curso: 'cuartob',
      texto: 'Enviar $500 para el Jeans Day',
      prioridad: 'alta',
      nota: 'Aporte al CEAM.',
      vence: '2026-08-28',
      origen: 'Francisca Bravo · 24-08-2026'
    },
    {
      id: 'compromiso-familiar',
      curso: 'cuartob',
      texto: 'Completar y enviar firmado el Compromiso Familiar',
      prioridad: 'alta',
      nota: 'Es una hoja para llenar: "Durante este semestre, me comprometo a darle más oportunidades a mi hijo/a para…". Una vez recibida se pega en la agenda escolar.',
      vence: null,
      origen: 'Adjunto "COMPROMISO FAMILIAR.png" · Francisca Bravo · 15-07-2026'
    },
    {
      id: 'feria-cientifica-prep',
      curso: 'cuartob',
      texto: 'Avanzar la maqueta y el afiche de la Feria Científica',
      prioridad: 'media',
      nota: 'Incluye investigación de un sistema y exposición oral con vocabulario científico.',
      vence: '2026-09-01',
      origen: 'Francisca Bravo · 10-08-2026'
    },
    {
      id: 'caracterizacion-english',
      curso: 'kinder',
      texto: 'Preparar la caracterización para el English Day',
      prioridad: 'media',
      nota: 'El rol de cada niño viene en el guión adjunto.',
      vence: '2026-10-14',
      origen: 'Cynthia Argandoña · 12-08-2026'
    },
    {
      id: 'ensayo-cancion',
      curso: 'kinder',
      texto: 'Practicar en casa la canción y el guión de "Are you my mom?"',
      prioridad: 'media',
      nota: null,
      vence: '2026-10-14',
      origen: 'Cynthia Argandoña · 12-08-2026'
    },
    {
      id: 'agenda-diaria',
      curso: 'cuartob',
      texto: 'Mandar la agenda escolar todos los días, ida y vuelta',
      prioridad: 'habito',
      nota: 'Es el medio formal para evaluaciones, materiales y recordatorios de cada asignatura.',
      vence: null,
      origen: 'Francisca Bravo · 08-07-2026'
    },
    {
      id: 'sin-juguetes',
      curso: 'cuartob',
      texto: 'No enviar juguetes, álbumes ni láminas a la jornada escolar',
      prioridad: 'habito',
      nota: 'Si quieren intercambiar láminas a la salida, las porta el adulto que retira.',
      vence: null,
      origen: 'Francisca Bravo · 29-07-2026'
    }
  ],

  /* ---------------- EVALUACIONES ----------------
     4° B: transcrito del adjunto "CALENDARIO 4°B.jpg" (calendario oficial del
     II semestre). Kínder A: no llegó calendario equivalente por correo.
     Ante cualquier diferencia, mandan Lirmi y la agenda escolar. */
  evaluaciones: {
    fuenteOficial: {
      plataforma: 'Lirmi',
      descripcion: 'El calendario del II semestre de 4° B está transcrito abajo desde el adjunto que envió la profesora jefe. La versión viva está en Lirmi, impresa en la sala y registrada en la agenda de cada niño.',
      tutorial: 'https://youtu.be/qX_55QXUQcE',
      advertencia: 'De Kínder A no llegó un calendario de evaluaciones por correo. Lo que aparece acá son las actividades evaluadas mencionadas en los correos.',
      origen: 'Francisca Bravo · 20-07-2026 y 24-07-2026'
    },
    items: [
      { fecha: '2026-08-27', curso: 'cuartob', asignatura: 'Lenguaje y Comunicación', titulo: 'Prueba de lectura: "El túnel"', formato: 'Prueba escrita', estado: 'proxima', detalle: 'El calendario la tenía como jornada doble con Inglés, pero esa prueba se movió al 2 de septiembre: el 27 queda solo con Lenguaje.', origen: 'Calendario 4°B' },
      { fecha: '2026-08-28', curso: 'cuartob', asignatura: 'Ciencias Naturales', titulo: 'Propiedades de la materia', formato: 'Prueba escrita', estado: 'proxima', detalle: 'Características y propiedades fundamentales de la materia.', origen: 'Calendario 4°B' },
      { fecha: '2026-09-01', ref: 'feria-cientifica', curso: 'cuartob', asignatura: 'Ciencias Naturales', titulo: 'Feria Científica', formato: 'Maqueta, afiche y exposición oral', estado: 'proxima', detalle: 'Investigación de un sistema, elaboración de maqueta y afiche, exposición oral con vocabulario científico. Reprogramada desde el 5 de agosto.', origen: 'Calendario 4°B + correo del 10-08-2026' },
      { fecha: '2026-09-02', curso: 'cuartob', asignatura: 'Inglés', titulo: 'Book 2: "The Skateboarder"', formato: 'Prueba escrita', estado: 'proxima', detalle: 'Es la prueba que el calendario del II semestre listaba como "Book 2" para el 27 de agosto. La profesora de Inglés la reprogramó para el miércoles 2 de septiembre.', origen: 'Patricia Alvarado, profesora de Inglés' },
      { fecha: '2026-10-13', curso: 'cuartob', asignatura: 'Matemática', titulo: 'Unidad 4: Fracciones y decimales', formato: 'Prueba escrita', estado: 'proxima', detalle: 'Fracciones, números decimales y notación científica.', origen: 'Calendario 4°B' },
      { fecha: '2026-10-14', ref: 'english-day-kinder', curso: 'kinder', asignatura: 'Inglés', titulo: 'Obra "Are you my mom?" — English Day', formato: 'Presentación en grupo', estado: 'proxima', detalle: 'Se han hecho ensayos en clases. Requiere caracterización según el rol asignado.', origen: 'Correo de Cynthia Argandoña · 12-08-2026' },
      { fecha: '2026-10-15', curso: 'cuartob', asignatura: 'Lenguaje y Comunicación', titulo: 'Unidad 3', formato: 'Prueba escrita', estado: 'proxima', detalle: 'Jornada de doble evaluación junto con Inglés.', origen: 'Calendario 4°B' },
      { fecha: '2026-10-15', curso: 'cuartob', asignatura: 'Inglés', titulo: 'Unidad "Health Matters"', formato: 'Prueba escrita', estado: 'proxima', detalle: 'Jornada de doble evaluación junto con Lenguaje.', origen: 'Calendario 4°B' },
      { fecha: '2026-10-19', curso: 'cuartob', asignatura: 'Historia, Geografía y C. Sociales', titulo: 'Civilización Inca', formato: 'Prueba escrita', estado: 'proxima', detalle: 'Enfocada exclusivamente en la civilización Inca.', origen: 'Calendario 4°B' },
      { fecha: '2026-10-30', curso: 'cuartob', asignatura: 'Ciencias Naturales', titulo: 'Trabajo: La Fuerza', formato: 'Trabajo de investigación', estado: 'proxima', detalle: 'Tipos de fuerzas, efectos, fuerzas de contacto y a distancia.', origen: 'Calendario 4°B' },
      { fecha: '2026-11-09', curso: 'cuartob', asignatura: 'Matemática', titulo: 'Unidad 3: Medición', formato: 'Prueba escrita', estado: 'proxima', detalle: 'Tiempo, longitud, áreas y volumen.', origen: 'Calendario 4°B' },
      { fecha: '2026-11-19', curso: 'cuartob', asignatura: 'Lenguaje y Comunicación', titulo: 'Lectura de libre elección', formato: 'Evaluación de lectura', estado: 'proxima', detalle: 'El libro lo elige el propio estudiante.', origen: 'Calendario 4°B' },
      { fecha: '2026-11-20', curso: 'cuartob', asignatura: 'Ciencias Naturales', titulo: 'La Tierra', formato: 'Prueba escrita', estado: 'proxima', detalle: 'Estructura de la Tierra, volcanes, terremotos y medidas de seguridad.', origen: 'Calendario 4°B' },
      { fecha: '2026-12-02', curso: 'cuartob', asignatura: 'Inglés', titulo: 'Proyecto final', formato: 'Proyecto integrador', estado: 'proxima', detalle: 'Contenidos de las unidades 7 y 8.', origen: 'Calendario 4°B' },

      { fecha: '2026-08-19', curso: 'cuartob', asignatura: 'Artes Escénicas', titulo: 'Festival de Teatro — "El extraño mundo de Jack"', formato: 'Presentación en grupo', estado: 'realizada', detalle: 'Presentación del curso dentro del Festival de Teatro.', origen: 'Correo de Francisca Bravo · 10-08-2026' },
      { fecha: '2026-08-17', curso: 'cuartob', asignatura: 'Historia, Geografía y C. Sociales', titulo: 'Civilizaciones prehispánicas: Azteca y Maya', formato: 'Prueba escrita', estado: 'realizada', detalle: null, origen: 'Calendario 4°B' },
      { fecha: '2026-08-12', curso: 'cuartob', asignatura: 'Inglés', titulo: 'Unidad "Wild Animals"', formato: 'Prueba escrita', estado: 'realizada', detalle: null, origen: 'Calendario 4°B' },
      { fecha: '2026-08-11', curso: 'cuartob', asignatura: 'Matemática', titulo: 'Unidad 2: Patrones y ecuaciones', formato: 'Prueba escrita', estado: 'realizada', detalle: 'Patrones, ecuaciones numéricas, equivalencias, secuencias e inecuaciones.', origen: 'Calendario 4°B' },
      { fecha: '2026-07-30', curso: 'cuartob', asignatura: 'Lenguaje y Comunicación', titulo: 'Lectura domiciliaria: "Las brujas"', formato: 'Prueba escrita', estado: 'realizada', detalle: null, origen: 'Calendario 4°B' },
      { fecha: '2026-07-23', curso: 'cuartob', asignatura: 'Inglés', titulo: 'Oral Evaluation — English Day', formato: 'Evaluación oral', estado: 'realizada', detalle: null, origen: 'Calendario 4°B' },
      { fecha: '2026-07-20', curso: 'cuartob', asignatura: 'Matemática', titulo: 'Geometría', formato: 'Prueba escrita', estado: 'realizada', detalle: 'Localización, figuras 2D y 3D, medición, construcción de ángulos y transformaciones isométricas.', origen: 'Calendario 4°B' }
    ]
  }
};
