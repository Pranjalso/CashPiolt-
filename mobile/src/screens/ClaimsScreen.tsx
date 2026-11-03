import React, { useState } from 'react';
import { FlatList, Pressable, RefreshControl, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../auth';
import { useApi } from '../useApi';
import { Badge, Err, Loading, Muted, Row, Segmented, s } from '../ui';
import { C, inr } from '../theme';

export default function ClaimsScreen() {
  const nav = useNavigation<any>(); const { me } = useAuth();
  const approver = me?.role === 'OWNER' || me?.role === 'ACCOUNTANT';
  const [st, setSt] = useState<string>(approver ? 'SUBMITTED' : '');
  const { data, error, refreshing, refresh } = useApi<any[]>(`/api/claims${st ? `?status=${st}` : ''}`);
  return <View style={s.screen}>
    <View style={{ padding: 14, paddingBottom: 0 }}>
      <Segmented value={st} onChange={setSt} options={approver ? [['SUBMITTED', 'To review'], ['APPROVED', 'To pay'], ['', 'All']] : [['', 'All'], ['SUBMITTED', 'Pending'], ['PAID', 'Paid']]} />
      <Err msg={error} /></View>
    {!data ? <Loading /> : <FlatList data={data} keyExtractor={c => String(c.id)} contentContainerStyle={{ padding: 14, paddingTop: 0, paddingBottom: 90 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />} ListEmptyComponent={<Muted>No claims here</Muted>}
      renderItem={({ item: c }) => <Pressable onPress={() => nav.navigate('ClaimDetail', { id: c.id })} style={{ backgroundColor: '#fff', borderRadius: 12, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: C.line }}>
        <Row><View style={{ flex: 1 }}><Text style={{ fontWeight: '700', fontSize: 15 }}>{c.title}</Text><Muted>{c.claim_no}{approver ? ` · ${c.employee}` : ''} · {c.items} item(s)</Muted></View>
          <View style={{ alignItems: 'flex-end' }}><Text style={{ fontWeight: '800', fontSize: 16 }}>{inr(c.approved_amount ?? c.total)}</Text><Badge s={c.status} /></View></Row>
      </Pressable>} />}
    {me?.role !== 'VIEWER' && <Pressable onPress={() => nav.navigate('ClaimForm', {})} style={{ position: 'absolute', right: 18, bottom: 22, backgroundColor: C.pink, borderRadius: 29, paddingHorizontal: 20, height: 54, alignItems: 'center', justifyContent: 'center', elevation: 4 }}>
      <Text style={{ color: '#fff', fontSize: 16, fontWeight: '800' }}>＋ New claim</Text></Pressable>}
  </View>;
}
