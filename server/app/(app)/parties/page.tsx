'use client';
import MasterPage from '@/components/MasterPage';
const KINDS = ['CUSTOMER', 'VENDOR', 'EMPLOYEE', 'LENDER', 'BOTH'].map(k => ({ value: k, label: k }));
export default function Parties() {
  return <MasterPage title="Customers & Vendors" endpoint="/api/parties" defaults={{ kind: 'CUSTOMER' }}
    columns={[{ key: 'name', label: 'Name' }, { key: 'kind', label: 'Type' }, { key: 'phone', label: 'Phone' }, { key: 'email', label: 'Email' }, { key: 'gstin', label: 'GSTIN' }]}
    fields={[{ name: 'name', label: 'Name', required: true }, { name: 'kind', label: 'Type', type: 'select', options: KINDS, required: true },
      { name: 'phone', label: 'Phone' }, { name: 'email', label: 'Email' }, { name: 'gstin', label: 'GSTIN' }]} />;
}
