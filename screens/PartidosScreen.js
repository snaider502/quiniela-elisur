import { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, ActivityIndicator, Image } from 'react-native';
import { supabase } from '../lib/supabase';

const GRUPOS = ['TODOS', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'R16', 'R8', 'R4', 'SEMI', 'FINAL'];

const FASES = ['Fase eliminatoria 16', 'Fase eliminatoria 8', 'Fase eliminatoria 4', 'SEMI-FINAL', 'TERCER LUGAR', 'FINAL'];

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
};

function getBandera(pais) {
  if (!pais) return null;
  const code = BANDERAS[pais.toLowerCase()];
  return code ? `https://flagcdn.com/h20/${code}.png` : null;
}

function mapearGrupo(filtro) {
  const mapa = {
    'R16': 'Fase eliminatoria 16',
    'R8': 'Fase eliminatoria 8',
    'R4': 'Fase eliminatoria 4',
    'SEMI': 'SEMI-FINAL',
    'FINAL': 'FINAL',
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
      const gl = res.goles_local;
      const gv = res.goles_visita;
      equipos[local].pj++;
      equipos[visita].pj++;
      equipos[local].gf += gl;
      equipos[local].gc += gv;
      equipos[visita].gf += gv;
      equipos[visita].gc += gl;

      if (gl > gv) {
        equipos[local].pg++; equipos[local].pts += 3;
        equipos[visita].pp++;
      } else if (gl < gv) {
        equipos[visita].pg++; equipos[visita].pts += 3;
        equipos[local].pp++;
      } else {
        equipos[local].pe++; equipos[local].pts++;
        equipos[visita].pe++; equipos[visita].pts++;
      }
    }
  });

  return Object.values(equipos).sort((a, b) => {
    if (b.pts !== a.pts) return b.pts - a.pts;
    const difB = b.gf - b.gc;
    const difA = a.gf - a.gc;
    if (difB !== difA) return difB - difA;
    return b.gf - a.gf;
  });
}

export default function PartidosScreen() {
  const [partidos, setPartidos] = useState([]);
  const [resultadosMap, setResultadosMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [grupoActivo, setGrupoActivo] = useState('TODOS');

  useEffect(() => {
    cargarPartidos();
  }, []);

  async function cargarPartidos() {
    const [p, r] = await Promise.all([
      supabase.from('partidos').select('*').order('fecha', { ascending: true }),
      supabase.from('resultados').select('*'),
    ]);

    if (p.data) {
      const map = {};
      if (r.data) r.data.forEach(res => { map[res.partido_id] = res; });
      setResultadosMap(map);
      const partidosConResultado = p.data.map(partido => ({
        ...partido,
        resultado: map[partido.id] || null,
      }));
      setPartidos(partidosConResultado);
    }
    setLoading(false);
  }

  const grupoReal = mapearGrupo(grupoActivo);
  const partidosFiltrados = grupoActivo === 'TODOS'
    ? partidos
    : partidos.filter(p => p.grupo === grupoReal);

  const esGrupoSimple = grupoActivo !== 'TODOS' && !FASES.includes(grupoReal);
  const tablaGrupo = esGrupoSimple
    ? calcularTablaGrupo(partidosFiltrados, resultadosMap)
    : [];

  function formatearFecha(fecha) {
    if (!fecha) return '';
    const d = new Date(fecha);
    return d.getDate().toString().padStart(2, '0') + '/' +
      (d.getMonth() + 1).toString().padStart(2, '0') + ' ' +
      d.getHours().toString().padStart(2, '0') + ':' +
      d.getMinutes().toString().padStart(2, '0');
  }

  if (loading) return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color="#2e7d32" />
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>⚽ Partidos Mundial 2026</Text>
      </View>

      <FlatList
        horizontal
        data={GRUPOS}
        keyExtractor={g => g}
        showsHorizontalScrollIndicator={false}
        style={styles.filtros}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.filtroBtn, grupoActivo === item && styles.filtroBtnActivo]}
            onPress={() => setGrupoActivo(item)}>
            <Text style={[styles.filtroTxt, grupoActivo === item && styles.filtroTxtActivo]}>
              {item}
            </Text>
          </TouchableOpacity>
        )}
      />

      <FlatList
        data={partidosFiltrados}
        keyExtractor={item => item.id.toString()}
        contentContainerStyle={{ padding: 12 }}
        ListHeaderComponent={esGrupoSimple && tablaGrupo.length > 0 ? (
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
                  {getBandera(equipo.nombre) && (
                    <Image source={{ uri: getBandera(equipo.nombre) }} style={styles.tablaBandera} />
                  )}
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
        ) : null}
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
                {getBandera(item.equipo_local) && (
                  <Image source={{ uri: getBandera(item.equipo_local) }} style={styles.bandera} />
                )}
                <Text style={styles.equipo} numberOfLines={1}>{item.equipo_local}</Text>
              </View>
              <View style={[styles.scoreBox, item.resultado && styles.scoreBoxActivo]}>
                <Text style={styles.scoreTxt}>
                  {item.resultado
                    ? `${item.resultado.goles_local} - ${item.resultado.goles_visita}`
                    : 'vs'}
                </Text>
              </View>
              <View style={[styles.equipoContainer, { flexDirection: 'row-reverse' }]}>
                {getBandera(item.equipo_visita) && (
                  <Image source={{ uri: getBandera(item.equipo_visita) }} style={styles.bandera} />
                )}
                <Text style={[styles.equipo, { textAlign: 'right' }]} numberOfLines={1}>
                  {item.equipo_visita}
                </Text>
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
  header: { backgroundColor: '#2e7d32', padding: 20, alignItems: 'center' },
  headerText: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  filtros: { backgroundColor: 'white', paddingVertical: 10, paddingHorizontal: 8, maxHeight: 52 },
  filtroBtn: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, backgroundColor: '#f0f2f5', marginHorizontal: 4 },
  filtroBtnActivo: { backgroundColor: '#2e7d32' },
  filtroTxt: { fontSize: 12, fontWeight: 'bold', color: '#555' },
  filtroTxtActivo: { color: 'white' },
  tablaContainer: { backgroundColor: 'white', borderRadius: 12, padding: 12, marginBottom: 12, elevation: 2 },
  tablaTitulo: { fontSize: 14, fontWeight: 'bold', color: '#2e7d32', marginBottom: 10, textAlign: 'center', textTransform: 'uppercase' },
  tablaHeader: { flexDirection: 'row', paddingVertical: 6, borderBottomWidth: 2, borderBottomColor: '#2e7d32', marginBottom: 4 },
  tablaFila: { flexDirection: 'row', paddingVertical: 8, alignItems: 'center' },
  tablaFilaPar: { backgroundColor: '#f9f9f9' },
  tablaFilaClasifica: { borderLeftWidth: 3, borderLeftColor: '#2e7d32' },
  tablaCol: { width: 28, textAlign: 'center', fontSize: 12, color: '#333' },
  tablaColPts: { fontWeight: 'bold', color: '#2e7d32' },
  equipoCell: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  tablaPosNum: { fontSize: 11, color: '#888', width: 16, textAlign: 'center' },
  tablaBandera: { width: 18, height: 12, borderRadius: 2 },
  tablaEquipoNombre: { fontSize: 12, fontWeight: 'bold', color: '#333', flex: 1 },
  tablaLeyenda: { fontSize: 10, color: '#888', marginTop: 8, textAlign: 'center' },
  card: { backgroundColor: 'white', borderRadius: 12, padding: 12, marginBottom: 10, elevation: 2 },
  cardConResultado: { borderLeftWidth: 4, borderLeftColor: '#2e7d32' },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  grupoBadge: { fontSize: 11, fontWeight: 'bold', color: '#2e7d32', backgroundColor: '#e8f5e9', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  fecha: { fontSize: 11, color: '#888', flex: 1 },
  finalTxt: { fontSize: 10, fontWeight: 'bold', color: 'white', backgroundColor: '#2e7d32', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  cardMid: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  equipoContainer: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  equipo: { flex: 1, fontSize: 13, fontWeight: 'bold', color: '#333' },
  bandera: { width: 24, height: 16, borderRadius: 2 },
  scoreBox: { backgroundColor: '#212529', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 6, marginHorizontal: 8 },
  scoreBoxActivo: { backgroundColor: '#2e7d32' },
  scoreTxt: { color: 'white', fontWeight: 'bold', fontSize: 13 },
  estadio: { fontSize: 10, color: '#999', textAlign: 'center' },
});