import { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, Alert, Image } from 'react-native';
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
};

function getBandera(pais) {
  if (!pais) return null;
  const code = BANDERAS[pais.toLowerCase()];
  return code ? `https://flagcdn.com/h20/${code}.png` : null;
}

export default function AdminScreen() {
  const [partidos, setPartidos] = useState([]);
  const [resultados, setResultados] = useState({});
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(null);
  const [esAdmin, setEsAdmin] = useState(false);

  useEffect(() => {
    verificarAdmin();
  }, []);

  async function verificarAdmin() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from('usuarios').select('es_admin').eq('id', user.id).single();
    if (data?.es_admin) {
      setEsAdmin(true);
      await cargarDatos();
    }
    setLoading(false);
  }

  async function cargarDatos() {
    const { data: p } = await supabase.from('partidos').select('*').order('fecha', { ascending: true });
    const { data: r } = await supabase.from('resultados').select('*');
    if (p) setPartidos(p);
    if (r) {
      const map = {};
      r.forEach(res => {
        map[res.partido_id] = {
          local: res.goles_local?.toString() || '',
          visita: res.goles_visita?.toString() || '',
          id: res.id
        };
      });
      setResultados(map);
    }
  }

  function setResultado(partidoId, campo, valor) {
    setResultados(prev => ({
      ...prev,
      [partidoId]: { ...prev[partidoId], [campo]: valor }
    }));
  }

  async function guardarResultado(partido) {
    const res = resultados[partido.id];
    if (!res || res.local === '' || res.visita === '') {
      Alert.alert('Error', 'Ingresa ambos marcadores');
      return;
    }

    setGuardando(partido.id);

    const { error } = await supabase.from('resultados').upsert({
      partido_id: partido.id,
      goles_local: parseInt(res.local),
      goles_visita: parseInt(res.visita),
    }, { onConflict: 'partido_id' });

    if (error) {
      Alert.alert('Error', error.message);
    } else {
      await calcularPuntosPartido(partido);
      Alert.alert('✅ Listo', `Resultado guardado y puntos calculados`);
    }
    setGuardando(null);
  }

 async function calcularPuntosPartido(partido) {
  const res = resultados[partido.id];
  if (!res) return;

  const { data: preds } = await supabase
    .from('predicciones')
    .select('*')
    .eq('partido_id', partido.id);

  if (!preds || preds.length === 0) return;

  for (const pred of preds) {
    const r = [parseInt(res.local), parseInt(res.visita)];
    const p = [pred.goles_local, pred.goles_visita];
    let pts = 0;
    let tipo = 'wrong';

    if (r[0] === p[0] && r[1] === p[1]) {
      pts = 5; tipo = 'exact';
    } else if (Math.sign(r[0] - r[1]) === Math.sign(p[0] - p[1])) {
      pts = Math.max(1, 5 - (Math.abs(r[0] - p[0]) + Math.abs(r[1] - p[1])));
      tipo = 'winner';
    }

    await supabase.from('puntos').upsert({
      usuario_id: pred.usuario_id,
      partido_id: partido.id,
      puntos: pts,
      tipo_acierto: tipo,
    }, { onConflict: 'usuario_id,partido_id' });
  }
}

  function formatearFecha(fecha) {
    if (!fecha) return '';
    const d = new Date(fecha);
    return d.getDate().toString().padStart(2, '0') + '/' +
      (d.getMonth() + 1).toString().padStart(2, '0');
  }

  if (loading) return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color="#2e7d32" />
    </View>
  );

  if (!esAdmin) return (
    <View style={styles.center}>
      <Text style={styles.noAdmin}>🔒 Acceso solo para administrador</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>⚙️ Panel Admin</Text>
      </View>
      <FlatList
        data={partidos}
        keyExtractor={item => item.id.toString()}
        contentContainerStyle={{ padding: 12 }}
        renderItem={({ item }) => {
          const res = resultados[item.id] || { local: '', visita: '' };
          const tieneResultado = res.local !== '' && res.visita !== '';
          return (
            <View style={[styles.card, tieneResultado && styles.cardCompleto]}>
              <View style={styles.cardTop}>
                <Text style={styles.grupoBadge}>Grupo {item.grupo}</Text>
                <Text style={styles.fecha}>{formatearFecha(item.fecha)}</Text>
                {tieneResultado && <Text style={styles.checkmark}>✅</Text>}
              </View>
              <View style={styles.cardMid}>
                <View style={styles.equipoContainer}>
                  {getBandera(item.equipo_local) && (
                    <Image source={{ uri: getBandera(item.equipo_local) }} style={styles.bandera} />
                  )}
                  <Text style={styles.equipo} numberOfLines={1}>{item.equipo_local}</Text>
                </View>
                <View style={styles.inputsRow}>
                  <TextInput
                    style={styles.input}
                    keyboardType="numeric"
                    maxLength={2}
                    value={res.local}
                    onChangeText={v => setResultado(item.id, 'local', v)}
                    placeholder="0"
                  />
                  <Text style={styles.guion}>-</Text>
                  <TextInput
                    style={styles.input}
                    keyboardType="numeric"
                    maxLength={2}
                    value={res.visita}
                    onChangeText={v => setResultado(item.id, 'visita', v)}
                    placeholder="0"
                  />
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
              <TouchableOpacity
                style={styles.guardarBtn}
                onPress={() => guardarResultado(item)}
                disabled={guardando === item.id}>
                {guardando === item.id
                  ? <ActivityIndicator color="white" size="small" />
                  : <Text style={styles.guardarTxt}>Guardar resultado</Text>
                }
              </TouchableOpacity>
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f2f5' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  noAdmin: { fontSize: 16, color: '#888', textAlign: 'center' },
  header: { backgroundColor: '#1a237e', padding: 20, alignItems: 'center' },
  headerText: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  card: { backgroundColor: 'white', borderRadius: 12, padding: 12, marginBottom: 10, elevation: 2 },
  cardCompleto: { borderLeftWidth: 4, borderLeftColor: '#2e7d32' },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  grupoBadge: { fontSize: 11, fontWeight: 'bold', color: '#2e7d32', backgroundColor: '#e8f5e9', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  fecha: { fontSize: 11, color: '#888' },
  checkmark: { fontSize: 14 },
  cardMid: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  equipoContainer: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  equipo: { flex: 1, fontSize: 12, fontWeight: 'bold', color: '#333' },
  bandera: { width: 22, height: 15, borderRadius: 2 },
  inputsRow: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8 },
  input: { width: 36, height: 36, borderWidth: 2, borderColor: '#1a237e', borderRadius: 8, textAlign: 'center', fontWeight: 'bold', fontSize: 16, color: '#333' },
  guion: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  guardarBtn: { backgroundColor: '#1a237e', borderRadius: 8, padding: 10, alignItems: 'center' },
  guardarTxt: { color: 'white', fontWeight: 'bold', fontSize: 13 },
});