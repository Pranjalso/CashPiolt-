import React, { useEffect, useState } from 'react';
import { ScrollView } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { api } from '../api';
import { useApi } from '../useApi';
import { Btn, Err, Field, Loading, Segmented, Select, s } from '../ui';
import { today } from '../theme';

const MODES = ['CASH', 'UPI', 'BANK', 'CARD', 'CHEQUE', 'OTHER'].map(m => ({ value: m, label: m }));

export default function AddTxnScreen() {
  const nav = useNavigation<any>(); const route = useRoute<any>();
  const [mode, setMode] = useState<'IN' | 'OUT' | 'TRANSFER'>(route.params?.direction ?? 'IN');
  const { data: lk } = useApi<any>('/api/lookups');
  const [f, setF] = useState<any>({ txn_date: today(), payment_mode: mode === 'OUT' ? 'CASH' : 'UPI' });
  const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  const set = (k: string) => (v: any) => setF((p: any) => ({ ...p, [k]: v }));
  useEffect(() => { if (lk?.accounts[0] && !f.account_id) set('account_id')(lk.accounts[0].id); }, [lk]);
  if (!lk) return <Loading />;
  const accounts = lk.accounts.map((a: any) => ({ value: a.id, label: a.name }));
  const save = async () => {
    setErr(''); setBusy(true);
    try {
      if (mode === 'TRANSFER') await api('/api/transfers', 'POST', { txn_date: f.txn_date, amount: Number(f.amount), from_account_id: f.account_id, to_account_id: f.to_account_id, notes: f.notes });
      else await api('/api/transactions', 'POST', { ...f, amount: Number(f.amount), direction: mode });
      nav.goBack();
    } catch (e: any) { setErr(e.message); setBusy(false); }
  };
  return <ScrollView style={s.screen} contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
    <Segmented value={mode} onChange={m => { setMode(m); set('category_id')(undefined); }} options={[['IN', '＋ In'], ['OUT', '－ Out'], ['TRANSFER', '⇄ Transfer']]} />
    <Err msg={err} />
    <Field label="Amount (₹) *" keyboardType="decimal-pad" value={f.amount ?? ''} onChangeText={set('amount')} autoFocus placeholder="0.00" />
    <Field label="Date (YYYY-MM-DD)" value={f.txn_date} onChangeText={set('txn_date')} />
    <Select label={mode === 'TRANSFER' ? 'From account *' : 'Account *'} value={f.account_id} options={accounts} onChange={set('account_id')} />
    {mode === 'TRANSFER' ? <Select label="To account *" value={f.to_account_id} options={accounts.filter((a: any) => a.value !== f.account_id)} onChange={set('to_account_id')} /> : <>
      <Select label="Category *" value={f.category_id} onChange={set('category_id')}
        options={lk.categories.filter((c: any) => c.direction === mode).map((c: any) => ({ value: c.id, label: c.name }))} />
      <Select label={mode === 'IN' ? 'Received from' : 'Paid to'} value={f.party_id} onChange={set('party_id')}
        options={[{ value: '', label: '— none —' }, ...lk.parties.map((p: any) => ({ value: p.id, label: p.name }))]} />
      <Select label="Payment mode" value={f.payment_mode} options={MODES} onChange={set('payment_mode')} />
      <Field label="Reference (UTR / bill no.)" value={f.reference ?? ''} onChangeText={set('reference')} />
    </>}
    <Field label="Notes" value={f.notes ?? ''} onChangeText={set('notes')} />
    <Btn title={busy ? 'Saving…' : 'Save'} kind={mode === 'OUT' ? 'red' : mode === 'IN' ? 'green' : 'primary'} onPress={save} disabled={busy || !f.amount || !f.account_id} />
  </ScrollView>;
}
