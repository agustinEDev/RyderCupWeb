import { describe, it, expect } from 'vitest';

/**
 * Ninguna pantalla aparece desde invisible al entrar en ella.
 *
 * El 3 nov 2026, en el iPhone, Agustín vio parpadear Torneos al pulsar su
 * pestaña: el título, el buscador y las tarjetas arrancaban a opacidad 0 y
 * entraban con un fundido, y durante un instante la pantalla se quedaba en
 * blanco. Lo mismo pasaba en otras 11 pantallas, sin contar las de acceso. Decidido con él: cada
 * pantalla sale ya pintada. Este test lee el código para que no vuelva a
 * colarse.
 *
 * LA TABLA (aprobada el 3 nov 2026):
 *
 *   #   | qué                                          | fundido
 *   ----|----------------------------------------------|-------------------
 *   A1  | al entrar en una pantalla de la aplicación   | no
 *   A2  | al entrar en las públicas                    | no
 *   A3  | el vacío de Torneos                          | no
 *   A4  | las tarjetas de Torneos                      | no, nunca
 *   B1  | la caja de un modal, al abrirlo              | sí: lo abre un gesto
 *   B2  | error de un campo, requisitos de la          | sí: reaccionan a lo
 *       | contraseña, éxito tras enviar un formulario  | que se hace
 *   B3  | filas de barras de `GolfCourseForm`          | sí: obsoleto, no se toca
 *   P2  | los bloques de la portada y de Precios que   | sí: no es al entrar,
 *       | aparecen al bajar (`fadeInUp`)               | es al hacer scroll
 *   A5  | las de acceso: Login, Registro, ¿Olvidaste   | sí, como siempre
 *       | la contraseña?, Restablecer y Completar      | (Agustín, 3 nov 2026,
 *       | perfil, con el aviso verde de Login          | al verlas en el iPhone)
 *
 * Los permitidos van por fichero, por etiqueta y con su número exacto (revisor
 * y `/code-review`): uno nuevo, aunque sea un modal, obliga a pasar por aquí y
 * decir por qué, y una caja de pantalla no puede ocupar el hueco del error de
 * un campo que se quite.
 *
 * Lo que no puede ver: unas props que llegan con `{...props}` desde fuera del
 * fichero. Los objetos que las definen, sí (`initial: { opacity: 0 }`, también
 * en los `.js`).
 */
const PERMITIDOS = {
  // B1: la caja del modal
  'components/admin/AdminEditCompetitionModal.jsx': { modal: 1 },
  'components/admin/EditUserModal.jsx': { modal: 1 },
  'components/admin/ManageAccountModal.jsx': { modal: 1 },
  'components/enrollment/EnrollmentRequestModal.jsx': { modal: 1 },
  'components/profile/HandicapRequestModal.jsx': { modal: 1 },
  'components/schedule/AssignTeamsModal.jsx': { modal: 1 },
  'components/schedule/GenerateMatchesModal.jsx': { modal: 1 },
  'components/schedule/MatchDetailModal.jsx': { modal: 1 },
  'components/schedule/ReassignPlayersModal.jsx': { modal: 1 },
  'components/schedule/WalkoverModal.jsx': { modal: 1 },
  'pages/admin/AdminPanel.jsx': { modal: 1 },
  'pages/admin/GolfCourses.jsx': { modal: 2 },
  'pages/admin/PendingGolfCourses.jsx': { modal: 2 },
  // B1 + B2: la caja y el «enviado» tras mandar la solicitud
  'components/golf_course/GolfCourseRequestModal.jsx': {
    modal: 1,
    'motion.div': 1,
  },
  // B2: el error de cada campo y los requisitos de la contraseña
  'components/auth/SignInForm.jsx': { 'motion.p': 2 },
  'components/ui/PasswordRequirements.jsx': { 'motion.div': 1 },
  // A5: las de acceso conservan su entrada (div) y los errores de sus campos (p)
  'pages/Login.jsx': { 'motion.div': 4 },
  'pages/Register.jsx': { 'motion.div': 3, 'motion.p': 5 },
  'pages/ForgotPassword.jsx': { 'motion.div': 5, 'motion.p': 1 },
  'pages/ResetPassword.jsx': { 'motion.div': 6, 'motion.p': 2 },
  'pages/CompleteProfile.jsx': { 'motion.div': 1 },
  // B3: obsoleto
  'components/golf_course/GolfCourseForm.jsx': { 'motion.div': 1 },
  // P2: al bajar, no al entrar; y la variante que usan
  'pages/Landing.jsx': { 'motion.div': 10 },
  'pages/public/Pricing.jsx': { 'motion.h2': 1 },
  'utils/animations.js': { objeto: 1 },
};

const fuentes = import.meta.glob(
  ['/src/**/*.{js,jsx}', '!/src/**/*.test.{js,jsx}'],
  {
    query: '?raw',
    import: 'default',
    eager: true,
  },
);

// El índice tras la `}` que cierra la `{` de la posición `i`
const finDeLlaves = (codigo, i) => {
  let profundidad = 0;
  for (let j = i; j < codigo.length; j++) {
    if (codigo[j] === '{') profundidad++;
    else if (codigo[j] === '}' && --profundidad === 0) return j + 1;
  }
  return codigo.length;
};

// Opacidad 0 como número o como texto, o fotogramas clave que empiezan en 0
const OPACIDAD_CERO = /opacity:\s*(\[\s*)?['"]?0(?![.\d])/;
const FOTOGRAMAS_DESDE_CERO = /opacity:\s*\[\s*['"]?0(?![.\d])/;

/**
 * Cada forma de arrancar invisible, con su línea y su etiqueta: `initial`,
 * variantes o `style` con opacidad 0 en cualquier sitio, `animate` con
 * fotogramas desde 0, `initial` con una constante (no se puede saber qué
 * lleva), la variante `fadeInUp`, y los objetos que definen un `initial:` con
 * opacidad 0 (una variante o unas props hechas en otro sitio).
 */
const fundidosDe = (codigo) => {
  const encontrados = [];
  const apunta = (i, etiqueta, como) =>
    encontrados.push({
      linea: codigo.slice(0, i).split('\n').length,
      etiqueta,
      como,
    });
  // La caja de un modal (lo que sigue a su `boxClassName`) cuenta aparte: así
  // un fundido de pantalla no ocupa su hueco en el mismo fichero (CodeRabbit)
  const etiquetaEn = (i) => {
    const desde = codigo.lastIndexOf('<', i);
    if (
      /boxClassName=[^<]*>\s*$/.test(
        codigo.slice(Math.max(0, desde - 200), desde),
      )
    )
      return 'modal';
    return /^<([\w.]+)/.exec(codigo.slice(desde))?.[1] ?? '?';
  };
  for (const m of codigo.matchAll(/\b(initial|animate|variants|style)=\{/g)) {
    const llave = m.index + m[0].length - 1;
    const valor = codigo.slice(llave, finDeLlaves(codigo, llave));
    const prop = m[1];
    const etiqueta = etiquetaEn(m.index);
    if (prop === 'animate') {
      if (FOTOGRAMAS_DESDE_CERO.test(valor))
        apunta(m.index, etiqueta, 'animate desde 0');
    } else if (OPACIDAD_CERO.test(valor)) {
      apunta(m.index, etiqueta, `${prop} con opacidad 0`);
    } else if (
      prop === 'initial' &&
      /^\{\s*[A-Za-z_$][\w$.]*\s*\}$/.test(valor) &&
      !/^\{\s*(true|false)\s*\}$/.test(valor)
    ) {
      apunta(m.index, etiqueta, 'initial con una constante');
    } else if (prop === 'variants' && /^\{\s*fadeInUp\s*\}$/.test(valor)) {
      apunta(m.index, etiqueta, 'variante fadeInUp');
    }
  }
  // Fuera de un atributo: `initial: { opacity: 0 }` en un objeto
  for (const m of codigo.matchAll(/(^|[\s,{])initial:\s*\{/g)) {
    const llave = m.index + m[0].length - 1;
    if (OPACIDAD_CERO.test(codigo.slice(llave, finDeLlaves(codigo, llave)))) {
      apunta(m.index, 'objeto', 'objeto con initial a opacidad 0');
    }
  }
  return encontrados;
};

const relativo = (fichero) => fichero.replace(/^\/src\//, '');
const cuenta = (encontrados) =>
  encontrados.reduce(
    (porEtiqueta, { etiqueta }) => ({
      ...porEtiqueta,
      [etiqueta]: (porEtiqueta[etiqueta] ?? 0) + 1,
    }),
    {},
  );
const ordenado = (objeto) => JSON.stringify(Object.entries(objeto).sort());

describe('ninguna pantalla aparece desde invisible al entrar', () => {
  it('solo los permitidos, por etiqueta y con su número exacto, conservan su fundido', () => {
    const distintos = [];
    for (const [fichero, codigo] of Object.entries(fuentes)) {
      const encontrados = fundidosDe(codigo);
      const permitidos = PERMITIDOS[relativo(fichero)] ?? {};
      if (ordenado(cuenta(encontrados)) !== ordenado(permitidos)) {
        distintos.push(
          `${relativo(fichero)}: ${JSON.stringify(cuenta(encontrados))} (permitidos ${JSON.stringify(permitidos)}) en ${encontrados
            .map((e) => `${e.linea} ${e.como}`)
            .join(', ')}`,
        );
      }
    }
    expect(distintos).toEqual([]);
  });

  it('todos los permitidos existen (un fichero borrado o renombrado se quita de la lista)', () => {
    const existen = new Set(Object.keys(fuentes).map(relativo));
    expect(Object.keys(PERMITIDOS).filter((f) => !existen.has(f))).toEqual([]);
  });

  it('el detector ve cada forma de arrancar invisible', () => {
    const formas = [
      '<motion.div initial={{ opacity: 0, y: 20 }} />',
      '<motion.div initial={{ y: 20, opacity: 0 }} />',
      "<motion.div initial={{ opacity: '0' }} />",
      '<motion.div initial={OCULTA} />',
      '<motion.div initial="initial" variants={fadeInUp} />',
      '<motion.div variants={{ oculto: { opacity: 0 } }} />',
      '<motion.div style={{ opacity: 0 }} animate={{ opacity: 1 }} />',
      '<motion.div animate={{ opacity: [0, 1] }} />',
      '<motion.div initial={cond ? false : { opacity: 0 }} />',
      'const aparece = { initial: { opacity: 0 }, animate: { opacity: 1 } };',
    ];
    for (const forma of formas)
      expect(fundidosDe(forma), forma).toHaveLength(1);
  });

  it('y no confunde lo que no arranca invisible', () => {
    const formas = [
      '<motion.div initial={false} />',
      '<motion.div initial={{ y: 20 }} variants={slideUp} />',
      '<motion.div initial={{ opacity: 0.5 }} />',
      '<motion.div style={{ opacity: 0.05 }} />',
      '<motion.div exit={{ opacity: 0 }} />',
      '<motion.div animate={{ opacity: [1, 0] }} />',
      'const sube = { initial: { y: 20 }, animate: { y: 0 } };',
    ];
    for (const forma of formas) expect(fundidosDe(forma), forma).toEqual([]);
  });

  it('la caja de un modal cuenta aparte: un fundido de pantalla no ocupa su hueco', () => {
    const modal =
      '<Modal boxClassName={CAJA_PROPIA}>\n  <motion.div initial={{ opacity: 0, scale: 0.95 }} />\n</Modal>';
    const pantalla =
      '<main>\n  <motion.div initial={{ opacity: 0, y: 20 }} />\n</main>';
    expect(cuenta(fundidosDe(modal))).toEqual({ modal: 1 });
    expect(cuenta(fundidosDe(pantalla))).toEqual({ 'motion.div': 1 });
  });

  it('cuenta por etiqueta: una caja de pantalla no ocupa el hueco de un error de campo', () => {
    const codigo =
      '<motion.p initial={{ opacity: 0 }} /><motion.div initial={{ opacity: 0 }} />';
    expect(cuenta(fundidosDe(codigo))).toEqual({
      'motion.p': 1,
      'motion.div': 1,
    });
  });
});
