import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Settings as SettingsIcon, Building2, Sliders, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';

export function Settings({ showToast }) {
  const { authFetch, updateOrgInState } = useAuth();
  const [orgData, setOrgData] = useState({
    name: '',
    defaultLowStockThreshold: 5,
    createdAt: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadSettings() {
      try {
        setLoading(true);
        setError(null);
        const res = await authFetch('/api/organization');
        if (!res.ok) throw new Error('Failed to load organization settings');
        const data = await res.json();
        setOrgData(data.organization);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      setError(null);

      const res = await authFetch('/api/organization', {
        method: 'PUT',
        body: JSON.stringify({
          name: orgData.name.trim(),
          defaultLowStockThreshold: parseInt(orgData.defaultLowStockThreshold, 10)
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update settings');
      }

      updateOrgInState({
        organizationName: data.organization.name,
        defaultLowStockThreshold: data.organization.defaultLowStockThreshold
      });

      showToast('Settings saved successfully', 'success');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[350px]">
        <div className="flex flex-col items-center gap-3 text-slate-500">
          <RefreshCw className="w-8 h-8 animate-spin text-indigo-600" />
          <p className="text-sm font-medium">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Organization Settings</h1>
        <p className="text-sm text-slate-500 mt-1">
          Configure global inventory thresholds and organization preferences
        </p>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2.5 text-rose-700 text-sm font-medium">
          <AlertCircle className="w-5 h-5 shrink-0 text-rose-500" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
        {/* Organization Name */}
        <div>
          <label className="block text-sm font-semibold text-slate-800 mb-1.5 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-indigo-600" />
            Organization Name
          </label>
          <input
            type="text"
            value={orgData.name}
            onChange={(e) => setOrgData({ ...orgData, name: e.target.value })}
            required
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
          />
          <p className="text-xs text-slate-500 mt-1">
            This name identifies your tenant workspace and scopes all your products and stock levels.
          </p>
        </div>

        {/* Global Default Low Stock Threshold (FR-7) */}
        <div className="pt-4 border-t border-slate-100">
          <label className="block text-sm font-semibold text-slate-800 mb-1.5 flex items-center gap-2">
            <Sliders className="w-4 h-4 text-indigo-600" />
            Default Low Stock Threshold (Units)
          </label>
          <input
            type="number"
            min="0"
            step="1"
            value={orgData.defaultLowStockThreshold}
            onChange={(e) => setOrgData({ ...orgData, defaultLowStockThreshold: e.target.value })}
            required
            className="w-full sm:w-48 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
          />
          <div className="mt-3 p-3.5 bg-indigo-50/70 border border-indigo-100 rounded-xl text-xs text-indigo-900 leading-relaxed">
            <strong className="font-semibold">How this works (FR-7):</strong>
            <p className="mt-1 text-indigo-800">
              When creating or editing a product, you can set an individual low-stock threshold. If a product's threshold is left empty, this default value (<strong>{orgData.defaultLowStockThreshold} units</strong>) will automatically be used to classify items as "Low Stock" across your catalog and dashboard.
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 shadow-sm shadow-indigo-200 transition-colors disabled:opacity-50"
          >
            <CheckCircle2 className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </form>
    </div>
  );
}
