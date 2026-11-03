import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import TeeColorBadge from '../golf_course/TeeColorBadge';
import TeeSelectField from './TeeSelectField';
import TeeSelectPanel from './TeeSelectPanel';
import { teeKey } from './createQuickMatchModalConstants';
import { barrasDeMiGenero } from '../../utils/barraPorDefecto';

/**
 * «Tu barra» en el paso 1 (FE #1025): las de tu género (y las mixtas) como
 * botones, a la vista y con una ya elegida, y «Otras» para las del otro
 * género en el panel de siempre. Todas como botones planos no: en un campo
 * federado cada color viene dos veces, y se elegía la del otro género sin
 * notarlo (por eso existe el panel, `TeeSelectField`). Sin género en el
 * perfil se queda ese campo, tal cual.
 */
const SUFIJO = { MALE: ' (M)', FEMALE: ' (F)' };

const BarrasDeTuGenero = ({ t, courseTees, genero, value, onChange }) => {
  const { t: tCampos } = useTranslation('golfCourses');
  const [otrasAbiertas, setOtrasAbiertas] = useState(false);
  // El sufijo (M)/(F) solo en la del otro género: todas las demás son tuyas
  // (o mixtas), y ponerlo en cada botón era ruido. El nombre accesible es
  // exactamente lo que se ve, para que el control por voz lo encuentre
  const generoVisible = (tee) => (tee.gender && tee.gender !== genero ? tee.gender : null);
  const nombreDe = (tee) =>
    (tee.identifier || tCampos(`form.teeColors.${tee.color}`, { defaultValue: tee.color })) +
    (SUFIJO[generoVisible(tee)] ?? '');
  const mias = barrasDeMiGenero(courseTees, genero);

  if (!mias) {
    return (
      <TeeSelectField
        value={value}
        onChange={onChange}
        courseTees={courseTees}
        placeholder={t('create.course.yourTeePlaceholder')}
        playerName={t('create.course.yourTeePanelTitle')}
        testIdPrefix="quick-match-creator-tee"
      />
    );
  }

  // La elegida en «Otras» (del otro género) también se ve, marcada, delante
  const elegidaDeOtras = courseTees.find(
    (tee) => teeKey(tee.color, tee.gender) === value && !mias.includes(tee)
  );
  const botones = elegidaDeOtras ? [elegidaDeOtras, ...mias] : mias;

  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label={t('create.course.yourTeeLabel')}>
      {botones.map((tee) => {
        const clave = teeKey(tee.color, tee.gender);
        const elegida = clave === value;
        return (
          <button
            key={clave}
            type="button"
            onClick={() => onChange(clave)}
            aria-label={nombreDe(tee)}
            aria-pressed={elegida}
            data-testid={`quick-match-creator-tee-option-${clave}`}
            className={`px-2 py-1 rounded-lg border transition-colors ${
              elegida ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <TeeColorBadge color={tee.color} identifier={tee.identifier} gender={generoVisible(tee)} />
          </button>
        );
      })}
      {mias.length < courseTees.length && (
        <button
          type="button"
          onClick={() => setOtrasAbiertas(true)}
          aria-haspopup="dialog"
          data-testid="quick-match-creator-tee-otras"
          className="px-3 py-1 rounded-lg border border-dashed border-gray-300 text-sm text-gray-600 hover:border-gray-400"
        >
          {t('create.course.otrasBarras')} <span aria-hidden="true">&rsaquo;</span>
        </button>
      )}
      {otrasAbiertas && (
        <TeeSelectPanel
          courseTees={courseTees}
          playerName={t('create.course.yourTeePanelTitle')}
          selectedKey={value}
          onSelect={(clave) => {
            setOtrasAbiertas(false);
            onChange(clave);
          }}
          onClose={() => setOtrasAbiertas(false)}
        />
      )}
    </div>
  );
};

export default BarrasDeTuGenero;
