import { useEffect } from 'react';

/**
 * Las barras del sistema en negro mientras dura quien lo usa: la ventana del
 * mapa del hoyo (19 oct). El iPhone instalado pinta la franja de la hora con el
 * fondo de la página y Android su barra con el theme-color; en negro, como un
 * marco del satélite. Al irse, lo que había. Safari sin instalar toma sus
 * colores de la página al cargarla y no se entera (probado en un iPhone).
 */
export function useBarrasNegras() {
  useEffect(() => {
    const html = document.documentElement;
    const { body } = document;
    const tema = document.head.querySelector('meta[name="theme-color"]');
    const antes = { html: html.style.backgroundColor, body: body.style.backgroundColor, tema: tema?.getAttribute('content') };
    html.style.backgroundColor = '#000000';
    body.style.backgroundColor = '#000000';
    tema?.setAttribute('content', '#000000');
    return () => {
      html.style.backgroundColor = antes.html;
      body.style.backgroundColor = antes.body;
      tema?.setAttribute('content', antes.tema);
    };
  }, []);
}
