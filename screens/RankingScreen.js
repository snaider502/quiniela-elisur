import { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { supabase } from '../lib/supabase';

export default function RankingScreen() {
  const [ranking, setRanking] = useState([]);
  const [movimientos, setMovimientos] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    cargarRanking();
  }, []);

  async function cargarRanking() {
    try {
      const { data: actual } = await supabase
        .from('ranking_view')
        .select('*');

      if (!actual) return;

      const { data: historial } = await supabase
        .from('ranking_historial')
        .select('*')
        .order('fecha', { ascending: false });

      if (historial && historial.length > 0) {
        const ultimaFecha = historial[0].fecha;
        const penultimaFecha = historial.find(h => h.fecha < ultimaFecha)?.fecha;

        const ultimoRanking = historial.filter(h => h.fecha === ultimaFecha);
        const penultimoRanking = historial.filter(h => h.fecha === penultimaFecha);

        const movs = {};
        actual.forEach((u, i) => {
          const posActual = i + 1;
          const posAnterior = penultimoRanking.find(h => h.usuario_id === u.id)?.posicion;
          if (!posAnterior) {
            movs[u.id] = 'nuevo';
          } else if (posActual < posAnterior) {
            movs[u.id] = 'subio';
          } else if (posActual > posAnterior) {
            movs[u.id] = 'bajo';
          } else {
            movs[u.id] = 'igual';
          }
        });
        setMovimientos(movs);
      }

      setRanking(actual);
    } catch (e) {
      alert('Error: ' + e.message);
    }
    setLoading(false);
  }

  function getFlecha(userId) {
    const mov = movimientos[userId];
    if (mov === 'subio') return { icon: '▲', color: '#2e7d32' };
    if (mov === 'bajo') return { icon: '▼', color: '#c62828' };
    if (mov === 'nuevo') return { icon: '★', color: '#f9a825' };
    return { icon: '—', color: '#888' };
  }

  const medallas = ['🥇', '🥈', '🥉'];

  if (loading) return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color="#2e7d32" />
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
  <View style={styles.headerContent}>
    <Text style={styles.headerText}>⚽ Quiniela Mundial 2026</Text>
    <Text style={styles.headerSub}>FIFA World Cup 2026</Text>
  </View>
  <TouchableOpacity 
    style={styles.salirBtn}
    onPress={() => supabase.auth.signOut()}>
    <Text style={styles.salirIcono}>⏻</Text>
    <Text style={styles.salirTxt}>Salir</Text>
  </TouchableOpacity>
</View>

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
          const flecha = getFlecha(item.id);
          return (
            <View style={[
              styles.row,
              index === 0 && styles.gold,
              index === 1 && styles.silver,
              index === 2 && styles.bronze
            ]}>
              <Text style={styles.pos}>{medallas[index] || index + 1}</Text>
              <Text style={styles.nombre}>{item.nombre}</Text>
              <Text style={[styles.flecha, { color: flecha.color }]}>{flecha.icon}</Text>
              <Text style={styles.puntos}>{item.puntos} pts</Text>
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  header: { backgroundColor: '#2e7d32', padding: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerContent: { flex: 1 },
  headerText: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  headerSub: { color: 'rgba(255,255,255,0.7)', fontSize: 11, marginTop: 2 },
  salirBtn: { backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 8, alignItems: 'center', flexDirection: 'row', gap: 4 },
  salirIcono: { color: 'white', fontSize: 14 },
  salirTxt: { color: 'white', fontSize: 12, fontWeight: 'bold' },
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
});