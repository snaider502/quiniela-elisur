import { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, Image, Alert } from 'react-native';
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

export default function QuinielaScreen() {
  const [partidos, setPartidos] = useState([]);
  const [predicciones, setPredicciones] = useState({});
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    iniciar();
  }, []);

  async function iniciar() {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setUserId(user.id);
      await cargarPartidos();
      await cargarPredicciones(user.id);
    }
    setLoading(false);
  }

  async function cargarPartidos() {
  const { data, error } = await supabase
    .from('partidos')
    .select('*')
    .eq('tipo', 'partido')
    .order('fecha', { ascending: true });
  if (error) console.log(error);
  if (data) setPartidos(data);
}

  async function cargarPredicciones(uid) {
    const { data } = await supabase
      .from('predicciones')
      .select('*')
      .eq('usuario_id', uid);
    if (data) {
      const map = {};
      data.forEach(p => {
        map[p.partido_id] = {
          local: p.goles_local?.toString() || '',
          visita: p.goles_visita?.toString() || '',
        };
      });
      setPredicciones(map);
    }
  }

  function setPred(partidoId, campo, valor) {
    setPredicciones(prev => ({
      ...prev,
      [partidoId]: { ...prev[partidoId], [campo]: valor }
    }));
  }

  async function guardarTodo() {
  setGuardando(true);
  let guardados = 0;
  let errores = 0;
  let mensajeError = '';

  for (const partido of partidos) {
    const pred = predicciones[partido.id];
    if (!pred || pred.local === '' || pred.visita === '') continue;

    const { error } = await supabase
      .from('predicciones')
      .upsert({
        usuario_id: userId,
        partido_id: partido.id,
        goles_local: parseInt(pred.local),
        goles_visita: parseInt(pred.visita),
      }, { onConflict: 'usuario_id,partido_id' });

    if (error) {
      errores++;
      mensajeError = error.message;
    } else guardados++;
  }

  setGuardando(false);
  Alert.alert('Resultado', `Guardados: ${guardados} | Errores: ${errores}\n${mensajeError}`);
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

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>📝 Mi Quiniela</Text>
      </View>

      <FlatList
        data={partidos}
        keyExtractor={item => item.id.toString()}
        contentContainerStyle={{ padding: 12, paddingBottom: 100 }}
        renderItem={({ item }) => {
          const pred = predicciones[item.id] || { local: '', visita: '' };
          return (
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
                <View style={styles.inputsRow}>
                  <TextInput
                    style={styles.input}
                    keyboardType="numeric"
                    maxLength={2}
                    value={pred.local}
                    onChangeText={v => setPred(item.id, 'local', v)}
                    placeholder="0"
                  />
                  <Text style={styles.guion}>-</Text>
                  <TextInput
                    style={styles.input}
                    keyboardType="numeric"
                    maxLength={2}
                    value={pred.visita}
                    onChangeText={v => setPred(item.id, 'visita', v)}
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
            </View>
          );
        }}
      />

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.guardarBtn}
          onPress={guardarTodo}
          disabled={guardando}>
          {guardando
            ? <ActivityIndicator color="white" />
            : <Text style={styles.guardarTxt}>💾 Guardar Quiniela</Text>
          }
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f2f5' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { backgroundColor: '#2e7d32', padding: 20, alignItems: 'center' },
  headerText: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  card: { backgroundColor: 'white', borderRadius: 12, padding: 12, marginBottom: 10, elevation: 2 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  grupoBadge: { fontSize: 11, fontWeight: 'bold', color: '#2e7d32', backgroundColor: '#e8f5e9', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  fecha: { fontSize: 11, color: '#888' },
  cardMid: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  equipoContainer: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  equipo: { flex: 1, fontSize: 12, fontWeight: 'bold', color: '#333' },
  bandera: { width: 22, height: 15, borderRadius: 2 },
  inputsRow: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8 },
  input: { width: 36, height: 36, borderWidth: 2, borderColor: '#ddd', borderRadius: 8, textAlign: 'center', fontWeight: 'bold', fontSize: 16, color: '#333' },
  guion: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 12, backgroundColor: 'white', borderTopWidth: 1, borderTopColor: '#eee' },
  guardarBtn: { backgroundColor: '#2e7d32', borderRadius: 12, padding: 16, alignItems: 'center' },
  guardarTxt: { color: 'white', fontWeight: 'bold', fontSize: 15 },
});