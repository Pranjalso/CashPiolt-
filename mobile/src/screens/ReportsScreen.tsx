import React, { useState } from 'react';
import { RefreshControl, ScrollView, Text, View } from 'react-native';
import { useApi } from '../useApi';
import { Card, H, Loading, Muted, Row, Segmented, s } from '../ui';
import { C, inr } from '../theme';

/** Forecast as a compact bar strip (weekly lows) + events, and this month's statement */
export default function ReportsScreen() {
  const [days, setDays] = useState<'30' | '90' | '180'>('90');
  const { data: fc, refreshing, refresh } = useApi<any>(`/api/reports/forecast?days=${days}`);
  const { data: st } = useApi<any>('/api/reports/statement');
  if (!fc) return <Loading />;
  const weeks: { label: string; bal: number }[] = [];
  for (let i = 0; i < fc.series.length; i += 7) { const w = fc.series.slice(i, i + 7); weeks.push({ label: w[0].date.slice(5), bal: Math.min(...w.map((x: any) => x.balance)) }); }
  const max = Math.max(1, ...weeks.map(w => Math.abs(w.bal)));
  return <ScrollView style={s.screen} contentContainerStyle={{ padding: 14 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}>
    <Segmented value={days} onChange={setDays} options={[['30', '30 days'], ['90', '90 days'], ['180', '180 days']]} />
    {fc.low_cash_date && <Text style={[s.err, { backgroundColor: '#fff4dc', color: '#92400e' }]}>⚠ Below alert level ({inr(fc.low_cash_alert)}) on {fc.low_cash_date}</Text>}
    <Row style={{ gap: 12 }}>
      <Card style={{ flex: 1 }}><Muted>Today</Muted><H>{inr(fc.start_balance)}</H></Card>
      <Card style={{ flex: 1 }}><Muted>In {days} days</Muted><H style={{ color: fc.end_balance < 0 ? C.red : C.text }}>{inr(fc.end_balance)}</H></Card></Row>
    <Card><H>Weekly lowest balance</H><Muted style={{ marginBottom: 10 }}>Lowest {inr(fc.min_balance)} on {fc.min_date}</Muted>
      {weeks.map(w => <Row key={w.label} style={{ marginBottom: 5 }}><Text style={{ width: 46, fontSize: 11, color: C.muted }}>{w.label}</Text>
        <View style={{ flex: 1, height: 12, backgroundColor: '#eef0f7', borderRadius: 6 }}><View style={{ width: `${(Math.abs(w.bal) / max) * 100}%`, height: 12, borderRadius: 6, backgroundColor: w.bal < fc.low_cash_alert ? C.red : C.indigo }} /></View>
        <Text style={{ width: 86, textAlign: 'right', fontSize: 12, fontWeight: '700' }}>{inr(w.bal)}</Text></Row>)}</Card>
    <Card><H style={{ marginBottom: 6 }}>Expected events</H>{fc.events.slice(0, 15).map((e: any, i: number) => <Row key={i} style={{ paddingVertical: 6 }}>
      <Text style={{ width: 50, fontSize: 12, color: C.muted }}>{e.date.slice(5)}</Text><Text style={{ flex: 1 }} numberOfLines={1}>{e.label}</Text>
      <Text style={{ fontWeight: '700', color: e.amount >= 0 ? C.green : C.red }}>{e.amount >= 0 ? '+' : '−'}{inr(Math.abs(e.amount))}</Text></Row>)}</Card>
    {st && <Card><H style={{ marginBottom: 8 }}>This month — cash flow statement</H>
      {[['Opening balance', st.opening], ['Operating', st.operating.net], ['Investing', st.investing.net], ['Financing', st.financing.net], ['Closing balance', st.closing]].map(([l, v]: any) =>
        <Row key={l} style={{ paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: C.line }}><Text style={{ flex: 1, fontWeight: l.includes('balance') ? '800' : '400' }}>{l}</Text>
          <Text style={{ fontWeight: '700', color: !l.includes('balance') ? (v >= 0 ? C.green : C.red) : C.text }}>{inr(v)}</Text></Row>)}</Card>}
  </ScrollView>;
}
