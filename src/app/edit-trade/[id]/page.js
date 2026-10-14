'use client';

import { useState, useEffect, use } from 'react';
import { getTradeById } from '@/lib/trades';
import { TradeFormPage } from '@/app/add-trade/page';

export default function EditTradePage({ params }) {
  const { id } = use(params);
  const [trade, setTrade] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTrade();
  }, [id]);

  async function loadTrade() {
    const { data } = await getTradeById(id);
    setTrade(data);
    setLoading(false);
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '100px 0' }}>
        <div className="loading-spinner" />
      </div>
    );
  }

  if (!trade) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 0' }}>
        <h2>Trade not found</h2>
        <p className="text-muted">The trade you are looking for does not exist.</p>
      </div>
    );
  }

  return <TradeFormPage mode="edit" initialData={trade} />;
}
