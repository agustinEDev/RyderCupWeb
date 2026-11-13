import customToast from '../../../utils/toast';
import { mensajeDeError } from '../../../utils/sinCobertura';
import { mensajeConJugadores } from '../../../utils/erroresConJugadores';
import { aCamposDeLaCompeticion } from '../../../utils/camposDeLaCompeticion';
import {
  MOTIVOS_PARA_NO_QUITAR,
  porQueNoSeFormaron,
  yaLosHabia,
} from '../../../utils/fichaDeLaCompeticion';
import { categoriasQueSalen } from '../../../domain/services/CategoriasQueSalen';
import { sinFranja } from '../../../domain/services/PlazasEnFranjas';
import {
  getCompetitionDetailUseCase,
  getCompetitionGolfCoursesUseCase,
  activateCompetitionUseCase,
  closeEnrollmentsUseCase,
  nameCaptainsUseCase,
  startCompetitionUseCase,
  completeCompetitionUseCase,
  cancelCompetitionUseCase,
  deleteCompetitionUseCase,
  reopenEnrollmentsUseCase,
  revertCompetitionStatusUseCase,
  revertCompetitionToInProgressUseCase,
  listEnrollmentsUseCase,
  removeEnrolledPlayerUseCase,
  assignTeamsUseCase,
} from '../../../composition';

/**
 * Lo que el organizador hace con la competición desde su ficha: cambiar su
 * estado, nombrar capitanes, borrarla y quitar a un inscrito, con las
 * relecturas que vienen detrás.
 *
 * Se crean en cada render con lo de ese render, igual que cuando
 * vivían en el cuerpo de la página: cada manejador ve la competición, las
 * listas y los derivados del render en que se pulsó (`contexto`).
 */
export const crearCambiosDeEstado = (contexto) => {
  const {
    id,
    t,
    navigate,
    competition,
    setCompetition,
    setEnrollments,
    approvedEnrollments,
    esStrokePlay,
    agendaLeida,
    idActual,
    lecturasDeLaFicha,
    lecturasDeInscripciones,
    preguntar,
    handleStartEditHandicap,
    setIsProcessing,
    setQuitandoId,
    setEditingHandicapId,
    setSinHandicap,
    setVersionFranjas,
    setIrASinFranja,
    setReleyendoTrasCerrar,
    setGuardandoCapitanes,
    setNombrandoCapitanes,
    setBorrando,
    setConfirmandoBorrado,
  } = contexto;

  const releerTrasQuitar = async () => {
    // Con los mismos guardas que las demás relecturas: una respuesta vieja no
    // pisa otra más nueva, ni la de otra competición (/code-review)
    const deEsta = id;
    const turnoDeLaFicha = lecturasDeLaFicha.turno();
    const turnoDeLaLista = lecturasDeInscripciones.turno();
    try {
      const [ficha, lista] = await Promise.all([
        getCompetitionDetailUseCase.execute(deEsta),
        listEnrollmentsUseCase.execute(deEsta),
      ]);
      if (deEsta !== idActual.current) return;
      if (lecturasDeLaFicha.aplicar(turnoDeLaFicha)) setCompetition(ficha);
      if (lecturasDeInscripciones.aplicar(turnoDeLaLista))
        setEnrollments(lista);
    } catch (error) {
      // Lo de antes sigue a la vista; el siguiente refresco lo pondrá al día
      console.error('Error reloading after removing a player:', error);
    }
    // Y sus franjas: quitarle no mueve la fecha de la ficha (/code-review)
    if (deEsta === idActual.current) setVersionFranjas((v) => v + 1);
  };

  // El organizador quita a un inscrito (release social 2, 27 oct 2026): se le
  // pregunta, se le avisa en la app y, con equipos formados, se deshacen
  const handleQuitar = async (enrollment) => {
    const datos = {
      nombre: enrollment.userName || t('detail.unknownUser'),
      competicion: competition.name,
    };
    const accion = competition.teamsAssigned ? 'removeWithTeams' : 'remove';
    if (!(await preguntar(accion, { destructiva: true, datos }))) return;
    setQuitandoId(enrollment.id);
    try {
      await removeEnrolledPlayerUseCase.execute(enrollment.id);
      customToast.success(t('detail.success.playerRemoved', datos));
      // Su hándicap, si se estaba editando, ya no es de nadie (/code-review)
      setEditingHandicapId((editando) =>
        editando === enrollment.id ? null : editando,
      );
    } catch (error) {
      customToast.error(
        t(
          error?.status === 404
            ? 'detail.errors.removeGone'
            : (MOTIVOS_PARA_NO_QUITAR[error?.errorCode] ??
                'detail.errors.removeFailed'),
        ),
      );
    }
    // Bien o mal, se relee: la lista (y los equipos, si se deshicieron) ya no
    // es la de antes. En silencio, sin la espera de pantalla completa: quitar a
    // varios seguidos hacía parpadear la ficha y la subía arriba (revisor)
    await releerTrasQuitar();
    setQuitandoId(null);
  };

  // Si ahora se puede borrar: la respuesta de un cambio de estado no lo trae, y
  // el de antes ya no vale —cancelar la vuelve borrable— (FE #667). En silencio,
  // sin la espera de pantalla completa; si falla, no se ofrece lo que no se sabe
  const refrescarCanDelete = () => {
    const turno = lecturasDeLaFicha.turno();
    return (
      getCompetitionDetailUseCase
        .execute(id)
        // Solo si esa ficha es la del estado de ahora: con dos cambios seguidos, la
        // del primero puede llegar tarde y decidiría el botón del segundo
        .then((data) => {
          setCompetition((prev) =>
            prev.status === data.status
              ? // Y los ajustes de stroke play: al cerrar, «categorías iguales»
                // guarda los límites que repartió (PR 8)
                {
                  ...prev,
                  canDelete: data.canDelete,
                  teamsAssigned: data.teamsAssigned,
                  strokePlay: data.strokePlay,
                }
              : prev,
          );
          // Lo de los hándicaps cambia al cerrar (FE #824, PR 5) y vale sea cual
          // sea el estado, pero no pisa lo de una lectura más nueva de la tarjeta
          // (/code-review). Aparte: si gasta el turno, se pinta (revisor)
          if (lecturasDeLaFicha.aplicar(turno)) {
            setCompetition((prev) => ({
              ...prev,
              handicapUpdate: data.handicapUpdate,
              handicapUpdateWindow: data.handicapUpdateWindow,
            }));
          }
          return data;
        })
        .catch(() => {
          setCompetition((prev) => ({ ...prev, canDelete: false }));
          return null;
        })
    );
  };

  const handleStatusChange = async (action) => {
    // Validate golf courses approval status before activation
    if (action === 'activate') {
      try {
        const golfCoursesResult =
          await getCompetitionGolfCoursesUseCase.execute(id);
        const golfCourses = aCamposDeLaCompeticion(golfCoursesResult);

        if (golfCourses.length === 0) {
          customToast.error(t('detail.errors.noGolfCourses'));
          return;
        }

        const pendingCourses = golfCourses.filter(
          (gc) => gc.approvalStatus === 'PENDING_APPROVAL',
        );
        if (pendingCourses.length > 0) {
          const courseNames = pendingCourses.map((gc) => gc.name).join(', ');
          customToast.error(
            t('detail.errors.golfCoursesPendingApproval', {
              courses: courseNames,
            }),
          );
          return;
        }

        const rejectedCourses = golfCourses.filter(
          (gc) => gc.approvalStatus === 'REJECTED',
        );
        if (rejectedCourses.length > 0) {
          const courseNames = rejectedCourses.map((gc) => gc.name).join(', ');
          customToast.error(
            t('detail.errors.golfCoursesRejected', { courses: courseNames }),
          );
          return;
        }
      } catch (error) {
        console.error('Error validating golf courses for activation:', error);
        customToast.error(t('detail.errors.golfCoursesFetchFailed'));
        return;
      }
    }

    // Con franjas y alguien sin plaza, el servidor no deja cerrar: se dice
    // antes, con sus nombres, y se lleva a colocarlos (QA del 11 oct 2026).
    // Sin ninguna franja con hoja, lo decide el servidor
    if (action === 'close-enrollments' && esStrokePlay) {
      const conHoja = (agendaLeida?.rounds ?? []).filter((r) => r.teeSheet);
      const faltan =
        conHoja.length > 0 ? sinFranja(conHoja, approvedEnrollments) : [];
      if (faltan.length > 0) {
        const datos = {
          count: faltan.length,
          jugadores: faltan
            .map((e) => e.userName || t('detail.unknownUser'))
            .join(', '),
        };
        const ir = await preguntar('closeWithoutTeeWindow', { datos });
        // Se releen siempre: lo pintado puede ser viejo (alguien cogió plaza
        // en su móvil) y el siguiente intento lo miraría con lo de antes (revisor)
        setVersionFranjas((v) => v + 1);
        if (ir) setIrASinFranja((v) => v + 1);
        return;
      }
    }

    if (!(await preguntar(action, { destructiva: action === 'cancel' }))) {
      return;
    }

    setIsProcessing(true);
    try {
      let result;
      switch (action) {
        case 'activate':
          result = await activateCompetitionUseCase.execute(id);
          customToast.success(t('detail.success.activated'));
          break;
        case 'close-enrollments':
          result = await closeEnrollmentsUseCase.execute(id);
          customToast.success(t('detail.success.enrollmentsClosed'));
          // Formados, quedan así (29 oct 2026): al volver a cerrar una reabierta
          // no se reparten otra vez, que el servidor lo rechaza (revisor)
          if (
            competition.teamAssignment === 'AUTOMATIC' &&
            !competition.teamsAssigned
          ) {
            try {
              await assignTeamsUseCase.execute(id, { mode: 'AUTOMATIC' });
              customToast.success(t('detail.success.teamsAutoAssigned'));
            } catch (assignError) {
              console.error('Error auto-assigning teams:', assignError);
              customToast.error(porQueNoSeFormaron(t, assignError));
              yaLosHabia(assignError, setCompetition);
            }
          }
          break;
        case 'start':
          result = await startCompetitionUseCase.execute(id);
          customToast.success(t('detail.success.started'));
          break;
        case 'complete':
          result = await completeCompetitionUseCase.execute(id);
          customToast.success(t('detail.success.completed'));
          break;
        case 'cancel':
          result = await cancelCompetitionUseCase.execute(id);
          customToast.success(t('detail.success.cancelled'));
          break;
        case 'reopen-enrollments':
          result = await reopenEnrollmentsUseCase.execute(id);
          customToast.success(t('detail.success.enrollmentsReopened'));
          break;
        case 'revert-status':
          result = await revertCompetitionStatusUseCase.execute(id);
          customToast.success(t('detail.success.statusReverted'));
          break;
        case 'revert-to-in-progress':
          result = await revertCompetitionToInProgressUseCase.execute(id);
          customToast.success(t('detail.success.revertedToInProgress'));
          break;
        default:
          throw new Error('Invalid action');
      }

      // Update only the changed fields (status and updatedAt)
      setCompetition((prev) => ({
        ...prev,
        status: result.status,
        updatedAt: result.updatedAt,
      }));
      const fichaReleida = refrescarCanDelete();
      // Con otro estado, el personalizado puede dejar de poderse cambiar: el
      // editor abierto se cierra (/code-review)
      setEditingHandicapId(null);
      setSinHandicap(new Set());
      // Al cerrar (o reabrir) un stroke play se fija (o se suelta) el hándicap
      // de cada uno y su categoría: la lista de antes no lo trae (FE #824,
      // PR 5). Solo en stroke play: en una Ryder nada de eso cambia
      // Con su turno: una lectura vieja de la tarjeta no la pisa (revisor)
      if (esStrokePlay) {
        const deLaLista = lecturasDeInscripciones.turno();
        const listaReleida = listEnrollmentsUseCase
          .execute(id)
          .then((lista) => {
            if (lecturasDeInscripciones.aplicar(deLaLista))
              setEnrollments(lista);
            return lista;
          })
          .catch((e) => {
            console.error(
              'Error reloading enrollments after status change:',
              e,
            );
            return null;
          });
        // Al cerrar, si salen menos categorías se le dice al organizador (PR 8):
        // con las DOS lecturas ya hechas —los límites que se guardaron y la
        // categoría de cada uno—. Con lo que fuera llegando, el orden decidía
        // el motivo (revisor)
        if (action === 'close-enrollments') {
          // Y el aviso de la ficha espera también: con una lectura sí y la
          // otra no, saldría con los límites de antes (/code-review)
          setReleyendoTrasCerrar(true);
          // Esperadas: hasta que llegan, los botones siguen desactivados; si no,
          // «Iniciar» deprisa sacaba el toast con la competición ya en juego
          // (CodeRabbit)
          await Promise.all([fichaReleida, listaReleida])
            .then(([ficha, lista]) => {
              if (!ficha?.strokePlay || !lista) return;
              const aprobados = lista.filter((e) => e.status === 'APPROVED');
              const aviso = categoriasQueSalen(
                ficha.strokePlay,
                aprobados.map((e) => e.category ?? null),
              );
              if (aviso)
                customToast.warning(
                  t(`detail.fewerCategories.${aviso.motivo}`, {
                    ...aviso,
                    count: aviso.salen,
                  }),
                );
            })
            .finally(() => setReleyendoTrasCerrar(false));
        }
      }
    } catch (error) {
      console.error(`Error ${action}:`, error);
      console.error(
        'Error details:',
        error.stack || error.message || String(error),
      );
      // Un stroke play no se cierra ni se inicia con aprobados sin franja: se
      // dice quiénes y se lleva a «Sin franja», donde se colocan (FE #824)
      // Y sin hándicap tampoco se cierra: se dice quiénes, se marcan en la lista
      // y se abre el personalizado del primero (Agustín, 11 oct 2026)
      // Los textos, los de aquí (dicen qué hacer en esta pantalla), montados
      // con la cuenta y los nombres como en el resto de avisos con jugadores
      if (error?.errorCode === 'PLAYERS_WITHOUT_HANDICAP') {
        const faltan = error.data?.players || [];
        customToast.error(
          mensajeConJugadores(t, error, 'detail.errors', [
            'PLAYERS_WITHOUT_HANDICAP',
          ]),
        );
        setSinHandicap(new Set(faltan.map((p) => p.user_id)));
        // Con la lista releída: el que falta puede no estar en la de aquí
        // (otra pestaña, una aprobación reciente) (/code-review)
        try {
          const lista = await listEnrollmentsUseCase.execute(id);
          setEnrollments(lista);
          const primero = lista.find(
            (e) =>
              e.status === 'APPROVED' &&
              faltan.some((p) => p.user_id === e.userId),
          );
          if (primero) {
            handleStartEditHandicap(primero);
            document
              .querySelector(`[data-testid="aprobado-${primero.userId}"]`)
              ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        } catch (e) {
          console.error(
            'Error reloading enrollments after missing handicaps:',
            e,
          );
        }
        return;
      }
      if (error?.errorCode === 'PLAYERS_WITHOUT_TEE_WINDOW') {
        customToast.error(
          mensajeConJugadores(t, error, 'detail.errors', [
            'PLAYERS_WITHOUT_TEE_WINDOW',
          ]),
        );
        // Lo pintado puede estar viejo: se releen las franjas, y con lo releído
        // se lleva a «Sin franja» (allí se espera a que aparezca)
        setVersionFranjas((v) => v + 1);
        setIrASinFranja((v) => v + 1);
        return;
      }
      customToast.error(error.message || t('detail.failedToUpdateCompetition'));
    } finally {
      setIsProcessing(false);
    }
  };

  const confirmarCapitanes = async (capitanes) => {
    const cerraba = competition.status === 'ACTIVE';
    setGuardandoCapitanes(true);
    try {
      const result = await nameCaptainsUseCase.execute(id, capitanes);
      setCompetition((prev) => ({
        ...prev,
        status: result.status,
        captains: { ...prev.captains, ...result.captains },
      }));
      setNombrandoCapitanes(false);
      customToast.success(
        t(
          cerraba
            ? 'detail.success.captainsNamed'
            : 'detail.success.captainsChanged',
        ),
      );
      if (result.unevenTeams) {
        // Aviso, no bloqueo: los capitanes quedan nombrados. El reparto
        // automático no se intenta, porque con impares el servidor lo rechaza
        customToast.warning(
          t('detail.captains.uneven', { count: result.totalPlayers }),
        );
      } else if (cerraba && competition.teamAssignment === 'AUTOMATIC') {
        // Lo mismo que hacía «Cerrar inscripciones»: el reparto automático vive
        // aquí, en el navegador, hasta que lo haga el servidor
        try {
          await assignTeamsUseCase.execute(id, { mode: 'AUTOMATIC' });
          // Con equipos, «Cambiar capitanes» ya no se ofrece: fallaría siempre
          setCompetition((prev) => ({ ...prev, teamsAssigned: true }));
          customToast.success(t('detail.success.teamsAutoAssigned'));
        } catch (assignError) {
          console.error('Error auto-assigning teams:', assignError);
          customToast.error(porQueNoSeFormaron(t, assignError));
          yaLosHabia(assignError, setCompetition);
        }
      }
      refrescarCanDelete();
    } catch (error) {
      console.error('Error naming captains:', error);
      // El motivo del servidor tal cual («ya hay equipos»...): dice qué hacer.
      // El modal sigue abierto para corregir la elección
      customToast.error(
        mensajeDeError(error, {
          sinConexion: t('common:sinConexion.mensaje'),
          generico: t('detail.captains.failed'),
        }),
      );
    } finally {
      setGuardandoCapitanes(false);
    }
  };

  const handleDelete = () => setConfirmandoBorrado(true);

  const confirmarBorrado = async () => {
    setBorrando(true);
    try {
      await deleteCompetitionUseCase.execute(id);
      customToast.success(t('detail.success.deleted'));
      navigate('/competitions');
    } catch (error) {
      console.error('Error deleting competition:', error);
      // El motivo del servidor se enseña tal cual («ya tiene calendario»...):
      // es lo que dice qué hacer. Sin red o sin respuesta, el texto de la app
      customToast.error(
        mensajeDeError(error, {
          sinConexion: t('common:sinConexion.mensaje'),
          generico: t('detail.failedToDeleteCompetition'),
        }),
      );
      setConfirmandoBorrado(false);
    } finally {
      setBorrando(false);
    }
  };

  return {
    releerTrasQuitar,
    handleQuitar,
    refrescarCanDelete,
    handleStatusChange,
    confirmarCapitanes,
    handleDelete,
    confirmarBorrado,
  };
};
