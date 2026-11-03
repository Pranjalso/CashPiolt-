import React, { useEffect, useState } from 'react';
import { Alert, Image, Pressable, ScrollView, Text, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { api } from '../api';
import { useApi } from '../useApi';
import { Btn, Card, Err, Field, H, Loading, Muted, Row, Select, s } from '../ui';
import { C, inr, today } from '../theme';

type Line = { expense_date: string; category_id?: number; description: string; amount: string; receipt_url?: string | null; receipt_mime?: string | null };
const blank = (): Line => ({ expense_date: today(), description: '', amount: '' });

/** Shrink the photo before upload: max 1280px, JPEG 60% → typically 150-300 KB */
async function pickReceipt(source: 'camera' | 'library') {
  const perm = source === 'camera' ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) { Alert.alert('Permission needed', `Allow ${source} access to attach receipts.`); return null; }
  const r = source === 'camera'
    ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.8 })
    : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
  if (r.canceled) return null;
  const a = r.assets[0];
  const out = await ImageManipulator.manipulateAsync(a.uri, (a.width ?? 0) > 1280 ? [{ resize: { width: 1280 } }] : [],
    { compress: 0.6, format: ImageManipulator.SaveFormat.JPEG, base64: true });
  return { receipt_url: `data:image/jpeg;base64,${out.base64}`, receipt_mime: 'image/jpeg' };
}

export default function ClaimFormScreen() {
  const nav = useNavigation<any>(); const route = useRoute<any>(); const editId: number | undefined = route.params?.id;
  const { data: lk } = useApi<any>('/api/lookups');
  const { data: existing } = useApi<any>(editId ? `/api/claims/${editId}` : null);
  const [title, setTitle] = useState(''); const [lines, setLines] = useState<Line[]>([blank()]);
  const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  useEffect(() => { if (existing) { setTitle(existing.title); setLines(existing.items.map((i: any) => ({ ...i, amount: String(i.amount) }))); } }, [existing]);
  if (!lk || (editId && !existing)) return <Loading />;
  const cats = lk.categories.filter((c: any) => c.direction === 'OUT').map((c: any) => ({ value: c.id, label: c.name }));
  const upd = (i: number, p: Partial<Line>) => setLines(ls => ls.map((l, j) => (j === i ? { ...l, ...p } : l)));
  const total = lines.reduce((t, l) => t + Number(l.amount || 0), 0);

  const save = async (submit: boolean) => {
    setErr(''); setBusy(true);
    const body = { title, submit, items: lines.map(l => ({ expense_date: l.expense_date, category_id: l.category_id, description: l.description, amount: Number(l.amount), receipt_url: l.receipt_url ?? null, receipt_mime: l.receipt_mime ?? null })) };
    try {
      const r = editId ? (await api(`/api/claims/${editId}`, 'PUT', body), { id: editId }) : await api('/api/claims', 'POST', body);
      nav.replace('ClaimDetail', { id: r.id });
    } catch (e: any) { setErr(e.message); setBusy(false); }
  };
  return <ScrollView style={s.screen} contentContainerStyle={{ padding: 14, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
    <Err msg={err} />
    <Field label="Claim title *" value={title} onChangeText={setTitle} placeholder="e.g. Client visit – Pune" />
    {lines.map((l, i) => <Card key={i}>
      <Row style={{ marginBottom: 8 }}><H style={{ flex: 1 }}>Expense {i + 1}</H>{lines.length > 1 && <Pressable onPress={() => setLines(lines.filter((_, j) => j !== i))}><Text style={{ color: C.red, fontWeight: '700' }}>Remove</Text></Pressable>}</Row>
      <Row style={{ gap: 10 }}><View style={{ flex: 1 }}><Field label="Amount (₹)" keyboardType="decimal-pad" value={l.amount} onChangeText={v => upd(i, { amount: v })} /></View>
        <View style={{ flex: 1 }}><Field label="Date" value={l.expense_date} onChangeText={v => upd(i, { expense_date: v })} /></View></Row>
      <Select label="Category" value={l.category_id} options={cats} onChange={v => upd(i, { category_id: v })} />
      <Field label="Description" value={l.description} onChangeText={v => upd(i, { description: v })} placeholder="What was it for?" />
      <Muted style={{ marginBottom: 6 }}>Receipt</Muted>
      <Row>{l.receipt_url ? <Image source={{ uri: l.receipt_url }} style={{ width: 64, height: 64, borderRadius: 8 }} /> : null}
        <Btn small kind="ghost" title="📷 Camera" onPress={async () => { const r = await pickReceipt('camera'); if (r) upd(i, r); }} />
        <Btn small kind="ghost" title="🖼 Gallery" onPress={async () => { const r = await pickReceipt('library'); if (r) upd(i, r); }} /></Row>
    </Card>)}
    <Btn kind="ghost" title="＋ Add another expense" onPress={() => setLines([...lines, blank()])} />
    <Row style={{ marginVertical: 16 }}><H style={{ flex: 1 }}>Total</H><H>{inr(total, 2)}</H></Row>
    <Row><View style={{ flex: 1 }}><Btn kind="ghost" title="Save draft" disabled={busy} onPress={() => save(false)} /></View>
      <View style={{ flex: 1.4 }}><Btn title="Submit for approval" disabled={busy || !title} onPress={() => save(true)} /></View></Row>
  </ScrollView>;
}
