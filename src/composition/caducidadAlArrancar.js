/**
 * Al cargar la aplicación, los avisos de golpes perdidos de más de 7 días salen del
 * móvil (FS-03, re-auditoría del 16 nov 2026), haya sesión o no y haya red o no.
 *
 * El vaciado de la cola también los purga, pero solo corre con sesión y con red: sin
 * esto, en un móvil compartido donde nadie vuelve a entrar se quedaban guardados, y la
 * política de privacidad dice que se borran a los 7 días. Los golpes caducados de la
 * cola no se tocan aquí: pasar a aviso es cosa del vaciado, con su cerrojo, para no
 * pisar a otra pestaña que esté enviando.
 */
import * as golpesPerdidos from '../utils/golpesPerdidos';

try {
  golpesPerdidos.purgaLosCaducados();
} catch {
  // Sin almacenamiento no hay nada que purgar; la lectura ya no enseña lo caducado
}
