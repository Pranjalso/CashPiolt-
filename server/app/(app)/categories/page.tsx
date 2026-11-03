'use client';
import MasterPage from '@/components/MasterPage';
export default function Categories() {
  return <MasterPage title="Categories" endpoint="/api/categories" defaults={{ direction: 'OUT', activity: 'OPERATING', color: '#3B4FE0', active: true }}
    columns={[{ key: 'name', label: 'Category', render: r => <><span className="dot" style={{ background: r.color }} />{r.name}</> },
      { key: 'direction', label: 'Type', render: r => r.direction === 'IN' ? <span className="in">Money in</span> : <span className="out">Money out</span> },
      { key: 'activity', label: 'Cash flow activity' }, { key: 'active', label: 'Active', render: r => (r.active ? 'Yes' : 'No') }]}
    fields={[{ name: 'name', label: 'Name', required: true },
      { name: 'direction', label: 'Type', type: 'select', required: true, options: [{ value: 'IN', label: 'Money in (income)' }, { value: 'OUT', label: 'Money out (expense)' }] },
      { name: 'activity', label: 'Activity', type: 'select', required: true, options: ['OPERATING', 'INVESTING', 'FINANCING'].map(a => ({ value: a, label: a })) },
      { name: 'color', label: 'Colour', type: 'color' }, { name: 'active', label: 'Active', type: 'checkbox' }]} />;
}
