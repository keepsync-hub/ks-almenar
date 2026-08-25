/* Contenido del portal. Editar SOLO este archivo para actualizar la agenda.
   Fuente: correos de las profesoras jefe recibidos en cristian0907@gmail.com.
   Formato de fecha: AAAA-MM-DD. Si no hay fecha confirmada, usar fecha: null
   y describirla en fechaTexto. */

const PORTAL = {
  actualizado: '2026-08-25',

  cursos: {
    kinder: {
      nombre: 'Kínder A',
      estudiante: 'Agustín',
      profesora: 'Cynthia Argandoña',
      tono: 'celeste'
    },
    cuartob: {
      nombre: '4° B',
      estudiante: 'Olivia',
      profesora: 'Francisca Bravo',
      tono: 'amarillo'
    }
  },

  /* ---------------- AGENDA ---------------- */
  eventos: [
    {
      fecha: '2026-08-28',
      curso: 'cuartob',
      titulo: 'Jeans Day',
      tipo: 'Actividad',
      detalle: 'Jeans Day con aporte de $500. Los fondos van al Centro de Estudiantes (CEAM).',
      accion: 'Enviar $500',
      origen: 'Francisca Bravo · 24-08-2026'
    },
    {
      fecha: '2026-09-01',
      curso: 'cuartob',
      titulo: 'Feria Científica',
      tipo: 'Actividad evaluada',
      detalle: 'Feria Científica del curso. El trabajo de modelos y maquetas se retoma las semanas previas.',
      accion: 'Apoyar la preparación de la maqueta',
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
      curso: 'kinder',
      titulo: 'English Day — ciclo Rilan',
      tipo: 'Presentación',
      detalle: 'Kínder A presenta la obra "Are you my mom?" y canta un tema de la temática. Los niños deben venir caracterizados según el rol asignado. El guión y la canción vinieron adjuntos para practicar en casa.',
      accion: 'Preparar disfraz y practicar la canción',
      origen: 'Cynthia Argandoña · 12-08-2026'
    },
    {
      fecha: null,
      fechaTexto: 'Fecha por confirmar',
      curso: 'kinder',
      titulo: 'Presentación proyecto kínder (ABP)',
      tipo: 'Presentación',
      detalle: 'Presentación del proyecto "Almenar aprende y crece a cada instante", creado por los niños de kínder. Asistencia obligatoria de al menos un adulto por niño.',
      accion: 'Confirmar la fecha con la profesora',
      origen: 'Cynthia Argandoña · 14-08-2026'
    }
  ],

  /* ---------------- RECORDATORIOS ---------------- */
  recordatorios: [
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
      texto: 'Enviar firmado el Compromiso Familiar',
      prioridad: 'alta',
      nota: 'Se presentó en la reunión de apoderados. Una vez recibido se pega en la agenda escolar.',
      vence: null,
      origen: 'Francisca Bravo · 15-07-2026'
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
    }
  ],

  /* ---------------- EVALUACIONES ----------------
     OJO: el calendario oficial del II semestre vive en Lirmi y llegó como
     archivo adjunto. Acá solo va lo que aparece explícito en los correos.
     No inventar fechas de pruebas. */
  evaluaciones: {
    fuenteOficial: {
      plataforma: 'Lirmi',
      descripcion: 'Calendario de Evaluaciones del II semestre. También está impreso en la sala y se registra en la agenda de cada niño.',
      tutorial: 'https://youtu.be/qX_55QXUQcE',
      origen: 'Francisca Bravo · 20-07-2026'
    },
    items: [
      {
        fecha: '2026-09-01',
        curso: 'cuartob',
        asignatura: 'Ciencias Naturales',
        titulo: 'Feria Científica',
        formato: 'Modelos y maquetas',
        estado: 'proxima',
        detalle: 'El trabajo de elaboración se retoma en las semanas previas.',
        origen: 'Francisca Bravo · 10-08-2026'
      },
      {
        fecha: '2026-10-14',
        curso: 'kinder',
        asignatura: 'Inglés',
        titulo: 'Obra "Are you my mom?" — English Day',
        formato: 'Presentación en grupo',
        estado: 'proxima',
        detalle: 'Se han hecho ensayos en clases. Requiere caracterización.',
        origen: 'Cynthia Argandoña · 12-08-2026'
      },
      {
        fecha: '2026-08-19',
        curso: 'cuartob',
        asignatura: 'Artes Escénicas',
        titulo: 'Festival de Teatro — "El extraño mundo de Jack"',
        formato: 'Presentación en grupo',
        estado: 'realizada',
        detalle: 'Presentación del curso dentro del Festival de Teatro.',
        origen: 'Francisca Bravo · 10-08-2026'
      },
      {
        fecha: '2026-07-15',
        curso: 'kinder',
        asignatura: 'Tecnología',
        titulo: 'Disertación de objeto tecnológico',
        formato: 'Disertación individual',
        estado: 'realizada',
        detalle: 'Rúbrica con observaciones en la agenda. La profesora destacó fluidez, espontaneidad y buen manejo de preguntas.',
        origen: 'Cynthia Argandoña · 15-07-2026'
      }
    ]
  }
};
