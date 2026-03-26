import { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, ActivityIndicator, Image } from 'react-native';
import { supabase } from '../lib/supabase';

const GRUPOS = ['TODOS', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];

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
  'australia': 'au', 'francia': 'fr', 'serbia': 'rs', 'dinamarca': 'dk',
  'iran': 'ir', 'belgica': 'be', 'tunez': 'tn', 'japon': 'jp',
};

function getBandera(pais) {
  if (!pais) return null;
  const code = BANDERAS[pais.toLowerCase()];
  return code ? `https://flagcdn.com/h20/${code}.png` : null;
}

export default function PartidosScreen() {
  const [partidos, setPartidos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [grupoActivo, setGrupoActivo] = useState('TODOS');

  useEffect(() => {
    cargarPartidos();
  }, []);

  async function cargarPartidos() {
    const { data, error } = await supabase
      .from('partidos')
      .select('*')
      .order('fecha', { ascending: true });

    if (error) console.log(error);
    else setPartidos(data);
    setLoading(false);
  }

  const partidosFiltrados = grupoActivo === 'TODOS'
    ? partidos
    : partidos.filter(p => p.grupo === grupoActivo);

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
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardTop}>
              <Text style={styles.grupoBadge}>Grupo {item.grupo}</Text>
              <Text style={styles.fecha}>{formatearFecha(item.fecha)}</Text>
            </View>
            <View style={styles.cardMid}>
              <View style={styles.equipoContainer}>
                {getBandera(item.equipo_local) && (
                  <Image source={{ uri: getBandera(item.equipo_local) }} style={styles.bandera} />
                )}
                <Text style={styles.equipo} numberOfLines={1}>{item.equipo_local}</Text>
              </View>
              <View style={styles.scoreBox}>
                <Text style={styles.scoreTxt}>vs</Text>
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
  card: { backgroundColor: 'white', borderRadius: 12, padding: 12, marginBottom: 10, elevation: 2 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  grupoBadge: { fontSize: 11, fontWeight: 'bold', color: '#2e7d32', backgroundColor: '#e8f5e9', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  fecha: { fontSize: 11, color: '#888' },
  cardMid: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  equipoContainer: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  equipo: { flex: 1, fontSize: 13, fontWeight: 'bold', color: '#333' },
  bandera: { width: 24, height: 16, borderRadius: 2 },
  scoreBox: { backgroundColor: '#212529', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 6, marginHorizontal: 8 },
  scoreTxt: { color: 'white', fontWeight: 'bold', fontSize: 13 },
  estadio: { fontSize: 10, color: '#999', textAlign: 'center' },
});