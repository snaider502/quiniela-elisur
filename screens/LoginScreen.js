import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { supabase } from '../lib/supabase';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nombre, setNombre] = useState('');
  const [modo, setModo] = useState('login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleLogin() {
    if (!email || !password) { setError('Completa todos los campos'); return; }
    setLoading(true);
    setError('');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setError(error.message);
    setLoading(false);
  }

  async function handleRegistro() {
    if (!nombre || !email || !password) { setError('Completa todos los campos'); return; }
    if (password.length < 6) { setError('La contraseña debe tener al menos 6 caracteres'); return; }
    setLoading(true);
    setError('');
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) { setError(error.message); setLoading(false); return; }
    if (data.user) {
      await supabase.from('usuarios').insert({ id: data.user.id, nombre, email });
    }
    setLoading(false);
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={styles.card}>
        <Text style={styles.logo}>⚽</Text>
        <Text style={styles.titulo}>Quiniela Mundial 2026</Text>
        <Text style={styles.subtitulo}>{modo === 'login' ? 'Inicia sesión' : 'Crea tu cuenta'}</Text>

        {error !== '' && (
          <View style={styles.errorBox}>
            <Text style={styles.errorTxt}>{error}</Text>
          </View>
        )}

        {modo === 'registro' && (
          <TextInput
            style={styles.input}
            placeholder="Tu nombre completo"
            value={nombre}
            onChangeText={setNombre}
            autoCapitalize="words"
          />
        )}

        <TextInput
          style={styles.input}
          placeholder="Correo electrónico"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <TextInput
          style={styles.input}
          placeholder="Contraseña"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <TouchableOpacity
          style={styles.btn}
          onPress={modo === 'login' ? handleLogin : handleRegistro}
          disabled={loading}>
          {loading
            ? <ActivityIndicator color="white" />
            : <Text style={styles.btnTxt}>{modo === 'login' ? 'Entrar' : 'Registrarme'}</Text>
          }
        </TouchableOpacity>

        <TouchableOpacity onPress={() => { setModo(modo === 'login' ? 'registro' : 'login'); setError(''); }}>
          <Text style={styles.switchTxt}>
            {modo === 'login' ? '¿No tienes cuenta? Regístrate' : '¿Ya tienes cuenta? Inicia sesión'}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f2f5', justifyContent: 'center', padding: 20 },
  card: { backgroundColor: 'white', borderRadius: 16, padding: 24, elevation: 4 },
  logo: { fontSize: 48, textAlign: 'center', marginBottom: 8 },
  titulo: { fontSize: 20, fontWeight: 'bold', textAlign: 'center', color: '#2e7d32', marginBottom: 4 },
  subtitulo: { fontSize: 14, textAlign: 'center', color: '#888', marginBottom: 20 },
  errorBox: { backgroundColor: '#ffebee', borderRadius: 8, padding: 10, marginBottom: 12 },
  errorTxt: { color: '#c62828', fontSize: 12, textAlign: 'center' },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 10, padding: 12, fontSize: 14, marginBottom: 12, color: '#333' },
  btn: { backgroundColor: '#2e7d32', borderRadius: 10, padding: 14, alignItems: 'center', marginTop: 4 },
  btnTxt: { color: 'white', fontWeight: 'bold', fontSize: 15 },
  switchTxt: { color: '#2e7d32', textAlign: 'center', marginTop: 16, fontSize: 13 },
});