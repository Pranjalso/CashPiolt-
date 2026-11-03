import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, Text, View } from 'react-native';
import { useAuth } from '../auth';
import { API_URL } from '../api';
import { Btn, Card, Err, Field, Muted } from '../ui';
import { C } from '../theme';

export default function LoginScreen() {
  const { login } = useAuth();
  const [email, setEmail] = useState(''); const [password, setPassword] = useState('');
  const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  const go = async () => { setErr(''); setBusy(true); try { await login(email.trim(), password); } catch (e: any) { setErr(e.message); setBusy(false); } };
  return <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: C.navy, justifyContent: 'center', padding: 22 }}>
    <Text style={{ color: '#fff', fontSize: 34, fontWeight: '900', marginBottom: 4 }}>Cash<Text style={{ color: C.pink }}>Pilot</Text></Text>
    <Text style={{ color: '#cdd5f0', marginBottom: 26 }}>Cash flow & expense claims for every business</Text>
    <Card style={{ padding: 20 }}>
      <Err msg={err} />
      <Field label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" placeholder="you@business.com" />
      <Field label="Password" value={password} onChangeText={setPassword} secureTextEntry placeholder="••••••••" onSubmitEditing={go} />
      <Btn title={busy ? 'Signing in…' : 'Sign in'} onPress={go} disabled={busy || !email || !password} />
      <View style={{ height: 12 }} /><Muted style={{ textAlign: 'center' }}>New business? Sign up on the web app, then log in here.</Muted>
    </Card>
    <Text style={{ color: '#7f8bb8', fontSize: 11, textAlign: 'center' }}>Server: {API_URL}</Text>
  </KeyboardAvoidingView>;
}
