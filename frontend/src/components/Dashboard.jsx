import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Package, 
  Layers, 
  AlertTriangle, 
  TrendingUp, 
  Plus, 
  SlidersHorizontal,
  ArrowRight,
  RefreshCw,
  CheckCircle2
} from 'lucide-react';

export function Dashboard({ setActiveTab, onOpenAdjustStock, onOpenCreateProduct }) {
  const { authFetch } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await authFetch('/api/dashboard');
      if (!res.ok) throw new Error('Failed to load dashboard metrics');
      const json = await res.json();
      setData(json);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3 text-slate-500">
          <RefreshCw className="w-8 h-8 animate-spin text-indigo-600" />
          <p className="text-sm font-medium">Loading inventory dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-sm">
        <p className="font-semibold">Unable to load dashboard data</p>
        <p className="mt-1">{error}</p>
        <button
          onClick={fetchDashboardData}
          className="mt-3 px-3 py-1.5 bg-rose-600 text-white rounded-lg text-xs font-medium hover:bg-rose-700"
        >
          Try Again
        </button>
      </div>
    );
  }

  const { summary, lowStockItems } = data || { summary: {}, lowStockItems: [] };

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Inventory Dashboard</h1>
          <p className="text-sm text-slate-500 mt-1">
            Real-time stock summary for <span className="font-semibold text-slate-800">{summary.organizationName}</span>
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchDashboardData}
            title="Refresh metrics"
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={onOpenCreateProduct}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 shadow-sm shadow-indigo-200 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Product
          </button>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Products */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Products</span>
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Package className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-extrabold text-slate-900">{summary.totalProducts ?? 0}</span>
            <span className="text-xs text-slate-400 ml-2">SKUs</span>
          </div>
          <p className="mt-2 text-xs text-slate-500 flex items-center justify-between">
            <span>Catalog items</span>
            <button
              onClick={() => setActiveTab('products')}
              className="text-indigo-600 hover:text-indigo-700 font-medium inline-flex items-center gap-1"
            >
              View list <ArrowRight className="w-3 h-3" />
            </button>
          </p>
        </div>

        {/* Total Quantity */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Units on Hand</span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Layers className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-extrabold text-slate-900">{summary.totalQuantity ?? 0}</span>
            <span className="text-xs text-slate-400 ml-2">total units</span>
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Across all active catalog items
          </p>
        </div>

        {/* Low Stock Items */}
        <div className={`bg-white p-5 rounded-2xl border shadow-sm hover:shadow-md transition-shadow ${
          summary.lowStockCount > 0 ? 'border-amber-300 ring-1 ring-amber-100' : 'border-slate-200'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Low Stock Alert</span>
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
              summary.lowStockCount > 0 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-50 text-emerald-600'
            }`}>
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className={`text-3xl font-extrabold ${
              summary.lowStockCount > 0 ? 'text-amber-600' : 'text-emerald-600'
            }`}>
              {summary.lowStockCount ?? 0}
            </span>
            <span className="text-xs text-slate-400 ml-2">items below threshold</span>
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Default threshold: <span className="font-semibold text-slate-700">{summary.defaultLowStockThreshold} units</span>
          </p>
        </div>

        {/* Inventory Value */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Inventory Valuation</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-extrabold text-slate-900">
              ${Number(summary.totalInventoryValue || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Calculated from unit cost prices
          </p>
        </div>
      </div>

      {/* Low Stock Items Section (FR-6) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse"></div>
            <h2 className="text-base font-bold text-slate-900">Low Stock Items Requiring Restock</h2>
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
              {lowStockItems.length}
            </span>
          </div>
          <div className="text-xs text-slate-500">
            Threshold: Product-specific, or org default ({summary.defaultLowStockThreshold})
          </div>
        </div>

        {lowStockItems.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-semibold text-slate-800">All inventory levels are healthy!</h3>
            <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">
              No products are currently at or below their low-stock thresholds.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 uppercase text-[11px] font-semibold tracking-wider">
                <tr>
                  <th className="px-6 py-3.5">Product Name</th>
                  <th className="px-6 py-3.5">SKU</th>
                  <th className="px-6 py-3.5 text-right">Quantity on Hand</th>
                  <th className="px-6 py-3.5 text-right">Low Stock Threshold</th>
                  <th className="px-6 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {lowStockItems.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4 font-semibold text-slate-900">
                      {item.name}
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-slate-600">
                      <span className="bg-slate-100 px-2 py-1 rounded border border-slate-200">
                        {item.sku}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                        <AlertTriangle className="w-3 h-3 text-rose-500" />
                        {item.quantityOnHand} units
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right text-slate-600">
                      <span className="text-xs font-medium">
                        {item.effectiveThreshold}
                        {item.lowStockThreshold === null && (
                          <span className="text-[10px] text-slate-400 block font-normal">(org default)</span>
                        )}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => onOpenAdjustStock(item, fetchDashboardData)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 transition-colors"
                      >
                        <SlidersHorizontal className="w-3.5 h-3.5" />
                        Adjust Stock
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
