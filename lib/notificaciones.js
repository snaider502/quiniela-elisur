import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { supabase } from './supabase';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export async function registrarNotificaciones() {
  if (!Device.isDevice) return null;

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') return null;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
    });
  }

  const token = (await Notifications.getExpoPushTokenAsync()).data;
  return token;
}

export async function guardarToken(userId, token) {
  if (!token) return;
  await supabase
    .from('usuarios')
    .update({ push_token: token })
    .eq('id', userId);
}

export async function enviarNotificacionATodos(titulo, mensaje) {
  const { data: usuarios } = await supabase
    .from('usuarios')
    .select('push_token')
    .not('push_token', 'is', null);

  if (!usuarios || usuarios.length === 0) return;

  const mensajes = usuarios
    .filter(u => u.push_token)
    .map(u => ({
      to: u.push_token,
      sound: 'default',
      title: titulo,
      body: mensaje,
      badge: 1,
      data: { tipo: 'resultado' },
    }));

  await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify(mensajes),
  });
}