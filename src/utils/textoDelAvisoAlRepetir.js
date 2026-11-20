import { Gender } from '../domain/value_objects/Gender';

// La barra de un aviso: color y género (el campo puede tener las amarillas de
// hombre y no las de mujer), o «sin barra». No es `nombreDeLaBarra`: va dentro
// de una frase, así que el género se escribe («amarillas de hombre») en vez
// de «(M)»; y el aviso guarda solo color y género, no el nombre propio que
// tenía la barra (ya no está en el campo)
const GENERO_DE_LA_BARRA = {
  [Gender.MALE]: 'male',
  [Gender.FEMALE]: 'female',
  MIXED: 'mixed',
};
const barraDelAviso = (t, tCampos, aviso) => {
  const color = tCampos(`form.teeColors.${aviso.color}`, {
    defaultValue: aviso.color,
  });
  const genero = GENERO_DE_LA_BARRA[aviso.genero];
  return genero
    ? `${color} ${t(`create.teePanel.${genero}`).toLowerCase()}`
    : color;
};

// El texto de cada aviso de lo que no se pudo copiar al repetir (FE #1021).
// `t` es el de quickMatch y `tCampos` el de golfCourses: llegan de fuera para
// que esto no dependa de React
export const textoDelAviso = (t, tCampos, aviso) => {
  if (aviso.tipo === 'campo') return t('create.repetir.avisoCampo');
  if (aviso.tipo === 'noAmigo')
    return t('create.repetir.avisoNoAmigo', { nombre: aviso.nombre });
  if (aviso.tipo === 'invitado')
    return t('create.repetir.avisoInvitado', { nombre: aviso.nombre });
  if (aviso.tipo === 'faltan') return t('create.repetir.avisoFaltan');
  if (aviso.tipo === 'sinBarra') {
    return aviso.propia
      ? t('create.repetir.avisoMiBarraNueva')
      : t('create.repetir.avisoBarraNueva', { nombre: aviso.nombre });
  }
  const barra = barraDelAviso(t, tCampos, aviso);
  if (aviso.propia) return t('create.repetir.avisoMiBarra', { barra });
  return t('create.repetir.avisoBarra', { nombre: aviso.nombre, barra });
};
