import React, { useState } from 'react';
import { ActivityIndicator, FlatList, Modal, Pressable, StyleSheet, Text, TextInput, TextInputProps, View, ViewStyle } from 'react-native';
import { C } from './theme';

export const Card = ({ children, style }: { children: React.ReactNode; style?: ViewStyle }) => <View style={[s.card, style]}>{children}</View>;
export const H = ({ children, style }: any) => <Text style={[s.h, style]}>{children}</Text>;
export const Muted = ({ children, style }: any) => <Text style={[s.muted, style]}>{children}</Text>;
export const Row = ({ children, style }: { children: React.ReactNode; style?: ViewStyle }) => <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 8 }, style]}>{children}</View>;
export const Err = ({ msg }: { msg?: string }) => (msg ? <Text style={s.err}>{msg}</Text> : null);
export const Loading = () => <View style={{ padding: 40 }}><ActivityIndicator color={C.indigo} /></View>;

export function Btn({ title, onPress, kind = 'primary', disabled, small }: { title: string; onPress: () => void; kind?: 'primary' | 'green' | 'red' | 'ghost'; disabled?: boolean; small?: boolean }) {
  const bg = { primary: C.indigo, green: C.teal, red: C.red, ghost: '#fff' }[kind];
  return <Pressable onPress={onPress} disabled={disabled} style={({ pressed }) => [s.btn, small && { paddingVertical: 7, paddingHorizontal: 12 }, { backgroundColor: bg, opacity: disabled ? 0.5 : pressed ? 0.8 : 1, borderWidth: kind === 'ghost' ? 1 : 0 }]}>
    <Text style={{ color: kind === 'ghost' ? C.text : '#fff', fontWeight: '700', fontSize: small ? 13 : 15 }}>{title}</Text></Pressable>;
}

export function Field({ label, ...p }: TextInputProps & { label: string }) {
  return <View style={{ marginBottom: 12 }}><Text style={s.label}>{label}</Text><TextInput placeholderTextColor="#9aa3bd" style={s.input} {...p} /></View>;
}

/** Simple dropdown (bottom sheet list) — no native picker dependency */
export function Select({ label, value, options, onChange, placeholder = 'Select…' }: { label: string; value: any; options: { value: any; label: string }[]; onChange: (v: any) => void; placeholder?: string }) {
  const [open, setOpen] = useState(false);
  const cur = options.find(o => String(o.value) === String(value));
  return <View style={{ marginBottom: 12 }}>
    <Text style={s.label}>{label}</Text>
    <Pressable style={s.input} onPress={() => setOpen(true)}><Text style={{ color: cur ? C.text : '#9aa3bd', fontSize: 15 }}>{cur?.label ?? placeholder}</Text></Pressable>
    <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
      <Pressable style={s.sheetBg} onPress={() => setOpen(false)} />
      <View style={s.sheet}><Text style={[s.h, { marginBottom: 8 }]}>{label}</Text>
        <FlatList data={options} keyExtractor={o => String(o.value)} renderItem={({ item }) =>
          <Pressable style={s.opt} onPress={() => { onChange(item.value); setOpen(false); }}>
            <Text style={{ fontSize: 15, fontWeight: String(item.value) === String(value) ? '700' : '400', color: String(item.value) === String(value) ? C.indigo : C.text }}>{item.label}</Text></Pressable>} />
      </View>
    </Modal>
  </View>;
}

export function Segmented<T extends string>({ value, options, onChange }: { value: T; options: [T, string][]; onChange: (v: T) => void }) {
  return <View style={s.seg}>{options.map(([k, l]) =>
    <Pressable key={k} onPress={() => onChange(k)} style={[s.segItem, value === k && s.segOn]}><Text style={{ fontWeight: '700', color: value === k ? C.text : C.muted, fontSize: 13 }}>{l}</Text></Pressable>)}</View>;
}

const BADGE: Record<string, [string, string]> = {
  OPEN: ['#eef0f7', '#475070'], DRAFT: ['#eef0f7', '#475070'], PARTIAL: ['#fff4dc', '#a16207'], SUBMITTED: ['#fff4dc', '#a16207'],
  APPROVED: ['#e5e8ff', C.indigo], PAID: ['#dcf7f0', '#0b7d6b'], REJECTED: ['#fde2e2', C.red], CANCELLED: ['#fde2e2', C.red], OVERDUE: ['#fde2e2', C.red],
};
export const Badge = ({ s: st, text }: { s: string; text?: string }) => { const [bg, fg] = BADGE[st] ?? ['#eef0f7', '#475070'];
  return <View style={{ backgroundColor: bg, borderRadius: 99, paddingHorizontal: 8, paddingVertical: 2, alignSelf: 'flex-start' }}><Text style={{ color: fg, fontSize: 11, fontWeight: '800' }}>{text ?? st}</Text></View>; };

export const s = StyleSheet.create({
  card: { backgroundColor: C.card, borderRadius: 14, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: C.line },
  h: { fontSize: 16, fontWeight: '800', color: C.text }, muted: { color: C.muted, fontSize: 12 },
  label: { fontSize: 12, color: C.muted, marginBottom: 4 },
  input: { borderWidth: 1, borderColor: C.line, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 11, fontSize: 15, backgroundColor: '#fff', color: C.text },
  btn: { borderRadius: 10, paddingVertical: 13, paddingHorizontal: 18, alignItems: 'center', borderColor: C.line },
  err: { backgroundColor: '#fde2e2', color: '#991b1b', padding: 10, borderRadius: 8, marginBottom: 12 },
  sheetBg: { flex: 1, backgroundColor: 'rgba(11,31,75,.45)' },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 18, borderTopRightRadius: 18, padding: 16, maxHeight: '65%' },
  opt: { paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: C.line },
  seg: { flexDirection: 'row', backgroundColor: '#e9ecf5', borderRadius: 10, padding: 3, marginBottom: 12 },
  segItem: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8 }, segOn: { backgroundColor: '#fff' },
  screen: { flex: 1, backgroundColor: C.bg },
});
