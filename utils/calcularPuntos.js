export function calcularPuntos(real, pred, titulo, poolTerceros = []) {
  let res = { clase: '', pts: 0, show: false };
  if (!real || !pred || real === '-' || pred === '-' || real === '' || pred === '') return res;

  let t = titulo ? titulo.toLowerCase() : '';
  let pNorm = pred.toString().trim().toLowerCase();
  let rNorm = real.toString().trim().toLowerCase();

  if (!t.includes(' vs ')) {
    let esTercero = (t.includes('mejor 3er') || t.includes('terceros') || t.includes('selecciona al mejor tercero'));
    let acierto = esTercero ? poolTerceros.map(x => x.toLowerCase()).includes(pNorm) : (rNorm === pNorm);
    if (acierto) {
      res.show = true;
      res.clase = 'exact';
      if (t.includes('subcampeón') || t.includes('sub campeon') || t.includes('subcampeon')) res.pts = 20;
      else if (t.includes('campeon del mundo') || t.includes('campeón del mundo') || t.includes('campeona')) res.pts = 30;
      else if (t.includes('tercer lugar') || t.includes('3er lugar')) res.pts = 10;
      else if (t.includes('cuarto lugar') || t.includes('4to lugar')) res.pts = 5;
      else if (t.includes('líder') || t.includes('lider')) res.pts = 10;
      else if (esTercero) res.pts = 5;
      else if (t.includes('goleador') || t.includes('portero')) res.pts = 15;
      else res.pts = 5;
    } else {
      res.clase = 'wrong';
      res.pts = 0;
    }
    return res;
  }

  let r, p;
  try {
    r = real.toString().split('-').map(Number);
    p = pred.toString().split('-').map(Number);
  } catch (e) { return res; }

  if (r.length < 2 || p.length < 2) return res;
  if (isNaN(r[0]) || isNaN(r[1]) || isNaN(p[0]) || isNaN(p[1])) return res;

  res.show = true;

  if (r[0] === p[0] && r[1] === p[1]) {
    res.clase = 'exact';
    res.pts = 5;
  } else if (Math.sign(r[0] - r[1]) === Math.sign(p[0] - p[1])) {
    res.clase = 'winner';
    res.pts = Math.max(1, 5 - (Math.abs(r[0] - p[0]) + Math.abs(r[1] - p[1])));
  } else {
    res.clase = 'wrong';
    res.pts = 0;
  }

  return res;
}

export function calcularPuntosPartido(golesLocalReal, golesVisitaReal, golesLocalPred, golesVisitaPred) {
  if (golesLocalReal === null || golesLocalReal === undefined) return { pts: 0, tipo: 'pending' };
  if (golesLocalPred === null || golesLocalPred === undefined) return { pts: 0, tipo: 'pending' };

  const r = [parseInt(golesLocalReal), parseInt(golesVisitaReal)];
  const p = [parseInt(golesLocalPred), parseInt(golesVisitaPred)];

  if (isNaN(r[0]) || isNaN(r[1]) || isNaN(p[0]) || isNaN(p[1])) return { pts: 0, tipo: 'pending' };

  if (r[0] === p[0] && r[1] === p[1]) {
    return { pts: 5, tipo: 'exact' };
  } else if (Math.sign(r[0] - r[1]) === Math.sign(p[0] - p[1])) {
    const pts = Math.max(1, 5 - (Math.abs(r[0] - p[0]) + Math.abs(r[1] - p[1])));
    return { pts, tipo: 'winner' };
  } else {
    return { pts: 0, tipo: 'wrong' };
  }
}