import { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, View, ActivityIndicator, StyleSheet, TouchableOpacity } from 'react-native';
import { supabase } from './lib/supabase';
import LoginScreen from './screens/LoginScreen';
import RankingScreen from './screens/RankingScreen';
import PartidosScreen from './screens/PartidosScreen';
import SimuladorScreen from './screens/SimuladorScreen';
import ReglasScreen from './screens/ReglasScreen';
import QuinielaScreen from './screens/QuinielaScreen';
import PrediccionesScreen from './screens/PrediccionesScreen';
import AdminScreen from './screens/AdminScreen';

const Tab = createBottomTabNavigator();

function PagoScreen({ onRefresh }) {
  const [verificando, setVerificando] = useState(false);

  async function verificarManual() {
    setVerificando(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase
        .from('usuarios')
        .select('activo, es_admin')
        .eq('id', user.id)
        .single();
      const estaActivo = data?.activo === true || data?.es_admin === true;
      if (estaActivo) onRefresh(true);
      else alert('Tu cuenta aún no ha sido activada. Contacta al administrador.');
    }
    setVerificando(false);
  }

  return (
    <View style={styles.pagoContainer}>
      <TouchableOpacity
        style={styles.cerrarBtn}
        onPress={() => supabase.auth.signOut()}>
        <Text style={styles.cerrarTxt}>✕</Text>
      </TouchableOpacity>
      <Text style={styles.pagoIcono}>🔒</Text>
      <Text style={styles.pagoTitulo}>Acceso Bloqueado</Text>
      <Text style={styles.pagoMensaje}>
        Para participar en la Quiniela Mundial 2026 debes realizar el pago de inscripción.
      </Text>
      <View style={styles.pagoCard}>
        <Text style={styles.pagoCardTxt}>Una vez realizado el pago, el administrador activará tu cuenta.</Text>
      </View>
      <TouchableOpacity
        style={styles.verificarBtn}
        onPress={verificarManual}
        disabled={verificando}>
        {verificando
          ? <ActivityIndicator color="white" />
          : <Text style={styles.verificarTxt}>🔄 Ya realicé el pago</Text>
        }
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.salirBtn}
        onPress={() => supabase.auth.signOut()}>
        <Text style={styles.salirTxt}>Cerrar sesión</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activo, setActivo] = useState(false);
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        setUserId(session.user.id);
        verificarActivo(session.user.id);
      } else setLoading(false);
    });

    supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      if (session?.user) {
        setUserId(session.user.id);
        verificarActivo(session.user.id);
      } else {
        setActivo(false);
        setUserId(null);
        setLoading(false);
      }
    });
  }, []);

  useEffect(() => {
    if (!userId) return;

    const canal = supabase
      .channel('usuario_activo')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'usuarios',
        filter: `id=eq.${userId}`,
      }, (payload) => {
        const estaActivo = payload.new.activo === true || payload.new.es_admin === true;
        setActivo(estaActivo);
      })
      .subscribe();

    return () => supabase.removeChannel(canal);
  }, [userId]);

  async function verificarActivo(uid) {
    const { data } = await supabase
      .from('usuarios')
      .select('activo, es_admin')
      .eq('id', uid)
      .single();
    setActivo(data?.activo === true || data?.es_admin === true);
    setLoading(false);
  }

  if (loading) return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" color="#2e7d32" />
    </View>
  );

  if (!session) return <LoginScreen />;
  if (!activo) return <PagoScreen onRefresh={setActivo} />;

  return (
    <NavigationContainer>
      <Tab.Navigator screenOptions={{ headerShown: false, tabBarActiveTintColor: '#2e7d32' }}>
        <Tab.Screen name="Posiciones" component={RankingScreen} options={{ tabBarIcon: () => <Text>📊</Text> }} />
        <Tab.Screen name="Partidos" component={PartidosScreen} options={{ tabBarIcon: () => <Text>⚽</Text> }} />
        <Tab.Screen name="Mi Quiniela" component={QuinielaScreen} options={{ tabBarIcon: () => <Text>📝</Text> }} />
        <Tab.Screen name="Predicciones" component={PrediccionesScreen} options={{ tabBarIcon: () => <Text>🔍</Text> }} />
        <Tab.Screen name="Simulador" component={SimuladorScreen} options={{ tabBarIcon: () => <Text>🧮</Text> }} />
        <Tab.Screen name="Reglas" component={ReglasScreen} options={{ tabBarIcon: () => <Text>📜</Text> }} />
        <Tab.Screen name="Admin" component={AdminScreen} options={{ tabBarIcon: () => <Text>⚙️</Text> }} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  pagoContainer: { flex: 1, backgroundColor: '#f0f2f5', justifyContent: 'center', alignItems: 'center', padding: 24 },
  cerrarBtn: { position: 'absolute', top: 50, right: 20, width: 36, height: 36, borderRadius: 18, backgroundColor: '#ddd', justifyContent: 'center', alignItems: 'center' },
  cerrarTxt: { fontSize: 16, fontWeight: 'bold', color: '#555' },
  pagoIcono: { fontSize: 64, marginBottom: 16 },
  pagoTitulo: { fontSize: 22, fontWeight: 'bold', color: '#333', marginBottom: 12, textAlign: 'center' },
  pagoMensaje: { fontSize: 14, color: '#555', textAlign: 'center', lineHeight: 22, marginBottom: 20 },
  pagoCard: { backgroundColor: 'white', borderRadius: 12, padding: 16, marginBottom: 24, borderLeftWidth: 4, borderLeftColor: '#2e7d32', elevation: 2 },
  pagoCardTxt: { fontSize: 13, color: '#444', lineHeight: 20 },
  salirBtn: { backgroundColor: '#c62828', borderRadius: 10, paddingHorizontal: 24, paddingVertical: 12 },
  salirTxt: { color: 'white', fontWeight: 'bold', fontSize: 14 },
  verificarBtn: { backgroundColor: '#2e7d32', borderRadius: 10, paddingHorizontal: 24, paddingVertical: 12, marginBottom: 12 },
  verificarTxt: { color: 'white', fontWeight: 'bold', fontSize: 14 },
});
