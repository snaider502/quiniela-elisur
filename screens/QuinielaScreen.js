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
  'suecia': 'se', 'turquía': 'tr', 'turquia': 'tr',
  'república checa': 'cz', 'republica checa': 'cz', 'chequia': 'cz',
  'bosnia y herzegovina': 'ba', 'bosnia': 'ba', 'italia': 'it',
  'r. d. congo': 'cd', 'república democrática del congo': 'cd', 'rd congo': 'cd',
  'jamaica': 'jm', 'irak': 'iq', 'iraq': 'iq', 'bolivia': 'bo',
  'nueva caledonia': 'nc', 'surinam': 'sr',
};

function getBandera(pais) {
  if (!pais) return null;
  const code = BANDERAS[pais.toLowerCase()];
  return code ? `https://flagcdn.com/h20/${code}.png` : null;
}

const GRUPOS_VALIDOS = ['A','B','C','D','E','F','G','H','I','J','K','L'];
const GRUPOS_FILTRO = ['TODOS', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'R16', 'R8', 'R4', 'SEMI', 'FINAL'];

const FASES_MAP = {
  'Fase eliminatoria 16': { hab: 'fase_r16_habilitada', limite: 'fecha_limite_r16' },
  'Fase eliminatoria 8':  { hab: 'fase_r8_habilitada',  limite: 'fecha_limite_r8' },
  'Fase eliminatoria 4':  { hab: 'fase_r4_habilitada',  limite: 'fecha_limite_r4' },
  'SEMI-FINAL':           { hab: 'fase_semi_habilitada', limite: 'fecha_limite_semi' },
  'TERCER LUGAR':         { hab: 'fase_tercer_habilitada', limite: 'fecha_limite_tercer' },
  'FINAL':                { hab: 'fase_final_habilitada', limite: 'fecha_limite_final' },
};

function mapearFiltro(filtro) {
  const mapa = {
    'R16': 'Fase eliminatoria 16',
    'R8': 'Fase eliminatoria 8',
    'R4': 'Fase eliminatoria 4',
    'SEMI': 'SEMI-FINAL',
    'FINAL': 'FINAL',
  };
  return mapa[filtro] || filtro;
}

export default function QuinielaScreen({ recargar, activo }) {
  const [partidos, setPartidos] = useState([]);
  const [predicciones, setPredicciones] = useState({});
  const [prediccionesGuardadas, setPrediccionesGuardadas] = useState({});
  const [resultados, setResultados] = useState({});
  const [configuracion, setConfiguracion] = useState({});
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [userId, setUserId] = useState(null);
  const [filtroGrupo, setFiltroGrupo] = useState('TODOS');
  const [tiempoRestante, setTiempoRestante] = useState(null);

  useEffect(() => { iniciar(); }, []);
  useEffect(() => { if (recargar > 0) iniciar(); }, [recargar]);

  useEffect(() => {
    if (Object.keys(configuracion).length === 0) return;
    const timer = setInterval(() => {
      setTiempoRestante(calcularTiempoRestante());
    }, 1000);
    setTiempoRestante(calcularTiempoRestante());
    return () => clearInterval(timer);
  }, [configuracion]);

  async function iniciar() {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setUserId(user.id);
      await Promise.all([cargarPartidos(), cargarPredicciones(user.id), cargarResultados(), cargarConfiguracion()]);
    }
    setLoading(false);
  }

  async function cargarPartidos() {
    const { data } = await supabase.from('partidos').select('*').eq('tipo', 'partido').order('fecha', { ascending: true });
    if (data) setPartidos(data);
  }

  async function cargarPredicciones(uid) {
    const { data } = await supabase.from('predicciones').select('*').eq('usuario_id', uid);
    if (data) {
      const map = {};
      const guardadasMap = {};
      data.forEach(p => {
        map[p.partido_id] = { local: p.goles_local?.toString() ?? '', visita: p.goles_visita?.toString() ?? '' };
        guardadasMap[p.partido_id] = true;
      });
      setPredicciones(map);
      setPrediccionesGuardadas(guardadasMap);
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

  function calcularProgreso() {
    if (!partidos || partidos.length === 0) return { llenados: 0, total: 0, faltantes: 0 };
    const visibles = partidos.filter(p => esFaseVisible(p.grupo));
    const total = visibles.length;
    const llenados = visibles.filter(p => {
      const pred = predicciones[p.id];
      return pred?.local !== '' && pred?.visita !== '' && pred?.local !== undefined;
    }).length;
    return { llenados, total, faltantes: total - llenados };
  }

  function calcularTiempoRestante() {
    const limite = configuracion['fecha_limite'];
    if (!limite) return null;
    const diff = new Date(limite) - new Date();
    if (diff <= 0) return null;
    return {
      dias: Math.floor(diff / (1000 * 60 * 60 * 24)),
      horas: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
      minutos: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
      segundos: Math.floor((diff % (1000 * 60)) / 1000),
    };
  }

  function estaHabilitado(partido) {
    if (resultados[partido.id]) return false;
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
    if (GRUPOS_VALIDOS.includes(grupo)) {
      return configuracion['fase_grupos_habilitada'] !== 'false';
    }
    const fase = FASES_MAP[grupo];
    if (!fase) return false;
    return configuracion[fase.hab] === 'true';
  }

  function getColorCard(pred, resultado, partido) {
    if (!resultado) return null;
    if (!pred || pred.local === '' || pred.visita === '') return styles.cardWrong;
    const r = calcularPuntos(`${resultado.goles_local}-${resultado.goles_visita}`, `${pred.local}-${pred.visita}`, partido.titulo);
    if (r.clase === 'exact') return styles.cardExact;
    if (r.clase === 'winner') return styles.cardWinner;
    return styles.cardWrong;
  }

  function getPts(pred, resultado, partido) {
    if (!resultado || !pred || pred.local === '' || pred.visita === '') return null;
    const r = calcularPuntos(`${resultado.goles_local}-${resultado.goles_visita}`, `${pred.local}-${pred.visita}`, partido.titulo);
    return r.show ? r.pts : null;
  }

  function setPred(partidoId, campo, valor) {
    setPredicciones(prev => ({ ...prev, [partidoId]: { ...prev[partidoId], [campo]: valor } }));
  }

  function getEstadoPrediccion(partido) {
    const tieneResultado = !!resultados[partido.id];
    const pred = predicciones[partido.id];
    const guardada = prediccionesGuardadas[partido.id];
    const habilitado = estaHabilitado(partido);
    if (tieneResultado) return { texto: '🔒 Partido terminado', estilo: styles.estadoTerminado };
    if (!habilitado) return { texto: '🔒 Cerrado', estilo: styles.estadoCerrado };
    if (guardada && pred?.local !== '' && pred?.visita !== '') return { texto: '✓ Guardado', estilo: styles.estadoGuardado };
    return { texto: '⏳ Pendiente de ingreso', estilo: styles.estadoPendiente };
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
      const { error } = await supabase.from('predicciones').upsert({
        usuario_id: userId, partido_id: partido.id,
        goles_local: parseInt(pred.local), goles_visita: parseInt(pred.visita),
      }, { onConflict: 'usuario_id,partido_id' });
      if (error) errores++;
      else { guardados++; setPrediccionesGuardadas(prev => ({ ...prev, [partido.id]: true })); }
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

  const partidosVisibles = partidos
    .filter(p => esFaseVisible(p.grupo))
    .filter(p => filtroGrupo === 'TODOS' || p.grupo === mapearFiltro(filtroGrupo));

  const hayAlgoHabilitado = partidosVisibles.some(p => estaHabilitado(p));

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#292663" /></View>;

  if (!activo) return (
    <View style={styles.bloqueado}>
      <Text style={styles.bloqueadoIcono}>🔒</Text>
      <Text style={styles.bloqueadoTitulo}>Acceso Bloqueado</Text>
      <Text style={styles.bloqueadoMsg}>Para participar debes realizar el pago de inscripción de Q200.00 y contactar al administrador.</Text>
    </View>
  );

  const { llenados, total, faltantes } = calcularProgreso();
  const completo = faltantes === 0 && total > 0;

  return (
    <View style={styles.container}>

      {Object.keys(configuracion).length > 0 && (
        <View style={[styles.alertaBanner, completo ? styles.alertaCompleta : styles.alertaIncompleta]}>
          <View style={styles.alertaRow}>
            <Text style={styles.alertaIcono}>{completo ? '✅' : '⚠️'}</Text>
            <View style={{ flex: 1 }}>
              {completo
                ? <Text style={styles.alertaTxt}><Text style={styles.alertaBold}>¡Listo! </Text>Has registrado todos los {total} marcadores.</Text>
                : <Text style={styles.alertaTxt}>Te faltan <Text style={styles.alertaBold}>{faltantes} partidos</Text> por llenar de {total}</Text>
              }
            </View>
          </View>
          {!completo && tiempoRestante && (
            <View style={styles.cronometro}>
              <Text style={styles.cronometroLabel}>⏱️ Tiempo restante para llenar:</Text>
              <View style={styles.cronometroRow}>
                {[
                  { val: tiempoRestante.dias, label: 'días' },
                  { val: tiempoRestante.horas, label: 'hrs' },
                  { val: tiempoRestante.minutos, label: 'min' },
                  { val: tiempoRestante.segundos, label: 'seg' },
                ].map((item, i) => (
                  <View key={i} style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <View style={styles.cronometroItem}>
                      <Text style={styles.cronometroNum}>{String(item.val).padStart(2,'0')}</Text>
                      <Text style={styles.cronometroSub}>{item.label}</Text>
                    </View>
                    {i < 3 && <Text style={styles.cronometroDos}>:</Text>}
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>
      )}

      <FlatList
        data={partidosVisibles}
  keyExtractor={item => item.id.toString()}
  contentContainerStyle={{ padding: 12, paddingBottom: 100 }}
  ListHeaderComponent={
    <FlatList
      horizontal
      showsHorizontalScrollIndicator={false}
      data={GRUPOS_FILTRO.filter(g => {
        if (g === 'TODOS') return true;
        const grupoReal = mapearFiltro(g);
        return partidos.some(p => p.grupo === grupoReal && esFaseVisible(p.grupo));
      })}
      keyExtractor={g => g}
      style={{ backgroundColor: 'white', marginHorizontal: -12, marginTop: -12, marginBottom: 12, borderBottomWidth: 1, borderBottomColor: '#eee' }}
      contentContainerStyle={{ paddingHorizontal: 8, paddingVertical: 10 }}
      renderItem={({ item: g }) => (
        <TouchableOpacity
          style={[styles.filtroBtn, filtroGrupo === g && styles.filtroBtnActivo]}
          onPress={() => setFiltroGrupo(g)}>
          <Text style={[styles.filtroTxt, filtroGrupo === g && styles.filtroTxtActivo]}>{g}</Text>
        </TouchableOpacity>
      )}
    />
  }
  renderItem={({ item }) => {
          const pred = predicciones[item.id] || { local: '', visita: '' };
          const resultado = resultados[item.id];
          const tieneResultado = !!resultado;
          const habilitado = estaHabilitado(item);
          const colorCard = getColorCard(pred, resultado, item);
          const pts = getPts(pred, resultado, item);
          const estado = getEstadoPrediccion(item);

          return (
            <View style={[styles.card, colorCard, !habilitado && !tieneResultado && styles.cardCerrado]}>
              <View style={styles.cardTop}>
                <Text style={styles.grupoBadge}>
                  {GRUPOS_VALIDOS.includes(item.grupo) ? `Grupo ${item.grupo}` : item.grupo}
                </Text>
                <Text style={styles.fecha}>{formatearFecha(item.fecha)}</Text>
                {tieneResultado && (
                  <View style={styles.resultadoRealBadge}>
                    <Text style={styles.resultadoRealTxt}>{resultado.goles_local} - {resultado.goles_visita}</Text>
                  </View>
                )}
                {pts !== null && <Text style={styles.ptsLabel}>+{pts} pts</Text>}
              </View>
              <View style={styles.cardMid}>
                <View style={styles.equipoContainer}>
                  {getBandera(item.equipo_local) && <Image source={{ uri: getBandera(item.equipo_local) }} style={styles.bandera} />}
                  <Text style={styles.equipo} numberOfLines={1}>{item.equipo_local}</Text>
                </View>
                <View style={styles.inputsRow}>
                  {tieneResultado ? (
                    <View style={styles.predGuardadaBox}>
                      <Text style={styles.predGuardadaTxt}>{pred.local !== '' ? `${pred.local} - ${pred.visita}` : '- -'}</Text>
                    </View>
                  ) : (
                    <>
                      <TextInput style={[styles.input, !habilitado && styles.inputDisabled]} keyboardType="numeric" maxLength={2} value={pred.local} onChangeText={v => habilitado && setPred(item.id, 'local', v)} placeholder="-" placeholderTextColor="#ccc" editable={habilitado} />
                      <Text style={styles.guion}>-</Text>
                      <TextInput style={[styles.input, !habilitado && styles.inputDisabled]} keyboardType="numeric" maxLength={2} value={pred.visita} onChangeText={v => habilitado && setPred(item.id, 'visita', v)} placeholder="-" placeholderTextColor="#ccc" editable={habilitado} />
                    </>
                  )}
                </View>
                <View style={[styles.equipoContainer, { flexDirection: 'row-reverse' }]}>
                  {getBandera(item.equipo_visita) && <Image source={{ uri: getBandera(item.equipo_visita) }} style={styles.bandera} />}
                  <Text style={[styles.equipo, { textAlign: 'right' }]} numberOfLines={1}>{item.equipo_visita}</Text>
                </View>
              </View>
              {estado && (
                <View style={[styles.estadoRow, estado.estilo]}>
                  <Text style={styles.estadoTxt}>{estado.texto}</Text>
                </View>
              )}
            </View>
          );
        }}
      />

      {hayAlgoHabilitado && (
        <View style={styles.footer}>
          <TouchableOpacity style={styles.guardarBtn} onPress={guardarTodo} disabled={guardando}>
            {guardando ? <ActivityIndicator color="white" /> : <Text style={styles.guardarTxt}>💾 Guardar Quiniela</Text>}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f2f5' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  bloqueado: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: '#f0f2f5' },
  bloqueadoIcono: { fontSize: 64, marginBottom: 16 },
  bloqueadoTitulo: { fontSize: 22, fontWeight: 'bold', color: '#333', marginBottom: 12, textAlign: 'center' },
  bloqueadoMsg: { fontSize: 14, color: '#555', textAlign: 'center', lineHeight: 22 },
  card: { backgroundColor: 'white', borderRadius: 12, padding: 12, marginBottom: 10, elevation: 2 },
  cardExact: { backgroundColor: '#e3f8fd', borderLeftWidth: 4, borderLeftColor: '#292663' },
  cardWinner: { backgroundColor: '#fffde7', borderLeftWidth: 4, borderLeftColor: '#f9a825' },
  cardWrong: { backgroundColor: '#ffebee', borderLeftWidth: 4, borderLeftColor: '#c62828' },
  cardCerrado: { opacity: 0.6 },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8, flexWrap: 'wrap' },
  grupoBadge: { fontSize: 11, fontWeight: 'bold', color: '#292663', backgroundColor: '#e3f8fd', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  fecha: { fontSize: 11, color: '#888', flex: 1 },
  resultadoRealBadge: { backgroundColor: '#212529', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  resultadoRealTxt: { color: 'white', fontSize: 11, fontWeight: 'bold' },
  ptsLabel: { fontSize: 11, fontWeight: 'bold', color: '#292663' },
  cardMid: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  equipoContainer: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  equipo: { flex: 1, fontSize: 12, fontWeight: 'bold', color: '#333' },
  bandera: { width: 22, height: 15, borderRadius: 2 },
  inputsRow: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8 },
  input: { width: 44, height: 44, borderWidth: 2, borderColor: '#ddd', borderRadius: 8, textAlign: 'center', fontWeight: 'bold', fontSize: 18, color: '#333' },
  inputDisabled: { backgroundColor: '#f5f5f5', borderColor: '#eee', color: '#444' },
  guion: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  predGuardadaBox: { backgroundColor: '#212529', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, minWidth: 80, alignItems: 'center' },
  predGuardadaTxt: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  estadoRow: { marginTop: 8, paddingVertical: 4, paddingHorizontal: 10, borderRadius: 6, alignSelf: 'flex-start' },
  estadoTxt: { fontSize: 11, fontWeight: 'bold', color: '#555' },
  estadoGuardado: { backgroundColor: '#e3f8fd' },
  estadoPendiente: { backgroundColor: '#fff8e1' },
  estadoCerrado: { backgroundColor: '#f5f5f5' },
  estadoTerminado: { backgroundColor: '#eeeeee' },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 12, backgroundColor: 'white', borderTopWidth: 1, borderTopColor: '#eee' },
  guardarBtn: { backgroundColor: '#292663', borderRadius: 12, padding: 16, alignItems: 'center' },
  guardarTxt: { color: 'white', fontWeight: 'bold', fontSize: 15 },
  alertaBanner: { margin: 12, marginBottom: 0, borderRadius: 12, padding: 14, borderLeftWidth: 4, elevation: 2 },
  alertaCompleta: { backgroundColor: '#e3f8fd', borderLeftColor: '#292663' },
  alertaIncompleta: { backgroundColor: '#fff8e1', borderLeftColor: '#f9a825' },
  alertaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  alertaIcono: { fontSize: 20 },
  alertaTxt: { fontSize: 13, color: '#555' },
  alertaBold: { fontWeight: 'bold', color: '#ffcc40' },
  cronometro: { alignItems: 'center' },
  cronometroLabel: { fontSize: 11, color: '#888', marginBottom: 8 },
  cronometroRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  cronometroItem: { backgroundColor: '#212529', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, alignItems: 'center', minWidth: 50 },
  cronometroNum: { color: 'white', fontSize: 20, fontWeight: 'bold' },
  cronometroSub: { color: 'rgba(255,255,255,0.6)', fontSize: 9, marginTop: 2 },
  cronometroDos: { color: '#333', fontSize: 20, fontWeight: 'bold', marginBottom: 12 },
 filtroBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#f0f2f5', marginHorizontal: 4 },
  filtroBtnActivo: { backgroundColor: '#292663' },
  filtroTxt: { fontSize: 12, fontWeight: 'bold', color: '#555' },
  filtroTxtActivo: { color: 'white' },
});