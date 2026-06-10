import { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, ScrollView } from 'react-native';
import { supabase } from '../lib/supabase';

export default function RankingScreen({ recargar }) {
  const [ranking, setRanking] = useState([]);
  const [movimientos, setMovimientos] = useState({});
  const [estadisticas, setEstadisticas] = useState(null);
  const [loading, setLoading] = useState(true);
  const [vistaActiva, setVistaActiva] = useState('ranking');

  useEffect(() => { cargarRanking(); }, []);
  useEffect(() => { if (recargar > 0) cargarRanking(); }, [recargar]);

  async function cargarRanking() {
    try {
      const { data: actual } = await supabase.from('ranking_view').select('*');
      if (!actual) return;
      const { data: historial } = await supabase.from('ranking_historial').select('*').order('fecha', { ascending: false });
      if (historial && historial.length > 0) {
        const fechas = [...new Set(historial.map(h => h.fecha?.split('T')[0]))].sort().reverse();
        const penultimaFecha = fechas[1];
        const penultimoRanking = historial.filter(h => h.fecha?.startsWith(penultimaFecha));
        const movs = {};
        actual.forEach((u, i) => {
          const posActual = i + 1;
          const posAnterior = penultimoRanking.find(h => h.usuario_id === u.id)?.posicion;
          if (!posAnterior) movs[u.id] = 'nuevo';
          else if (posActual < posAnterior) movs[u.id] = 'subio';
          else if (posActual > posAnterior) movs[u.id] = 'bajo';
          else movs[u.id] = 'igual';
        });
        setMovimientos(movs);
      }
      setRanking(actual);
      await cargarEstadisticas(actual);
    } catch (e) {
      console.log('Error:', e.message);
    }
    setLoading(false);
  }

  async function cargarEstadisticas(usuarios) {
    const { data: puntos } = await supabase.from('puntos').select('*').not('partido_id', 'is', null);
    const { data: historial } = await supabase.from('ranking_historial').select('*').order('fecha', { ascending: true });
    const { data: puntosPartidos } = await supabase.from('puntos').select('partido_id, puntos').not('partido_id', 'is', null);
    const { data: partidos } = await supabase.from('partidos').select('id, titulo, numero');

    if (!puntos || puntos.length === 0) { setEstadisticas(null); return; }

    const stats = {};
    usuarios.forEach(u => {
      stats[u.id] = {
        nombre: u.nombre,
        exactos: 0,
        acertados: 0,
        fallos: 0,
        jornadaPuntos: {},
        vecesEnPrimero: 0,
        vecesEnUltimo: 0,
      };
    });

    puntos.forEach(p => {
      if (!stats[p.usuario_id]) return;
      if (p.tipo_acierto === 'exact') stats[p.usuario_id].exactos++;
      else if (p.tipo_acierto === 'winner') stats[p.usuario_id].acertados++;
      else if (p.tipo_acierto === 'wrong') stats[p.usuario_id].fallos++;
    });

   if (historial && historial.length > 0) {
  // Agrupar por fecha única - tomar solo el último registro de cada usuario por día
  const fechas = [...new Set(historial.map(h => h.fecha?.split('T')[0]))].sort();
  fechas.forEach(fecha => {
    const jornadaRanking = [];
    // Para cada usuario tomar solo su mejor posición del día
    const usuariosDelDia = [...new Set(historial.filter(h => h.fecha?.startsWith(fecha)).map(h => h.usuario_id))];
    usuariosDelDia.forEach(uid => {
      const registrosUsuario = historial.filter(h => h.fecha?.startsWith(fecha) && h.usuario_id === uid);
      // Tomar el último registro del día (el más actualizado)
      const ultimoRegistro = registrosUsuario[registrosUsuario.length - 1];
      if (ultimoRegistro) jornadaRanking.push(ultimoRegistro);
    });
    if (jornadaRanking.length === 0) return;
    const maxPos = Math.max(...jornadaRanking.map(h => h.posicion));
    jornadaRanking.forEach(h => {
      if (!stats[h.usuario_id]) return;
      if (h.posicion === 1) stats[h.usuario_id].vecesEnPrimero++;
      if (h.posicion === maxPos) stats[h.usuario_id].vecesEnUltimo++;
      if (!stats[h.usuario_id].jornadaPuntos[fecha]) stats[h.usuario_id].jornadaPuntos[fecha] = 0;
      stats[h.usuario_id].jornadaPuntos[fecha] = h.puntos || 0;
    });
  });
}

    const statsArray = Object.values(stats);
    const rankingExactos = [...statsArray].sort((a, b) => b.exactos - a.exactos).filter(u => u.exactos > 0).slice(0, 5);
const rankingAcertados = [...statsArray].sort((a, b) => b.acertados - a.acertados).filter(u => u.acertados > 0).slice(0, 5);
const rankingPrimero = [...statsArray].sort((a, b) => b.vecesEnPrimero - a.vecesEnPrimero).filter(u => u.vecesEnPrimero > 0).slice(0, 5);
const rankingUltimo = [...statsArray].sort((a, b) => b.vecesEnUltimo - a.vecesEnUltimo).filter(u => u.vecesEnUltimo > 0).slice(0, 5);
    const masConsistente = [...statsArray].sort((a, b) => a.fallos - b.fallos)[0] || { nombre: '-', fallos: 0 };

    let mejorJornada = { titulo: '-', pts: 0 };
    let peorJornada = { titulo: '-', pts: 999 };

    if (puntosPartidos && partidos) {
      const sumasPorPartido = {};
      puntosPartidos.forEach(p => {
        if (!sumasPorPartido[p.partido_id]) sumasPorPartido[p.partido_id] = 0;
        sumasPorPartido[p.partido_id] += p.puntos;
      });
      Object.entries(sumasPorPartido).forEach(([partidoId, total]) => {
        const partido = partidos.find(p => p.id === parseInt(partidoId));
        if (!partido) return;
        if (total > mejorJornada.pts) mejorJornada = { titulo: partido.titulo, pts: total };
        if (total < peorJornada.pts) peorJornada = { titulo: partido.titulo, pts: total };
      });
    }

    setEstadisticas({ rankingExactos, rankingAcertados, rankingPrimero, rankingUltimo, mejorJornada, peorJornada, masConsistente });
  }

  function getFlecha(userId) {
    const mov = movimientos[userId];
    if (mov === 'subio') return { icon: '▲', color: '#2e7d32' };
    if (mov === 'bajo') return { icon: '▼', color: '#c62828' };
    if (mov === 'nuevo') return { icon: '★', color: '#f9a825' };
    return { icon: '—', color: '#888' };
  }

  if (loading) return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color="#2e7d32" />
    </View>
  );

  const puntosUnicos = [...new Set(ranking.map(r => r.puntos))].sort((a, b) => b - a);

  return (
    <View style={styles.container}>
      <View style={styles.tabs}>
        <Text style={[styles.tabBtn, vistaActiva === 'ranking' && styles.tabBtnActivo]} onPress={() => setVistaActiva('ranking')}>
          📊 Posiciones
        </Text>
        <Text style={[styles.tabBtn, vistaActiva === 'stats' && styles.tabBtnActivo]} onPress={() => setVistaActiva('stats')}>
          🏅 Estadísticas - top 5 -
        </Text>
      </View>

      {vistaActiva === 'ranking' && (
        <>
          <View style={styles.leyenda}>
            <Text style={styles.leyendaItem}><Text style={{ color: '#2e7d32' }}>▲</Text> Subió</Text>
            <Text style={styles.leyendaItem}><Text style={{ color: '#c62828' }}>▼</Text> Bajó</Text>
            <Text style={styles.leyendaItem}><Text style={{ color: '#888' }}>—</Text> Igual</Text>
            <Text style={styles.leyendaItem}><Text style={{ color: '#f9a825' }}>★</Text> Nuevo</Text>
          </View>
          <FlatList
            data={ranking}
            keyExtractor={(item) => item.id?.toString()}
            contentContainerStyle={{ padding: 12 }}
            renderItem={({ item, index }) => {
              const posReal = puntosUnicos.indexOf(item.puntos) + 1;
              const esOro = posReal === 1;
              const esPlata = posReal === 2;
              const esBronce = posReal === 3;
              const posIcono = esOro ? '🥇' : esPlata ? '🥈' : esBronce ? '🥉' : posReal;
              const flecha = getFlecha(item.id);
              return (
                <View style={[styles.row, esOro && styles.gold, esPlata && styles.silver, esBronce && styles.bronze]}>
                  <Text style={styles.pos}>{posIcono}</Text>
                  <Text style={styles.nombre}>{item.nombre}</Text>
                  <Text style={[styles.flecha, { color: flecha.color }]}>{flecha.icon}</Text>
                  <Text style={styles.puntos}>{item.puntos} pts</Text>
                </View>
              );
            }}
          />
        </>
      )}

      {vistaActiva === 'stats' && (
        <ScrollView contentContainerStyle={{ padding: 12 }}>
          {!estadisticas ? (
            <View style={styles.statsEmpty}>
              <Text style={styles.statsEmptyIcon}>📊</Text>
              <Text style={styles.statsEmptyTxt}>Las estadísticas estarán disponibles cuando inicien los partidos el 11 de junio</Text>
            </View>
          ) : (
            <>
              <Text style={styles.statsSeccion}>🎯 Precisión</Text>
              <View style={styles.statCardFull}>
                <Text style={styles.statTitulo}>🎯 Marcadores Exactos</Text>
                {estadisticas.rankingExactos.map((u, i) => (
                  <View key={i} style={styles.statFila}>
                    <Text style={styles.statFilaPos}>{i + 1}</Text>
                    <Text style={styles.statFilaNombre}>{u.nombre}</Text>
                    <Text style={styles.statFilaValor}>{u.exactos} exactos</Text>
                  </View>
                ))}
              </View>

              <View style={styles.statCardFull}>
                <Text style={styles.statTitulo}>✅ Ganadores Acertados</Text>
                {estadisticas.rankingAcertados.map((u, i) => (
                  <View key={i} style={styles.statFila}>
                    <Text style={styles.statFilaPos}>{i + 1}</Text>
                    <Text style={styles.statFilaNombre}>{u.nombre}</Text>
                    <Text style={styles.statFilaValor}>{u.acertados} acertados</Text>
                  </View>
                ))}
              </View>

              <Text style={styles.statsSeccion}>👑 Liderazgo</Text>
              <View style={styles.statCardFull}>
                <Text style={styles.statTitulo}>👑 Más Tiempo en 1er Lugar</Text>
                {estadisticas.rankingPrimero.map((u, i) => (
                  <View key={i} style={styles.statFila}>
                    <Text style={styles.statFilaPos}>{i + 1}</Text>
                    <Text style={styles.statFilaNombre}>{u.nombre}</Text>
                    <Text style={styles.statFilaValor}>{u.vecesEnPrimero} veces</Text>
                  </View>
                ))}
              </View>

              <View style={styles.statCardFull}>
                <Text style={styles.statTitulo}>😓 Más Tiempo en Último</Text>
                {estadisticas.rankingUltimo.map((u, i) => (
                  <View key={i} style={styles.statFila}>
                    <Text style={styles.statFilaPos}>{i + 1}</Text>
                    <Text style={styles.statFilaNombre}>{u.nombre}</Text>
                    <Text style={styles.statFilaValor}>{u.vecesEnUltimo} veces</Text>
                  </View>
                ))}
              </View>

              <Text style={styles.statsSeccion}>⚡ Rendimiento</Text>
              <View style={styles.statsGrid}>
                <View style={styles.statCard}>
                  <Text style={styles.statIcon}>🔥</Text>
                  <Text style={styles.statLabel}>Partido con más puntos</Text>
                  <Text style={styles.statNombre} numberOfLines={2}>{estadisticas.mejorJornada.titulo}</Text>
                  <Text style={styles.statValor}>{estadisticas.mejorJornada.pts} pts totales</Text>
                </View>
                <View style={styles.statCard}>
                  <Text style={styles.statIcon}>❄️</Text>
                  <Text style={styles.statLabel}>Partido con menos puntos</Text>
                  <Text style={styles.statNombre} numberOfLines={2}>{estadisticas.peorJornada.titulo}</Text>
                  <Text style={styles.statValor}>{estadisticas.peorJornada.pts} pts totales</Text>
                </View>
              </View>

              <View style={[styles.statCardFull, { marginBottom: 30 }]}>
                <Text style={styles.statIcon}>🧘</Text>
                <Text style={styles.statLabel}>Usuario Más Consistente</Text>
                <Text style={styles.statNombre}>{estadisticas.masConsistente.nombre}</Text>
                <Text style={styles.statValor}>Solo {estadisticas.masConsistente.fallos} fallos</Text>
              </View>
            </>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f2f5' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  tabs: { flexDirection: 'row', backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#eee' },
  tabBtn: { flex: 1, padding: 14, textAlign: 'center', fontSize: 13, fontWeight: 'bold', color: '#888' },
  tabBtnActivo: { color: '#2e7d32', borderBottomWidth: 3, borderBottomColor: '#2e7d32' },
  leyenda: { flexDirection: 'row', justifyContent: 'center', gap: 16, backgroundColor: 'white', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#eee' },
  leyendaItem: { fontSize: 11, color: '#555' },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', padding: 16, marginBottom: 8, borderRadius: 10, elevation: 1 },
  gold: { borderLeftWidth: 4, borderLeftColor: '#fbc02d', backgroundColor: '#fffde7' },
  silver: { borderLeftWidth: 4, borderLeftColor: '#9e9e9e', backgroundColor: '#f5f5f5' },
  bronze: { borderLeftWidth: 4, borderLeftColor: '#ff8f00', backgroundColor: '#fff8e1' },
  pos: { fontSize: 20, width: 40 },
  nombre: { flex: 1, fontSize: 15, fontWeight: 'bold', color: '#333' },
  flecha: { fontSize: 14, fontWeight: 'bold', marginRight: 8, width: 20, textAlign: 'center' },
  puntos: { fontSize: 16, fontWeight: 'bold', color: '#2e7d32' },
  statsEmpty: { alignItems: 'center', padding: 40 },
  statsEmptyIcon: { fontSize: 48, marginBottom: 16 },
  statsEmptyTxt: { fontSize: 14, color: '#888', textAlign: 'center', lineHeight: 22 },
  statsSeccion: { fontSize: 13, fontWeight: 'bold', color: '#888', marginBottom: 8, marginTop: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  statsGrid: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  statCard: { flex: 1, backgroundColor: 'white', borderRadius: 12, padding: 14, alignItems: 'center', elevation: 2 },
  statCardFull: { backgroundColor: 'white', borderRadius: 12, padding: 14, elevation: 2, marginBottom: 8 },
  statIcon: { fontSize: 28, marginBottom: 6, textAlign: 'center' },
  statLabel: { fontSize: 10, color: '#888', textAlign: 'center', marginBottom: 6 },
  statNombre: { fontSize: 13, fontWeight: 'bold', color: '#333', textAlign: 'center', marginBottom: 2 },
  statValor: { fontSize: 11, color: '#2e7d32', fontWeight: 'bold', textAlign: 'center' },
  statTitulo: { fontSize: 13, fontWeight: 'bold', color: '#333', marginBottom: 8 },
  statFila: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  statFilaPos: { fontSize: 12, color: '#888', width: 24, textAlign: 'center' },
  statFilaNombre: { flex: 1, fontSize: 12, color: '#333', fontWeight: 'bold' },
  statFilaValor: { fontSize: 12, color: '#2e7d32', fontWeight: 'bold' },
});
