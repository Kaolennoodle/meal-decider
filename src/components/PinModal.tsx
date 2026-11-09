import React, { useState } from 'react';
import { Lock, KeyRound, X, CheckCircle2, AlertCircle } from 'lucide-react';

interface PinModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (pin: string) => void;
}

export const PinModal: React.FC<PinModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = pin.trim();
    if (!trimmed) {
      setError('请输入管理口令');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/verify-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: trimmed }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error || '口令验证失败');
      } else {
        onSuccess(trimmed);
        setPin('');
      }
    } catch {
      setError('网络请求异常，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/60 backdrop-blur-xs animate-fadeIn">
      <div className="relative w-full max-w-sm rounded-3xl bg-[#FFFDF9] dark:bg-[#241E1B] border border-amber-900/15 dark:border-amber-200/10 p-6 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 p-2 rounded-full text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 hover:bg-stone-200/50 dark:hover:bg-stone-800 transition-colors"
          aria-label="关闭"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex flex-col items-center text-center">
          <div className="w-12 h-12 rounded-2xl bg-orange-500/15 text-orange-600 dark:text-orange-400 flex items-center justify-center mb-3">
            <Lock className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-stone-800 dark:text-stone-100">
            解锁选项库编辑权限
          </h3>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
            输入管理口令以新增、修改或调整餐厅权重（验证后将保存在当前浏览器）
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div className="relative">
            <KeyRound className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="password"
              inputMode="text"
              autoFocus
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="输入管理 PIN 码 (默认 8888)"
              className="w-full pl-10 pr-4 py-3 rounded-xl bg-stone-100/90 dark:bg-stone-900/80 border border-stone-200 dark:border-stone-700 text-stone-800 dark:text-stone-100 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 transition-all"
            />
          </div>

          {error && (
            <div className="flex items-center gap-1.5 text-xs text-red-600 dark:text-red-400 bg-red-500/10 px-3 py-2 rounded-lg">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 px-4 rounded-xl text-sm font-medium text-stone-600 dark:text-stone-300 bg-stone-200/60 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 px-4 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-orange-600 to-amber-500 hover:from-orange-500 hover:to-amber-400 shadow-md shadow-orange-500/20 disabled:opacity-50 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{loading ? '验证中...' : '确认解锁'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
