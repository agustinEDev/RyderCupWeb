# Arte fuente de la marca

De aqui salieron los iconos que sirve la aplicacion. **No se sirven**: esta
carpeta esta fuera de `public/`, asi que Vite no la copia a `dist` — antes vivian
en `public/images/` y se publicaban ~235 KB que ningun sitio referenciaba.

| Fichero | Que es |
|---|---|
| `source/rcf-monogram-green.jpeg` | Monograma en verde, original |
| `source/rcf-monogram-black.jpeg` | Monograma en negro |
| `source/rcf-logo-green.jpeg` | Logotipo completo en verde |
| `source/rcf-logo-black.jpeg` | Logotipo completo en negro |
| `source/logos.jpeg` | Hoja con las variantes juntas |

## Lo que se sirve, y de donde sale

- `public/images/rcf-monogram-green.png` y `rcf-monogram-white.png` — las dos
  tintas que pinta `src/components/ui/BrandMark.jsx`, recortadas del monograma
  verde: fondo a transparente, recorte a la caja de la tinta y 160 px de ancho.
  Pesan 6,5 KB y 3,4 KB.
- `public/icons/*` — favicon, `apple-touch-icon` y los iconos de la PWA, que se
  generaron de estas fuentes el 5 de agosto de 2026.

Los JPEG **no tienen canal alfa y su fondo es blanco solido**: puestos tal cual
sobre el panel oscuro de las pantallas de autenticacion, enmarcan la marca en un
recuadro blanco. Por eso lo que se sirve son PNG recortados y no el original.
