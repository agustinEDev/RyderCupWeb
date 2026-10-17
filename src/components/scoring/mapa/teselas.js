// Ortofoto del PNOA (IGN), la de más detalle de España; sus teselas permiten
// CORS. La usan el mapa del hoyo y el de revisar hoyos del admin (BE #575)
export const TESELAS_PNOA =
  'https://www.ign.es/wmts/pnoa-ma?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=OI.OrthoimageCoverage' +
  '&STYLE=default&TILEMATRIXSET=GoogleMapsCompatible&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}&FORMAT=image/jpeg';
