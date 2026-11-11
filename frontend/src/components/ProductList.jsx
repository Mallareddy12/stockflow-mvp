import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Package, 
  Search, 
  Plus, 
  SlidersHorizontal, 
  Edit3, 
  Trash2, 
  AlertTriangle, 
  CheckCircle,
  RefreshCw
} from 'lucide-react';

export function ProductList({ 
  onOpenCreateProduct, 
  onOpenEditProduct, 
  onOpenAdjustStock, 
  onOpenDeleteConfirm 
}) {
  const { authFetch } = useAuth();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState(null);

  const fetchProducts = async (query = '') => {
    try {
      setLoading(true);
      setError(null);
      const url = query ? `/api/products?search=${encodeURIComponent(query)}` : '/api/products';
      const res = await authFetch(url);
      if (!res.ok) throw new Error('Failed to load products');
      const data = await res.json();
      setProducts(data.products || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchProducts(searchTerm);
    }, 250);
    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Products & Inventory</h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage your catalog items, track stock quantities, and adjust on-hand inventory
          </p>
        </div>
        <button
          onClick={onOpenCreateProduct}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 shadow-sm shadow-indigo-200 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Product
        </button>
      </div>

      {/* Search and Filters Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-96">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name or SKU..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 font-bold"
            >
              ✕
            </button>
          )}
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
          <span className="text-xs text-slate-500 font-medium">
            Showing <strong className="text-slate-800">{products.length}</strong> items
          </span>
          <button
            onClick={() => fetchProducts(searchTerm)}
            title="Refresh list"
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-indigo-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* Products Table Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {error && (
          <div className="p-4 bg-rose-50 border-b border-rose-200 text-rose-700 text-sm">
            {error}
          </div>
        )}

        {loading && products.length === 0 ? (
          <div className="p-16 text-center text-slate-500">
            <RefreshCw className="w-8 h-8 animate-spin text-indigo-600 mx-auto mb-2" />
            <p className="text-sm font-medium">Loading products...</p>
          </div>
        ) : products.length === 0 ? (
          <div className="p-16 text-center">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-3">
              <Package className="w-6 h-6" />
            </div>
            <h3 className="text-base font-semibold text-slate-900">
              {searchTerm ? 'No products match your search' : 'No products in inventory yet'}
            </h3>
            <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">
              {searchTerm 
                ? `Try searching for another keyword or clear the search input.`
                : `Create your first product to start tracking your inventory quantities and prices.`}
            </p>
            {!searchTerm && (
              <button
                onClick={onOpenCreateProduct}
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 shadow-sm transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Your First Product
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 uppercase text-[11px] font-semibold tracking-wider">
                <tr>
                  <th className="px-6 py-3.5">Product</th>
                  <th className="px-6 py-3.5">SKU</th>
                  <th className="px-6 py-3.5 text-right">Quantity</th>
                  <th className="px-6 py-3.5 text-center">Stock Status</th>
                  <th className="px-6 py-3.5 text-right">Cost Price</th>
                  <th className="px-6 py-3.5 text-right">Selling Price</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {products.map((product) => (
                  <tr key={product.id} className="hover:bg-slate-50/70 transition-colors">
                    {/* Name & Description */}
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-900">{product.name}</div>
                      {product.description && (
                        <div className="text-xs text-slate-400 truncate max-w-xs mt-0.5">
                          {product.description}
                        </div>
                      )}
                    </td>

                    {/* SKU */}
                    <td className="px-6 py-4 font-mono text-xs">
                      <span className="bg-slate-100 text-slate-700 px-2.5 py-1 rounded-md font-semibold border border-slate-200">
                        {product.sku}
                      </span>
                    </td>

                    {/* Quantity */}
                    <td className="px-6 py-4 text-right">
                      <span className="text-base font-bold text-slate-900">
                        {product.quantity_on_hand}
                      </span>
                      <span className="text-xs text-slate-400 ml-1">units</span>
                    </td>

                    {/* Low Stock Indicator */}
                    <td className="px-6 py-4 text-center">
                      {product.is_low_stock ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                          <AlertTriangle className="w-3 h-3 text-rose-500" />
                          Low Stock (≤{product.effective_threshold})
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle className="w-3 h-3 text-emerald-500" />
                          In Stock (&gt;{product.effective_threshold})
                        </span>
                      )}
                    </td>

                    {/* Cost Price */}
                    <td className="px-6 py-4 text-right text-slate-600 font-medium">
                      {product.cost_price !== null && product.cost_price !== undefined
                        ? `$${Number(product.cost_price).toFixed(2)}`
                        : <span className="text-slate-300">—</span>}
                    </td>

                    {/* Selling Price */}
                    <td className="px-6 py-4 text-right text-slate-900 font-semibold">
                      {product.selling_price !== null && product.selling_price !== undefined
                        ? `$${Number(product.selling_price).toFixed(2)}`
                        : <span className="text-slate-300">—</span>}
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => onOpenAdjustStock(product, () => fetchProducts(searchTerm))}
                          title="Quick stock adjustment (+/- N units)"
                          className="p-1.5 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-lg transition-colors border border-transparent hover:border-indigo-100"
                        >
                          <SlidersHorizontal className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onOpenEditProduct(product, () => fetchProducts(searchTerm))}
                          title="Edit product"
                          className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors border border-transparent hover:border-slate-200"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onOpenDeleteConfirm(product, () => fetchProducts(searchTerm))}
                          title="Delete product"
                          className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors border border-transparent hover:border-rose-100"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
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
