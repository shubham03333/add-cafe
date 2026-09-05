'use client';

import React, { useEffect, useState } from 'react';
import { MenuItem } from '@/types';

type Offer = {
  id: number;
  code: string;
  name: string;
  scope: 'bill' | 'dish';
  discount_type: 'percent' | 'fixed';
  discount_value: number;
  menu_item_ids: number[] | null;
  min_bill: number;
  max_uses_per_phone: number;
  max_uses_total: number | null;
  require_phone: boolean;
  is_active: boolean;
  starts_at: string | null;
  ends_at: string | null;
};

const emptyForm = {
  code: '',
  name: '',
  scope: 'bill' as 'bill' | 'dish',
  discount_type: 'percent' as 'percent' | 'fixed',
  discount_value: 10,
  menu_item_ids: [] as number[],
  min_bill: 0,
  max_uses_per_phone: 1,
  max_uses_total: '' as string | number,
  require_phone: true,
  is_active: true,
  starts_at: '',
  ends_at: '',
};

export default function OffersManager({ menuItems }: { menuItems: MenuItem[] }) {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function load() {
    const response = await fetch('/api/offers');
    const data = await response.json();
    if (!response.ok) {
      setError(data.error || 'Failed to load offers');
      return;
    }
    setOffers(Array.isArray(data) ? data : []);
  }

  useEffect(() => {
    void load();
  }, []);

  function toggleDish(id: number) {
    setForm((prev) => ({
      ...prev,
      menu_item_ids: prev.menu_item_ids.includes(id)
        ? prev.menu_item_ids.filter((item) => item !== id)
        : [...prev.menu_item_ids, id],
    }));
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    const payload = {
      ...form,
      max_uses_total: form.max_uses_total === '' ? null : Number(form.max_uses_total),
      starts_at: form.starts_at || null,
      ends_at: form.ends_at || null,
    };
    const response = await fetch(editingId ? `/api/offers/${editingId}` : '/api/offers', {
      method: editingId ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await response.json().catch(() => ({}));
    setSaving(false);
    if (!response.ok) {
      setError(data.error || 'Could not save offer');
      return;
    }
    setForm(emptyForm);
    setEditingId(null);
    await load();
  }

  async function disable(id: number) {
    await fetch(`/api/offers/${id}`, { method: 'DELETE' });
    await load();
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-black text-zinc-900">Offers & coupon codes</h2>
        <p className="mt-1 text-sm text-zinc-600">
          Bill % hits the whole check. Dish % hits selected items only. One use per mobile unless you raise the limit.
        </p>
      </div>

      {error ? <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p> : null}

      <form onSubmit={save} className="rounded-2xl border border-zinc-200 bg-white p-4 space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm font-medium">
            Code
            <input
              required
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
              className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-base"
              placeholder="BDAY10"
            />
          </label>
          <label className="text-sm font-medium">
            Name
            <input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-base"
              placeholder="Birthday 10%"
            />
          </label>
          <label className="text-sm font-medium">
            Scope
            <select
              value={form.scope}
              onChange={(e) => setForm({ ...form, scope: e.target.value as 'bill' | 'dish' })}
              className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-base"
            >
              <option value="bill">Whole bill</option>
              <option value="dish">Specific dishes</option>
            </select>
          </label>
          <label className="text-sm font-medium">
            Type
            <select
              value={form.discount_type}
              onChange={(e) => setForm({ ...form, discount_type: e.target.value as 'percent' | 'fixed' })}
              className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-base"
            >
              <option value="percent">Percent %</option>
              <option value="fixed">Fixed ₹</option>
            </select>
          </label>
          <label className="text-sm font-medium">
            Value
            <input
              required
              type="number"
              min={0.01}
              step="0.01"
              value={form.discount_value}
              onChange={(e) => setForm({ ...form, discount_value: Number(e.target.value) })}
              className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-base"
            />
          </label>
          <label className="text-sm font-medium">
            Min bill ₹
            <input
              type="number"
              min={0}
              value={form.min_bill}
              onChange={(e) => setForm({ ...form, min_bill: Number(e.target.value) })}
              className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-base"
            />
          </label>
          <label className="text-sm font-medium">
            Uses per phone
            <input
              type="number"
              min={1}
              value={form.max_uses_per_phone}
              onChange={(e) => setForm({ ...form, max_uses_per_phone: Number(e.target.value) })}
              className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-base"
            />
          </label>
          <label className="text-sm font-medium">
            Campaign max uses (blank = unlimited)
            <input
              type="number"
              min={1}
              value={form.max_uses_total}
              onChange={(e) => setForm({ ...form, max_uses_total: e.target.value })}
              className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-base"
            />
          </label>
        </div>

        {form.scope === 'dish' ? (
          <div>
            <p className="mb-2 text-sm font-medium">Dishes</p>
            <div className="grid max-h-48 grid-cols-2 gap-2 overflow-y-auto rounded-xl border border-zinc-100 p-2 sm:grid-cols-3">
              {menuItems.map((item) => (
                <label key={item.id} className="flex items-center gap-2 text-xs">
                  <input
                    type="checkbox"
                    checked={form.menu_item_ids.includes(item.id)}
                    onChange={() => toggleDish(item.id)}
                  />
                  <span>{item.name}</span>
                </label>
              ))}
            </div>
          </div>
        ) : null}

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.require_phone}
            onChange={(e) => setForm({ ...form, require_phone: e.target.checked })}
          />
          Require customer mobile (recommended)
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.is_active}
            onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
          />
          Active
        </label>

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-zinc-900 px-4 py-2 text-sm font-semibold text-white min-h-[44px]"
          >
            {editingId ? 'Update offer' : 'Create offer'}
          </button>
          {editingId ? (
            <button
              type="button"
              className="rounded-xl px-4 py-2 text-sm"
              onClick={() => {
                setEditingId(null);
                setForm(emptyForm);
              }}
            >
              Cancel edit
            </button>
          ) : null}
        </div>
      </form>

      <div className="overflow-x-auto rounded-2xl border border-zinc-200 bg-white">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-b text-xs uppercase text-zinc-400">
              <th className="p-3">Code</th>
              <th className="p-3">Rule</th>
              <th className="p-3">Limit</th>
              <th className="p-3">Status</th>
              <th className="p-3" />
            </tr>
          </thead>
          <tbody>
            {offers.map((offer) => (
              <tr key={offer.id} className="border-b border-zinc-100">
                <td className="p-3 font-bold">{offer.code}</td>
                <td className="p-3">
                  {offer.scope} · {offer.discount_type === 'percent' ? `${offer.discount_value}%` : `₹${offer.discount_value}`}
                </td>
                <td className="p-3">{offer.max_uses_per_phone} / phone</td>
                <td className="p-3">{offer.is_active ? 'Active' : 'Off'}</td>
                <td className="p-3 text-right">
                  <button
                    type="button"
                    className="mr-2 text-xs font-semibold"
                    onClick={() => {
                      setEditingId(offer.id);
                      setForm({
                        code: offer.code,
                        name: offer.name,
                        scope: offer.scope,
                        discount_type: offer.discount_type,
                        discount_value: offer.discount_value,
                        menu_item_ids: offer.menu_item_ids || [],
                        min_bill: offer.min_bill,
                        max_uses_per_phone: offer.max_uses_per_phone,
                        max_uses_total: offer.max_uses_total ?? '',
                        require_phone: offer.require_phone,
                        is_active: offer.is_active,
                        starts_at: '',
                        ends_at: '',
                      });
                    }}
                  >
                    Edit
                  </button>
                  {offer.is_active ? (
                    <button type="button" className="text-xs font-semibold text-red-700" onClick={() => void disable(offer.id)}>
                      Turn off
                    </button>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {offers.length === 0 ? <p className="p-6 text-center text-sm text-zinc-500">No offers yet.</p> : null}
      </div>
    </div>
  );
}
