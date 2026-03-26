import { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Image } from 'react-native';
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
};

function getBandera(pais) {
  if (!pais) return null;
  const code = BANDERAS[pais.toLowerCase()];
  return code ? `https://flagcdn.com/h20/${code}.png` : null;
}

export default function SimuladorScreen() {
  const [partidos, setPartidos] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [predicciones, setPredicciones] = useState([]);
  const [marcadores, setMarcadores] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    cargarDatos();
  }, []);

  async function cargarDatos() {
    const [p, u, pred] = await Promise.all([
      supabase.from('partidos').select('*').order('fecha', { ascending: true }),
      supabase.from('usuarios').select('*'),
      supabase.from('predicciones').select('*'),
    ]);
    if (p.data) setPartidos(p.data.filter(x => x.tipo === 'partido'));
    if (u.data) setUsuarios(u.data);
    if (pred.data) setPredicciones(pred.data);
    setLoading(false);
  }

  const partidosPendientes = partidos.filter(p => {
    const key = p.id.toString();
    return !marcadores[key] || (marcadores[key].local === '' && marcadores[key].visita === '');
  });

  function setMarcador(partidoId, campo, valor) {
    setMarcadores(prev => ({
      ...prev,
      [partidoId]: { ...prev[partidoId], [campo]: valor }
    }));
  }

  function calcularRankingSimulado() {
    return usuarios.map(u => {
      let puntosExtra = 0;
      Object.keys(marcadores).forEach(partidoId => {
        const m = marcadores[partidoId];
        if (m?.local === '' || m?.visita === '' || m?.local == null || m?.visita == null) return;
        const partido = partidos.find(p => p.id.toString() === partidoId);
        if (!partido) return;
        const pred = predicciones.find(p => p.usuario_id === u.id && p.partido_id === parseInt(partidoId));
        if (!pred) return;
        const realStr = `${m.local}-${m.visita}`;
        const predStr = `${pred.goles_local}-${pred.goles_visita}`;
        const resultado = calcularPuntos(realStr, predStr, partido.titulo);
        puntosExtra += resultado.pts;
      });
      return { ...u, puntosExtra, total: (u.puntos_base || 0) + puntosExtra };
    }).sort((a, b) => b.total - a.total);
  }

  const rankingSimulado = calcularRankingSimulado();
  const medallas = ['🥇', '🥈', '🥉'];

  if (loading) return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color="#2e7d32" />
    </View>
  );

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>🧮 Simulador</Text>
      </View>

      <View style={styles.alert}>
        <Text style={styles.alertTxt}>Ingresa marcadores y mira cómo cambia la tabla en tiempo real</Text>
      </View>

      <Text style={styles.seccionTitle}>Partidos Pendientes</Text>
      {partidos.filter(p => true).slice(0, 10).map(partido => {
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
                placeholder="0"
              />
              <Text style={styles.guion}>-</Text>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                maxLength={2}
                value={m.visita}
                onChangeText={v => setMarcador(partido.id, 'visita', v)}
                placeholder="0"
              />
            </View>
          </View>
        );
      })}

      <TouchableOpacity style={styles.resetBtn} onPress={() => setMarcadores({})}>
        <Text style={styles.resetTxt}>Borrar Todo</Text>
      </TouchableOpacity>

      <Text style={styles.seccionTitle}>Tabla Simulada</Text>
      {rankingSimulado.map((u, i) => (
        <View key={u.id} style={[styles.rankRow, i < 3 && styles.rankTop]}>
          <Text style={styles.rankPos}>{medallas[i] || i + 1}</Text>
          <Text style={styles.rankNombre}>{u.nombre}</Text>
          <Text style={styles.rankTotal}>{u.total}</Text>
          {u.puntosExtra > 0 && (
            <Text style={styles.rankExtra}>+{u.puntosExtra}</Text>
          )}
        </View>
      ))}

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
  matchCard: { backgroundColor: 'white', borderRadius: 10, padding: 12, marginHorizontal: 12, marginBottom: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', elevation: 1 },
  matchTeams: { flex: 1, gap: 4 },
  teamRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  bandera: { width: 20, height: 14, borderRadius: 2 },
  teamName: { fontSize: 12, fontWeight: 'bold', color: '#333', flex: 1 },
  vs: { fontSize: 10, color: '#999', marginLeft: 26 },
  inputs: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  input: { width: 36, height: 36, borderWidth: 2, borderColor: '#ddd', borderRadius: 8, textAlign: 'center', fontWeight: 'bold', fontSize: 16 },
  guion: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  resetBtn: { backgroundColor: '#757575', borderRadius: 10, padding: 12, marginHorizontal: 12, marginTop: 8, alignItems: 'center' },
  resetTxt: { color: 'white', fontWeight: 'bold', fontSize: 13 },
  rankRow: { backgroundColor: 'white', borderRadius: 10, padding: 12, marginHorizontal: 12, marginBottom: 6, flexDirection: 'row', alignItems: 'center', elevation: 1 },
  rankTop: { backgroundColor: '#f9f9f9' },
  rankPos: { fontSize: 18, width: 36 },
  rankNombre: { flex: 1, fontSize: 14, fontWeight: 'bold', color: '#333' },
  rankTotal: { fontSize: 16, fontWeight: 'bold', color: '#2e7d32' },
  rankExtra: { fontSize: 11, fontWeight: 'bold', color: '#2e7d32', marginLeft: 4 },
});