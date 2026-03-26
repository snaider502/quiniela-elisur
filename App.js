import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';
import RankingScreen from './screens/RankingScreen';
import PartidosScreen from './screens/PartidosScreen';
import SimuladorScreen from './screens/SimuladorScreen';
import ReglasScreen from './screens/ReglasScreen';

const Tab = createBottomTabNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={{ headerShown: false, tabBarActiveTintColor: '#2e7d32' }}>
        <Tab.Screen name="Posiciones" component={RankingScreen} options={{ tabBarIcon: () => <Text>📊</Text> }} />
        <Tab.Screen name="Partidos" component={PartidosScreen} options={{ tabBarIcon: () => <Text>⚽</Text> }} />
        <Tab.Screen name="Simulador" component={SimuladorScreen} options={{ tabBarIcon: () => <Text>🧮</Text> }} />
        <Tab.Screen name="Reglas" component={ReglasScreen} options={{ tabBarIcon: () => <Text>📜</Text> }} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
