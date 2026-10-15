import IHoleMarkStore from '../../domain/repositories/IHoleMarkStore';

// Una clave por jugador; dentro, por campo, sus marcas y las pendientes de
// enviar (por número de hoyo). Al cerrar sesión no se borra: lo pendiente se
// envía cuando ese jugador vuelva a entrar
const clave = (userId) => `marcasDeHoyos:v1:${userId}`;

const vacio = () => ({ marcas: {}, pendientes: {} });
const misma = (a, b) => Boolean(a) && Boolean(b) && a.holeNumber === b.holeNumber && a.markedAt === b.markedAt;

const leer = (userId) => {
  try {
    const todo = JSON.parse(globalThis.localStorage.getItem(clave(userId)));
    return todo && typeof todo === 'object' && !Array.isArray(todo) ? todo : {};
  } catch {
    return {};
  }
};

const escribir = (userId, todo) => {
  try {
    globalThis.localStorage.setItem(clave(userId), JSON.stringify(todo));
  } catch {
    // Sin sitio o sin almacenamiento: la marca vive mientras la pantalla siga abierta
  }
};

const conCampo = (userId, golfCourseId, cambiar) => {
  if (!userId || !golfCourseId) return;
  const todo = leer(userId);
  const campo = { ...vacio(), ...todo[golfCourseId] };
  cambiar(campo);
  todo[golfCourseId] = campo;
  escribir(userId, todo);
};

/** Las marcas de hoyo del jugador en localStorage (BE #532, PR C). */
class LocalStorageHoleMarkStore extends IHoleMarkStore {
  load(userId, golfCourseId) {
    if (!userId || !golfCourseId) return vacio();
    const campo = leer(userId)[golfCourseId];
    return { marcas: { ...campo?.marcas }, pendientes: { ...campo?.pendientes } };
  }

  ponerPendiente(userId, golfCourseId, marca) {
    conCampo(userId, golfCourseId, (campo) => {
      campo.marcas[marca.holeNumber] = marca;
      campo.pendientes[marca.holeNumber] = marca;
    });
  }

  confirmar(userId, golfCourseId, enviada, guardada) {
    conCampo(userId, golfCourseId, (campo) => {
      const hoyo = enviada.holeNumber;
      // Si mientras se enviaba se marcó otra vez, manda la nueva
      if (campo.pendientes[hoyo] && !misma(campo.pendientes[hoyo], enviada)) return;
      delete campo.pendientes[hoyo];
      campo.marcas[hoyo] = guardada;
    });
  }

  descartar(userId, golfCourseId, enviada) {
    conCampo(userId, golfCourseId, (campo) => {
      const hoyo = enviada.holeNumber;
      if (misma(campo.pendientes[hoyo], enviada)) delete campo.pendientes[hoyo];
      if (misma(campo.marcas[hoyo], enviada)) delete campo.marcas[hoyo];
    });
  }

  ponerDelServidor(userId, golfCourseId, marcas) {
    conCampo(userId, golfCourseId, (campo) => {
      campo.marcas = Object.fromEntries(marcas.map((m) => [m.holeNumber, m]));
      Object.assign(campo.marcas, campo.pendientes);
    });
  }

  pendientes(userId) {
    if (!userId) return [];
    return Object.entries(leer(userId)).flatMap(([golfCourseId, campo]) =>
      Object.values(campo?.pendientes ?? {}).map((marca) => ({ golfCourseId, marca })),
    );
  }
}

export default LocalStorageHoleMarkStore;
