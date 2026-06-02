import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Image } from 'react-native';
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
  'suecia': 'se', 'turquía': 'tr', 'turquia': 'tr',
  'república checa': 'cz', 'republica checa': 'cz','chequia': 'cz',
  'bosnia y herzegovina': 'ba', 'italia': 'it',
  'r. d. congo': 'cd', 'jamaica': 'jm', 'irak': 'iq', 'iraq': 'iq',
  'bolivia': 'bo', 'nueva caledonia': 'nc', 'surinam': 'sr',
};

const GRUPOS_VALIDOS = ['A','B','C','D','E','F','G','H','I','J','K','L'];

function getBandera(pais) {
  if (!pais) return null;
  const code = BANDERAS[pais.toLowerCase()];
  return code ? `https://flagcdn.com/h20/${code}.png` : null;
}

export default function SimuladorScreen({ recargar }) {
  const [partidos, setPartidos] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [predicciones, setPredicciones] = useState([]);
  const [resultados, setResultados] = useState({});
  const [marcadores, setMarcadores] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => { cargarDatos(); }, []);
  useEffect(() => { if (recargar > 0) cargarDatos(); }, [recargar]);

  async function cargarDatos() {
    const [p, u, pred, res] = await Promise.all([
      supabase.from('partidos').select('*').in('grupo', GRUPOS_VALIDOS).order('fecha', { ascending: true }),
      supabase.from('ranking_view').select('*'),
      supabase.from('predicciones').select('*'),
      supabase.from('resultados').select('*'),
    ]);
    if (p.data) setPartidos(p.data);
    if (u.data) setUsuarios(u.data);
    if (pred.data) setPredicciones(pred.data);
    if (res.data) {
      const map = {};
      res.data.forEach(r => { map[r.partido_id] = r; });
      setResultados(map);
    }
    setLoading(false);
  }

  const partidosPendientes = partidos.filter(p => !resultados[p.id]);

  function setMarcador(partidoId, campo, valor) {
    setMarcadores(prev => ({ ...prev, [partidoId]: { ...prev[partidoId], [campo]: valor } }));
  }

  const rankingSimulado = usuarios.map(u => {
    let puntosExtra = 0;
    Object.keys(marcadores).forEach(partidoId => {
      const m = marcadores[partidoId];
      if (!m?.local || !m?.visita || m.local === '' || m.visita === '') return;
      const partido = partidos.find(p => p.id.toString() === partidoId);
      if (!partido) return;
      const pred = predicciones.find(p => p.usuario_id === u.id && p.partido_id === parseInt(partidoId));
      if (!pred) return;
      const resultado = calcularPuntos(`${m.local}-${m.visita}`, `${pred.goles_local}-${pred.goles_visita}`, partido.titulo);
      puntosExtra += resultado.pts;
    });
    return { ...u, puntosExtra, total: (u.puntos || 0) + puntosExtra };
  }).sort((a, b) => b.total - a.total);

  const medallas = ['🥇', '🥈', '🥉'];

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#292663" /></View>;

  return (
    <View style={styles.container}>
      <View style={styles.alert}>
        <Text style={styles.alertTxt}>Ingresa marcadores y la tabla se actualiza automáticamente</Text>
      </View>

      <View style={styles.layout}>
        {/* COLUMNA IZQUIERDA - Partidos */}
        <ScrollView style={styles.colPartidos} showsVerticalScrollIndicator={false}>
          <Text style={styles.colTitle}>⚽ Pendientes ({partidosPendientes.length})</Text>
          {partidosPendientes.length === 0 && (
            <View style={styles.noPartidos}>
              <Text style={styles.noPartidosTxt}>No hay partidos pendientes</Text>
            </View>
          )}
          {partidosPendientes.map(partido => {
            const m = marcadores[partido.id] || { local: '', visita: '' };
            return (
              <View key={partido.id} style={styles.matchCard}>
                <View style={styles.matchTeams}>
  <View style={[styles.teamRow, { justifyContent: 'flex-start' }]}>
    {getBandera(partido.equipo_local) && <Image source={{ uri: getBandera(partido.equipo_local) }} style={styles.bandera} />}
    <Text style={styles.teamName} numberOfLines={1}>{partido.equipo_local}</Text>
  </View>
  <View style={styles.inputsRow}>
    <TextInput style={styles.input} keyboardType="numeric" maxLength={2} value={m.local} onChangeText={v => setMarcador(partido.id, 'local', v)} placeholder="-" placeholderTextColor="#ccc" />
    <Text style={styles.guion}>-</Text>
    <TextInput style={styles.input} keyboardType="numeric" maxLength={2} value={m.visita} onChangeText={v => setMarcador(partido.id, 'visita', v)} placeholder="-" placeholderTextColor="#ccc" />
  </View>
  <View style={[styles.teamRow, { justifyContent: 'flex-end' }]}>
    <Text style={[styles.teamName, { textAlign: 'right' }]} numberOfLines={1}>{partido.equipo_visita}</Text>
    {getBandera(partido.equipo_visita) && <Image source={{ uri: getBandera(partido.equipo_visita) }} style={styles.bandera} />}
  </View>
</View>
              </View>
            );
          })}
          {partidosPendientes.length > 0 && (
            <TouchableOpacity style={styles.resetBtn} onPress={() => setMarcadores({})}>
              <Text style={styles.resetTxt}>🗑️ Borrar</Text>
            </TouchableOpacity>
          )}
        </ScrollView>

        {/* COLUMNA DERECHA - Ranking */}
        <ScrollView style={styles.colRanking} showsVerticalScrollIndicator={false}>
          <Text style={styles.colTitle}>📊 Tabla Simulada</Text>
          {rankingSimulado.map((u, i) => (
            <View key={u.id} style={[styles.rankRow, i < 3 && styles.rankTop]}>
              <Text style={styles.rankPos}>{medallas[i] || i + 1}</Text>
              <Text style={styles.rankNombre} numberOfLines={1}>{u.nombre}</Text>
              <View style={styles.rankPuntos}>
                <Text style={styles.rankTotal}>{u.total}</Text>
                {u.puntosExtra > 0 && <Text style={styles.rankExtra}>+{u.puntosExtra}</Text>}
              </View>
            </View>
          ))}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f2f5' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  alert: { backgroundColor: '#e3f2fd', margin: 8, borderRadius: 10, padding: 10 },
  alertTxt: { color: '#0d47a1', fontSize: 11, textAlign: 'center' },
  layout: { flex: 1, flexDirection: 'row', gap: 8, paddingHorizontal: 8, paddingBottom: 8 },
  colPartidos: { flex: 1 },
  colRanking: { flex: 1 },
  colTitle: { fontSize: 11, fontWeight: 'bold', color: '#888', textTransform: 'uppercase', marginVertical: 8, letterSpacing: 0.5 },
  noPartidos: { backgroundColor: 'white', borderRadius: 10, padding: 16, alignItems: 'center' },
  noPartidosTxt: { color: '#888', fontSize: 12 },
 matchCard: { backgroundColor: 'white', borderRadius: 10, padding: 8, marginBottom: 6, elevation: 1 },
matchTeams: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
teamRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 3 },
bandera: { width: 16, height: 11, borderRadius: 2 },
teamName: { fontSize: 10, fontWeight: 'bold', color: '#333', flex: 1 },
inputsRow: { flexDirection: 'row', alignItems: 'center', gap: 2, paddingHorizontal: 4 },
input: { width: 28, height: 28, borderWidth: 1.5, borderColor: '#ddd', borderRadius: 6, textAlign: 'center', fontWeight: 'bold', fontSize: 13 },
guion: { fontSize: 13, fontWeight: 'bold', color: '#333' },
  resetBtn: { backgroundColor: '#757575', borderRadius: 8, padding: 10, alignItems: 'center', marginTop: 4, marginBottom: 16 },
  resetTxt: { color: 'white', fontWeight: 'bold', fontSize: 12 },
  rankRow: { backgroundColor: 'white', borderRadius: 8, padding: 8, marginBottom: 4, flexDirection: 'row', alignItems: 'center', elevation: 1 },
  rankTop: { backgroundColor: '#f9f9f9' },
  rankPos: { fontSize: 14, width: 26 },
  rankNombre: { flex: 1, fontSize: 11, fontWeight: 'bold', color: '#333' },
  rankPuntos: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  rankTotal: { fontSize: 13, fontWeight: 'bold', color: '#292663' },
  rankExtra: { fontSize: 9, fontWeight: 'bold', color: '#f9a825', backgroundColor: '#fffde7', paddingHorizontal: 4, paddingVertical: 1, borderRadius: 4 },
});