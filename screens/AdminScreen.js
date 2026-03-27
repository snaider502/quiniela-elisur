import { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, Alert, Image, ScrollView } from 'react-native';
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
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(null);
  const [esAdmin, setEsAdmin] = useState(false);
  const [tab, setTab] = useState('resultados');
  const [fechaLimite, setFechaLimite] = useState('');
  const [nuevaFechaLimite, setNuevaFechaLimite] = useState('');
  const [equiposPendientes, setEquiposPendientes] = useState([]);
  const [equipoEditar, setEquipoEditar] = useState('');
  const [equipoNuevo, setEquipoNuevo] = useState('');

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
    const [p, r, u] = await Promise.all([
      supabase.from('partidos').select('*').order('fecha', { ascending: true }),
      supabase.from('resultados').select('*'),
      supabase.from('usuarios').select('*').order('nombre'),
    ]);

    if (p.data) setPartidos(p.data);
    if (r.data) {
      const map = {};
      r.data.forEach(res => {
        map[res.partido_id] = {
          local: res.goles_local?.toString() || '',
          visita: res.goles_visita?.toString() || '',
          id: res.id
        };
      });
      setResultados(map);
    }
    if (u.data) setUsuarios(u.data);
    await cargarEquiposPendientes();
    const { data: config } = await supabase
      .from('configuracion')
      .select('valor')
      .eq('clave', 'fecha_limite')
      .single();
    if (config) {
      setFechaLimite(config.valor);
      setNuevaFechaLimite(config.valor);
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
      await guardarHistorialRanking();
      Alert.alert('✅ Listo', 'Resultado guardado y puntos calculados');
    }
    setGuardando(null);
  }

  async function calcularPuntosPartido(partido) {
    const res = resultados[partido.id];
    if (!res) return;
    const { data: preds } = await supabase.from('predicciones').select('*').eq('partido_id', partido.id);
    if (!preds || preds.length === 0) return;
    for (const pred of preds) {
      const r = [parseInt(res.local), parseInt(res.visita)];
      const p = [pred.goles_local, pred.goles_visita];
      let pts = 0; let tipo = 'wrong';
      if (r[0] === p[0] && r[1] === p[1]) { pts = 5; tipo = 'exact'; }
      else if (Math.sign(r[0] - r[1]) === Math.sign(p[0] - p[1])) {
        pts = Math.max(1, 5 - (Math.abs(r[0] - p[0]) + Math.abs(r[1] - p[1]))); tipo = 'winner';
      }
      await supabase.from('puntos').upsert({
        usuario_id: pred.usuario_id, partido_id: partido.id, puntos: pts, tipo_acierto: tipo,
      }, { onConflict: 'usuario_id,partido_id' });
    }
  }

  async function guardarHistorialRanking() {
    const { data: ranking } = await supabase.from('ranking_view').select('*');
    if (!ranking) return;
    for (let i = 0; i < ranking.length; i++) {
      await supabase.from('ranking_historial').insert({
        usuario_id: ranking[i].id, posicion: i + 1, puntos: ranking[i].puntos,
      });
    }
  }

  async function activarUsuario(userId) {
    const { error } = await supabase.from('usuarios').update({ activo: true }).eq('id', userId);
    if (error) Alert.alert('Error', error.message);
    else { Alert.alert('✅ Listo', 'Usuario activado'); cargarDatos(); }
  }

  async function desactivarUsuario(userId) {
    const { error } = await supabase.from('usuarios').update({ activo: false }).eq('id', userId);
    if (error) Alert.alert('Error', error.message);
    else { Alert.alert('✅ Listo', 'Usuario desactivado'); cargarDatos(); }
  }

  async function guardarFechaLimite() {
    const { error } = await supabase
      .from('configuracion')
      .update({ valor: nuevaFechaLimite })
      .eq('clave', 'fecha_limite');
    if (error) Alert.alert('Error', error.message);
    else {
      setFechaLimite(nuevaFechaLimite);
      Alert.alert('✅ Listo', 'Fecha límite actualizada');
    }
  }

async function cargarEquiposPendientes() {
  const codigos = ['A4', 'B2', 'D4', 'F3', 'I3', 'K2'];
  const pendientes = [];
  for (const codigo of codigos) {
    const { data } = await supabase
      .from('partidos')
      .select('id, titulo, equipo_local, equipo_visita')
      .or(`equipo_local.eq.${codigo},equipo_visita.eq.${codigo}`)
      .limit(1);
    if (data && data.length > 0) pendientes.push(codigo);
  }
  setEquiposPendientes(pendientes);
}

async function actualizarEquipo() {
  if (!equipoEditar || !equipoNuevo) {
    Alert.alert('Error', 'Completa ambos campos');
    return;
  }
  await supabase.rpc('actualizar_equipo', {
    codigo_viejo: equipoEditar,
    nombre_nuevo: equipoNuevo,
  });
  Alert.alert('✅ Listo', `${equipoEditar} actualizado a ${equipoNuevo}`);
  setEquipoEditar('');
  setEquipoNuevo('');
  await cargarEquiposPendientes();
  await cargarDatos();
}

  function formatearFecha(fecha) {
    if (!fecha) return '';
    const d = new Date(fecha);
    return d.getDate().toString().padStart(2, '0') + '/' + (d.getMonth() + 1).toString().padStart(2, '0');
  }

  if (loading) return (
    <View style={styles.center}><ActivityIndicator size="large" color="#2e7d32" /></View>
  );

  if (!esAdmin) return (
    <View style={styles.center}><Text style={styles.noAdmin}>🔒 Acceso solo para administrador</Text></View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>⚙️ Panel Admin</Text>
      </View>

      <View style={styles.tabs}>
        <TouchableOpacity
        style={[styles.tabBtn, tab === 'equipos' && styles.tabBtnActivo]}
        onPress={() => setTab('equipos')}>
        <Text style={[styles.tabTxt, tab === 'equipos' && styles.tabTxtActivo]}>🌍</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabBtn, tab === 'resultados' && styles.tabBtnActivo]}
          onPress={() => setTab('resultados')}>
          <Text style={[styles.tabTxt, tab === 'resultados' && styles.tabTxtActivo]}>⚽</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabBtn, tab === 'usuarios' && styles.tabBtnActivo]}
          onPress={() => setTab('usuarios')}>
          <Text style={[styles.tabTxt, tab === 'usuarios' && styles.tabTxtActivo]}>👥</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabBtn, tab === 'config' && styles.tabBtnActivo]}
          onPress={() => setTab('config')}>
          <Text style={[styles.tabTxt, tab === 'config' && styles.tabTxtActivo]}>🔧</Text>
        </TouchableOpacity>
      </View>
{tab === 'equipos' && (
  <ScrollView style={{ padding: 16 }}>
    <View style={styles.configCard}>
      <Text style={styles.configTitle}>🌍 Equipos Pendientes</Text>
      <Text style={styles.configDesc}>
        Actualiza los equipos que aún no estaban clasificados cuando se confirmen.
      </Text>

      {equiposPendientes.length === 0 && (
        <Text style={{ color: '#2e7d32', fontWeight: 'bold', textAlign: 'center', padding: 12 }}>
          ✅ Todos los equipos están confirmados
        </Text>
      )}

      {equiposPendientes.map(codigo => (
        <View key={codigo} style={styles.equipoPendienteRow}>
          <View style={styles.equipoCodigo}>
            <Text style={styles.equipoCodigoTxt}>{codigo}</Text>
            <Text style={styles.equipoPendienteTxt}>Por confirmar</Text>
          </View>
          <TouchableOpacity
            style={styles.equipoEditarBtn}
            onPress={() => setEquipoEditar(codigo)}>
            <Text style={styles.guardarTxt}>Actualizar</Text>
          </TouchableOpacity>
        </View>
      ))}

      {equipoEditar !== '' && (
        <View style={styles.equipoFormCard}>
          <Text style={styles.configTitle}>Actualizar: {equipoEditar}</Text>
          <TextInput
            style={styles.configInput}
            value={equipoNuevo}
            onChangeText={setEquipoNuevo}
            placeholder="Nombre del equipo clasificado"
            autoCapitalize="words"
          />
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity
              style={[styles.configBtn, { flex: 1 }]}
              onPress={actualizarEquipo}>
              <Text style={styles.guardarTxt}>💾 Confirmar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.configBtn, { flex: 1, backgroundColor: '#888' }]}
              onPress={() => { setEquipoEditar(''); setEquipoNuevo(''); }}>
              <Text style={styles.guardarTxt}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  </ScrollView>
)}
      {tab === 'resultados' && (
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
      )}

      {tab === 'usuarios' && (
        <FlatList
          data={usuarios}
          keyExtractor={item => item.id}
          contentContainerStyle={{ padding: 12 }}
          renderItem={({ item }) => (
            <View style={styles.userCard}>
              <View style={styles.userInfo}>
                <Text style={styles.userName}>{item.nombre}</Text>
                <Text style={styles.userEmail}>{item.email}</Text>
              </View>
              <View style={[styles.estadoBadge, item.activo ? styles.estadoActivo : styles.estadoInactivo]}>
                <Text style={styles.estadoTxt}>{item.activo ? 'Activo' : 'Inactivo'}</Text>
              </View>
              {item.activo
                ? <TouchableOpacity style={styles.btnDesactivar} onPress={() => desactivarUsuario(item.id)}>
                    <Text style={styles.btnTxt}>Desactivar</Text>
                  </TouchableOpacity>
                : <TouchableOpacity style={styles.btnActivar} onPress={() => activarUsuario(item.id)}>
                    <Text style={styles.btnTxt}>Activar</Text>
                  </TouchableOpacity>
              }
            </View>
          )}
        />
      )}

      {tab === 'config' && (
        <ScrollView style={{ padding: 16 }}>
          <View style={styles.configCard}>
            <Text style={styles.configTitle}>📅 Fecha límite de quiniela</Text>
            <Text style={styles.configDesc}>
              Los participantes no podrán modificar sus predicciones después de esta fecha y hora.
            </Text>
            <Text style={styles.configActual}>Actual: {fechaLimite}</Text>
            <TextInput
              style={styles.configInput}
              value={nuevaFechaLimite}
              onChangeText={setNuevaFechaLimite}
              placeholder="YYYY-MM-DD HH:MM:SS"
              autoCapitalize="none"
            />
            <Text style={styles.configHint}>Ejemplo: 2026-06-11 14:00:00</Text>
            <TouchableOpacity style={styles.configBtn} onPress={guardarFechaLimite}>
              <Text style={styles.guardarTxt}>💾 Guardar fecha límite</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f2f5' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  noAdmin: { fontSize: 16, color: '#888', textAlign: 'center' },
  header: { backgroundColor: '#1a237e', padding: 20, alignItems: 'center' },
  headerText: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  tabs: { flexDirection: 'row', backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#eee' },
  tabBtn: { flex: 1, padding: 14, alignItems: 'center' },
  tabBtnActivo: { borderBottomWidth: 3, borderBottomColor: '#1a237e' },
  tabTxt: { fontSize: 12, fontWeight: 'bold', color: '#888' },
  tabTxtActivo: { color: '#1a237e' },
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
  input: { width: 44, height: 44, borderWidth: 2, borderColor: '#1a237e', borderRadius: 8, textAlign: 'center', fontWeight: 'bold', fontSize: 18, color: '#333' },
  guion: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  guardarBtn: { backgroundColor: '#1a237e', borderRadius: 8, padding: 10, alignItems: 'center' },
  guardarTxt: { color: 'white', fontWeight: 'bold', fontSize: 13 },
  userCard: { backgroundColor: 'white', borderRadius: 12, padding: 14, marginBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 8, elevation: 1 },
  userInfo: { flex: 1 },
  userName: { fontSize: 14, fontWeight: 'bold', color: '#333' },
  userEmail: { fontSize: 11, color: '#888', marginTop: 2 },
  estadoBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  estadoActivo: { backgroundColor: '#e8f5e9' },
  estadoInactivo: { backgroundColor: '#ffebee' },
  estadoTxt: { fontSize: 11, fontWeight: 'bold', color: '#333' },
  btnActivar: { backgroundColor: '#2e7d32', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  btnDesactivar: { backgroundColor: '#c62828', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  btnTxt: { color: 'white', fontSize: 12, fontWeight: 'bold' },
  configCard: { backgroundColor: 'white', borderRadius: 12, padding: 16, elevation: 2 },
  configTitle: { fontSize: 15, fontWeight: 'bold', color: '#1a237e', marginBottom: 8 },
  configDesc: { fontSize: 12, color: '#666', marginBottom: 12, lineHeight: 18 },
  configActual: { fontSize: 12, color: '#888', marginBottom: 8 },
  configInput: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, fontSize: 14, marginBottom: 6, color: '#333' },
  configHint: { fontSize: 11, color: '#aaa', marginBottom: 12 },
  configBtn: { backgroundColor: '#1a237e', borderRadius: 8, padding: 12, alignItems: 'center' },
  equipoPendienteRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
equipoCodigo: { flex: 1 },
equipoCodigoTxt: { fontSize: 15, fontWeight: 'bold', color: '#333' },
equipoPendienteTxt: { fontSize: 11, color: '#f9a825' },
equipoEditarBtn: { backgroundColor: '#1a237e', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
equipoFormCard: { backgroundColor: '#f0f2f5', borderRadius: 10, padding: 14, marginTop: 14 },
});