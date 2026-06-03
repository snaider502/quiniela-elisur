import { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, ActivityIndicator, Image } from 'react-native';
import { supabase } from '../lib/supabase';

const BANDERAS = {
  'méxico': 'mx', 'sudáfrica': 'za', 'corea del sur': 'kr',
  'canadá': 'ca', 'estados unidos': 'us', 'paraguay': 'py',
  'catar': 'qa', 'suiza': 'ch', 'haití': 'ht', 'escocia': 'gb-sct',
  'países bajos': 'nl', 'japón': 'jp', 'alemania': 'de',
  'costa de marfil': 'ci', 'inglaterra': 'gb-eng', 'croacia': 'hr',
  'españa': 'es', 'cabo verde': 'cv', 'irán': 'ir', 'nueva zelanda': 'nz',
  'arabia saudita': 'sa', 'uruguay': 'uy', 'argentina': 'ar',
  'argelia': 'dz', 'noruega': 'no', 'senegal': 'sn', 'marruecos': 'ma',
  'bélgica': 'be', 'austria': 'at', 'ecuador': 'ec', 'curazao': 'cw',
  'brasil': 'br', 'túnez': 'tn', 'jordania': 'jo', 'ghana': 'gh',
  'portugal': 'pt', 'colombia': 'co', 'uzbekistán': 'uz',
  'australia': 'au', 'francia': 'fr', 'egipto': 'eg', 'panamá': 'pa',
  ' suecia': 'se',' Suecia': 'se', 'turquía': 'tr', 'turquia': 'tr',
  'república checa': 'cz', 'republica checa': 'cz', 'chequia': 'cz',
  'bosnia y herzegovina': 'ba', 'bosnia': 'ba', 'italia': 'it',
  'r. d. congo': 'cd', 'república democrática del congo': 'cd', 'rd congo': 'cd',
  'jamaica': 'jm', 'irak': 'iq', 'iraq': 'iq', 'bolivia': 'bo',
  'nueva caledonia': 'nc', 'surinam': 'sr',
};

const GRUPOS = ['TODOS', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'R16', 'R8', 'R4', 'SEMI', 'FINAL'];
const FASES = ['Fase eliminatoria 16', 'Fase eliminatoria 8', 'Fase eliminatoria 4', 'SEMI-FINAL', 'TERCER LUGAR', 'FINAL'];

function getBandera(pais) {
  if (!pais) return null;
  const code = BANDERAS[pais.toLowerCase()];
  return code ? `https://flagcdn.com/h20/${code}.png` : null;
}

function mapearGrupo(filtro) {
  const mapa = {
    'R16': 'Fase eliminatoria 16', 'R8': 'Fase eliminatoria 8',
    'R4': 'Fase eliminatoria 4', 'SEMI': 'SEMI-FINAL', 'FINAL': 'FINAL',
  };
  return mapa[filtro] || filtro;
}

function calcularTablaGrupo(partidos, resultados) {
  const equipos = {};
  partidos.forEach(partido => {
    const res = resultados[partido.id];
    const local = partido.equipo_local;
    const visita = partido.equipo_visita;
    if (!equipos[local]) equipos[local] = { nombre: local, pj: 0, pg: 0, pe: 0, pp: 0, gf: 0, gc: 0, pts: 0 };
    if (!equipos[visita]) equipos[visita] = { nombre: visita, pj: 0, pg: 0, pe: 0, pp: 0, gf: 0, gc: 0, pts: 0 };
    if (res) {
      const gl = res.goles_local, gv = res.goles_visita;
      equipos[local].pj++; equipos[visita].pj++;
      equipos[local].gf += gl; equipos[local].gc += gv;
      equipos[visita].gf += gv; equipos[visita].gc += gl;
      if (gl > gv) { equipos[local].pg++; equipos[local].pts += 3; equipos[visita].pp++; }
      else if (gl < gv) { equipos[visita].pg++; equipos[visita].pts += 3; equipos[local].pp++; }
      else { equipos[local].pe++; equipos[local].pts++; equipos[visita].pe++; equipos[visita].pts++; }
    }
  });
  return Object.values(equipos).sort((a, b) => {
    if (b.pts !== a.pts) return b.pts - a.pts;
    const difB = b.gf - b.gc, difA = a.gf - a.gc;
    if (difB !== difA) return difB - difA;
    return b.gf - a.gf;
  });
}

export default function PartidosScreen({ recargar }) {
  const [partidos, setPartidos] = useState([]);
  const [resultadosMap, setResultadosMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [grupoActivo, setGrupoActivo] = useState('TODOS');
  const [partidosVivo, setPartidosVivo] = useState([]);
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    cargarPartidos();
    cargarPartidosEnVivo();
    const timerVivo = setInterval(cargarPartidosEnVivo, 60000);
    const timerCuenta = setInterval(() => forceUpdate(n => n + 1), 60000);
    return () => { clearInterval(timerVivo); clearInterval(timerCuenta); };
  }, []);

  useEffect(() => { if (recargar > 0) cargarPartidos(); }, [recargar]);

  async function cargarPartidos() {
    const [p, r] = await Promise.all([
      supabase.from('partidos').select('*').order('fecha', { ascending: true }),
      supabase.from('resultados').select('*'),
    ]);
    if (p.data) {
      const map = {};
      if (r.data) r.data.forEach(res => { map[res.partido_id] = res; });
      setResultadosMap(map);
      setPartidos(p.data.map(partido => ({ ...partido, resultado: map[partido.id] || null })));
    }
    setLoading(false);
  }

  async function cargarPartidosEnVivo() {
    try {
      const response = await fetch('https://v3.football.api-sports.io/fixtures?live=all&league=1&season=2026', {
        headers: { 'x-apisports-key': '6ee57b2b6714d69da8dfb1600d633ed3' }
      });
      const data = await response.json();
      if (data.response) setPartidosVivo(data.response);
    } catch (e) { console.log('Error live:', e); }
  }

  const grupoReal = mapearGrupo(grupoActivo);
  const partidosFiltrados = grupoActivo === 'TODOS' ? partidos : partidos.filter(p => p.grupo === grupoReal);
  const esGrupoSimple = grupoActivo !== 'TODOS' && !FASES.includes(grupoReal);
  const tablaGrupo = esGrupoSimple ? calcularTablaGrupo(partidosFiltrados, resultadosMap) : [];

  const ahora = new Date();
  const inicioMundial = new Date('2026-06-11T13:00:00');
  const diff = inicioMundial - ahora;
  const mundialIniciado = diff <= 0;
  const dias = Math.floor(diff / (1000 * 60 * 60 * 24));
  const horas = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutos = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  function formatearFecha(fecha) {
    if (!fecha) return '';
    const partes = fecha.split('T')[0].split('-');
    const meses = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
    return `${parseInt(partes[2])} ${meses[parseInt(partes[1])-1]}`;
  }

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#292663" /></View>;

  return (
    <View style={styles.container}>
      <FlatList
        data={partidosFiltrados}
        keyExtractor={item => item.id.toString()}
        stickyHeaderIndices={[0]}
        contentContainerStyle={{ padding: 12, paddingTop: 0 }}
        ListHeaderComponent={
          <>
            <View style={styles.filtrosWrapper}>
              <FlatList
                horizontal
                showsHorizontalScrollIndicator={false}
                data={GRUPOS}
                keyExtractor={g => g}
                contentContainerStyle={styles.filtrosContent}
                renderItem={({ item: g }) => (
                  <TouchableOpacity
                    style={[styles.filtroBtn, grupoActivo === g && styles.filtroBtnActivo]}
                    onPress={() => setGrupoActivo(g)}>
                    <Text style={[styles.filtroTxt, grupoActivo === g && styles.filtroTxtActivo]}>{g}</Text>
                  </TouchableOpacity>
                )}
              />
            </View>

            {!mundialIniciado && (
              <View style={styles.cuentaContainer}>
                <Text style={styles.cuentaTitulo}>🏆 FIFA World Cup 2026</Text>
                <Text style={styles.cuentaSub}>El torneo más grande de la historia comienza en:</Text>
                <View style={styles.cuentaRow}>
                  <View style={styles.cuentaItem}>
                    <Text style={styles.cuentaNum}>{dias}</Text>
                    <Text style={styles.cuentaLabel}>días</Text>
                  </View>
                  <Text style={styles.cuentaDos}>:</Text>
                  <View style={styles.cuentaItem}>
                    <Text style={styles.cuentaNum}>{String(horas).padStart(2,'0')}</Text>
                    <Text style={styles.cuentaLabel}>hrs</Text>
                  </View>
                  <Text style={styles.cuentaDos}>:</Text>
                  <View style={styles.cuentaItem}>
                    <Text style={styles.cuentaNum}>{String(minutos).padStart(2,'0')}</Text>
                    <Text style={styles.cuentaLabel}>min</Text>
                  </View>
                </View>
                <Text style={styles.cuentaFecha}>11 Jun 2026 · México vs Sudáfrica · Estadio Azteca</Text>
                <View style={styles.cuentaStats}>
                  <View style={styles.cuentaStat}>
                    <Text style={styles.cuentaStatNum}>48</Text>
                    <Text style={styles.cuentaStatLabel}>Selecciones</Text>
                  </View>
                  <View style={styles.cuentaStat}>
                    <Text style={styles.cuentaStatNum}>104</Text>
                    <Text style={styles.cuentaStatLabel}>Partidos</Text>
                  </View>
                  <View style={styles.cuentaStat}>
                    <Text style={styles.cuentaStatNum}>16</Text>
                    <Text style={styles.cuentaStatLabel}>Estadios</Text>
                  </View>
                  <View style={styles.cuentaStat}>
                    <Text style={styles.cuentaStatNum}>3</Text>
                    <Text style={styles.cuentaStatLabel}>Países</Text>
                  </View>
                </View>
              </View>
            )}

            {mundialIniciado && partidosVivo.length > 0 && (
              <View style={styles.vivoContainer}>
                <Text style={styles.vivoTitle}>🔴 EN VIVO AHORA</Text>
                {partidosVivo.map(p => (
                  <View key={p.fixture.id} style={styles.vivoCard}>
                    <View style={styles.vivoTeams}>
                      <Text style={styles.vivoTeam} numberOfLines={1}>{p.teams.home.name}</Text>
                      <View style={styles.vivoScore}>
                        <Text style={styles.vivoScoreTxt}>{p.goals.home ?? 0} - {p.goals.away ?? 0}</Text>
                        <Text style={styles.vivoMinuto}>{p.fixture.status.elapsed}'</Text>
                      </View>
                      <Text style={[styles.vivoTeam, { textAlign: 'right' }]} numberOfLines={1}>{p.teams.away.name}</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {esGrupoSimple && tablaGrupo.length > 0 && (
              <View style={styles.tablaContainer}>
                <Text style={styles.tablaTitulo}>Tabla Grupo {grupoActivo}</Text>
                <View style={styles.tablaHeader}>
                  <Text style={[styles.tablaCol, { flex: 2 }]}>Equipo</Text>
                  <Text style={styles.tablaCol}>PJ</Text>
                  <Text style={styles.tablaCol}>PG</Text>
                  <Text style={styles.tablaCol}>PE</Text>
                  <Text style={styles.tablaCol}>PP</Text>
                  <Text style={styles.tablaCol}>GF</Text>
                  <Text style={styles.tablaCol}>GC</Text>
                  <Text style={[styles.tablaCol, styles.tablaColPts]}>PTS</Text>
                </View>
                {tablaGrupo.map((equipo, i) => (
                  <View key={equipo.nombre} style={[styles.tablaFila, i % 2 === 0 && styles.tablaFilaPar, i < 2 && styles.tablaFilaClasifica]}>
                    <View style={[styles.equipoCell, { flex: 2 }]}>
                      <Text style={styles.tablaPosNum}>{i + 1}</Text>
                      {getBandera(equipo.nombre) && <Image source={{ uri: getBandera(equipo.nombre) }} style={styles.tablaBandera} />}
                      <Text style={styles.tablaEquipoNombre} numberOfLines={1}>{equipo.nombre}</Text>
                    </View>
                    <Text style={styles.tablaCol}>{equipo.pj}</Text>
                    <Text style={styles.tablaCol}>{equipo.pg}</Text>
                    <Text style={styles.tablaCol}>{equipo.pe}</Text>
                    <Text style={styles.tablaCol}>{equipo.pp}</Text>
                    <Text style={styles.tablaCol}>{equipo.gf}</Text>
                    <Text style={styles.tablaCol}>{equipo.gc}</Text>
                    <Text style={[styles.tablaCol, styles.tablaColPts]}>{equipo.pts}</Text>
                  </View>
                ))}
                <Text style={styles.tablaLeyenda}>🟢 Clasifica a siguiente ronda</Text>
              </View>
            )}
          </>
        }
        renderItem={({ item }) => (
          <View style={[styles.card, item.resultado && styles.cardConResultado]}>
            <View style={styles.cardTop}>
              <Text style={styles.grupoBadge}>
                {FASES.includes(item.grupo) ? item.grupo : `Grupo ${item.grupo}`}
              </Text>
              <Text style={styles.fecha}>{formatearFecha(item.fecha)}</Text>
              {item.resultado && <Text style={styles.finalTxt}>FINAL</Text>}
            </View>
            <View style={styles.cardMid}>
              <View style={styles.equipoContainer}>
                {getBandera(item.equipo_local) && <Image source={{ uri: getBandera(item.equipo_local) }} style={styles.bandera} />}
                <Text style={styles.equipo} numberOfLines={1}>{item.equipo_local}</Text>
              </View>
              <View style={[styles.scoreBox, item.resultado && styles.scoreBoxActivo]}>
                <Text style={styles.scoreTxt}>
                  {item.resultado ? `${item.resultado.goles_local} - ${item.resultado.goles_visita}` : 'vs'}
                </Text>
              </View>
              <View style={[styles.equipoContainer, { flexDirection: 'row-reverse' }]}>
                {getBandera(item.equipo_visita) && <Image source={{ uri: getBandera(item.equipo_visita) }} style={styles.bandera} />}
                <Text style={[styles.equipo, { textAlign: 'right' }]} numberOfLines={1}>{item.equipo_visita}</Text>
              </View>
            </View>
            <Text style={styles.estadio}>{item.estadio}</Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f2f5' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  filtrosWrapper: { backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#eee' },
  filtrosContent: { paddingHorizontal: 8, paddingVertical: 10 },
  filtroBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#f0f2f5', marginHorizontal: 4 },
  filtroBtnActivo: { backgroundColor: '#292663' },
  filtroTxt: { fontSize: 12, fontWeight: 'bold', color: '#555' },
  filtroTxtActivo: { color: 'white' },
  cuentaContainer: { backgroundColor: '#292663', borderRadius: 12, padding: 16, alignItems: 'center', marginBottom: 12, marginTop: 12 },
  cuentaTitulo: { color: 'white', fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
  cuentaSub: { color: 'rgba(255,255,255,0.7)', fontSize: 11, marginBottom: 12, textAlign: 'center' },
  cuentaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  cuentaItem: { backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8, alignItems: 'center', minWidth: 60 },
  cuentaNum: { color: 'white', fontSize: 28, fontWeight: 'bold' },
  cuentaLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 10, marginTop: 2 },
  cuentaDos: { color: 'white', fontSize: 24, fontWeight: 'bold', marginBottom: 8 },
  cuentaFecha: { color: 'rgba(255,255,255,0.8)', fontSize: 11, textAlign: 'center', marginBottom: 12 },
  cuentaStats: { flexDirection: 'row', gap: 16 },
  cuentaStat: { alignItems: 'center' },
  cuentaStatNum: { color: '#f9a825', fontSize: 18, fontWeight: 'bold' },
  cuentaStatLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 9 },
  vivoContainer: { backgroundColor: '#fff5f5', borderRadius: 12, padding: 12, borderLeftWidth: 4, borderLeftColor: '#c62828', marginBottom: 12 },
  vivoTitle: { fontSize: 12, fontWeight: 'bold', color: '#c62828', marginBottom: 8, letterSpacing: 0.5 },
  vivoCard: { backgroundColor: 'white', borderRadius: 8, padding: 10, marginBottom: 6, elevation: 1 },
  vivoTeams: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  vivoTeam: { flex: 1, fontSize: 12, fontWeight: 'bold', color: '#333' },
  vivoScore: { alignItems: 'center', paddingHorizontal: 12 },
  vivoScoreTxt: { fontSize: 16, fontWeight: 'bold', color: '#c62828' },
  vivoMinuto: { fontSize: 10, color: '#888' },
  tablaContainer: { backgroundColor: 'white', borderRadius: 12, padding: 12, marginBottom: 12, elevation: 2 },
  tablaTitulo: { fontSize: 14, fontWeight: 'bold', color: '#292663', marginBottom: 10, textAlign: 'center', textTransform: 'uppercase' },
  tablaHeader: { flexDirection: 'row', paddingVertical: 6, borderBottomWidth: 2, borderBottomColor: '#292663', marginBottom: 4 },
  tablaFila: { flexDirection: 'row', paddingVertical: 8, alignItems: 'center' },
  tablaFilaPar: { backgroundColor: '#f9f9f9' },
  tablaFilaClasifica: { borderLeftWidth: 3, borderLeftColor: '#292663' },
  tablaCol: { width: 28, textAlign: 'center', fontSize: 12, color: '#333' },
  tablaColPts: { fontWeight: 'bold', color: '#292663' },
  equipoCell: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  tablaPosNum: { fontSize: 11, color: '#888', width: 16, textAlign: 'center' },
  tablaBandera: { width: 18, height: 12, borderRadius: 2 },
  tablaEquipoNombre: { fontSize: 12, fontWeight: 'bold', color: '#333', flex: 1 },
  tablaLeyenda: { fontSize: 10, color: '#888', marginTop: 8, textAlign: 'center' },
  card: { backgroundColor: 'white', borderRadius: 12, padding: 12, marginBottom: 10, elevation: 2 },
  cardConResultado: { borderLeftWidth: 4, borderLeftColor: '#292663' },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  grupoBadge: { fontSize: 11, fontWeight: 'bold', color: '#292663', backgroundColor: '#e8f5e9', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  fecha: { fontSize: 11, color: '#888', flex: 1 },
  finalTxt: { fontSize: 10, fontWeight: 'bold', color: 'white', backgroundColor: '#292663', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  cardMid: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  equipoContainer: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  equipo: { flex: 1, fontSize: 13, fontWeight: 'bold', color: '#333' },
  bandera: { width: 24, height: 16, borderRadius: 2 },
  scoreBox: { backgroundColor: '#212529', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 6, marginHorizontal: 8 },
  scoreBoxActivo: { backgroundColor: '#292663' },
  scoreTxt: { color: 'white', fontWeight: 'bold', fontSize: 13 },
  estadio: { fontSize: 10, color: '#999', textAlign: 'center' },
});