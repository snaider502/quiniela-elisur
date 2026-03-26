export function calcularPuntos(real, pred, titulo, poolTerceros = []) {
  let res = { clase: '', pts: 0, show: false };
  if (real === '-' || pred === '-' || real === '' || pred === '') return res;

  let t = titulo.toLowerCase();
  let pNorm = pred.trim().toLowerCase();
  let rNorm = real.trim().toLowerCase();

  if (!t.includes(' vs ')) {
    let esTercero = (t.includes('mejor 3er') || t.includes('terceros'));
    let acierto = esTercero ? poolTerceros.includes(pNorm) : (rNorm === pNorm);
    if (acierto) {
      res.show = true;
      res.clase = 'exact';
      if (t.includes('subcampeón') || t.includes('sub campeon')) res.pts = 20;
      else if (t.includes('campeon del mundo') || t.includes('campeón')) res.pts = 30;
      else if (t.includes('tercer lugar')) res.pts = 10;
      else if (t.includes('cuarto lugar')) res.pts = 5;
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

  let r = real.split('-').map(Number);
  let p = pred.split('-').map(Number);
  if (r.length < 2 || p.length < 2) return res;

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