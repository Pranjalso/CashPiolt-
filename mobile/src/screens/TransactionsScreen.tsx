import React, { useState } from 'react';
import { FlatList, Pressable, RefreshControl, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { canWrite, useAuth } from '../auth';
import { useApi } from '../useApi';
import { Err, Loading, Muted, Row, Segmented, s } from '../ui';
import { C, inr } from '../theme';

export default function TransactionsScreen() {
  const nav = useNavigation<any>(); const { me } = useAuth();
  const [dir, setDir] = useState<'' | 'IN' | 'OUT'>('');
  const { data, error, refreshing, refresh } = useApi<any>(`/api/transactions?size=100${dir ? `&direction=${dir}` : ''}&from=${new Date(Date.now() - 60 * 86400e3).toISOString().slice(0, 10)}`);
  return <View style={s.screen}>
    <View style={{ padding: 14, paddingBottom: 0 }}><Segmented value={dir} onChange={setDir} options={[['', 'All'], ['IN', 'Money in'], ['OUT', 'Money out']]} />
      {data && <Row style={{ marginBottom: 8 }}><Text style={{ color: C.green, fontWeight: '700' }}>In {inr(data.total_in)}</Text><Text style={{ color: C.red, fontWeight: '700' }}>Out {inr(data.total_out)}</Text><Muted>· last 60 days</Muted></Row>}
      <Err msg={error} /></View>
    {!data ? <Loading /> : <FlatList data={data.rows} keyExtractor={(t: any) => String(t.id)} contentContainerStyle={{ padding: 14, paddingTop: 0, paddingBottom: 90 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
      renderItem={({ item: t }) => <View style={{ backgroundColor: '#fff', borderRadius: 12, padding: 12, marginBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: C.line }}>
        <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: (t.color ?? C.indigo) + '22', alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: t.color ?? C.indigo, fontWeight: '900' }}>{t.transfer_group ? '⇄' : t.direction === 'IN' ? '↓' : '↑'}</Text></View>
        <View style={{ flex: 1 }}><Text style={{ fontWeight: '700' }}>{t.transfer_group ? 'Transfer' : t.category ?? 'Settlement'}{t.party ? ` · ${t.party}` : ''}</Text>
          <Muted>{t.txn_date} · {t.account} · {t.payment_mode}{t.doc_no ? ` · ${t.doc_no}` : ''}{t.claim_no ? ` · ${t.claim_no}` : ''}</Muted>{t.notes ? <Muted numberOfLines={1}>{t.notes}</Muted> : null}</View>
        <Text style={{ fontWeight: '800', color: t.direction === 'IN' ? C.green : C.red }}>{t.direction === 'IN' ? '+' : '−'}{inr(t.amount)}</Text></View>} />}
    {canWrite(me?.role) && <Pressable onPress={() => nav.navigate('AddTxn', {})} style={{ position: 'absolute', right: 18, bottom: 22, backgroundColor: C.indigo, width: 58, height: 58, borderRadius: 29, alignItems: 'center', justifyContent: 'center', elevation: 4 }}>
      <Text style={{ color: '#fff', fontSize: 30, marginTop: -2 }}>＋</Text></Pressable>}
  </View>;
}
