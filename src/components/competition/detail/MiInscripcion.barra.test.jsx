import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import MiInscripcion from './MiInscripcion';
import FilaDeAprobado from './FilaDeAprobado';

const t = (clave, v) => (v ? `${clave} ${JSON.stringify(v)}` : clave);
const competition = {
  status: 'ACTIVE',
  captains: {},
  team1Name: 'A',
  team2Name: 'B',
};
const mia = (extra = {}) => ({
  id: 'e1',
  userId: 'ana',
  status: 'APPROVED',
  color: null,
  ...extra,
});
const pintaMia = (props = {}) =>
  render(
    <MiInscripcion
      competition={competition}
      user={{ id: 'ana' }}
      generoDelUsuario="FEMALE"
      t={t}
      i18n={{ language: 'es' }}
      isCreator={false}
      userEnrollment={mia()}
      {...props}
    />,
  );

/**
 * Mi barra en la ficha (FE #1214, F3): la elegida o la de por defecto de mi
 * género, y «Cambiar barra» solo si puedo.
 */
describe('MiInscripcion · mi barra', () => {
  it('sin elegir: la de por defecto de mi género', () => {
    pintaMia();
    expect(screen.getByTestId('mi-barra')).toHaveTextContent(
      'detail.tee.default {"color":"golfCourses:form.teeColors.RED"}',
    );
  });

  it('elegida: esa', () => {
    pintaMia({ userEnrollment: mia({ color: 'BLUE' }) });
    expect(screen.getByTestId('mi-barra')).toHaveTextContent(
      'golfCourses:form.teeColors.BLUE',
    );
  });

  it('si puedo, el botón abre el cambio con mi inscripción', () => {
    const onCambiarMiBarra = vi.fn();
    pintaMia({ puedeCambiarMiBarra: true, onCambiarMiBarra });
    fireEvent.click(screen.getByText('detail.tee.change'));
    expect(onCambiarMiBarra).toHaveBeenCalledWith(mia());
  });

  it('si no puedo, no hay botón; sin aprobar, no se dice la barra', () => {
    pintaMia();
    expect(screen.queryByText('detail.tee.change')).not.toBeInTheDocument();
    pintaMia({ userEnrollment: mia({ status: 'REQUESTED' }) });
    expect(screen.getAllByTestId('mi-barra')).toHaveLength(1);
  });
});

/**
 * «Cambiar barra» en la lista de inscritos (F4): por jugador, solo a quien
 * puede, con la barra elegida si la tiene.
 */
describe('FilaDeAprobado · cambiar su barra', () => {
  const pintaFila = (props = {}) =>
    render(
      <FilaDeAprobado
        enrollment={mia({ userName: 'Ana', color: 'RED' })}
        competition={competition}
        t={t}
        i18n={{ language: 'es' }}
        canManage
        esStrokePlay={false}
        sinHandicap={new Set()}
        {...props}
      />,
    );

  it('si puede, el botón abre el cambio de ese jugador', () => {
    const onCambiarBarra = vi.fn();
    pintaFila({ puedeCambiarSuBarra: () => true, onCambiarBarra });
    const boton = screen.getByTestId('cambiar-barra-ana');
    expect(boton).toHaveTextContent('golfCourses:form.teeColors.RED');
    fireEvent.click(boton);
    expect(onCambiarBarra).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'e1' }),
    );
  });

  it('si no puede, no hay botón', () => {
    pintaFila({ puedeCambiarSuBarra: () => false, onCambiarBarra: vi.fn() });
    expect(screen.queryByTestId('cambiar-barra-ana')).not.toBeInTheDocument();
  });
});
