import { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, Alert, Image, ScrollView } from 'react-native';
import { supabase } from '../lib/supabase';
import { calcularPuntosPartido as calcularPuntosPartidoUtil } from '../utils/calcularPuntos';

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

export default function AdminScreen({ recargar }) {
  const [partidos, setPartidos] = useState([]);
  const [resultados, setResultados] = useState({});
  const [usuarios, setUsuarios] = useState([]);
  const [equipos, setEquipos] = useState([]);
  const [resultadosBonos, setResultadosBonos] = useState({});
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(null);
  const [esAdmin, setEsAdmin] = useState(false);
  const [tab, setTab] = useState('resultados');
  const [fechaLimite, setFechaLimite] = useState('');
  const [nuevaFechaLimite, setNuevaFechaLimite] = useState('');
  const [configMap, setConfigMap] = useState({});
  const [nuevoConfigMap, setNuevoConfigMap] = useState({});
  const [equiposPendientes, setEquiposPendientes] = useState([]);
  const [equipoEditar, setEquipoEditar] = useState('');
  const [equipoNuevo, setEquipoNuevo] = useState('');
  const [equiposPorGrupo, setEquiposPorGrupo] = useState({});

  useEffect(() => {
  if (recargar > 0) verificarAdmin();
}, [recargar]);

  async function verificarAdmin() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from('usuarios').select('es_admin').eq('id', user.id).single();
    if (data?.es_admin) { setEsAdmin(true); await cargarDatos(); }
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
      r.data.forEach(res => { map[res.partido_id] = { local: res.goles_local?.toString() || '', visita: res.goles_visita?.toString() || '', id: res.id }; });
      setResultados(map);
    }
    if (u.data) setUsuarios(u.data);
    await cargarConfigFases();
    await cargarEquipos();
    await cargarResultadosBonos();
  }

  async function cargarConfigFases() {
    const { data } = await supabase.from('configuracion').select('*');
    if (data) {
      const map = {};
      data.forEach(c => { map[c.clave] = c.valor; });
      setConfigMap(map);
      setNuevoConfigMap(map);
      setFechaLimite(map['fecha_limite'] || '');
      setNuevaFechaLimite(map['fecha_limite'] || '');
    }
  }

  async function cargarEquipos() {
  const { data } = await supabase
    .from('partidos')
    .select('equipo_local, equipo_visita, grupo')
    .in('grupo', ['A','B','C','D','E','F','G','H','I','J','K','L']);
  if (data) {
    const set = new Set();
    const porGrupo = {};
    ['A','B','C','D','E','F','G','H','I','J','K','L'].forEach(g => { porGrupo[g] = new Set(); });
    data.forEach(p => {
      set.add(p.equipo_local);
      set.add(p.equipo_visita);
      if (porGrupo[p.grupo]) {
        porGrupo[p.grupo].add(p.equipo_local);
        porGrupo[p.grupo].add(p.equipo_visita);
      }
    });
    const porGrupoArray = {};
    ['A','B','C','D','E','F','G','H','I','J','K','L'].forEach(g => {
      porGrupoArray[g] = [...porGrupo[g]].sort();
    });
    setEquipos([...set].sort());
    setEquiposPorGrupo(porGrupoArray);
  }
  const codigos = ['A4', 'B2', 'D4', 'F3', 'I3', 'K2'];
  const pendientes = [];
  for (const codigo of codigos) {
    const { data: d } = await supabase.from('partidos').select('id').or(`equipo_local.eq.${codigo},equipo_visita.eq.${codigo}`).limit(1);
    if (d && d.length > 0) pendientes.push(codigo);
  }
  setEquiposPendientes(pendientes);
}
  async function cargarResultadosBonos() {
    const { data } = await supabase.from('configuracion').select('*');
    if (data) {
      const map = {};
      data.forEach(c => { if (c.clave.startsWith('resultado_bono_')) map[c.clave] = c.valor; });
      setResultadosBonos(map);
    }
  }

  function setResultado(partidoId, campo, valor) {
    setResultados(prev => ({ ...prev, [partidoId]: { ...prev[partidoId], [campo]: valor } }));
  }

  async function guardarResultado(partido) {
    const res = resultados[partido.id];
    if (!res || res.local === '' || res.visita === '') { Alert.alert('Error', 'Ingresa ambos marcadores'); return; }
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
      await enviarMensajeWhatsApp(`⚽ QUINIELA MUNDIAL 2026\n\nNuevo resultado:\n🏟️ ${partido.titulo}\n📊 ${res.local} - ${res.visita}\n\n¡Revisa tu posición en la app! 🏆`);
      Alert.alert('✅ Listo', 'Resultado guardado y puntos calculados');
    }
    setGuardando(null);
  }

 async function borrarResultado(partido) {
  try {
    await supabase.from('puntos').delete().eq('partido_id', partido.id);
    await supabase.from('resultados').delete().eq('partido_id', partido.id);
    setResultados(prev => {
      const nuevo = { ...prev };
      delete nuevo[partido.id];
      return nuevo;
    });
    alert('✅ Resultado y puntos borrados correctamente');
  } catch (e) {
    alert('Error: ' + e.message);
  }
}

  async function calcularPuntosPartido(partido) {
    const res = resultados[partido.id];
    if (!res) return;
    const { data: preds } = await supabase.from('predicciones').select('*').eq('partido_id', partido.id);
    if (!preds || preds.length === 0) return;
    for (const pred of preds) {
      const { pts, tipo } = calcularPuntosPartidoUtil(parseInt(res.local), parseInt(res.visita), pred.goles_local, pred.goles_visita);
      await supabase.from('puntos').upsert({
        usuario_id: pred.usuario_id, partido_id: partido.id, puntos: pts, tipo_acierto: tipo,
      }, { onConflict: 'usuario_id,partido_id' });
    }
  }

  async function guardarHistorialRanking() {
    const { data: ranking } = await supabase.from('ranking_view').select('*');
    if (!ranking) return;
    for (let i = 0; i < ranking.length; i++) {
      await supabase.from('ranking_historial').insert({ usuario_id: ranking[i].id, posicion: i + 1, puntos: ranking[i].puntos });
    }
  }

  async function enviarMensajeWhatsApp(mensaje) {
    try {
      const phone = '50242451548';
      const apikey = '6717176';
      await fetch(`https://api.callmebot.com/whatsapp.php?phone=${phone}&text=${encodeURIComponent(mensaje)}&apikey=${apikey}`);
    } catch (e) { console.log('Error WhatsApp:', e); }
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

async function eliminarUsuario(usuario) {
  try {
    const { error } = await supabase.from('usuarios').delete().eq('id', usuario.id);
    if (error) {
      alert('Error: ' + error.message);
    } else {
      alert('✅ ' + usuario.nombre + ' eliminado correctamente');
      cargarDatos();
    }
  } catch (e) {
    alert('Error: ' + e.message);
  }
}

  async function guardarFechaLimite() {
    const { error } = await supabase.from('configuracion').update({ valor: nuevaFechaLimite }).eq('clave', 'fecha_limite');
    if (error) Alert.alert('Error', error.message);
    else { setFechaLimite(nuevaFechaLimite); Alert.alert('✅ Listo', 'Fecha límite actualizada'); }
  }

  async function toggleFase(clave, fechaClave, nuevoValor) {
    const fechaLimiteFase = nuevoConfigMap[fechaClave];
    await supabase.from('configuracion').update({ valor: nuevoValor.toString() }).eq('clave', clave);
    if (fechaLimiteFase) await supabase.from('configuracion').update({ valor: fechaLimiteFase }).eq('clave', fechaClave);
    await cargarConfigFases();
    Alert.alert('✅ Listo', `Fase ${nuevoValor ? 'habilitada' : 'deshabilitada'}`);
  }

  async function actualizarEquipo() {
  if (!equipoEditar || !equipoNuevo) { Alert.alert('Error', 'Completa ambos campos'); return; }
  const { error } = await supabase.rpc('actualizar_equipo', { codigo_viejo: equipoEditar, nombre_nuevo: equipoNuevo });
  if (error) Alert.alert('Error', error.message);
  else {
    Alert.alert('✅ Listo', `${equipoEditar} actualizado a ${equipoNuevo}`);
    setEquipoEditar(''); setEquipoNuevo('');
    await cargarEquipos();
    await cargarDatos();
  }
}

  async function guardarResultadoBono(clave, valor) {
    const claveCompleta = `resultado_bono_${clave}`;
    const { error } = await supabase.from('configuracion').upsert({ clave: claveCompleta, valor }, { onConflict: 'clave' });
    if (error) Alert.alert('Error', error.message);
    else {
      setResultadosBonos(prev => ({ ...prev, [claveCompleta]: valor }));
      await calcularPuntosBonos(clave, valor);
      Alert.alert('✅ Listo', 'Resultado de bono guardado');
    }
  }

async function borrarResultadoBono(clave) {
  const claveCompleta = `resultado_bono_${clave}`;
  await supabase.from('configuracion').delete().eq('clave', claveCompleta);
  await supabase.from('puntos').delete().eq('tipo_acierto', `bono_${clave}`);
  setResultadosBonos(prev => {
    const nuevo = { ...prev };
    delete nuevo[claveCompleta];
    return nuevo;
  });
  alert('✅ Resultado de bono borrado');
}
  async function calcularPuntosBonos(clave, valorReal) {
    const { data: preds } = await supabase.from('predicciones_bonos').select('*').eq('clave', clave);
    if (!preds || preds.length === 0) return;
    const puntosMap = { 'campeon': 30, 'subcampeon': 20, 'tercer_lugar': 10, 'cuarto_lugar': 5, 'goleador': 15, 'portero': 15 };
    const pts = clave.startsWith('lider_') ? 10 : (clave.startsWith('mejor_tercero') ? 5 : puntosMap[clave] || 0);
    for (const pred of preds) {
      if (pred.valor?.toLowerCase() !== valorReal?.toLowerCase()) continue;
      await supabase.from('puntos').upsert({
        usuario_id: pred.usuario_id, partido_id: null, puntos: pts, tipo_acierto: `bono_${clave}`,
      }, { onConflict: 'usuario_id,tipo_acierto' });
    }
  }

  function formatearFecha(fecha) {
    if (!fecha) return '';
    const partes = fecha.split('T')[0].split('-');
    const meses = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
    return `${parseInt(partes[2])} ${meses[parseInt(partes[1])-1]}`;
  }

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#2e7d32" /></View>;
  if (!esAdmin) return <View style={styles.center}><Text style={styles.noAdmin}>🔒 Acceso solo para administrador</Text></View>;

  return (
    <View style={styles.container}>
      <View style={styles.tabs}>
        <TouchableOpacity style={[styles.tabBtn, tab === 'resultados' && styles.tabBtnActivo]} onPress={() => setTab('resultados')}>
          <Text style={[styles.tabTxt, tab === 'resultados' && styles.tabTxtActivo]}>⚽</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tabBtn, tab === 'usuarios' && styles.tabBtnActivo]} onPress={() => setTab('usuarios')}>
          <Text style={[styles.tabTxt, tab === 'usuarios' && styles.tabTxtActivo]}>👥</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tabBtn, tab === 'config' && styles.tabBtnActivo]} onPress={() => setTab('config')}>
          <Text style={[styles.tabTxt, tab === 'config' && styles.tabTxtActivo]}>🔧</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tabBtn, tab === 'equipos' && styles.tabBtnActivo]} onPress={() => setTab('equipos')}>
          <Text style={[styles.tabTxt, tab === 'equipos' && styles.tabTxtActivo]}>🌍</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tabBtn, tab === 'bonos' && styles.tabBtnActivo]} onPress={() => setTab('bonos')}>
          <Text style={[styles.tabTxt, tab === 'bonos' && styles.tabTxtActivo]}>⭐</Text>
        </TouchableOpacity>
      </View>

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
                  <Text style={styles.grupoBadge}>{item.grupo}</Text>
                  <Text style={styles.fecha}>{formatearFecha(item.fecha)}</Text>
                  {tieneResultado && <Text style={styles.checkmark}>✅</Text>}
                </View>
                <View style={styles.cardMid}>
                  <View style={styles.equipoContainer}>
                    {getBandera(item.equipo_local) && <Image source={{ uri: getBandera(item.equipo_local) }} style={styles.bandera} />}
                    <Text style={styles.equipo} numberOfLines={1}>{item.equipo_local}</Text>
                  </View>
                  <View style={styles.inputsRow}>
                    <TextInput style={styles.input} keyboardType="numeric" maxLength={2} value={res.local} onChangeText={v => setResultado(item.id, 'local', v)} placeholder="0" />
                    <Text style={styles.guion}>-</Text>
                    <TextInput style={styles.input} keyboardType="numeric" maxLength={2} value={res.visita} onChangeText={v => setResultado(item.id, 'visita', v)} placeholder="0" />
                  </View>
                  <View style={[styles.equipoContainer, { flexDirection: 'row-reverse' }]}>
                    {getBandera(item.equipo_visita) && <Image source={{ uri: getBandera(item.equipo_visita) }} style={styles.bandera} />}
                    <Text style={[styles.equipo, { textAlign: 'right' }]} numberOfLines={1}>{item.equipo_visita}</Text>
                  </View>
                </View>
                <TouchableOpacity style={styles.guardarBtn} onPress={() => guardarResultado(item)} disabled={guardando === item.id}>
                  {guardando === item.id ? <ActivityIndicator color="white" size="small" /> : <Text style={styles.guardarTxt}>Guardar resultado</Text>}
                </TouchableOpacity>
                {tieneResultado && (
                  <TouchableOpacity
  style={styles.borrarBtn}
  activeOpacity={0.7}
  onPress={() => {
    if (window.confirm(`¿Seguro que quieres borrar el resultado de ${item.equipo_local} vs ${item.equipo_visita}?`)) {
      borrarResultado(item);
    }
  }}>
  <Text style={styles.borrarTxt}>🗑️ Borrar resultado</Text>
</TouchableOpacity>
                )}
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
                ? <TouchableOpacity style={styles.btnDesactivar} onPress={() => desactivarUsuario(item.id)}><Text style={styles.btnTxt}>Desactivar</Text></TouchableOpacity>
                : <TouchableOpacity style={styles.btnActivar} onPress={() => activarUsuario(item.id)}><Text style={styles.btnTxt}>Activar</Text></TouchableOpacity>
              }
              <TouchableOpacity
  style={styles.btnEliminar}
  onPress={() => {
    if (typeof window !== 'undefined' && window.confirm) {
      if (window.confirm(`¿Eliminar a ${item.nombre}? Esta acción no se puede deshacer.`)) eliminarUsuario(item);
    } else {
      Alert.alert('Eliminar', `¿Eliminar a ${item.nombre}? Esta acción no se puede deshacer.`, [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Eliminar', style: 'destructive', onPress: () => eliminarUsuario(item) }
      ]);
    }
  }}>
  <Text style={styles.btnTxt}>🗑️</Text>
</TouchableOpacity>
            </View>
          )}
        />
      )}

      {tab === 'config' && (
        <ScrollView style={{ padding: 16 }}>
          <View style={styles.configCard}>
            <Text style={styles.configTitle}>📅 Fecha límite fase de grupos</Text>
            <Text style={styles.configActual}>Actual: {fechaLimite}</Text>
            <TextInput style={styles.configInput} value={nuevaFechaLimite} onChangeText={setNuevaFechaLimite} placeholder="YYYY-MM-DD HH:MM:SS" autoCapitalize="none" />
            <Text style={styles.configHint}>Ejemplo: 2026-06-11 12:00:00</Text>
            <TouchableOpacity style={styles.configBtn} onPress={guardarFechaLimite}>
              <Text style={styles.guardarTxt}>💾 Guardar fecha límite grupos</Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.configCard, { marginTop: 12 }]}>
            <Text style={styles.configTitle}>🏆 Habilitar Fases Eliminatorias</Text>
            {[
              { clave: 'fase_r16_habilitada', fechaClave: 'fecha_limite_r16', label: 'Fase de 32 (R16)' },
              { clave: 'fase_r8_habilitada', fechaClave: 'fecha_limite_r8', label: 'Fase de 16 (R8)' },
              { clave: 'fase_r4_habilitada', fechaClave: 'fecha_limite_r4', label: 'Cuartos de Final' },
              { clave: 'fase_semi_habilitada', fechaClave: 'fecha_limite_semi', label: 'Semifinales' },
              { clave: 'fase_tercer_habilitada', fechaClave: 'fecha_limite_tercer', label: '3er y 4to Lugar' },
              { clave: 'fase_final_habilitada', fechaClave: 'fecha_limite_final', label: 'Final' },
            ].map(fase => {
              const habilitada = configMap[fase.clave] === 'true';
              const fechaFase = configMap[fase.fechaClave] || '';
              return (
                <View key={fase.clave} style={styles.faseRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.faseLabel}>{fase.label}</Text>
                    <TextInput
                      style={styles.faseFechaInput}
                      value={nuevoConfigMap[fase.fechaClave] || fechaFase}
                      onChangeText={v => setNuevoConfigMap(prev => ({ ...prev, [fase.fechaClave]: v }))}
                      placeholder="YYYY-MM-DD HH:MM:SS"
                      autoCapitalize="none"
                    />
                  </View>
                  <TouchableOpacity
                    style={[styles.faseBtn, habilitada ? styles.faseBtnActivo : styles.faseBtnInactivo]}
                    onPress={() => toggleFase(fase.clave, fase.fechaClave, !habilitada)}>
                    <Text style={styles.faseBtnTxt}>{habilitada ? '✅ ON' : '⛔ OFF'}</Text>
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        </ScrollView>
      )}

      {tab === 'equipos' && (
  <ScrollView style={{ padding: 16 }}>
    <View style={styles.configCard}>
      <Text style={styles.configTitle}>🌍 Actualizar Equipos</Text>
      <Text style={styles.configDesc}>
        Busca el nombre actual del equipo y escribe el nombre correcto. Útil para playoffs y fase eliminatoria.
      </Text>

      <TextInput
        style={styles.configInput}
        value={equipoEditar}
        onChangeText={setEquipoEditar}
        placeholder="Nombre actual (ej: 1A, Ganador P73, A4...)"
        autoCapitalize="none"
      />
      <TextInput
        style={styles.configInput}
        value={equipoNuevo}
        onChangeText={setEquipoNuevo}
        placeholder="Nombre nuevo (ej: Argentina, España...)"
        autoCapitalize="words"
      />

      <TouchableOpacity style={styles.configBtn} onPress={actualizarEquipo}>
        <Text style={styles.guardarTxt}>💾 Actualizar Equipo</Text>
      </TouchableOpacity>
    </View>

    <View style={[styles.configCard, { marginTop: 12 }]}>
      <Text style={styles.configTitle}>⏳ Equipos Pendientes de Clasificar</Text>
      {equiposPendientes.length === 0 && (
        <Text style={{ color: '#2e7d32', fontWeight: 'bold', textAlign: 'center', padding: 12 }}>
          ✅ Todos los equipos confirmados
        </Text>
      )}
      {equiposPendientes.map(codigo => (
        <TouchableOpacity
          key={codigo}
          style={styles.equipoPendienteRow}
          onPress={() => setEquipoEditar(codigo)}>
          <View style={styles.equipoCodigo}>
            <Text style={styles.equipoCodigoTxt}>{codigo}</Text>
            <Text style={styles.equipoPendienteTxt}>Toca para editar</Text>
          </View>
          <Text style={{ fontSize: 18 }}>→</Text>
        </TouchableOpacity>
      ))}
    </View>

    <View style={[styles.configCard, { marginTop: 12, marginBottom: 30 }]}>
      <Text style={styles.configTitle}>🏆 Fase Eliminatoria</Text>
      <Text style={styles.configDesc}>
        Equipos pendientes en fase eliminatoria. Toca uno para pre-llenar el campo de arriba.
      </Text>
      {partidos
        .filter(p => !['A','B','C','D','E','F','G','H','I','J','K','L'].includes(p.grupo))
        .filter(p => 
          p.equipo_local.startsWith('1') || 
          p.equipo_local.startsWith('2') || 
          p.equipo_local.startsWith('3') ||
          p.equipo_local.startsWith('Ganador') ||
          p.equipo_local.startsWith('Perdedor') ||
          p.equipo_visita.startsWith('1') ||
          p.equipo_visita.startsWith('2') ||
          p.equipo_visita.startsWith('3') ||
          p.equipo_visita.startsWith('Ganador') ||
          p.equipo_visita.startsWith('Perdedor')
        )
        .map(p => (
          <View key={p.id} style={styles.equipoPendienteRow}>
            <View style={styles.equipoCodigo}>
              <Text style={styles.equipoCodigoTxt}>#{p.numero} {p.grupo}</Text>
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
                <TouchableOpacity
                  style={styles.equipoEditarBtn}
                  onPress={() => setEquipoEditar(p.equipo_local)}>
                  <Text style={styles.guardarTxt}>{p.equipo_local}</Text>
                </TouchableOpacity>
                <Text style={{ alignSelf: 'center', color: '#888' }}>vs</Text>
                <TouchableOpacity
                  style={styles.equipoEditarBtn}
                  onPress={() => setEquipoEditar(p.equipo_visita)}>
                  <Text style={styles.guardarTxt}>{p.equipo_visita}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        ))
      }
    </View>
  </ScrollView>
)}

      {tab === 'bonos' && (
        <ScrollView style={{ padding: 16 }}>
          {[
  { clave: 'campeon', label: 'Campeón del Mundo', icon: '🏆' },
  { clave: 'subcampeon', label: 'Subcampeón', icon: '🥈' },
  { clave: 'tercer_lugar', label: '3er Lugar', icon: '🥉' },
  { clave: 'cuarto_lugar', label: '4to Lugar', icon: '4️⃣' },
  { clave: 'goleador', label: 'Selección Goleadora', icon: '⚽' },
  { clave: 'portero', label: 'Portero Menos Vencido', icon: '🧤' },
].map(bono => (
  <View key={bono.clave} style={styles.bonoCard}>
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
      <Text style={styles.bonoTitulo}>{bono.icon} {bono.label}</Text>
      {resultadosBonos[`resultado_bono_${bono.clave}`] && (
        <TouchableOpacity
          style={styles.borrarBtn}
          onPress={() => {
            if (typeof window !== 'undefined' && window.confirm) {
              if (window.confirm(`¿Borrar resultado de ${bono.label}?`)) borrarResultadoBono(bono.clave);
            } else {
              Alert.alert('Borrar', `¿Borrar resultado de ${bono.label}?`, [
                { text: 'Cancelar', style: 'cancel' },
                { text: 'Borrar', style: 'destructive', onPress: () => borrarResultadoBono(bono.clave) }
              ]);
            }
          }}>
          <Text style={styles.borrarTxt}>🗑️ Borrar</Text>
        </TouchableOpacity>
      )}
    </View>
    {resultadosBonos[`resultado_bono_${bono.clave}`] && (
      <Text style={styles.bonoActual}>Actual: {resultadosBonos[`resultado_bono_${bono.clave}`]}</Text>
    )}
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
      {equipos.map(equipo => (
        <TouchableOpacity
          key={equipo}
          style={[styles.bonoEquipoBtn, resultadosBonos[`resultado_bono_${bono.clave}`] === equipo && styles.bonoEquipoBtnActivo]}
          onPress={() => guardarResultadoBono(bono.clave, equipo)}>
          {BANDERAS[equipo.toLowerCase()] && (
            <Image source={{ uri: `https://flagcdn.com/h20/${BANDERAS[equipo.toLowerCase()]}.png` }} style={styles.bandera} />
          )}
          <Text style={[styles.bonoEquipoBtnTxt, resultadosBonos[`resultado_bono_${bono.clave}`] === equipo && styles.bonoEquipoBtnTxtActivo]} numberOfLines={1}>{equipo}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  </View>
))}

          <View style={[styles.bonoCard, { marginTop: 8 }]}>
  <Text style={styles.bonoTitulo}>🥇 Líderes de Grupo</Text>
  {['A','B','C','D','E','F','G','H','I','J','K','L'].map(grupo => (
    <View key={grupo} style={styles.grupoBonoRow}>
      <Text style={styles.grupoBonoLabel}>Grupo {grupo}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flex: 1 }}>
        {(equiposPorGrupo[grupo] || []).map(equipo => (
          <TouchableOpacity
            key={equipo}
            style={[styles.bonoEquipoBtnSmall, resultadosBonos[`resultado_bono_lider_${grupo}`] === equipo && styles.bonoEquipoBtnActivo]}
            onPress={() => guardarResultadoBono(`lider_${grupo}`, equipo)}>
            {BANDERAS[equipo.toLowerCase()] && (
              <Image source={{ uri: `https://flagcdn.com/h20/${BANDERAS[equipo.toLowerCase()]}.png` }} style={{ width: 14, height: 10, borderRadius: 2 }} />
            )}
            <Text style={[styles.bonoEquipoBtnSmallTxt, resultadosBonos[`resultado_bono_lider_${grupo}`] === equipo && styles.bonoEquipoBtnTxtActivo]} numberOfLines={1}>{equipo}</Text>
          </TouchableOpacity>
        ))}
        {resultadosBonos[`resultado_bono_lider_${grupo}`] && (
          <TouchableOpacity
            style={[styles.bonoEquipoBtnSmall, { backgroundColor: '#ffebee' }]}
            onPress={() => borrarResultadoBono(`lider_${grupo}`)}>
            <Text style={{ fontSize: 10, color: '#c62828', fontWeight: 'bold' }}>🗑️</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  ))}
</View>

          <View style={[styles.bonoCard, { marginTop: 8, marginBottom: 30 }]}>
            <Text style={styles.bonoTitulo}>3️⃣ Mejores Terceros (selecciona 8)</Text>
            <Text style={styles.bonoActual}>Seleccionados: {Object.keys(resultadosBonos).filter(k => k.startsWith('resultado_bono_mejor_tercero')).length}/8</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
              {equipos.map(equipo => {
                const yaSeleccionado = Object.keys(resultadosBonos).some(k => k.startsWith('resultado_bono_mejor_tercero') && resultadosBonos[k] === equipo);
                return (
                  <TouchableOpacity
                    key={equipo}
                    style={[styles.bonoEquipoBtnGrid, yaSeleccionado && styles.bonoEquipoBtnActivo]}
                    onPress={() => {
                      if (yaSeleccionado) return;
                      const count = Object.keys(resultadosBonos).filter(k => k.startsWith('resultado_bono_mejor_tercero')).length;
                      if (count >= 8) { Alert.alert('Máximo 8', 'Ya seleccionaste los 8 mejores terceros'); return; }
                      guardarResultadoBono(`mejor_tercero_${count + 1}`, equipo);
                    }}>
                    {BANDERAS[equipo.toLowerCase()] && (
                      <Image source={{ uri: `https://flagcdn.com/h20/${BANDERAS[equipo.toLowerCase()]}.png` }} style={styles.bandera} />
                    )}
                    <Text style={[styles.bonoEquipoBtnTxt, yaSeleccionado && styles.bonoEquipoBtnTxtActivo]} numberOfLines={1}>{equipo}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
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
  tabs: { flexDirection: 'row', backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#eee' },
  tabBtn: { flex: 1, padding: 14, alignItems: 'center' },
  tabBtnActivo: { borderBottomWidth: 3, borderBottomColor: '#1a237e' },
  tabTxt: { fontSize: 18, color: '#888' },
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
  borrarBtn: { backgroundColor: '#ffebee', borderRadius: 8, padding: 8, alignItems: 'center', marginTop: 6 },
  borrarTxt: { color: '#c62828', fontWeight: 'bold', fontSize: 12 },
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
  faseRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  faseLabel: { fontSize: 13, fontWeight: 'bold', color: '#333', marginBottom: 4 },
  faseFechaInput: { borderWidth: 1, borderColor: '#ddd', borderRadius: 6, padding: 6, fontSize: 11, color: '#333' },
  faseBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, minWidth: 70, alignItems: 'center' },
  faseBtnActivo: { backgroundColor: '#2e7d32' },
  faseBtnInactivo: { backgroundColor: '#888' },
  faseBtnTxt: { color: 'white', fontWeight: 'bold', fontSize: 12 },
  equipoPendienteRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  equipoCodigo: { flex: 1 },
  equipoCodigoTxt: { fontSize: 15, fontWeight: 'bold', color: '#333' },
  equipoPendienteTxt: { fontSize: 11, color: '#f9a825' },
  equipoEditarBtn: { backgroundColor: '#1a237e', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  equipoFormCard: { backgroundColor: '#f0f2f5', borderRadius: 10, padding: 14, marginTop: 14 },
  bonoCard: { backgroundColor: 'white', borderRadius: 12, padding: 14, marginBottom: 10, elevation: 2 },
  bonoTitulo: { fontSize: 14, fontWeight: 'bold', color: '#1a237e', marginBottom: 4 },
  bonoActual: { fontSize: 12, color: '#2e7d32', fontWeight: 'bold' },
  bonoEquipoBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, backgroundColor: '#f0f2f5', marginRight: 6, minWidth: 80 },
  bonoEquipoBtnActivo: { backgroundColor: '#1a237e' },
  bonoEquipoBtnTxt: { fontSize: 11, fontWeight: 'bold', color: '#333' },
  bonoEquipoBtnTxtActivo: { color: 'white' },
  bonoEquipoBtnSmall: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 16, backgroundColor: '#f0f2f5', marginRight: 4 },
  bonoEquipoBtnSmallTxt: { fontSize: 10, fontWeight: 'bold', color: '#333' },
  bonoEquipoBtnGrid: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 6, borderRadius: 16, backgroundColor: '#f0f2f5', minWidth: '30%' },
  grupoBonoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 8 },
  grupoBonoLabel: { fontSize: 12, fontWeight: 'bold', color: '#1a237e', width: 60 },
  btnEliminar: { backgroundColor: '#333', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
});