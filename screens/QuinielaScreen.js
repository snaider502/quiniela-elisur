import { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, Image, Alert } from 'react-native';
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

function getColorStyle(pred, resultado, partido) {
  if (!pred || !resultado || pred.local === '' || pred.visita === '') return null;
  const realStr = `${resultado.goles_local}-${resultado.goles_visita}`;
  const predStr = `${pred.local}-${pred.visita}`;
  const r = calcularPuntos(realStr, predStr, partido.titulo);
  if (r.clase === 'exact') return { card: styles.cardExact, pts: r.pts };
  if (r.clase === 'winner') return { card: styles.cardWinner, pts: r.pts };
  if (r.clase === 'wrong') return { card: styles.cardWrong, pts: 0 };
  return null;
}

const GRUPOS_VALIDOS = ['A','B','C','D','E','F','G','H','I','J','K','L'];
const FASES_MAP = {
  'Fase eliminatoria 16': { hab: 'fase_r16_habilitada', limite: 'fecha_limite_r16' },
  'Fase eliminatoria 8':  { hab: 'fase_r8_habilitada',  limite: 'fecha_limite_r8' },
  'Fase eliminatoria 4':  { hab: 'fase_r4_habilitada',  limite: 'fecha_limite_r4' },
  'SEMI-FINAL':           { hab: 'fase_semi_habilitada', limite: 'fecha_limite_semi' },
  'TERCER LUGAR':         { hab: 'fase_tercer_habilitada', limite: 'fecha_limite_tercer' },
  'FINAL':                { hab: 'fase_final_habilitada', limite: 'fecha_limite_final' },
};

export default function QuinielaScreen() {
  const [partidos, setPartidos] = useState([]);
  const [predicciones, setPredicciones] = useState({});
  const [resultados, setResultados] = useState({});
  const [configuracion, setConfiguracion] = useState({});
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
      await Promise.all([
        cargarPartidos(),
        cargarPredicciones(user.id),
        cargarResultados(),
        cargarConfiguracion(),
      ]);
    }
    setLoading(false);
  }

  async function cargarPartidos() {
    const { data } = await supabase
      .from('partidos')
      .select('*')
      .eq('tipo', 'partido')
      .order('fecha', { ascending: true });
    if (data) setPartidos(data);
  }

  async function cargarPredicciones(uid) {
    const { data } = await supabase.from('predicciones').select('*').eq('usuario_id', uid);
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

  async function cargarResultados() {
    const { data } = await supabase.from('resultados').select('*');
    if (data) {
      const map = {};
      data.forEach(r => { map[r.partido_id] = r; });
      setResultados(map);
    }
  }

  async function cargarConfiguracion() {
    const { data } = await supabase.from('configuracion').select('*');
    if (data) {
      const map = {};
      data.forEach(c => { map[c.clave] = c.valor; });
      setConfiguracion(map);
    }
  }

  function estaHabilitado(partido) {
    const tieneResultado = !!resultados[partido.id];
    if (tieneResultado) return false;
    const ahora = new Date();
    const grupo = partido.grupo;

    if (GRUPOS_VALIDOS.includes(grupo)) {
      const limite = configuracion['fecha_limite'];
      if (limite && ahora > new Date(limite)) return false;
      return true;
    }

    const fase = FASES_MAP[grupo];
    if (!fase) return false;
    if (configuracion[fase.hab] !== 'true') return false;
    const limite = configuracion[fase.limite];
    if (limite && ahora > new Date(limite)) return false;
    return true;
  }

  function esFaseVisible(grupo) {
    if (GRUPOS_VALIDOS.includes(grupo)) return true;
    const fase = FASES_MAP[grupo];
    if (!fase) return false;
    return configuracion[fase.hab] === 'true';
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
    for (const partido of partidos) {
      if (!esFaseVisible(partido.grupo)) continue;
      const pred = predicciones[partido.id];
      if (!pred || pred.local === '' || pred.visita === '') continue;
      if (!estaHabilitado(partido)) continue;
      const { error } = await supabase
        .from('predicciones')
        .upsert({
          usuario_id: userId,
          partido_id: partido.id,
          goles_local: parseInt(pred.local),
          goles_visita: parseInt(pred.visita),
        }, { onConflict: 'usuario_id,partido_id' });
      if (error) errores++;
      else guardados++;
    }
    setGuardando(false);
    Alert.alert('Listo', `Se guardaron ${guardados} predicciones.${errores > 0 ? ` ${errores} errores.` : ''}`, [{ text: 'OK' }]);
  }

  function formatearFecha(fecha) {
    if (!fecha) return '';
    const partes = fecha.split('T')[0].split('-');
    const meses = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
    return `${parseInt(partes[2])} ${meses[parseInt(partes[1])-1]}`;
  }

  const partidosVisibles = partidos.filter(p => esFaseVisible(p.grupo));
  const hayAlgoHabilitado = partidosVisibles.some(p => estaHabilitado(p));

  if (loading) return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color="#2e7d32" />
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>📝 Mi Quiniela</Text>
        {configuracion['fecha_limite'] && (
          <Text style={styles.headerSub}>
            {new Date() <= new Date(configuracion['fecha_limite'])
              ? `Grupos cierran: ${configuracion['fecha_limite']?.split(' ')[0]}`
              : '🔒 Fase de grupos cerrada'}
          </Text>
        )}
      </View>

      <FlatList
        data={partidosVisibles}
        keyExtractor={item => item.id.toString()}
        contentContainerStyle={{ padding: 12, paddingBottom: 100 }}
        renderItem={({ item }) => {
          const pred = predicciones[item.id] || { local: '', visita: '' };
          const resultado = resultados[item.id];
          const tieneResultado = !!resultado;
          const habilitado = estaHabilitado(item);
          const color = getColorStyle(pred, resultado, item);

          return (
            <View style={[styles.card, color?.card, !habilitado && !tieneResultado && styles.cardCerrado]}>
              <View style={styles.cardTop}>
                <Text style={styles.grupoBadge}>
                  {GRUPOS_VALIDOS.includes(item.grupo) ? `Grupo ${item.grupo}` : item.grupo}
                </Text>
                <Text style={styles.fecha}>{formatearFecha(item.fecha)}</Text>
                <View style={[styles.resultadoReal, !tieneResultado && styles.resultadoPendiente]}>
                  <Text style={[styles.resultadoRealTxt, !tieneResultado && styles.resultadoPendienteTxt]}>
                    {tieneResultado
                      ? `${resultado.goles_local} - ${resultado.goles_visita}`
                      : 'Pendiente'}
                  </Text>
                </View>
                {!habilitado && !tieneResultado && (
                  <Text style={styles.cerradoTxt}>🔒</Text>
                )}
                {color?.pts !== undefined && (
                  <Text style={styles.ptsLabel}>+{color.pts} pts</Text>
                )}
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
                    style={[styles.input, !habilitado && styles.inputDisabled]}
                    keyboardType="numeric"
                    maxLength={2}
                    value={tieneResultado ? resultado.goles_local.toString() : pred.local}
                    onChangeText={v => habilitado && setPred(item.id, 'local', v)}
                    placeholder="0"
                    editable={habilitado}
                  />
                  <Text style={styles.guion}>-</Text>
                  <TextInput
                    style={[styles.input, !habilitado && styles.inputDisabled]}
                    keyboardType="numeric"
                    maxLength={2}
                    value={tieneResultado ? resultado.goles_visita.toString() : pred.visita}
                    onChangeText={v => habilitado && setPred(item.id, 'visita', v)}
                    placeholder="0"
                    editable={habilitado}
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

      {hayAlgoHabilitado && (
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
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f2f5' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { backgroundColor: '#2e7d32', padding: 20, alignItems: 'center' },
  headerText: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  headerSub: { color: 'rgba(255,255,255,0.8)', fontSize: 12, marginTop: 4 },
  card: { backgroundColor: 'white', borderRadius: 12, padding: 12, marginBottom: 10, elevation: 2 },
  cardExact: { backgroundColor: '#e8f5e9', borderLeftWidth: 4, borderLeftColor: '#2e7d32' },
  cardWinner: { backgroundColor: '#fffde7', borderLeftWidth: 4, borderLeftColor: '#f9a825' },
  cardWrong: { backgroundColor: '#ffebee', borderLeftWidth: 4, borderLeftColor: '#c62828' },
  cardCerrado: { opacity: 0.6 },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8, flexWrap: 'wrap' },
  grupoBadge: { fontSize: 11, fontWeight: 'bold', color: '#2e7d32', backgroundColor: '#e8f5e9', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  fecha: { fontSize: 11, color: '#888', flex: 1 },
  resultadoReal: { backgroundColor: '#212529', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  resultadoPendiente: { backgroundColor: '#f0f2f5' },
  resultadoRealTxt: { color: 'white', fontSize: 11, fontWeight: 'bold' },
  resultadoPendienteTxt: { color: '#888' },
  cerradoTxt: { fontSize: 12 },
  ptsLabel: { fontSize: 11, fontWeight: 'bold', color: '#2e7d32' },
  cardMid: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  equipoContainer: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  equipo: { flex: 1, fontSize: 12, fontWeight: 'bold', color: '#333' },
  bandera: { width: 22, height: 15, borderRadius: 2 },
  inputsRow: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8 },
  input: { width: 44, height: 44, borderWidth: 2, borderColor: '#ddd', borderRadius: 8, textAlign: 'center', fontWeight: 'bold', fontSize: 18, color: '#333' },
  inputDisabled: { backgroundColor: '#f5f5f5', borderColor: '#eee', color: '#444' },
  guion: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 12, backgroundColor: 'white', borderTopWidth: 1, borderTopColor: '#eee' },
  guardarBtn: { backgroundColor: '#2e7d32', borderRadius: 12, padding: 16, alignItems: 'center' },
  guardarTxt: { color: 'white', fontWeight: 'bold', fontSize: 15 },
});