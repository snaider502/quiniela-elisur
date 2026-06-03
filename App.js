import { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, View, ActivityIndicator, StyleSheet, TouchableOpacity, Image } from 'react-native';
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
        Para participar en la Quiniela Mundial 2026 debes indicarle a SNAIDER SANTIZO.
      </Text>
      <View style={styles.pagoCard}>
        <Text style={styles.pagoCardTxt}>Una vez autorizado, el administrador activará tu cuenta.</Text>
      </View>
      <TouchableOpacity style={styles.verificarBtn} onPress={verificarManual} disabled={verificando}>
        {verificando ? <ActivityIndicator size="large" color="#292663" /> : <Text style={styles.verificarTxt}>🔄 Actualiza</Text>}
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
  const [nombreUsuario, setNombreUsuario] = useState('');
  const [recargar, setRecargar] = useState(0);

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
  const { data } = await supabase.from('usuarios').select('activo, es_admin, nombre').eq('id', uid).single();
  setActivo(data?.activo === true || data?.es_admin === true);
  setNombreUsuario(data?.nombre || '');
  setLoading(false);
}

 if (loading) return (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f0f2f5' }}>
    <Image
      source={require('./assets/loading.gif')}
      style={{ width: 200, height: 200 }}
      resizeMode="contain"
    />
    <Text style={{ marginTop: 16, fontSize: 14, color: '#2e7d32', fontWeight: 'bold' }}>Cargando...</Text>
  </View>
);

  if (!session) return <LoginScreen />;
  if (!activo) return <PagoScreen onRefresh={setActivo} />;

  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={{
  headerShown: true,
  headerStyle: { backgroundColor: '#292663' },
  headerTintColor: 'white',
  headerTitleAlign: 'center',
  headerTitle: () => (
  <View style={{ alignItems: 'center', flexDirection: 'row', gap: 8 }}>
    <Image 
      source={require('./assets/elisur.png')} 
      style={{ width: 100, height: 50, resizeMode: 'contain' }} 
    />
    <View>
      <Text style={{ color: 'white', fontSize: 14, fontWeight: 'bold' }}>Quiniela</Text>
      <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 9 }}>FIFA World Cup 2026</Text>
    </View>
  </View>
),
          headerLeft: () => (
            <TouchableOpacity
              style={{ marginLeft: 16, backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6 }}
              onPress={() => setRecargar(prev => prev + 1)}>
              <Text style={{ color: 'white', fontSize: 14 }}>🔄 recargar </Text>
            </TouchableOpacity>
          ),
          headerRight: () => (
  <View style={{ alignItems: 'flex-end', marginRight: 16, gap: 2 }}>
    <TouchableOpacity
      style={{ backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6 }}
      onPress={() => supabase.auth.signOut()}>
      <Text style={{ color: 'white', fontSize: 12, fontWeight: 'bold' }}>⏻ Salir</Text>
    </TouchableOpacity>
    {nombreUsuario ? (
      <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 10 }} numberOfLines={1}>
        👤 {nombreUsuario}
      </Text>
    ) : null}
  </View>
),
          tabBarActiveTintColor: '#292663',
          tabBarShowLabel: false,
          tabBarStyle: { height: 65, paddingBottom: 8, paddingTop: 4 },
        }}>
        <Tab.Screen name="Posiciones"
          options={{ tabBarIcon: () => <TabIcon emoji="📊" label="POSICIONES" /> }}>
          {() => <RankingScreen recargar={recargar} />}
        </Tab.Screen>
        <Tab.Screen name="Partidos"
          options={{ tabBarIcon: () => <TabIcon emoji="⚽" label="PARTIDOS" /> }}>
          {() => <PartidosScreen recargar={recargar} />}
        </Tab.Screen>
        <Tab.Screen name="Mi Quiniela"
  options={{ tabBarIcon: () => <TabIcon emoji="📝" label="MI QUINIELA" /> }}>
  {() => <QuinielaScreen recargar={recargar} activo={activo} />}
</Tab.Screen>
        <Tab.Screen name="Bonos"
          options={{ tabBarIcon: () => <TabIcon emoji="⭐" label="BONOS" /> }}>
          {() => <BonosScreen recargar={recargar} />}
        </Tab.Screen>
        <Tab.Screen name="Predicciones"
          options={{ tabBarIcon: () => <TabIcon emoji="🔍" label="PREDICCIONES" /> }}>
          {() => <PrediccionesScreen recargar={recargar} />}
        </Tab.Screen>
        <Tab.Screen name="Simulador"
          options={{ tabBarIcon: () => <TabIcon emoji="🧮" label="SIMULADOR" /> }}>
          {() => <SimuladorScreen recargar={recargar} />}
        </Tab.Screen>
        <Tab.Screen name="Reglas"
          options={{ tabBarIcon: () => <TabIcon emoji="📜" label="REGLAS" /> }}>
          {() => <ReglasScreen recargar={recargar} />}
        </Tab.Screen>
        <Tab.Screen name="Admin"
          options={{ tabBarIcon: () => <TabIcon emoji="⚙️" label="ADMIN" /> }}>
          {() => <AdminScreen recargar={recargar} />}
        </Tab.Screen>
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