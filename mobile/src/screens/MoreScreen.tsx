import React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../auth';
import { API_URL } from '../api';
import { Btn, Card, H, Muted, Row, s } from '../ui';
import { C } from '../theme';

export default function MoreScreen() {
  const { me, logout, switchBusiness } = useAuth(); const nav = useNavigation<any>();
  if (!me) return null;
  return <ScrollView style={s.screen} contentContainerStyle={{ padding: 14 }}>
    <Card><H>{me.user.name}</H><Muted>{me.user.email} · {me.role}</Muted></Card>
    <Card><H style={{ marginBottom: 8 }}>Your businesses</H>{me.businesses.map(b => <Pressable key={b.id} onPress={() => switchBusiness(b.id)}>
      <Row style={{ paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.line }}>
        <View style={{ flex: 1 }}><Text style={{ fontWeight: b.id === me.business?.id ? '800' : '500', color: b.id === me.business?.id ? C.indigo : C.text }}>{b.name}</Text>
          <Muted>{b.business_type.replace('_', ' / ')} · {b.role}</Muted></View>{b.id === me.business?.id && <Text style={{ color: C.indigo }}>✓ active</Text>}</Row></Pressable>)}</Card>
    {me.role !== 'EMPLOYEE' && <Card>{[['Reports', 'Forecast & cash flow statement'], ['Dues', 'Receivables & payables']].map(([r, d]) =>
      <Pressable key={r} onPress={() => nav.navigate(r)}><Row style={{ paddingVertical: 10 }}><View style={{ flex: 1 }}><Text style={{ fontWeight: '700' }}>{r}</Text><Muted>{d}</Muted></View><Text>›</Text></Row></Pressable>)}</Card>}
    <Muted style={{ marginBottom: 12 }}>Setup (accounts, categories, budgets, team) is on the web app. Server: {API_URL}</Muted>
    <Btn kind="ghost" title="Sign out" onPress={logout} />
  </ScrollView>;
}
