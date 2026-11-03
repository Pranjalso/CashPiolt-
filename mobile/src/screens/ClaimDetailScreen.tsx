import React, { useState } from 'react';
import { Image, Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { api } from '../api';
import { useAuth } from '../auth';
import { useApi } from '../useApi';
import { Badge, Btn, Card, Err, Field, H, Loading, Muted, Row, Select, s } from '../ui';
import { C, fmtDate, inr } from '../theme';

export default function ClaimDetailScreen() {
  const nav = useNavigation<any>(); const { id } = useRoute<any>().params; const { me } = useAuth();
  const { data: c, reload } = useApi<any>(`/api/claims/${id}`);
  const approver = me?.role === 'OWNER' || me?.role === 'ACCOUNTANT';
  const { data: lk } = useApi<any>(approver ? '/api/lookups' : null);
  const [sheet, setSheet] = useState<null | 'approve' | 'reject' | 'pay'>(null); const [f, setF] = useState<any>({});
  const [err, setErr] = useState(''); const [view, setView] = useState<string | null>(null);
  if (!c || !me) return <Loading />;
  const mine = c.employee_id === me.user.id;
  const act = async (path: string, body?: any) => { setErr(''); try { await api(`/api/claims/${id}/${path}`, 'POST', body); setSheet(null); reload(); } catch (e: any) { setErr(e.message); } };
  return <View style={s.screen}><ScrollView contentContainerStyle={{ padding: 14, paddingBottom: 40 }}>
    <Err msg={err} />
    <Card><Row><View style={{ flex: 1 }}><H>{c.title}</H><Muted>{c.claim_no} · {c.employee}</Muted></View><Badge s={c.status} /></Row>
      <Row style={{ marginTop: 12 }}><View style={{ flex: 1 }}><Muted>Claimed</Muted><H>{inr(c.total, 2)}</H></View>
        <View style={{ flex: 1 }}><Muted>Approved</Muted><H style={{ color: C.green }}>{c.approved_amount != null ? inr(c.approved_amount, 2) : '—'}</H></View></Row>
      {c.review_note && <Text style={{ marginTop: 10, color: c.status === 'REJECTED' ? C.red : C.muted }}>{c.status === 'REJECTED' ? 'Rejected: ' : 'Note: '}{c.review_note} — {c.reviewer}</Text>}
      <Muted style={{ marginTop: 10 }}>Submitted {fmtDate(c.submitted_at)} · Reviewed {fmtDate(c.reviewed_at)} · Paid {fmtDate(c.paid_at)}{c.paid_from ? ` from ${c.paid_from}` : ''}</Muted>
    </Card>
    {c.items.map((i: any) => <Card key={i.id}><Row>
      {i.receipt_url ? <Pressable onPress={() => setView(i.receipt_url)}><Image source={{ uri: i.receipt_url }} style={{ width: 54, height: 54, borderRadius: 8 }} /></Pressable>
        : <View style={{ width: 54, height: 54, borderRadius: 8, backgroundColor: '#fde2e2', alignItems: 'center', justifyContent: 'center' }}><Text style={{ fontSize: 10, color: C.red }}>no receipt</Text></View>}
      <View style={{ flex: 1 }}><Text style={{ fontWeight: '700' }}>{i.description}</Text><Muted>{i.category} · {i.expense_date}</Muted></View>
      <Text style={{ fontWeight: '800' }}>{inr(i.amount, 2)}</Text></Row></Card>)}

    {mine && ['DRAFT', 'REJECTED'].includes(c.status) && <Row><View style={{ flex: 1 }}><Btn kind="ghost" title="Edit" onPress={() => nav.navigate('ClaimForm', { id })} /></View>
      <View style={{ flex: 1 }}><Btn title="Submit" onPress={() => act('submit')} /></View></Row>}
    {approver && !mine && c.status === 'SUBMITTED' && <Row><View style={{ flex: 1 }}><Btn kind="red" title="Reject" onPress={() => { setF({}); setSheet('reject'); }} /></View>
      <View style={{ flex: 1 }}><Btn kind="green" title="Approve" onPress={() => { setF({ approved_amount: String(c.total) }); setSheet('approve'); }} /></View></Row>}
    {approver && c.status === 'APPROVED' && <Btn kind="green" title={`Reimburse ${inr(c.approved_amount, 2)}`} onPress={() => { setF({ account_id: lk?.accounts[0]?.id, payment_mode: 'UPI' }); setSheet('pay'); }} />}
  </ScrollView>
    <Modal visible={!!sheet} transparent animationType="slide" onRequestClose={() => setSheet(null)}>
      <Pressable style={s.sheetBg} onPress={() => setSheet(null)} />
      <View style={s.sheet}>
        <H style={{ marginBottom: 10 }}>{sheet === 'approve' ? 'Approve claim' : sheet === 'reject' ? 'Reject claim' : `Reimburse ${c.employee}`}</H><Err msg={err} />
        {sheet === 'approve' && <Field label={`Approved amount (max ${inr(c.total, 2)})`} keyboardType="decimal-pad" value={f.approved_amount} onChangeText={v => setF({ ...f, approved_amount: v })} />}
        {sheet !== 'pay' && <Field label={sheet === 'reject' ? 'Reason *' : 'Note (optional)'} value={f.note ?? ''} onChangeText={v => setF({ ...f, note: v })} />}
        {sheet === 'pay' && lk && <>
          <Select label="Pay from" value={f.account_id} options={lk.accounts.map((a: any) => ({ value: a.id, label: a.name }))} onChange={v => setF({ ...f, account_id: v })} />
          <Select label="Mode" value={f.payment_mode} options={['UPI', 'BANK', 'CASH', 'CHEQUE'].map(m => ({ value: m, label: m }))} onChange={v => setF({ ...f, payment_mode: v })} />
          <Field label="Reference / UTR" value={f.reference ?? ''} onChangeText={v => setF({ ...f, reference: v })} /></>}
        <Btn kind={sheet === 'reject' ? 'red' : 'green'} title="Confirm" onPress={() =>
          sheet === 'approve' ? act('approve', { approved_amount: Number(f.approved_amount), note: f.note }) : sheet === 'reject' ? act('reject', { note: f.note }) : act('pay', f)} />
        <View style={{ height: 24 }} />
      </View>
    </Modal>
    <Modal visible={!!view} transparent onRequestClose={() => setView(null)}>
      <Pressable style={{ flex: 1, backgroundColor: '#000d', justifyContent: 'center' }} onPress={() => setView(null)}>
        {view && <Image source={{ uri: view }} style={{ width: '100%', height: '80%' }} resizeMode="contain" />}</Pressable>
    </Modal>
  </View>;
}
