import { describe, it, expect } from 'vitest';

/**
 * Ninguna pantalla aparece desde invisible al entrar en ella.
 *
 * El 3 nov 2026, en el iPhone, Agustín vio parpadear Torneos al pulsar su
 * pestaña: el título, el buscador y las tarjetas arrancaban a opacidad 0 y
 * entraban con un fundido, y durante un instante la pantalla se quedaba en
 * blanco. Lo mismo pasaba en otras 16 pantallas. Decidido con él: cada
 * pantalla sale ya pintada. Este test lee el código para que no vuelva a
 * colarse.
 *
 * LA TABLA (aprobada el 3 nov 2026):
 *
 *   #   | qué                                          | fundido
 *   ----|----------------------------------------------|-------------------
 *   A1  | al entrar en una pantalla de la aplicación   | no
 *   A2  | al entrar en las públicas y las de acceso,   | no
 *       | también el aviso verde con el que se llega   |
 *       | a Login (revisor)                            |
 *   A3  | el vacío de Torneos                          | no
 *   A4  | las tarjetas de Torneos                      | no, nunca
 *   B1  | la caja de un modal, al abrirlo              | sí: lo abre un gesto
 *   B2  | error de un campo, requisitos de la          | sí: reaccionan a lo
 *       | contraseña, éxito tras enviar un formulario  | que se hace
 *   B3  | filas de barras de `GolfCourseForm`          | sí: obsoleto, no se toca
 *   P2  | los bloques de la portada y de Precios que   | sí: no es al entrar,
 *       | aparecen al bajar (`fadeInUp`)               | es al hacer scroll
 *
 * Los permitidos van por fichero y con su número exacto (revisor): uno nuevo,
 * aunque sea un modal, obliga a pasar por aquí y decir por qué.
 */
const PERMITIDOS = {
  // B1: la caja del modal
  'components/admin/AdminEditCompetitionModal.jsx': 1,
  'components/admin/EditUserModal.jsx': 1,
  'components/admin/ManageAccountModal.jsx': 1,
  'components/enrollment/EnrollmentRequestModal.jsx': 1,
  'components/profile/HandicapRequestModal.jsx': 1,
  'components/schedule/AssignTeamsModal.jsx': 1,
  'components/schedule/GenerateMatchesModal.jsx': 1,
  'components/schedule/MatchDetailModal.jsx': 1,
  'components/schedule/ReassignPlayersModal.jsx': 1,
  'components/schedule/WalkoverModal.jsx': 1,
  'pages/admin/AdminPanel.jsx': 1,
  'pages/admin/GolfCourses.jsx': 2,
  'pages/admin/PendingGolfCourses.jsx': 2,
  // B1 + B2: la caja y el «enviado» tras mandar la solicitud
  'components/golf_course/GolfCourseRequestModal.jsx': 2,
  // B2: el error de cada campo y los requisitos de la contraseña
  'components/auth/SignInForm.jsx': 2,
  'pages/Register.jsx': 5,
  'pages/ResetPassword.jsx': 2,
  'pages/ForgotPassword.jsx': 1,
  'components/ui/PasswordRequirements.jsx': 1,
  // B3: obsoleto
  'components/golf_course/GolfCourseForm.jsx': 1,
  // P2: al bajar, no al entrar
  'pages/Landing.jsx': 10,
  'pages/public/Pricing.jsx': 1,
};

const fuentes = import.meta.glob(['/src/**/*.jsx', '!/src/**/*.test.jsx'], {
  query: '?raw',
  import: 'default',
  eager: true,
});

// El índice tras la `}` que cierra la `{` de la posición `i`
const finDeLlaves = (codigo, i) => {
  let profundidad = 0;
  for (let j = i; j < codigo.length; j++) {
    if (codigo[j] === '{') profundidad++;
    else if (codigo[j] === '}' && --profundidad === 0) return j + 1;
  }
  return codigo.length;
};

const OPACIDAD_CERO = /opacity:\s*0(?![.\d])/;

/**
 * Cada forma de arrancar invisible, con su línea: `initial` que lleve opacidad
 * 0 en cualquier sitio del objeto, `initial` con una constante (no se puede
 * saber qué lleva), la variante `fadeInUp`, variantes en línea con opacidad 0 y
 * un `style` que la fije.
 */
export const fundidosDe = (codigo) => {
  const encontrados = [];
  const apunta = (i, como) => encontrados.push({ linea: codigo.slice(0, i).split('\n').length, como });
  for (const m of codigo.matchAll(/\b(initial|variants|style)=\{/g)) {
    const llave = m.index + m[0].length - 1;
    const valor = codigo.slice(llave, finDeLlaves(codigo, llave));
    const prop = m[1];
    if (OPACIDAD_CERO.test(valor)) apunta(m.index, `${prop} con opacidad 0`);
    else if (prop === 'initial' && /^\{\s*[A-Za-z_$][\w$.]*\s*\}$/.test(valor) && !/^\{\s*(true|false)\s*\}$/.test(valor)) {
      apunta(m.index, 'initial con una constante');
    } else if (prop === 'variants' && /^\{\s*fadeInUp\s*\}$/.test(valor)) apunta(m.index, 'variante fadeInUp');
  }
  return encontrados;
};

const relativo = (fichero) => fichero.replace(/^\/src\//, '');

describe('ninguna pantalla aparece desde invisible al entrar', () => {
  it('solo los permitidos, con su número exacto, conservan su fundido', () => {
    const sobran = [];
    for (const [fichero, codigo] of Object.entries(fuentes)) {
      const encontrados = fundidosDe(codigo);
      const permitidos = PERMITIDOS[relativo(fichero)] ?? 0;
      if (encontrados.length !== permitidos) {
        sobran.push(`${relativo(fichero)}: ${encontrados.length} (permitidos ${permitidos}) en ${encontrados.map((e) => `${e.linea} ${e.como}`).join(', ')}`);
      }
    }
    expect(sobran).toEqual([]);
  });

  it('todos los permitidos existen (un fichero borrado o renombrado se quita de la lista)', () => {
    const existen = new Set(Object.keys(fuentes).map(relativo));
    expect(Object.keys(PERMITIDOS).filter((f) => !existen.has(f))).toEqual([]);
  });

  it('el detector ve cada forma de arrancar invisible', () => {
    const formas = [
      '<motion.div initial={{ opacity: 0, y: 20 }} />',
      '<motion.div initial={{ y: 20, opacity: 0 }} />',
      '<motion.div initial={OCULTA} />',
      '<motion.div initial="initial" variants={fadeInUp} />',
      '<motion.div variants={{ oculto: { opacity: 0 } }} />',
      '<motion.div style={{ opacity: 0 }} animate={{ opacity: 1 }} />',
      '<motion.div initial={cond ? false : { opacity: 0 }} />',
    ];
    for (const forma of formas) expect(fundidosDe(forma), forma).toHaveLength(1);
  });

  it('y no confunde lo que no arranca invisible', () => {
    const formas = [
      '<motion.div initial={false} />',
      '<motion.div initial={{ y: 20 }} variants={slideUp} />',
      '<motion.div initial={{ opacity: 0.5 }} />',
      '<motion.div style={{ opacity: 0.05 }} />',
      '<motion.div exit={{ opacity: 0 }} />',
    ];
    for (const forma of formas) expect(fundidosDe(forma), forma).toEqual([]);
  });
});
