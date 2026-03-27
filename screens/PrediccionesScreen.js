import { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, ActivityIndicator, Image, ScrollView } from 'react-native';
import { supabase } from '../lib/supabase';
import { calcularPuntos } from '../utils/calcularPuntos';

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

export default function PrediccionesScreen() {
  const [partidos, setPartidos] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [predicciones, setPredicciones] = useState([]);
  const [resultados, setResultados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [partidoActivo, setPartidoActivo] = useState(null);

  useEffect(() => { cargarDatos(); }, []);

  async function cargarDatos() {
    const [p, u, pred, res] = await Promise.all([
      supabase.from('partidos').select('*').eq('tipo', 'partido').order('numero', { ascending: true }),
      supabase.from('ranking_view').select('*'),
      supabase.from('predicciones').select('*'),
      supabase.from('resultados').select('*'),
    ]);
    if (p.data) { setPartidos(p.data); setPartidoActivo(p.data[0]); }
    if (u.data) setUsuarios(u.data);
    if (pred.data) setPredicciones(pred.data);
    if (res.data) setResultados(res.data);
    setLoading(false);
  }

  function getResultado(partidoId) {
    const r = resultados.find(r => r.partido_id === partidoId);
    if (!r || r.goles_local === null) return null;
    return { local: r.goles_local, visita: r.goles_visita };
  }

  function getPrediccion(usuarioId, partidoId) {
    const p = predicciones.find(p => p.usuario_id === usuarioId && p.partido_id === partidoId);
    if (!p) return null;
    return { local: p.goles_local, visita: p.goles_visita };
  }

  function getColor(pred, resultado, partido) {
    if (!pred || !resultado) return styles.predNeutral;
    const realStr = `${resultado.local}-${resultado.visita}`;
    const predStr = `${pred.local}-${pred.visita}`;
    const r = calcularPuntos(realStr, predStr, partido.titulo);
    if (r.clase === 'exact') return styles.predExact;
    if (r.clase === 'winner') return styles.predWinner;
    return styles.predWrong;
  }

  function getPuntos(pred, resultado, partido) {
    if (!pred || !resultado) return null;
    const realStr = `${resultado.local}-${resultado.visita}`;
    const predStr = `${pred.local}-${pred.visita}`;
    const r = calcularPuntos(realStr, predStr, partido.titulo);
    return r.show ? r.pts : null;
  }

  if (loading) return (
    <View style={styles.center}><ActivityIndicator size="large" color="#2e7d32" /></View>
  );

  const resultado = partidoActivo ? getResultado(partidoActivo.id) : null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>🔍 Predicciones</Text>
      </View>

      <View style={styles.partidosContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={true}
          contentContainerStyle={styles.partidosContent}>
          {partidos.map(item => {
            const res = getResultado(item.id);
            const activo = partidoActivo?.id === item.id;
            return (
              <TouchableOpacity
                key={item.id.toString()}
                style={[styles.partidoBtn, activo && styles.partidoBtnActivo]}
                onPress={() => setPartidoActivo(item)}>
                <Text style={[styles.partidoNum, activo && styles.partidoTxtActivo]}>
                  #{item.numero}
                </Text>
                <Text style={[styles.partidoEquipos, activo && styles.partidoTxtActivo]} numberOfLines={1}>
                  {item.equipo_local} vs {item.equipo_visita}
                </Text>
                {res
                  ? <Text style={styles.resSmall}>{res.local}-{res.visita}</Text>
                  : <Text style={styles.resPendiente}>Pendiente</Text>
                }
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {partidoActivo && (
        <View style={styles.partidoHeader}>
          <View style={styles.equipoRow}>
            {getBandera(partidoActivo.equipo_local) && (
              <Image source={{ uri: getBandera(partidoActivo.equipo_local) }} style={styles.bandera} />
            )}
            <Text style={styles.equipoNombre} numberOfLines={1}>{partidoActivo.equipo_local}</Text>
          </View>
          <View style={styles.scoreCenter}>
            {resultado
              ? <Text style={styles.scoreReal}>{resultado.local} - {resultado.visita}</Text>
              : <Text style={styles.scorePendiente}>vs</Text>
            }
          </View>
          <View style={[styles.equipoRow, { flexDirection: 'row-reverse' }]}>
            {getBandera(partidoActivo.equipo_visita) && (
              <Image source={{ uri: getBandera(partidoActivo.equipo_visita) }} style={styles.bandera} />
            )}
            <Text style={[styles.equipoNombre, { textAlign: 'right' }]} numberOfLines={1}>
              {partidoActivo.equipo_visita}
            </Text>
          </View>
        </View>
      )}

      <FlatList
        data={usuarios}
        keyExtractor={u => u.id}
        contentContainerStyle={{ paddingBottom: 20 }}
       renderItem={({ item: u, index: i }) => {
  const pred = partidoActivo ? getPrediccion(u.id, partidoActivo.id) : null;
  const colorStyle = partidoActivo ? getColor(pred, resultado, partidoActivo) : styles.predNeutral;
  const pts = partidoActivo ? getPuntos(pred, resultado, partidoActivo) : null;
  const medallas = ['🥇', '🥈', '🥉'];

  return (
    <View style={styles.userRow}>
      <Text style={styles.userPos}>{medallas[i] || i + 1}</Text>
      <Text style={styles.userName}>{u.nombre}</Text>
      <View style={[styles.predBox, colorStyle]}>
        <Text style={styles.predTxt}>
          {pred ? `${pred.local} - ${pred.visita}` : '-'}
        </Text>
        {pts !== null && (
          <View style={styles.ptsBubble}>
            <Text style={styles.ptsBadge}>+{pts} pts</Text>
          </View>
        )}
      </View>
      <Text style={styles.userPuntos}>{u.puntos} pts</Text>
    </View>
  );
}}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f2f5' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { backgroundColor: '#2e7d32', padding: 20, alignItems: 'center' },
  headerText: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  partidosContainer: { backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#eee' },
  partidosContent: { paddingHorizontal: 8, paddingVertical: 8, flexDirection: 'row' },
  partidoBtn: { paddingHorizontal: 10, paddingVertical: 8, borderRadius: 10, backgroundColor: '#f0f2f5', marginHorizontal: 4, width: 130 },
  partidoBtnActivo: { backgroundColor: '#2e7d32' },
  partidoNum: { fontSize: 9, color: '#888', fontWeight: 'bold' },
  partidoEquipos: { fontSize: 11, fontWeight: 'bold', color: '#444', marginVertical: 2 },
  partidoTxtActivo: { color: 'white' },
  resSmall: { fontSize: 10, color: '#2e7d32', fontWeight: 'bold' },
  resPendiente: { fontSize: 9, color: '#aaa' },
  partidoHeader: { backgroundColor: 'white', padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: '#eee' },
  equipoRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  bandera: { width: 24, height: 16, borderRadius: 2 },
  equipoNombre: { flex: 1, fontSize: 12, fontWeight: 'bold', color: '#333' },
  scoreCenter: { paddingHorizontal: 12 },
  scoreReal: { backgroundColor: '#2e7d32', color: 'white', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, fontWeight: 'bold', fontSize: 14 },
  scorePendiente: { backgroundColor: '#e9ecef', color: '#777', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, fontWeight: 'bold', fontSize: 12 },
  userRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', padding: 12, marginHorizontal: 12, marginTop: 6, borderRadius: 10, gap: 8, elevation: 1 },
userPos: { fontSize: 16, width: 32, textAlign: 'center' },
userName: { flex: 1, fontSize: 13, fontWeight: 'bold', color: '#333' },
predBox: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, flexDirection: 'row', alignItems: 'center', gap: 6, minWidth: 80, justifyContent: 'center' },
predNeutral: { backgroundColor: '#f0f2f5' },
predExact: { backgroundColor: '#c8e6c9', borderWidth: 1, borderColor: '#2e7d32' },
predWinner: { backgroundColor: '#fff9c4', borderWidth: 1, borderColor: '#f9a825' },
predWrong: { backgroundColor: '#ffcdd2', borderWidth: 1, borderColor: '#c62828' },
predTxt: { fontSize: 14, fontWeight: 'bold', color: '#333' },
ptsBubble: { backgroundColor: 'rgba(0,0,0,0.1)', borderRadius: 8, paddingHorizontal: 5, paddingVertical: 1 },
ptsBadge: { fontSize: 10, fontWeight: 'bold', color: '#333' },
userPuntos: { fontSize: 12, fontWeight: 'bold', color: '#2e7d32', width: 55, textAlign: 'right' },
});