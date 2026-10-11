import { describe, it, expect } from 'vitest';
import { CODIGOS_DE_PARTIDA, mensajeDeErrorDePartida } from './erroresDePartida';

const t = (clave, params) => (params ? `${clave} ${JSON.stringify(params)}` : clave);

describe('mensajeDeErrorDePartida (FE #824, PR 7)', () => {
  it.each(CODIGOS_DE_PARTIDA)('%s, traducido', (codigo) => {
    expect(mensajeDeErrorDePartida(t, { errorCode: codigo, message: 'detail' })).toBe(`partida.errors.${codigo}`);
  });

  it('SCORECARD_NOT_READY con los hoyos que faltan, nombrados', () => {
    expect(mensajeDeErrorDePartida(t, { errorCode: 'SCORECARD_NOT_READY', data: { holes: [7, 12] } })).toBe(
      'partida.errors.SCORECARD_NOT_READY_holes {"count":2,"hoyos":"7, 12"}'
    );
  });

  it('un código desconocido, el texto del servidor; sin nada, uno genérico', () => {
    expect(mensajeDeErrorDePartida(t, { errorCode: 'OTRO', message: 'detail' })).toBe('detail');
    expect(mensajeDeErrorDePartida(t, {})).toBe('partida.errors.generic');
  });
});
