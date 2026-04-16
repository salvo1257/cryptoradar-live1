import React, { useState } from 'react';
import { useAccess } from '../../contexts/AccessContext';
import { Lock, Unlock, Eye, EyeOff, ShieldCheck, X } from 'lucide-react';
import { Button } from '../ui/button';
import { cn } from '../../lib/utils';

export function AdminLoginModal({ isOpen, onClose }) {
  const { adminLogin, loginError } = useAccess();
  const [secretKey, setSecretKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!secretKey.trim()) return;

    setIsLoading(true);
    const result = await adminLogin(secretKey);
    setIsLoading(false);

    if (result.success) {
      setSecretKey('');
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-crypto-card border border-zinc-700/60 rounded-sm w-full max-w-md mx-4 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-700/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/20 rounded">
              <ShieldCheck className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h2 className="font-heading font-bold text-white">Admin Access</h2>
              <p className="text-xs text-zinc-400">Enter admin key to unlock</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 hover:bg-white/10 rounded transition-colors"
          >
            <X className="w-5 h-5 text-zinc-400" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="space-y-2">
            <label className="text-sm text-zinc-300 font-medium">Secret Key</label>
            <div className="relative">
              <input
                type={showKey ? 'text' : 'password'}
                value={secretKey}
                onChange={(e) => setSecretKey(e.target.value)}
                placeholder="Enter admin secret key..."
                className={cn(
                  "w-full bg-zinc-900/60 border rounded-sm px-4 py-2.5 pr-10",
                  "text-white placeholder:text-zinc-500",
                  "focus:outline-none focus:ring-1 focus:ring-amber-500/50",
                  loginError ? "border-red-500/50" : "border-zinc-700/60"
                )}
                data-testid="admin-secret-key-input"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-300"
              >
                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {loginError && (
              <p className="text-xs text-red-400">{loginError}</p>
            )}
          </div>

          <Button
            type="submit"
            disabled={isLoading || !secretKey.trim()}
            className="w-full bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border border-amber-500/30"
            data-testid="admin-login-submit"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-amber-400/30 border-t-amber-400 rounded-full animate-spin" />
                Verifying...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Unlock className="w-4 h-4" />
                Unlock Admin Access
              </span>
            )}
          </Button>
        </form>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-zinc-700/50 bg-zinc-900/30">
          <p className="text-xs text-zinc-500 text-center">
            Admin access unlocks V3 signals, backtest, settings, and analytics.
          </p>
        </div>
      </div>
    </div>
  );
}

export function AdminAccessButton() {
  const { isAdmin, adminLogout } = useAccess();
  const [showLoginModal, setShowLoginModal] = useState(false);

  if (isAdmin) {
    return (
      <button
        onClick={adminLogout}
        className="flex items-center gap-2 px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 rounded-sm border border-amber-500/30 text-xs font-medium transition-colors"
        data-testid="admin-logout-btn"
      >
        <ShieldCheck className="w-3.5 h-3.5" />
        ADMIN
      </button>
    );
  }

  return (
    <>
      <button
        onClick={() => setShowLoginModal(true)}
        className="flex items-center gap-2 px-3 py-1.5 bg-zinc-800/60 hover:bg-zinc-700/60 text-zinc-400 hover:text-zinc-300 rounded-sm border border-zinc-700/50 text-xs font-medium transition-colors"
        data-testid="admin-login-btn"
      >
        <Lock className="w-3.5 h-3.5" />
        Admin
      </button>
      <AdminLoginModal 
        isOpen={showLoginModal} 
        onClose={() => setShowLoginModal(false)} 
      />
    </>
  );
}
