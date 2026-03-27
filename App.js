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
import BonosScreen from './screens/BonosScreen';

const Tab = createBottomTabNavigator();

function PagoScreen({ onRefresh }) {
  const [verificando, setVerificando] = useState(false);

  async function verificarManual() {
    setVerificando(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase.from('usuarios').select('activo, es_admin').eq('id', user.id).single();
      const estaActivo = data?.activo === true || data?.es_admin === true;
      if (estaActivo) onRefresh(true);
      else alert('Tu cuenta aún no ha sido activada. Contacta al administrador.');
    }
    setVerificando(false);
  }

  return (
    <View style={styles.pagoContainer}>
      <TouchableOpacity style={styles.cerrarBtn} onPress={() => supabase.auth.signOut()}>
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
      <TouchableOpacity style={styles.verificarBtn} onPress={verificarManual} disabled={verificando}>
        {verificando ? <ActivityIndicator color="white" /> : <Text style={styles.verificarTxt}>🔄 Ya realicé el pago</Text>}
      </TouchableOpacity>
      <TouchableOpacity style={styles.salirBtn} onPress={() => supabase.auth.signOut()}>
        <Text style={styles.salirTxt}>Cerrar sesión</Text>
      </TouchableOpacity>
    </View>
  );
}

function TabIcon({ emoji, label }) {
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontSize: 18 }}>{emoji}</Text>
      <Text style={{ fontSize: 9, color: '#888', marginTop: 1, textAlign: 'center' }}>{label}</Text>
    </View>
  );
}

export default function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activo, setActivo] = useState(false);
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    let intervalo;
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        setUserId(session.user.id);
        verificarActivo(session.user.id);
        intervalo = setInterval(() => verificarActivo(session.user.id), 5000);
      } else setLoading(false);
    });
    supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      if (session?.user) {
        setUserId(session.user.id);
        verificarActivo(session.user.id);
        if (intervalo) clearInterval(intervalo);
        intervalo = setInterval(() => verificarActivo(session.user.id), 5000);
      } else {
        setActivo(false);
        setUserId(null);
        setLoading(false);
        if (intervalo) clearInterval(intervalo);
      }
    });
    return () => { if (intervalo) clearInterval(intervalo); };
  }, []);

  useEffect(() => {
    if (!userId) return;
    const canal = supabase.channel('usuario_activo')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'usuarios', filter: `id=eq.${userId}` },
        (payload) => { setActivo(payload.new.activo === true || payload.new.es_admin === true); })
      .subscribe();
    return () => supabase.removeChannel(canal);
  }, [userId]);

  async function verificarActivo(uid) {
    const { data } = await supabase.from('usuarios').select('activo, es_admin').eq('id', uid).single();
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
      <Tab.Navigator
        screenOptions={{
          headerShown: true,
          headerStyle: { backgroundColor: '#2e7d32' },
          headerTintColor: 'white',
          headerTitle: () => (
            <View>
              <Text style={{ color: 'white', fontSize: 15, fontWeight: 'bold' }}>🏆 Quiniela Mundial 2026</Text>
              <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 10 }}>FIFA World Cup 2026</Text>
            </View>
          ),
          headerRight: () => (
            <TouchableOpacity
              style={{ marginRight: 16, backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6 }}
              onPress={() => supabase.auth.signOut()}>
              <Text style={{ color: 'white', fontSize: 12, fontWeight: 'bold' }}>🏃 Salir</Text>
            </TouchableOpacity>
          ),
          tabBarActiveTintColor: '#2e7d32',
          tabBarShowLabel: false,
          tabBarStyle: { height: 65, paddingBottom: 8, paddingTop: 4 },
        }}>
        <Tab.Screen name="Posiciones" component={RankingScreen}
          options={{ tabBarIcon: ({ focused }) => <TabIcon emoji="📊" label="POSICIONES" /> }} />
        <Tab.Screen name="Partidos" component={PartidosScreen}
          options={{ tabBarIcon: ({ focused }) => <TabIcon emoji="⚽" label="PARTIDOS" /> }} />
        <Tab.Screen name="Mi Quiniela" component={QuinielaScreen}
          options={{ tabBarIcon: ({ focused }) => <TabIcon emoji="📝" label="MI QUINIELA" /> }} />
        <Tab.Screen name="Bonos" component={BonosScreen}
          options={{ tabBarIcon: ({ focused }) => <TabIcon emoji="⭐" label="BONOS" /> }} />
        <Tab.Screen name="Predicciones" component={PrediccionesScreen}
          options={{ tabBarIcon: ({ focused }) => <TabIcon emoji="🔍" label="PREDICCIONES" /> }} />
        <Tab.Screen name="Simulador" component={SimuladorScreen}
          options={{ tabBarIcon: ({ focused }) => <TabIcon emoji="🧮" label="SIMULADOR" /> }} />
        <Tab.Screen name="Reglas" component={ReglasScreen}
          options={{ tabBarIcon: ({ focused }) => <TabIcon emoji="📜" label="REGLAS" /> }} />
        <Tab.Screen name="Admin" component={AdminScreen}
          options={{ tabBarIcon: ({ focused }) => <TabIcon emoji="⚙️" label="ADMIN" /> }} />
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
  verificarBtn: { backgroundColor: '#2e7d32', borderRadius: 10, paddingHorizontal: 24, paddingVertical: 12, marginBottom: 12 },
  verificarTxt: { color: 'white', fontWeight: 'bold', fontSize: 14 },
  salirBtn: { backgroundColor: '#c62828', borderRadius: 10, paddingHorizontal: 24, paddingVertical: 12 },
  salirTxt: { color: 'white', fontWeight: 'bold', fontSize: 14 },
});