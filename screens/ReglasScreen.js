import { useState, useEffect } from 'react';
import { ScrollView, View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { supabase } from '../lib/supabase';

export default function ReglasScreen({ recargar }) {
  const [financiero, setFinanciero] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
  if (recargar > 0) cargarFinanciero();
}, [recargar]);

  async function cargarFinanciero() {
    const { data } = await supabase.from('resumen_financiero').select('*').single();
    if (data) setFinanciero(data);
    setLoading(false);
  }

  const total = financiero?.total_recaudado || 0;
  const premio1 = financiero?.premio_1 || 0;
  const premio2 = financiero?.premio_2 || 0;
  const premio3 = financiero?.premio_3 || 0;

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>📜 Reglas y Premios</Text>
      </View>

            <View style={styles.seccion}>
        <Text style={styles.seccionTitle}>💰 Bolsa de Premios</Text>
        <View style={styles.premioFila}>
          <View style={styles.premioInfo}>
            <Text style={styles.premioPos}>🥇 1er Lugar</Text>
            <Text style={styles.premioPct}>Smart TV Compaq 32" con Google TV</Text>
          </View>
          
        </View>
        <View style={styles.premioFila}>
          <View style={styles.premioInfo}>
            <Text style={styles.premioPos}>🥈 2do Lugar</Text>
            <Text style={styles.premioPct}>Barreno Furius</Text>
          </View>
          
        </View>
        <View style={styles.premioFila}>
          <View style={styles.premioInfo}>
            <Text style={styles.premioPos}>🥉 3er Lugar</Text>
            <Text style={styles.premioPct}>Hielera Truper 9.4L</Text>
          </View>

          </View>
        <View style={styles.premioFila}>
          <View style={styles.premioInfo}>
            <Text style={styles.premioPos}> ⬇️ Ultimo Lugar</Text>
            <Text style={styles.premioPct}>Termo de acero inoxidable Truper</Text>
          </View>
          
        </View>
      </View>

      <View style={styles.seccion}>
        <Text style={styles.seccionTitle}>⚽ Sistema de Puntuación</Text>
        <Text style={styles.nota}>Puntos según resultado oficial a los 90 minutos. No cuentan tiempos extras ni penales.</Text>
        <View style={styles.tabla}>
          <View style={styles.tablaFila}>
            <Text style={styles.tablaTitulo}>Marcador Exacto</Text>
            <View style={[styles.badge, { backgroundColor: '#292663' }]}>
              <Text style={styles.badgeTxt}>5 pts</Text>
            </View>
            <Text style={styles.tablaDesc}>Aciertas ganador y marcador exacto</Text>
          </View>
          <View style={styles.tablaFila}>
            <Text style={styles.tablaTitulo}>Ganador Acertado</Text>
            <View style={[styles.badge, { backgroundColor: '#ffcc40' }]}>
              <Text style={styles.badgeTxt}>1-4 pts</Text>
            </View>
            <Text style={styles.tablaDesc}>5 pts base menos 1 por cada gol de diferencia</Text>
          </View>
          <View style={styles.tablaFila}>
            <Text style={styles.tablaTitulo}>Fallo Total</Text>
            <View style={[styles.badge, { backgroundColor: '#c62828' }]}>
              <Text style={styles.badgeTxt}>0 pts</Text>
            </View>
            <Text style={styles.tablaDesc}>No aciertas al ganador</Text>
          </View>
        </View>
      </View>

      <View style={styles.seccion}>
        <Text style={styles.seccionTitle}>⭐ Bonos Extra</Text>
        <View style={styles.bonosGrid}>
          {[
            { label: 'Campeón', pts: 30 },
            { label: 'Subcampeón', pts: 20 },
            { label: '3er Lugar', pts: 10 },
            { label: '4to Lugar', pts: 5 },
            { label: 'Líder de Grupo por cada uno', pts: 10 },
            { label: 'Mejor Tercero por cada uno', pts: 5 },
            { label: 'Goleador', pts: 15 },
            { label: 'Portero Menos Vencido', pts: 15 },
          ].map((b, i) => (
            <View key={i} style={styles.bonoItem}>
              <Text style={styles.bonoPts}>{b.pts}</Text>
              <Text style={styles.bonoLabel}>{b.label}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.seccion}>
        <Text style={styles.seccionTitle}>📋 Disposiciones Generales</Text>
        <Text style={styles.regla}>⏱️ <Text style={styles.bold}>Tiempos Extras:</Text> El marcador válido es el de los 90 minutos reglamentarios.</Text>
        <Text style={styles.regla}>✅ <Text style={styles.bold}>Validación:</Text> Es responsabilidad del participante verificar que sus datos sean correctos.</Text>
        <Text style={styles.regla}>⚖️ <Text style={styles.bold}>Autoridad:</Text> Cualquier situación no prevista será resuelta por el administrador (Snaider Santizo).</Text>
      </View>

      <View style={{ height: 30 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f2f5' },
  header: { backgroundColor: '#292663', padding: 20, alignItems: 'center' },
  headerText: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  premioCard: { backgroundColor: '#292663', margin: 12, borderRadius: 12, padding: 20, alignItems: 'center' },
  premioLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1 },
  premioMonto: { color: 'white', fontSize: 32, fontWeight: 'bold', marginVertical: 4 },
  premioSub: { color: 'rgba(255,255,255,0.7)', fontSize: 12 },
  seccion: { backgroundColor: 'white', margin: 12, marginTop: 0, borderRadius: 12, padding: 16, borderLeftWidth: 4, borderLeftColor: '#292663' },
  seccionTitle: { fontSize: 15, fontWeight: 'bold', color: '#292663', marginBottom: 12, textTransform: 'uppercase' },
  premioFila: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  premioInfo: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  premioPos: { fontSize: 14, color: '#333' },
  premioPct: { backgroundColor: '#292663', color: 'white', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, fontSize: 11, fontWeight: 'bold' },
  premioQ: { fontSize: 16, fontWeight: 'bold', color: '#292663' },
  nota: { fontSize: 12, color: '#666', marginBottom: 12, lineHeight: 18 },
  tabla: { gap: 10 },
  tablaFila: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  tablaTitulo: { fontSize: 13, fontWeight: 'bold', width: 130 },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  badgeTxt: { color: 'white', fontSize: 11, fontWeight: 'bold' },
  tablaDesc: { fontSize: 11, color: '#666', flex: 1 },
  bonosGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  bonoItem: { width: '47%', backgroundColor: '#f0f2f5', borderRadius: 10, padding: 12, alignItems: 'center' },
  bonoPts: { fontSize: 24, fontWeight: 'bold', color: '#292663' },
  bonoLabel: { fontSize: 11, color: '#555', textAlign: 'center', marginTop: 2 },
  regla: { fontSize: 12, color: '#555', marginBottom: 10, lineHeight: 18 },
  bold: { fontWeight: 'bold', color: '#333' },
});