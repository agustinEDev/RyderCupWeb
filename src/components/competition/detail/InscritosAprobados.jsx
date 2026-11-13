import { Users } from 'lucide-react';
import Plegable from '../../ui/Plegable';
import TituloConNumero from '../../ui/TituloConNumero';
import { ordenarAprobados } from '../../../utils/fichaDeLaCompeticion';
import FilaDeAprobado from './FilaDeAprobado';

/**
 * Los inscritos aprobados, visibles para todos los que han entrado: plegados
 * con la competición en juego, y con el aviso de quien solo ve a sus amigos.
 * Lo de cada fila va tal cual a `FilaDeAprobado`.
 */
const InscritosAprobados = ({
  t,
  canManage,
  conClasificacion,
  approvedEnrollments,
  approvedCount,
  listaAMedias,
  noVeANadie,
  esStrokePlay,
  ...fila
}) => (
  <div
    className="p-4"
  >
    <Plegable
      abiertoAlPrincipio={!conClasificacion}
      claseDelTitulo="text-base sm:text-lg"
      titulo={
        <>
          <Users className="w-5 h-5 flex-none text-green-600" />
          <TituloConNumero
            texto={t('detail.approvedPlayers')}
            numero={canManage ? approvedEnrollments.length : approvedCount}
          />
        </>
      }
    >

      {listaAMedias && (
        <p className="mb-3 text-sm text-gray-600">
          {t(noVeANadie ? 'detail.onlyParticipantsSee' : 'detail.onlyFriendsVisible')}
        </p>
      )}
      {approvedEnrollments.length === 0 ? (
        !listaAMedias && (
          <div className="text-center py-8 text-gray-500">
            <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>{t('detail.noApprovedPlayers')}</p>
          </div>
        )
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {ordenarAprobados(approvedEnrollments, esStrokePlay).map((enrollment) => (
            <FilaDeAprobado
              key={enrollment.id}
              enrollment={enrollment}
              t={t}
              canManage={canManage}
              esStrokePlay={esStrokePlay}
              {...fila}
            />
          ))}
        </div>
      )}
    </Plegable>
  </div>
);

export default InscritosAprobados;
