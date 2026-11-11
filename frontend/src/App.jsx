import React, { useState } from 'react';
import { useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { Dashboard } from './components/Dashboard';
import { ProductList } from './components/ProductList';
import { Settings } from './components/Settings';
import { AuthPage } from './components/AuthPage';
import { ProductModal } from './components/ProductModal';
import { AdjustStockModal } from './components/AdjustStockModal';
import { DeleteConfirmModal } from './components/DeleteConfirmModal';
import { Toast } from './components/Toast';
import { RefreshCw } from 'lucide-react';

export default function App() {
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard' | 'products' | 'settings'

  // Modals state
  const [productModalState, setProductModalState] = useState({ isOpen: false, product: null, onRefresh: null });
  const [adjustStockModalState, setAdjustStockModalState] = useState({ isOpen: false, product: null, onRefresh: null });
  const [deleteModalState, setDeleteModalState] = useState({ isOpen: false, product: null, onRefresh: null });

  // Toast state
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3 text-slate-500">
          <RefreshCw className="w-8 h-8 animate-spin text-indigo-600" />
          <p className="text-sm font-semibold tracking-wide">Initializing StockFlow session...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <>
        <AuthPage showToast={showToast} />
        <Toast toast={toast} onDismiss={() => setToast(null)} />
      </>
    );
  }

  // Modal handlers
  const handleOpenCreateProduct = () => {
    setProductModalState({
      isOpen: true,
      product: null,
      onRefresh: () => {
        // If we're on dashboard or products, refresh current view
      }
    });
  };

  const handleOpenEditProduct = (product, onRefresh) => {
    setProductModalState({
      isOpen: true,
      product,
      onRefresh
    });
  };

  const handleOpenAdjustStock = (product, onRefresh) => {
    setAdjustStockModalState({
      isOpen: true,
      product,
      onRefresh
    });
  };

  const handleOpenDeleteConfirm = (product, onRefresh) => {
    setDeleteModalState({
      isOpen: true,
      product,
      onRefresh
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'dashboard' && (
          <Dashboard
            setActiveTab={setActiveTab}
            onOpenAdjustStock={handleOpenAdjustStock}
            onOpenCreateProduct={handleOpenCreateProduct}
          />
        )}

        {activeTab === 'products' && (
          <ProductList
            onOpenCreateProduct={handleOpenCreateProduct}
            onOpenEditProduct={handleOpenEditProduct}
            onOpenAdjustStock={handleOpenAdjustStock}
            onOpenDeleteConfirm={handleOpenDeleteConfirm}
          />
        )}

        {activeTab === 'settings' && (
          <Settings showToast={showToast} />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 py-4 text-center text-xs text-slate-400">
        StockFlow MVP v0.1 &bull; Multi-Tenant SaaS Inventory System
      </footer>

      {/* Modals */}
      <ProductModal
        isOpen={productModalState.isOpen}
        product={productModalState.product}
        onClose={() => setProductModalState({ isOpen: false, product: null, onRefresh: null })}
        onSuccess={() => {
          if (productModalState.onRefresh) productModalState.onRefresh();
        }}
        showToast={showToast}
      />

      <AdjustStockModal
        isOpen={adjustStockModalState.isOpen}
        product={adjustStockModalState.product}
        onClose={() => setAdjustStockModalState({ isOpen: false, product: null, onRefresh: null })}
        onSuccess={() => {
          if (adjustStockModalState.onRefresh) adjustStockModalState.onRefresh();
        }}
        showToast={showToast}
      />

      <DeleteConfirmModal
        isOpen={deleteModalState.isOpen}
        product={deleteModalState.product}
        onClose={() => setDeleteModalState({ isOpen: false, product: null, onRefresh: null })}
        onSuccess={() => {
          if (deleteModalState.onRefresh) deleteModalState.onRefresh();
        }}
        showToast={showToast}
      />

      {/* Toast Alert */}
      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
