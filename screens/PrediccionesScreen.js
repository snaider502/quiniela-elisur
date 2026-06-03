import { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, ActivityIndicator, Image, ScrollView } from 'react-native';
import { supabase } from '../lib/supabase';
import { calcularPuntos } from '../utils/calcularPuntos';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

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
  'suecia': 'se','Suecia': 'se', 'turquía': 'tr', 'turquia': 'tr',
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

const BONOS_KEYS = ['campeon', 'subcampeon', 'tercer_lugar', 'cuarto_lugar', 'goleador', 'portero'];
const BONOS_LABELS = {
  'campeon': { label: 'Campeón', icon: '🏆' },
  'subcampeon': { label: 'Subcampeón', icon: '🥈' },
  'tercer_lugar': { label: '3er Lugar', icon: '🥉' },
  'cuarto_lugar': { label: '4to Lugar', icon: '4️⃣' },
  'goleador': { label: 'Goleadora', icon: '⚽' },
  'portero': { label: 'Portero', icon: '🧤' },
};

const GRUPOS = ['A','B','C','D','E','F','G','H','I','J','K','L'];
const LIDERES_KEYS = GRUPOS.map(g => `lider_${g}`);
const TERCEROS_KEYS = Array.from({length: 8}, (_, i) => `mejor_tercero_${i+1}`);

const FILTROS = ['Partidos', 'Bonos'];

export default function PrediccionesScreen({ recargar }) {
  const [partidos, setPartidos] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [predicciones, setPredicciones] = useState([]);
  const [resultados, setResultados] = useState([]);
  const [prediccionesBonos, setPrediccionesBonos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [partidoActivo, setPartidoActivo] = useState(null);
  const [filtro, setFiltro] = useState('Partidos');

  useEffect(() => { cargarDatos(); }, []);
  useEffect(() => { if (recargar > 0) cargarDatos(); }, [recargar]);

  async function cargarDatos() {
    const [p, u, pred, res, bonos] = await Promise.all([
      supabase.from('partidos').select('*').eq('tipo', 'partido').order('numero', { ascending: true }),
      supabase.from('ranking_view').select('*'),
      supabase.from('predicciones').select('*'),
      supabase.from('resultados').select('*'),
      supabase.from('predicciones_bonos').select('*'),
    ]);
    if (p.data) { setPartidos(p.data); setPartidoActivo(p.data[0]); }
    if (u.data) setUsuarios(u.data);
    if (pred.data) setPredicciones(pred.data);
    if (res.data) setResultados(res.data);
    if (bonos.data) setPrediccionesBonos(bonos.data);
    setLoading(false);
  }

  function getResultado(partidoId) {
    const r = resultados.find(r => r.partido_id === partidoId);
    if (!r || r.goles_local === null) return null;
    return { local: r.goles_local, visita: r.goles_visita };
  }

  function getPrediccion(usuarioId, partidoId) {
    const p = predicciones.find(p => p.usuario_id === usuarioId && p.partido_id === partidoId);
    if (!p) return null;
    return { local: p.goles_local, visita: p.goles_visita };
  }

  function getColor(pred, resultado, partido) {
    if (!pred || !resultado) return styles.predNeutral;
    const r = calcularPuntos(`${resultado.local}-${resultado.visita}`, `${pred.local}-${pred.visita}`, partido.titulo);
    if (r.clase === 'exact') return styles.predExact;
    if (r.clase === 'winner') return styles.predWinner;
    return styles.predWrong;
  }

  function getPuntos(pred, resultado, partido) {
    if (!pred || !resultado) return null;
    const r = calcularPuntos(`${resultado.local}-${resultado.visita}`, `${pred.local}-${pred.visita}`, partido.titulo);
    return r.show ? r.pts : null;
  }

  async function exportarExcel() {
    const { data: parts } = await supabase.from('partidos').select('*').eq('tipo', 'partido').order('numero', { ascending: true });
    const { data: preds } = await supabase.from('predicciones').select('*');
    const { data: ress } = await supabase.from('resultados').select('*');
    if (!parts || !usuarios || !preds) return;
    const resMap = {};
    ress?.forEach(r => { resMap[r.partido_id] = r; });
    let csv = 'Participante,' + parts.map(p => `#${p.numero} ${p.equipo_local} vs ${p.equipo_visita}`).join(',') + ',TOTAL PTS\n';
    usuarios.forEach(u => {
      let fila = `"${u.nombre}"`;
      parts.forEach(p => {
        const pred = preds.find(pr => pr.usuario_id === u.id && pr.partido_id === p.id);
        const res = resMap[p.id];
        if (!pred) { fila += ',-'; }
        else {
          const predStr = `${pred.goles_local}-${pred.goles_visita}`;
          if (res) {
            const r = calcularPuntos(`${res.goles_local}-${res.goles_visita}`, predStr, p.titulo);
            fila += `,${predStr}(+${r.pts}pts)`;
          } else { fila += `,${predStr}`; }
        }
      });
      fila += `,${u.puntos}`;
      csv += fila + '\n';
    });
    if (Platform.OS === 'web') {
      const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `quiniela_mundial_2026_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } else {
      const path = FileSystem.documentDirectory + `quiniela_${new Date().toISOString().split('T')[0]}.csv`;
      await FileSystem.writeAsStringAsync(path, csv, { encoding: FileSystem.EncodingType.UTF8 });
      await Sharing.shareAsync(path, { mimeType: 'text/csv', dialogTitle: 'Exportar Quiniela' });
    }
  }

  const resultado = partidoActivo ? getResultado(partidoActivo.id) : null;

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#292663" /></View>;

  return (
    <View style={styles.container}>

      <View style={styles.filtrosContainer}>
        <TouchableOpacity style={styles.exportBtn} onPress={exportarExcel}>
          <Text style={styles.exportTxt}>📥 Excel</Text>
        </TouchableOpacity>
        {FILTROS.map(f => (
          <TouchableOpacity
            key={f}
            style={[styles.filtroBtn, filtro === f && styles.filtroBtnActivo]}
            onPress={() => setFiltro(f)}>
            <Text style={[styles.filtroTxt, filtro === f && styles.filtroTxtActivo]}>
              {f === 'Partidos' ? '⚽ Partidos' : '⭐ Bonos'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {filtro === 'Partidos' && (
        <>
          <View style={styles.partidosContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={true} contentContainerStyle={styles.partidosContent}>
              {partidos.map(item => {
                const res = getResultado(item.id);
                const activo = partidoActivo?.id === item.id;
                return (
                  <TouchableOpacity key={item.id.toString()} style={[styles.partidoBtn, activo && styles.partidoBtnActivo]} onPress={() => setPartidoActivo(item)}>
                    <Text style={[styles.partidoNum, activo && styles.partidoTxtActivo]}>#{item.numero}</Text>
                    <Text style={[styles.partidoEquipos, activo && styles.partidoTxtActivo]} numberOfLines={1}>{item.equipo_local} vs {item.equipo_visita}</Text>
                    {res ? <Text style={styles.resSmall}>{res.local}-{res.visita}</Text> : <Text style={styles.resPendiente}>Pendiente</Text>}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {partidoActivo && (
            <View style={styles.partidoHeader}>
              <View style={styles.equipoRow}>
                {getBandera(partidoActivo.equipo_local) && <Image source={{ uri: getBandera(partidoActivo.equipo_local) }} style={styles.bandera} />}
                <Text style={styles.equipoNombre} numberOfLines={1}>{partidoActivo.equipo_local}</Text>
              </View>
              <View style={styles.scoreCenter}>
                {resultado ? <Text style={styles.scoreReal}>{resultado.local} - {resultado.visita}</Text> : <Text style={styles.scorePendiente}>vs</Text>}
              </View>
              <View style={[styles.equipoRow, { flexDirection: 'row-reverse' }]}>
                {getBandera(partidoActivo.equipo_visita) && <Image source={{ uri: getBandera(partidoActivo.equipo_visita) }} style={styles.bandera} />}
                <Text style={[styles.equipoNombre, { textAlign: 'right' }]} numberOfLines={1}>{partidoActivo.equipo_visita}</Text>
              </View>
            </View>
          )}

          <FlatList
            data={usuarios}
            keyExtractor={u => u.id}
            contentContainerStyle={{ paddingBottom: 20 }}
            renderItem={({ item: u, index: i }) => {
              const pred = partidoActivo ? getPrediccion(u.id, partidoActivo.id) : null;
              const colorStyle = partidoActivo ? getColor(pred, resultado, partidoActivo) : styles.predNeutral;
              const pts = partidoActivo ? getPuntos(pred, resultado, partidoActivo) : null;
              const medallas = ['🥇', '🥈', '🥉'];
              return (
                <View style={styles.userRow}>
                  <Text style={styles.userPos}>{medallas[i] || i + 1}</Text>
                  <Text style={styles.userName}>{u.nombre}</Text>
                  <View style={[styles.predBox, colorStyle]}>
                    <Text style={styles.predTxt}>{pred ? `${pred.local} - ${pred.visita}` : '-'}</Text>
                    {pts !== null && <View style={styles.ptsBubble}><Text style={styles.ptsBadge}>+{pts} pts</Text></View>}
                  </View>
                  <Text style={styles.userPuntos}>{u.puntos} pts</Text>
                </View>
              );
            }}
          />
        </>
      )}

      {filtro === 'Bonos' && (
  <FlatList
    data={usuarios}
    keyExtractor={u => u.id}
    contentContainerStyle={{ padding: 12, paddingBottom: 20 }}
    renderItem={({ item: u, index: i }) => {
      const medallas = ['🥇', '🥈', '🥉'];
      const bonosMap = {};
      prediccionesBonos.filter(b => b.usuario_id === u.id).forEach(b => { bonosMap[b.clave] = b.valor; });
      return (
        <View style={styles.bonoUserCard}>
          <View style={styles.bonoUserHeader}>
            <Text style={styles.bonoUserPos}>{medallas[i] || i + 1}</Text>
            <Text style={styles.bonoUserNombre}>{u.nombre}</Text>
            <Text style={styles.bonoUserPuntos}>{u.puntos} pts</Text>
          </View>

          <View style={styles.bonoFilaCompacta}>
            {BONOS_KEYS.map(clave => (
              <View key={clave} style={styles.bonoChipCompacto}>
  <Text style={styles.bonoChipIcon}>{BONOS_LABELS[clave].icon}</Text>
  {getBandera(bonosMap[clave]) && <Image source={{ uri: getBandera(bonosMap[clave]) }} style={{ width: 16, height: 11, borderRadius: 2 }} />}
  <Text style={styles.bonoChipValor} numberOfLines={1}>{bonosMap[clave] || '-'}</Text>
</View>
            ))}
          </View>

          <View style={styles.bonoFilaGrupos}>
            {GRUPOS.map(grupo => (
              <View key={grupo} style={styles.bonoGrupoChip}>
  <Text style={styles.bonoGrupoLabel}>{grupo}</Text>
  {getBandera(bonosMap[`lider_${grupo}`]) && <Image source={{ uri: getBandera(bonosMap[`lider_${grupo}`]) }} style={{ width: 14, height: 10, borderRadius: 2 }} />}
  <Text style={styles.bonoGrupoValor} numberOfLines={1}>{bonosMap[`lider_${grupo}`] ? bonosMap[`lider_${grupo}`].split(' ')[0] : '-'}</Text>
</View>
            ))}
          </View>

          <View style={styles.bonoFilaTerceros}>
            <Text style={styles.bonoSeccionInline}>3️⃣ </Text>
            {Array.from({length: 8}, (_, idx) => (
              <View key={idx} style={{ flexDirection: 'row', alignItems: 'center', gap: 2, backgroundColor: '#fff8e1', borderRadius: 6, paddingHorizontal: 4, paddingVertical: 3 }}>
  {getBandera(bonosMap[`mejor_tercero_${idx+1}`]) && <Image source={{ uri: getBandera(bonosMap[`mejor_tercero_${idx+1}`]) }} style={{ width: 14, height: 10, borderRadius: 2 }} />}
  <Text style={styles.bonoTerceroChip} numberOfLines={1}>
    {bonosMap[`mejor_tercero_${idx+1}`] ? bonosMap[`mejor_tercero_${idx+1}`].split(' ')[0] : '-'}
  </Text>
</View>
            ))}
          </View>
        </View>
      );
    }}
  />
  )}

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f2f5' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  filtrosContainer: { flexDirection: 'row', backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#eee', padding: 8, gap: 8, alignItems: 'center' },
  filtroBtn: { flex: 1, padding: 10, borderRadius: 20, backgroundColor: '#f0f2f5', alignItems: 'center' },
  filtroBtnActivo: { backgroundColor: '#292663' },
  filtroTxt: { fontSize: 12, fontWeight: 'bold', color: '#555' },
  filtroTxtActivo: { color: 'white' },
  exportBtn: { backgroundColor: '#1b5e20', borderRadius: 10, padding: 8, paddingHorizontal: 10 },
  exportTxt: { color: 'white', fontWeight: 'bold', fontSize: 11 },
  partidosContainer: { backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#eee' },
  partidosContent: { paddingHorizontal: 8, paddingVertical: 8, flexDirection: 'row' },
  partidoBtn: { paddingHorizontal: 10, paddingVertical: 8, borderRadius: 10, backgroundColor: '#f0f2f5', marginHorizontal: 4, width: 130 },
  partidoBtnActivo: { backgroundColor: '#292663' },
  partidoNum: { fontSize: 9, color: '#888', fontWeight: 'bold' },
  partidoEquipos: { fontSize: 11, fontWeight: 'bold', color: '#444', marginVertical: 2 },
  partidoTxtActivo: { color: 'white' },
  resSmall: { fontSize: 10, color: '#292663', fontWeight: 'bold' },
  resPendiente: { fontSize: 9, color: '#aaa' },
  partidoHeader: { backgroundColor: 'white', padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: '#eee' },
  equipoRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  bandera: { width: 24, height: 16, borderRadius: 2 },
  equipoNombre: { flex: 1, fontSize: 12, fontWeight: 'bold', color: '#333' },
  scoreCenter: { paddingHorizontal: 12 },
  scoreReal: { backgroundColor: '#292663', color: 'white', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, fontWeight: 'bold', fontSize: 14 },
  scorePendiente: { backgroundColor: '#e9ecef', color: '#777', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, fontWeight: 'bold', fontSize: 12 },
  userRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', padding: 12, marginHorizontal: 12, marginTop: 6, borderRadius: 10, gap: 8, elevation: 1 },
  userPos: { fontSize: 16, width: 32, textAlign: 'center' },
  userName: { flex: 1, fontSize: 13, fontWeight: 'bold', color: '#333' },
  predBox: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, flexDirection: 'row', alignItems: 'center', gap: 6, minWidth: 80, justifyContent: 'center' },
  predNeutral: { backgroundColor: '#f0f2f5' },
  predExact: { backgroundColor: '#b3ecfa', borderWidth: 1, borderColor: '#292663' },
  predWinner: { backgroundColor: '#fff9c4', borderWidth: 1, borderColor: '#f9a825' },
  predWrong: { backgroundColor: '#ffcdd2', borderWidth: 1, borderColor: '#c62828' },
  predTxt: { fontSize: 14, fontWeight: 'bold', color: '#333' },
  ptsBubble: { backgroundColor: 'rgba(0,0,0,0.1)', borderRadius: 8, paddingHorizontal: 5, paddingVertical: 1 },
  ptsBadge: { fontSize: 10, fontWeight: 'bold', color: '#333' },
  userPuntos: { fontSize: 12, fontWeight: 'bold', color: '#292663', width: 55, textAlign: 'right' },
  bonoUserCard: { backgroundColor: 'white', borderRadius: 12, padding: 10, marginBottom: 8, elevation: 2 },
bonoUserHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8, paddingBottom: 6, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
bonoUserPos: { fontSize: 16, width: 28 },
bonoUserNombre: { flex: 1, fontSize: 13, fontWeight: 'bold', color: '#333' },
bonoUserPuntos: { fontSize: 11, fontWeight: 'bold', color: '#292663' },
bonoFilaCompacta: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginBottom: 6 },
bonoChipCompacto: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#f0f2f5', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 3, minWidth: '30%', flex: 1 },
bonoChipIcon: { fontSize: 11 },
bonoChipValor: { fontSize: 10, fontWeight: 'bold', color: '#333', flex: 1 },
bonoFilaGrupos: { flexDirection: 'row', flexWrap: 'wrap', gap: 3, marginBottom: 6 },
bonoGrupoChip: { alignItems: 'center', backgroundColor: '#e3f8fd', borderRadius: 6, paddingHorizontal: 5, paddingVertical: 3, minWidth: '7%' },
bonoGrupoLabel: { fontSize: 8, color: '#888', fontWeight: 'bold' },
bonoGrupoValor: { fontSize: 9, fontWeight: 'bold', color: '#292663' },
bonoFilaTerceros: { flexDirection: 'row', flexWrap: 'wrap', gap: 3, alignItems: 'center' },
bonoSeccionInline: { fontSize: 11 },
bonoTerceroChip: { backgroundColor: '#fff8e1', borderRadius: 6, paddingHorizontal: 5, paddingVertical: 3, fontSize: 9, fontWeight: 'bold', color: '#333' },
bonoSeccion: { fontSize: 11, fontWeight: 'bold', color: '#888', marginTop: 6, marginBottom: 3 },
bonoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
bonoItem: { backgroundColor: '#f0f2f5', borderRadius: 6, padding: 6, minWidth: '30%', flex: 1, alignItems: 'center' },
bonoItemIcon: { fontSize: 14, marginBottom: 1 },
bonoItemLabel: { fontSize: 8, color: '#888', marginBottom: 1 },
bonoItemValor: { fontSize: 10, fontWeight: 'bold', color: '#333', textAlign: 'center' },
bonoItemPts: { fontSize: 8, color: '#ffcc40', marginTop: 1 },
});