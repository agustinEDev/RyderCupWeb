import IHoleMarkStore from '../../domain/repositories/IHoleMarkStore';

// Una clave por jugador; dentro, por campo, sus marcas y las pendientes de
// enviar (por número de hoyo). Al cerrar sesión no se borra: lo pendiente se
// envía cuando ese jugador vuelva a entrar
const clave = (userId) => `marcasDeHoyos:v1:${userId}`;

const vacio = () => ({ marcas: {}, pendientes: {} });
// Lo que se guarda por campo: además, la versión (cuántas veces se ha escrito
// en el móvil) y la marca confirmada que había antes de una pendiente, para
// volver a ella si el servidor rechaza la nueva
const conTodo = (campo) => ({ ...vacio(), previas: {}, version: 0, ...campo });
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
  const campo = conTodo(todo[golfCourseId]);
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

  version(userId, golfCourseId) {
    if (!userId || !golfCourseId) return 0;
    return conTodo(leer(userId)[golfCourseId]).version;
  }

  ponerPendiente(userId, golfCourseId, marca) {
    conCampo(userId, golfCourseId, (campo) => {
      const hoyo = marca.holeNumber;
      const confirmada = campo.pendientes[hoyo] ? null : campo.marcas[hoyo];
      if (confirmada) campo.previas[hoyo] = confirmada;
      campo.marcas[hoyo] = marca;
      campo.pendientes[hoyo] = marca;
      campo.version += 1;
    });
  }

  confirmar(userId, golfCourseId, enviada, guardada) {
    conCampo(userId, golfCourseId, (campo) => {
      const hoyo = enviada.holeNumber;
      // Si mientras se enviaba se marcó otra vez, manda la nueva; esta, que el
      // servidor ya tiene, es a la que se vuelve si la nueva se rechaza
      if (campo.pendientes[hoyo] && !misma(campo.pendientes[hoyo], enviada)) {
        campo.previas[hoyo] = guardada;
        campo.version += 1;
        return;
      }
      delete campo.pendientes[hoyo];
      delete campo.previas[hoyo];
      campo.marcas[hoyo] = guardada;
      campo.version += 1;
    });
  }

  descartar(userId, golfCourseId, enviada) {
    conCampo(userId, golfCourseId, (campo) => {
      const hoyo = enviada.holeNumber;
      if (misma(campo.pendientes[hoyo], enviada)) delete campo.pendientes[hoyo];
      if (misma(campo.marcas[hoyo], enviada)) {
        // Vuelve la que había confirmada, si la había
        if (campo.previas[hoyo]) campo.marcas[hoyo] = campo.previas[hoyo];
        else delete campo.marcas[hoyo];
      }
      if (!campo.pendientes[hoyo]) delete campo.previas[hoyo];
      campo.version += 1;
    });
  }

  ponerDelServidor(userId, golfCourseId, marcas, versionAlPedir = null) {
    conCampo(userId, golfCourseId, (campo) => {
      const delServidor = Object.fromEntries(marcas.map((m) => [m.holeNumber, m]));
      if (versionAlPedir !== null && versionAlPedir !== campo.version) {
        // Mientras llegaba se escribió en el móvil: la foto del servidor es
        // vieja, y solo aporta los hoyos que aquí no hay
        for (const [hoyo, m] of Object.entries(delServidor)) campo.marcas[hoyo] ??= m;
        return;
      }
      campo.marcas = delServidor;
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
