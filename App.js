import { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, View, ActivityIndicator } from 'react-native';
import { supabase } from './lib/supabase';
import LoginScreen from './screens/LoginScreen';
import RankingScreen from './screens/RankingScreen';
import PartidosScreen from './screens/PartidosScreen';
import SimuladorScreen from './screens/SimuladorScreen';
import ReglasScreen from './screens/ReglasScreen';
import QuinielaScreen from './screens/QuinielaScreen';


const Tab = createBottomTabNavigator();

export default function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });
    supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
  }, []);

  if (loading) return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" color="#2e7d32" />
    </View>
  );

  if (!session) return <LoginScreen />;

  return (
    <NavigationContainer>
      <Tab.Navigator screenOptions={{ headerShown: false, tabBarActiveTintColor: '#2e7d32' }}>
        <Tab.Screen name="Posiciones" component={RankingScreen} options={{ tabBarIcon: () => <Text>📊</Text> }} />
        <Tab.Screen name="Partidos" component={PartidosScreen} options={{ tabBarIcon: () => <Text>⚽</Text> }} />
        <Tab.Screen name="Simulador" component={SimuladorScreen} options={{ tabBarIcon: () => <Text>🧮</Text> }} />
        <Tab.Screen name="Reglas" component={ReglasScreen} options={{ tabBarIcon: () => <Text>📜</Text> }} />
        <Tab.Screen name="Quiniela" component={QuinielaScreen} options={{ tabBarIcon: () => <Text>📝</Text> }} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}