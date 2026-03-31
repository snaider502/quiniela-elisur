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
  'australia': 'au', 'francia': 'fr', 'egipto': 'eg', 'panamá': 'pa','suecia': 'se',
'turquía': 'tr', 'turquia': 'tr',
'república checa': 'cz', 'republica checa': 'cz', 'chequia': 'cz',
'bosnia y herzegovina': 'ba', 'bosnia': 'ba',
'italia': 'it','r. d. congo': 'cd', 'república democrática del congo': 'cd', 'rd congo': 'cd',
'jamaica': 'jm',
'irak': 'iq', 'iraq': 'iq',
'bolivia': 'bo',
'nueva caledonia': 'nc',
'surinam': 'sr',
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
  const [rankingSimulado, setRankingSimulado] = useState([]);
  const [loading, setLoading] = useState(true);
  const [simulando, setSimulando] = useState(false);

  useEffect(() => {
  if (recargar > 0) cargarDatos();
}, [recargar]);

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
    setMarcadores(prev => ({
      ...prev,
      [partidoId]: { ...prev[partidoId], [campo]: valor }
    }));
  }

  function simular() {
    setSimulando(true);
    const ranking = usuarios.map(u => {
      let puntosExtra = 0;
      Object.keys(marcadores).forEach(partidoId => {
        const m = marcadores[partidoId];
        if (!m?.local || !m?.visita || m.local === '' || m.visita === '') return;
        const partido = partidos.find(p => p.id.toString() === partidoId);
        if (!partido) return;
        const pred = predicciones.find(p => p.usuario_id === u.id && p.partido_id === parseInt(partidoId));
        if (!pred) return;
        const realStr = `${m.local}-${m.visita}`;
        const predStr = `${pred.goles_local}-${pred.goles_visita}`;
        const resultado = calcularPuntos(realStr, predStr, partido.titulo);
        puntosExtra += resultado.pts;
      });
      return { ...u, puntosExtra, total: (u.puntos || 0) + puntosExtra };
    }).sort((a, b) => b.total - a.total);
    setRankingSimulado(ranking);
    setSimulando(false);
  }

  const medallas = ['🥇', '🥈', '🥉'];

  if (loading) return (
    <View style={styles.center}><ActivityIndicator size="large" color="#2e7d32" /></View>
  );

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>🧮 Simulador</Text>
      </View>

      <View style={styles.alert}>
        <Text style={styles.alertTxt}>Ingresa marcadores hipotéticos y toca Simular para ver cómo quedaría la tabla</Text>
      </View>

      <Text style={styles.seccionTitle}>Partidos Pendientes ({partidosPendientes.length})</Text>

      {partidosPendientes.length === 0 && (
        <View style={styles.noPartidos}>
          <Text style={styles.noPartidosTxt}>No hay partidos pendientes en fase de grupos</Text>
        </View>
      )}

      {partidosPendientes.map(partido => {
        const m = marcadores[partido.id] || { local: '', visita: '' };
        return (
          <View key={partido.id} style={styles.matchCard}>
            <View style={styles.matchTeams}>
              <View style={styles.teamRow}>
                {getBandera(partido.equipo_local) && (
                  <Image source={{ uri: getBandera(partido.equipo_local) }} style={styles.bandera} />
                )}
                <Text style={styles.teamName} numberOfLines={1}>{partido.equipo_local}</Text>
              </View>
              <Text style={styles.vs}>vs</Text>
              <View style={styles.teamRow}>
                {getBandera(partido.equipo_visita) && (
                  <Image source={{ uri: getBandera(partido.equipo_visita) }} style={styles.bandera} />
                )}
                <Text style={styles.teamName} numberOfLines={1}>{partido.equipo_visita}</Text>
              </View>
            </View>
            <View style={styles.inputs}>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                maxLength={2}
                value={m.local}
                onChangeText={v => setMarcador(partido.id, 'local', v)}
                placeholder="-"
                placeholderTextColor="#ccc"
              />
              <Text style={styles.guion}>-</Text>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                maxLength={2}
                value={m.visita}
                onChangeText={v => setMarcador(partido.id, 'visita', v)}
                placeholder="-"
                placeholderTextColor="#ccc"
              />
            </View>
          </View>
        );
      })}

      {partidosPendientes.length > 0 && (
        <View style={styles.botonesRow}>
          <TouchableOpacity style={styles.simularBtn} onPress={simular} disabled={simulando}>
            {simulando
              ? <ActivityIndicator color="white" size="small" />
              : <Text style={styles.simularTxt}>🔮 Simular</Text>
            }
          </TouchableOpacity>
          <TouchableOpacity style={styles.resetBtn} onPress={() => { setMarcadores({}); setRankingSimulado([]); }}>
            <Text style={styles.resetTxt}>Borrar</Text>
          </TouchableOpacity>
        </View>
      )}

      {rankingSimulado.length > 0 && (
        <>
          <Text style={styles.seccionTitle}>Tabla Simulada</Text>
          {rankingSimulado.map((u, i) => (
            <View key={u.id} style={[styles.rankRow, i < 3 && styles.rankTop]}>
              <Text style={styles.rankPos}>{medallas[i] || i + 1}</Text>
              <Text style={styles.rankNombre}>{u.nombre}</Text>
              <View style={styles.rankPuntos}>
                <Text style={styles.rankTotal}>{u.total}</Text>
                {u.puntosExtra > 0 && (
                  <Text style={styles.rankExtra}>+{u.puntosExtra}</Text>
                )}
              </View>
            </View>
          ))}
        </>
      )}

      <View style={{ height: 30 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f2f5' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { backgroundColor: '#2e7d32', padding: 20, alignItems: 'center' },
  headerText: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  alert: { backgroundColor: '#e3f2fd', margin: 12, borderRadius: 10, padding: 12 },
  alertTxt: { color: '#0d47a1', fontSize: 12, textAlign: 'center' },
  seccionTitle: { fontSize: 12, fontWeight: 'bold', color: '#888', textTransform: 'uppercase', marginHorizontal: 12, marginTop: 12, marginBottom: 8, letterSpacing: 0.5 },
  noPartidos: { backgroundColor: 'white', borderRadius: 10, padding: 20, marginHorizontal: 12, alignItems: 'center' },
  noPartidosTxt: { color: '#888', fontSize: 13 },
  matchCard: { backgroundColor: 'white', borderRadius: 10, padding: 12, marginHorizontal: 12, marginBottom: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', elevation: 1 },
  matchTeams: { flex: 1, gap: 4 },
  teamRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  bandera: { width: 20, height: 14, borderRadius: 2 },
  teamName: { fontSize: 12, fontWeight: 'bold', color: '#333', flex: 1 },
  vs: { fontSize: 10, color: '#999', marginLeft: 26 },
  inputs: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  input: { width: 40, height: 40, borderWidth: 2, borderColor: '#ddd', borderRadius: 8, textAlign: 'center', fontWeight: 'bold', fontSize: 16 },
  guion: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  botonesRow: { flexDirection: 'row', gap: 10, marginHorizontal: 12, marginTop: 8, marginBottom: 4 },
  simularBtn: { flex: 1, backgroundColor: '#2e7d32', borderRadius: 10, padding: 14, alignItems: 'center' },
  simularTxt: { color: 'white', fontWeight: 'bold', fontSize: 14 },
  resetBtn: { backgroundColor: '#757575', borderRadius: 10, padding: 14, paddingHorizontal: 20, alignItems: 'center' },
  resetTxt: { color: 'white', fontWeight: 'bold', fontSize: 14 },
  rankRow: { backgroundColor: 'white', borderRadius: 10, padding: 12, marginHorizontal: 12, marginBottom: 6, flexDirection: 'row', alignItems: 'center', elevation: 1 },
  rankTop: { backgroundColor: '#f9f9f9' },
  rankPos: { fontSize: 18, width: 36 },
  rankNombre: { flex: 1, fontSize: 14, fontWeight: 'bold', color: '#333' },
  rankPuntos: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  rankTotal: { fontSize: 16, fontWeight: 'bold', color: '#2e7d32' },
  rankExtra: { fontSize: 11, fontWeight: 'bold', color: '#f9a825', backgroundColor: '#fffde7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
});