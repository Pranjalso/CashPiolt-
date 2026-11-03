'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useData } from '@/lib/client';
import TxnForm from './TxnForm';
export default function QuickAdd() {
  const [open, setOpen] = useState(false); const router = useRouter();
  const { data: lk } = useData<any>(open ? '/api/lookups' : null);
  return <>{<button className="btn primary" onClick={() => setOpen(true)}>+ Add cash entry</button>}
    {open && lk && <TxnForm lk={lk} onClose={() => setOpen(false)} onSaved={() => router.refresh()} />}</>;
}
