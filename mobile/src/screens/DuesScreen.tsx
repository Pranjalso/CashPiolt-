import React, { useState } from 'react';
import { FlatList, Modal, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { useRoute } from '@react-navigation/native';
import { api } from '../api';
import { canWrite, useAuth } from '../auth';
import { useApi } from '../useApi';
import { Badge, Btn, Err, Field, H, Loading, Muted, Row, Segmented, Select, s } from '../ui';
import { C, inr, today } from '../theme';

export default function DuesScreen() {
  const route = useRoute<any>(); const { me } = useAuth();
  const [kind, setKind] = useState<'RECEIVABLE' | 'PAYABLE'>(route.params?.kind ?? 'RECEIVABLE');
  const { data, error, refreshing, refresh, reload } = useApi<any[]>(`/api/dues?kind=${kind}&status=OPEN`);
  const { data: lk } = useApi<any>(canWrite(me?.role) ? '/api/lookups' : null);
  const [pay, setPay] = useState<any>(null); const [err, setErr] = useState('');
  const recv = kind === 'RECEIVABLE';
  const total = (data ?? []).reduce((t, d) => t + d.outstanding, 0);
  const settle = async () => {
    setErr('');
    try { const { due, ...b } = pay; await api(`/api/dues/${due.id}/settle`, 'POST', { ...b, amount: Number(b.amount) }); setPay(null); reload(); }
    catch (e: any) { setErr(e.message); }
  };
  return <View style={s.screen}>
    <View style={{ padding: 14, paddingBottom: 0 }}>
      <Segmented value={kind} onChange={setKind} options={[['RECEIVABLE', 'To receive'], ['PAYABLE', 'To pay']]} />
      <Row style={{ marginBottom: 10 }}><H>{inr(total)}</H><Muted>outstanding</Muted></Row><Err msg={error} /></View>
    {!data ? <Loading /> : <FlatList data={data} keyExtractor={d => String(d.id)} contentContainerStyle={{ padding: 14, paddingTop: 0 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
      ListEmptyComponent={<Muted>Nothing outstanding 🎉</Muted>}
      renderItem={({ item: d }) => <View style={{ backgroundColor: '#fff', borderRadius: 12, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: d.days_overdue > 0 ? '#f5b4b4' : C.line }}>
        <Row><View style={{ flex: 1 }}><Text style={{ fontWeight: '700', fontSize: 15 }}>{d.party_name ?? '—'}</Text><Muted>{d.doc_no} · due {d.due_date}</Muted></View>
          <Text style={{ fontWeight: '800', fontSize: 16, color: recv ? C.green : C.red }}>{inr(d.outstanding)}</Text></Row>
        <Row style={{ marginTop: 8 }}><Badge s={d.status} />{d.days_overdue > 0 && <Badge s="OVERDUE" text={`${d.days_overdue} days overdue`} />}
          {d.paid > 0 && <Muted>of {inr(d.amount)}</Muted>}<View style={{ flex: 1 }} />
          {canWrite(me?.role) && <Btn small kind="green" title={recv ? 'Receive' : 'Pay'} onPress={() => setPay({ due: d, amount: String(d.outstanding), txn_date: today(), account_id: lk?.accounts[0]?.id, payment_mode: 'UPI' })} />}</Row>
      </View>} />}
    <Modal visible={!!pay} animationType="slide" transparent onRequestClose={() => setPay(null)}>
      <Pressable style={s.sheetBg} onPress={() => setPay(null)} />
      {pay && lk && <ScrollView style={[s.sheet, { maxHeight: '80%' }]} keyboardShouldPersistTaps="handled">
        <H style={{ marginBottom: 4 }}>{recv ? 'Receive payment' : 'Pay bill'} · {pay.due.doc_no}</H><Muted style={{ marginBottom: 12 }}>Outstanding {inr(pay.due.outstanding)} — part payment allowed</Muted>
        <Err msg={err} />
        <Field label="Amount" keyboardType="decimal-pad" value={pay.amount} onChangeText={v => setPay({ ...pay, amount: v })} />
        <Field label="Date" value={pay.txn_date} onChangeText={v => setPay({ ...pay, txn_date: v })} />
        <Select label={recv ? 'Into account' : 'From account'} value={pay.account_id} options={lk.accounts.map((a: any) => ({ value: a.id, label: a.name }))} onChange={v => setPay({ ...pay, account_id: v })} />
        <Select label="Mode" value={pay.payment_mode} options={['UPI', 'BANK', 'CASH', 'CHEQUE', 'CARD'].map(m => ({ value: m, label: m }))} onChange={v => setPay({ ...pay, payment_mode: v })} />
        <Field label="Reference / UTR" value={pay.reference ?? ''} onChangeText={v => setPay({ ...pay, reference: v })} />
        <Btn kind="green" title="Record payment" onPress={settle} /><View style={{ height: 30 }} />
      </ScrollView>}
    </Modal>
  </View>;
}
