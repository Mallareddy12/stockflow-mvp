import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { X, SlidersHorizontal, AlertCircle, ArrowRight } from 'lucide-react';

export function AdjustStockModal({ product, isOpen, onClose, onSuccess, showToast }) {
  const { authFetch } = useAuth();
  const [deltaStr, setDeltaStr] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen || !product) return null;

  const currentQty = product.quantity_on_hand ?? product.quantityOnHand ?? 0;
  const parsedDelta = parseInt(deltaStr, 10) || 0;
  const projectedQty = currentQty + parsedDelta;
  const isInvalidNegative = projectedQty < 0;

  const handleQuickAdd = (amount) => {
    setDeltaStr(String(amount));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (parsedDelta === 0) {
      setError('Please specify a non-zero adjustment (+N or -N units)');
      return;
    }
    if (isInvalidNegative) {
      setError(`Cannot reduce inventory by ${Math.abs(parsedDelta)}. Available stock is only ${currentQty} units.`);
      return;
    }

    try {
      setSubmitting(true);
      const res = await authFetch(`/api/products/${product.id}/adjust-stock`, {
        method: 'POST',
        body: JSON.stringify({
          delta: parsedDelta,
          note: note.trim() || undefined
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to adjust stock');
      }

      showToast(
        `Stock updated for ${product.name}: ${currentQty} → ${projectedQty} units (${parsedDelta > 0 ? '+' : ''}${parsedDelta})`,
        'success'
      );
      setDeltaStr('');
      setNote('');
      onSuccess();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 relative animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <SlidersHorizontal className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Adjust Stock</h2>
              <p className="text-xs text-slate-500 font-mono">SKU: {product.sku}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-rose-700 text-xs font-medium">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
            <span className="text-xs text-slate-500 font-medium block">Target Product</span>
            <span className="text-sm font-bold text-slate-900 block mt-0.5">{product.name}</span>

            {/* Projection indicator */}
            <div className="mt-3 flex items-center justify-between pt-3 border-t border-slate-200">
              <div>
                <span className="text-[11px] text-slate-500 block uppercase font-medium">Current Stock</span>
                <span className="text-base font-bold text-slate-800">{currentQty} units</span>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400" />
              <div>
                <span className="text-[11px] text-slate-500 block uppercase font-medium">New Stock</span>
                <span className={`text-base font-bold ${
                  isInvalidNegative ? 'text-rose-600' : projectedQty === currentQty ? 'text-slate-800' : 'text-indigo-600'
                }`}>
                  {projectedQty} units
                </span>
              </div>
            </div>
          </div>

          {/* Quick presets */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Quick Shortcuts
            </label>
            <div className="flex flex-wrap gap-1.5">
              {[1, 5, 10, 25].map(val => (
                <button
                  key={`add-${val}`}
                  type="button"
                  onClick={() => handleQuickAdd(val)}
                  className="px-2.5 py-1 text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg border border-emerald-200 transition-colors"
                >
                  +{val}
                </button>
              ))}
              {[-1, -5, -10].map(val => (
                <button
                  key={`sub-${val}`}
                  type="button"
                  onClick={() => handleQuickAdd(val)}
                  className="px-2.5 py-1 text-xs font-semibold bg-rose-50 text-rose-700 hover:bg-rose-100 rounded-lg border border-rose-200 transition-colors"
                >
                  {val}
                </button>
              ))}
            </div>
          </div>

          {/* Delta input */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Quantity Adjustment (Delta) <span className="text-rose-500">*</span>
            </label>
            <input
              type="number"
              step="1"
              placeholder="e.g. +10 or -3"
              value={deltaStr}
              onChange={(e) => setDeltaStr(e.target.value)}
              required
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
            />
            <span className="text-[11px] text-slate-400 mt-1 block">
              Enter a positive number to restock, or negative to record inventory reduction.
            </span>
          </div>

          {/* Note */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Reason / Note <span className="text-slate-400 font-normal">(optional)</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Supplier delivery, damage write-off, count correction"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
            />
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || isInvalidNegative || parsedDelta === 0}
              className="px-5 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 shadow-sm shadow-indigo-200 transition-colors disabled:opacity-50"
            >
              {submitting ? 'Applying...' : 'Apply Stock Adjustment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
