import { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, Image } from 'react-native';
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
  'australia': 'au', 'francia': 'fr', 'egipto': 'eg', 'panamá': 'pa',
};

function getBandera(pais) {
  if (!pais) return null;
  const code = BANDERAS[pais?.toLowerCase()];
  return code ? `https://flagcdn.com/h20/${code}.png` : null;
}

const GRUPOS = ['A','B','C','D','E','F','G','H','I','J','K','L'];

const BONOS = [
  { clave: 'campeon', label: 'Campeón del Mundo', pts: 30, icon: '🏆' },
  { clave: 'subcampeon', label: 'Subcampeón', pts: 20, icon: '🥈' },
  { clave: 'tercer_lugar', label: '3er Lugar', pts: 10, icon: '🥉' },
  { clave: 'cuarto_lugar', label: '4to Lugar', pts: 5, icon: '4️⃣' },
  { clave: 'goleador', label: 'Selección Goleadora', pts: 15, icon: '⚽' },
  { clave: 'portero', label: 'Selección Portero Menos Vencido', pts: 15, icon: '🧤' },
];

export default function BonosScreen({ recargar }) {
  const [equipos, setEquipos] = useState([]);
  const [equiposPorGrupo, setEquiposPorGrupo] = useState({});
  const [predicciones, setPredicciones] = useState({});
  const [resultadosReales, setResultadosReales] = useState({});
  const [lideresGrupo, setLideresGrupo] = useState({});
  const [mejoresTerceros, setMejoresTerceros] = useState([]);
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [userId, setUserId] = useState(null);
  const [fechaLimite, setFechaLimite] = useState(null);

  useEffect(() => { iniciar(); }, []);
  useEffect(() => { if (recargar > 0) iniciar(); }, [recargar]);

  async function iniciar() {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setUserId(user.id);
      await Promise.all([
        cargarEquipos(),
        cargarPredicciones(user.id),
        cargarFechaLimite(),
        cargarResultadosReales(),
      ]);
    }
    setLoading(false);
  }

  async function cargarEquipos() {
    const { data } = await supabase
      .from('partidos')
      .select('equipo_local, equipo_visita, grupo')
      .in('grupo', GRUPOS);
    if (data) {
      const todosSet = new Set();
      const porGrupo = {};
      GRUPOS.forEach(g => { porGrupo[g] = new Set(); });
      data.forEach(p => {
        todosSet.add(p.equipo_local);
        todosSet.add(p.equipo_visita);
        if (porGrupo[p.grupo]) {
          porGrupo[p.grupo].add(p.equipo_local);
          porGrupo[p.grupo].add(p.equipo_visita);
        }
      });
      const porGrupoArray = {};
      GRUPOS.forEach(g => { porGrupoArray[g] = [...porGrupo[g]].sort(); });
      setEquipos([...todosSet].sort());
      setEquiposPorGrupo(porGrupoArray);
    }
  }

  async function cargarPredicciones(uid) {
    const { data } = await supabase.from('predicciones_bonos').select('*').eq('usuario_id', uid);
    if (data) {
      const map = {};
      data.forEach(p => { map[p.clave] = p.valor; });
      setPredicciones(map);
      const lideres = {};
      GRUPOS.forEach(g => { if (map[`lider_${g}`]) lideres[g] = map[`lider_${g}`]; });
      setLideresGrupo(lideres);
      const terceros = [];
      for (let i = 1; i <= 8; i++) {
        if (map[`mejor_tercero_${i}`]) terceros.push(map[`mejor_tercero_${i}`]);
      }
      setMejoresTerceros(terceros);
    }
  }

  async function cargarFechaLimite() {
    const { data } = await supabase.from('configuracion').select('valor').eq('clave', 'fecha_limite').single();
    if (data) setFechaLimite(new Date(data.valor));
  }

  async function cargarResultadosReales() {
    const { data } = await supabase.from('configuracion').select('*');
    if (data) {
      const map = {};
      data.forEach(c => {
        if (c.clave.startsWith('resultado_bono_')) {
          map[c.clave.replace('resultado_bono_', '')] = c.valor;
        }
      });
      setResultadosReales(map);
    }
  }

  const habilitado = !fechaLimite || new Date() <= fechaLimite;

  function getColorBono(clave, valorPrediccion) {
    const real = resultadosReales[clave];
    if (!real || !valorPrediccion) return null;
    if (real.toLowerCase() === valorPrediccion.toLowerCase()) return 'exact';
    return 'wrong';
  }

  function seleccionarEquipo(clave, equipo) {
    if (!habilitado) return;
    setPredicciones(prev => ({ ...prev, [clave]: equipo }));
  }

  function seleccionarLider(grupo, equipo) {
    if (!habilitado) return;
    setLideresGrupo(prev => ({ ...prev, [grupo]: equipo }));
    setPredicciones(prev => ({ ...prev, [`lider_${grupo}`]: equipo }));
  }

  function toggleMejorTercero(equipo) {
    if (!habilitado) return;
    setMejoresTerceros(prev => {
      if (prev.includes(equipo)) {
        const nuevo = prev.filter(e => e !== equipo);
        actualizarTerceros(nuevo);
        return nuevo;
      }
      if (prev.length >= 8) {
        Alert.alert('Máximo 8', 'Solo puedes seleccionar 8 mejores terceros');
        return prev;
      }
      const nuevo = [...prev, equipo];
      actualizarTerceros(nuevo);
      return nuevo;
    });
  }

  function actualizarTerceros(lista) {
    setPredicciones(p => {
      const np = { ...p };
      for (let i = 1; i <= 8; i++) delete np[`mejor_tercero_${i}`];
      lista.forEach((e, i) => { np[`mejor_tercero_${i + 1}`] = e; });
      return np;
    });
  }

  async function guardarTodo() {
    if (!habilitado) {
      Alert.alert('Tiempo agotado', 'El plazo para ingresar bonos ha vencido.');
      return;
    }
    setGuardando(true);
    let guardados = 0;
    for (const [clave, valor] of Object.entries(predicciones)) {
      if (!valor) continue;
      const { error } = await supabase
        .from('predicciones_bonos')
        .upsert({ usuario_id: userId, clave, valor }, { onConflict: 'usuario_id,clave' });
      if (!error) guardados++;
    }
    setGuardando(false);
    Alert.alert('✅ Listo', `Se guardaron ${guardados} predicciones de bonos.`);
  }

  if (loading) return (
    <View style={styles.center}><ActivityIndicator size="large" color="#f57f17" /></View>
  );

  return (
    <ScrollView style={styles.container}>
      <View style={styles.alertContainer}>
        {!habilitado && <Text style={styles.alertTxt}>🔒 Plazo vencido</Text>}
      </View>

      {BONOS.map(bono => {
        const colorCard = getColorBono(bono.clave, predicciones[bono.clave]);
        return (
          <View key={bono.clave} style={[
            styles.seccion,
            colorCard === 'exact' && styles.seccionExact,
            colorCard === 'wrong' && styles.seccionWrong,
          ]}>
            <View style={styles.seccionHeader}>
              <Text style={styles.seccionIcono}>{bono.icon}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.seccionTitulo}>{bono.label}</Text>
                <Text style={styles.seccionPts}>+{bono.pts} puntos</Text>
              </View>
              {predicciones[bono.clave] && (
                <View style={[
                  styles.seleccionadoBadge,
                  colorCard === 'exact' && styles.badgeExact,
                  colorCard === 'wrong' && styles.badgeWrong,
                ]}>
                  {getBandera(predicciones[bono.clave]) && (
                    <Image source={{ uri: getBandera(predicciones[bono.clave]) }} style={styles.banderaBadge} />
                  )}
                  <Text style={[
                    styles.seleccionadoTxt,
                    colorCard === 'exact' && { color: '#1b5e20' },
                    colorCard === 'wrong' && { color: '#b71c1c' },
                  ]} numberOfLines={1}>{predicciones[bono.clave]}</Text>
                  {colorCard === 'exact' && <Text style={{ color: '#1b5e20', fontWeight: 'bold' }}>+{bono.pts}pts</Text>}
                </View>
              )}
            </View>
            <View style={styles.equiposGrid}>
              {equipos.map(equipo => {
                const seleccionado = predicciones[bono.clave] === equipo;
                const colorBono = seleccionado ? getColorBono(bono.clave, equipo) : null;
                return (
                  <TouchableOpacity
                    key={equipo}
                    style={[
                      styles.equipoBtnGrid,
                      seleccionado && !colorBono && styles.equipoBtnSeleccionado,
                      colorBono === 'exact' && styles.equipoBtnExact,
                      colorBono === 'wrong' && styles.equipoBtnWrong,
                      !habilitado && styles.equipoBtnDisabled,
                    ]}
                    onPress={() => seleccionarEquipo(bono.clave, equipo)}>
                    {getBandera(equipo) && (
                      <Image source={{ uri: getBandera(equipo) }} style={styles.banderaBtn} />
                    )}
                    <Text style={[
                      styles.equipoBtnTxt,
                      (seleccionado || colorBono) && styles.equipoBtnTxtActivo,
                    ]} numberOfLines={1}>{equipo}</Text>
                    {colorBono === 'exact' && <Text style={styles.checkIcon}>✓</Text>}
                    {colorBono === 'wrong' && <Text style={styles.wrongIcon}>✗</Text>}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        );
      })}

      <View style={styles.seccion}>
        <View style={styles.seccionHeader}>
          <Text style={styles.seccionIcono}>🥇</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.seccionTitulo}>Líder de cada Grupo</Text>
            <Text style={styles.seccionPts}>+10 puntos por grupo acertado</Text>
          </View>
        </View>
        {GRUPOS.map(grupo => {
          const colorLider = getColorBono(`lider_${grupo}`, lideresGrupo[grupo]);
          return (
            <View key={grupo} style={[
              styles.grupoRow,
              colorLider === 'exact' && styles.grupoRowExact,
              colorLider === 'wrong' && styles.grupoRowWrong,
            ]}>
              <Text style={styles.grupoLabel}>Grupo {grupo}</Text>
              <View style={styles.grupoEquipos}>
                {(equiposPorGrupo[grupo] || []).map(equipo => {
                  const sel = lideresGrupo[grupo] === equipo;
                  const color = sel ? getColorBono(`lider_${grupo}`, equipo) : null;
                  return (
                    <TouchableOpacity
                      key={equipo}
                      style={[
                        styles.equipoBtnSmall,
                        sel && !color && styles.equipoBtnSeleccionado,
                        color === 'exact' && styles.equipoBtnExact,
                        color === 'wrong' && styles.equipoBtnWrong,
                        !habilitado && styles.equipoBtnDisabled,
                      ]}
                      onPress={() => seleccionarLider(grupo, equipo)}>
                      {getBandera(equipo) && (
                        <Image source={{ uri: getBandera(equipo) }} style={styles.banderaBtnSmall} />
                      )}
                      <Text style={[
                        styles.equipoBtnSmallTxt,
                        (sel || color) && styles.equipoBtnTxtActivo,
                      ]} numberOfLines={1}>{equipo}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          );
        })}
      </View>

      <View style={styles.seccion}>
        <View style={styles.seccionHeader}>
          <Text style={styles.seccionIcono}>3️⃣</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.seccionTitulo}>8 Mejores Terceros</Text>
            <Text style={styles.seccionPts}>+5 pts por acierto ({mejoresTerceros.length}/8)</Text>
          </View>
        </View>
        <View style={styles.equiposGrid}>
          {equipos.map(equipo => {
            const sel = mejoresTerceros.includes(equipo);
            const realTerceros = Object.keys(resultadosReales)
              .filter(k => k.startsWith('mejor_tercero'))
              .map(k => resultadosReales[k]?.toLowerCase());
            const esAcierto = sel && realTerceros.includes(equipo.toLowerCase());
            const esFallo = sel && realTerceros.length > 0 && !realTerceros.includes(equipo.toLowerCase());
            return (
              <TouchableOpacity
                key={equipo}
                style={[
                  styles.equipoBtnGrid,
                  sel && !esAcierto && !esFallo && styles.equipoBtnSeleccionado,
                  esAcierto && styles.equipoBtnExact,
                  esFallo && styles.equipoBtnWrong,
                  !habilitado && styles.equipoBtnDisabled,
                ]}
                onPress={() => toggleMejorTercero(equipo)}>
                {getBandera(equipo) && (
                  <Image source={{ uri: getBandera(equipo) }} style={styles.banderaBtn} />
                )}
                <Text style={[
                  styles.equipoBtnTxt,
                  (sel || esAcierto) && styles.equipoBtnTxtActivo,
                ]} numberOfLines={1}>{equipo}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {habilitado && (
        <View style={styles.footer}>
          <TouchableOpacity style={styles.guardarBtn} onPress={guardarTodo} disabled={guardando}>
            {guardando
              ? <ActivityIndicator color="white" />
              : <Text style={styles.guardarTxt}>💾 Guardar Bonos</Text>
            }
          </TouchableOpacity>
        </View>
      )}

      <View style={{ height: 100 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f2f5' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  alertContainer: { padding: 8, alignItems: 'center' },
  alertTxt: { color: '#c62828', fontWeight: 'bold', fontSize: 13 },
  seccion: { backgroundColor: 'white', margin: 12, marginBottom: 0, borderRadius: 12, padding: 14, elevation: 2 },
  seccionExact: { backgroundColor: '#e8f5e9', borderLeftWidth: 4, borderLeftColor: '#2e7d32' },
  seccionWrong: { backgroundColor: '#ffebee', borderLeftWidth: 4, borderLeftColor: '#c62828' },
  seccionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  seccionIcono: { fontSize: 24 },
  seccionTitulo: { fontSize: 14, fontWeight: 'bold', color: '#333' },
  seccionPts: { fontSize: 11, color: '#f57f17', fontWeight: 'bold' },
  seleccionadoBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#e8f5e9', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10, maxWidth: 140 },
  badgeExact: { backgroundColor: '#c8e6c9' },
  badgeWrong: { backgroundColor: '#ffcdd2' },
  banderaBadge: { width: 18, height: 12, borderRadius: 2 },
  seleccionadoTxt: { fontSize: 11, fontWeight: 'bold', color: '#2e7d32' },
  equiposGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  equipoBtnGrid: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 6, borderRadius: 16, backgroundColor: '#f0f2f5', minWidth: '30%' },
  equipoBtnSeleccionado: { backgroundColor: '#1565c0' },
  equipoBtnExact: { backgroundColor: '#2e7d32' },
  equipoBtnWrong: { backgroundColor: '#c62828' },
  equipoBtnDisabled: { opacity: 0.5 },
  equipoBtnTxt: { fontSize: 11, fontWeight: 'bold', color: '#333', flex: 1 },
  equipoBtnTxtActivo: { color: 'white' },
  banderaBtn: { width: 18, height: 12, borderRadius: 2 },
  checkIcon: { color: 'white', fontWeight: 'bold', fontSize: 12 },
  wrongIcon: { color: 'white', fontWeight: 'bold', fontSize: 12 },
  grupoRow: { marginBottom: 10, padding: 6, borderRadius: 8 },
  grupoRowExact: { backgroundColor: '#e8f5e9' },
  grupoRowWrong: { backgroundColor: '#ffebee' },
  grupoLabel: { fontSize: 12, fontWeight: 'bold', color: '#2e7d32', marginBottom: 6 },
  grupoEquipos: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  equipoBtnSmall: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 16, backgroundColor: '#f0f2f5' },
  banderaBtnSmall: { width: 14, height: 10, borderRadius: 2 },
  equipoBtnSmallTxt: { fontSize: 10, fontWeight: 'bold', color: '#333' },
  footer: { margin: 12, marginTop: 16 },
  guardarBtn: { backgroundColor: '#f57f17', borderRadius: 12, padding: 16, alignItems: 'center' },
  guardarTxt: { color: 'white', fontWeight: 'bold', fontSize: 15 },
});