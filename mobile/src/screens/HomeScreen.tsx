import React from 'react';
import { Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { canWrite, useAuth } from '../auth';
import { useApi } from '../useApi';
import { Badge, Btn, Card, Err, H, Loading, Muted, Row, s } from '../ui';
import { C, inr } from '../theme';

function Bars({ data }: { data: { label: string; inflow: number; outflow: number }[] }) {
  const max = Math.max(1, ...data.flatMap(d => [d.inflow, d.outflow]));
  return <Row style={{ alignItems: 'flex-end', height: 130, justifyContent: 'space-around' }}>
    {data.slice(-6).map(d => <View key={d.label} style={{ alignItems: 'center' }}>
      <Row style={{ alignItems: 'flex-end', gap: 3, height: 110 }}>
        <View style={{ width: 12, height: (d.inflow / max) * 110, backgroundColor: C.teal, borderRadius: 3 }} />
        <View style={{ width: 12, height: (d.outflow / max) * 110, backgroundColor: C.pink, borderRadius: 3 }} />
      </Row><Text style={{ fontSize: 10, color: C.muted, marginTop: 4 }}>{d.label}</Text></View>)}
  </Row>;
}

export default function HomeScreen() {
  const nav = useNavigation<any>(); const { me } = useAuth();
  const { data: d, error, refreshing, refresh } = useApi<any>('/api/reports/dashboard');
  return <ScrollView style={s.screen} contentContainerStyle={{ padding: 14 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}>
    <Err msg={error} />{!d ? <Loading /> : <>
      <View style={{ backgroundColor: C.navy, borderRadius: 16, padding: 18, marginBottom: 12 }}>
        <Text style={{ color: '#cdd5f0', fontSize: 12 }}>{d.business.name} · Cash & bank</Text>
        <Text style={{ color: '#fff', fontSize: 32, fontWeight: '900', marginVertical: 4 }}>{inr(d.total_balance)}</Text>
        <Row><Text style={{ color: '#7ff0d9', fontWeight: '700' }}>▲ {inr(d.month.inflow)}</Text><Text style={{ color: '#ff9fc9', fontWeight: '700' }}>▼ {inr(d.month.outflow)}</Text><Text style={{ color: '#cdd5f0' }}>this month</Text></Row>
      </View>
      {d.forecast.low_cash_date && <Text style={[s.err, { backgroundColor: '#fff4dc', color: '#92400e' }]}>⚠ Cash projected below alert level on {d.forecast.low_cash_date}</Text>}
      {canWrite(me?.role) && <Row style={{ marginBottom: 12 }}>
        <View style={{ flex: 1 }}><Btn kind="green" title="＋ Money in" onPress={() => nav.navigate('AddTxn', { direction: 'IN' })} /></View>
        <View style={{ flex: 1 }}><Btn kind="red" title="－ Money out" onPress={() => nav.navigate('AddTxn', { direction: 'OUT' })} /></View></Row>}
      <Row style={{ gap: 12 }}>
        <Pressable style={{ flex: 1 }} onPress={() => nav.navigate('Dues', { kind: 'RECEIVABLE' })}><Card><Muted>To receive</Muted><H style={{ fontSize: 19, marginTop: 4 }}>{inr(d.dues.receivable)}</H><Text style={{ color: C.red, fontSize: 12 }}>Overdue {inr(d.dues.overdue_receivable)}</Text></Card></Pressable>
        <Pressable style={{ flex: 1 }} onPress={() => nav.navigate('Dues', { kind: 'PAYABLE' })}><Card><Muted>To pay</Muted><H style={{ fontSize: 19, marginTop: 4 }}>{inr(d.dues.payable)}</H><Text style={{ color: C.red, fontSize: 12 }}>Overdue {inr(d.dues.overdue_payable)}</Text></Card></Pressable>
      </Row>
      <Row style={{ gap: 12 }}>
        <Pressable style={{ flex: 1 }} onPress={() => nav.navigate('Reports')}><Card><Muted>In 30 days (forecast)</Muted><H style={{ fontSize: 19, marginTop: 4 }}>{inr(d.forecast.end_balance)}</H><Muted>Low {inr(d.forecast.min_balance)}</Muted></Card></Pressable>
        <Pressable style={{ flex: 1 }} onPress={() => nav.navigate('Claims')}><Card><Muted>Expense claims</Muted><H style={{ fontSize: 19, marginTop: 4 }}>{d.claims.to_review} to review</H><Muted>{inr(d.claims.to_pay_amount)} to pay</Muted></Card></Pressable>
      </Row>
      <Card><H>Monthly cash flow</H><Muted style={{ marginBottom: 8 }}>green = in · pink = out</Muted><Bars data={d.monthly} /></Card>
      <Card><H style={{ marginBottom: 8 }}>Accounts</H>{d.balances.map((b: any) => <Row key={b.account_id} style={{ paddingVertical: 7 }}>
        <View style={{ flex: 1 }}><Text style={{ fontWeight: '600' }}>{b.name}</Text><Muted>{b.type.replace('_', ' ')}</Muted></View><Text style={{ fontWeight: '800', color: b.balance < 0 ? C.red : C.text }}>{inr(b.balance)}</Text></Row>)}</Card>
      <Card><H style={{ marginBottom: 8 }}>Upcoming dues</H>{d.upcoming.map((u: any) => <Row key={u.id} style={{ paddingVertical: 7 }}>
        <View style={{ flex: 1 }}><Text style={{ fontWeight: '600' }}>{u.party_name ?? u.doc_no}</Text><Row><Muted>{u.doc_no} · {u.due_date}</Muted>{u.days_overdue > 0 && <Badge s="OVERDUE" text={`${u.days_overdue}d late`} />}</Row></View>
        <Text style={{ fontWeight: '800', color: u.kind === 'RECEIVABLE' ? C.green : C.red }}>{u.kind === 'RECEIVABLE' ? '+' : '−'}{inr(u.outstanding)}</Text></Row>)}</Card>
    </>}
  </ScrollView>;
}
