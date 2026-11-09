import React, { useCallback, useEffect, useMemo, useState } from 'react';
import confetti from 'canvas-confetti';
import {
  Sun,
  Moon,
  Dices,
  RotateCcw,
  Check,
  Sparkles,
  History,
  ShieldCheck,
  Utensils,
  Flame,
  Info,
  Trash2,
} from 'lucide-react';
import { CATEGORIES, getCategoryEmoji, MealHistoryItem, Restaurant } from './types';
import { computeCandidates, pickWeightedRandom, WeightedCandidate } from './utils/lottery';
import { SlotMachine } from './components/SlotMachine';
import { RestaurantManager } from './components/RestaurantManager';
import { PinModal } from './components/PinModal';

const PIN_STORAGE_KEY = 'meal_decider_admin_pin';
const THEME_STORAGE_KEY = 'meal_decider_theme';

export function App() {
  // Automatically pick lunch before 15:00, dinner at or after 15:00
  const [activeMeal, setActiveMeal] = useState<'lunch' | 'dinner'>(() => {
    const hour = new Date().getHours();
    return hour < 15 ? 'lunch' : 'dinner';
  });

  const [selectedCategory, setSelectedCategory] = useState<string>('全部');
  const [antiRepeatEnabled, setAntiRepeatEnabled] = useState<boolean>(true);
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === 'dark') return true;
    if (saved === 'light') return false;
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [history, setHistory] = useState<MealHistoryItem[]>([]);
  const [loadingData, setLoadingData] = useState<boolean>(true);

  // Lottery state
  const [winner, setWinner] = useState<WeightedCandidate | null>(null);
  const [isSpinning, setIsSpinning] = useState<boolean>(false);
  const [spinCount, setSpinCount] = useState<number>(0);
  const [confirmedChoiceId, setConfirmedChoiceId] = useState<number | null>(null);
  const [confirming, setConfirming] = useState<boolean>(false);

  // Admin PIN state
  const [adminPin, setAdminPin] = useState<string | null>(() =>
    localStorage.getItem(PIN_STORAGE_KEY)
  );
  const [pinModalOpen, setPinModalOpen] = useState<boolean>(false);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 2800);
    return () => clearTimeout(t);
  }, [toast]);

  // Apply dark mode class to <html>
  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
      localStorage.setItem(THEME_STORAGE_KEY, 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem(THEME_STORAGE_KEY, 'light');
    }
  }, [darkMode]);

  // Fetch initial data from Cloudflare Worker + D1
  const fetchBootstrapData = useCallback(async () => {
    try {
      setLoadingData(true);
      const res = await fetch('/api/bootstrap');
      const data = await res.json();
      if (data.ok) {
        setRestaurants(data.restaurants || []);
        setHistory(data.history || []);
      }
    } catch (err) {
      console.error('Failed to load bootstrap data:', err);
      showToast('加载数据失败，请检查网络连接');
    } finally {
      setLoadingData(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchBootstrapData();
  }, [fetchBootstrapData]);

  // Compute filtered & weighted candidates
  const candidates = useMemo(
    () => computeCandidates(restaurants, activeMeal, selectedCategory, antiRepeatEnabled),
    [restaurants, activeMeal, selectedCategory, antiRepeatEnabled]
  );

  // Trigger confetti celebration when slot stops on a winner
  const triggerCelebration = useCallback(() => {
    try {
      confetti({
        particleCount: 55,
        spread: 68,
        origin: { y: 0.58 },
        colors: ['#E05A47', '#F28444', '#FBBF24', '#34D399', '#60A5FA'],
        disableForReducedMotion: true,
      });
    } catch {
      // Ignore confetti errors in headless/restricted environments
    }
  }, []);

  // Start spinning the slot machine
  const handleDraw = () => {
    if (isSpinning || candidates.length === 0) return;

    const picked = pickWeightedRandom(candidates, winner?.restaurant.id);
    if (!picked) return;

    setConfirmedChoiceId(null);
    setWinner(picked);
    setIsSpinning(true);
    setSpinCount((c) => c + 1);
  };

  const handleSpinEnd = useCallback(() => {
    setIsSpinning(false);
    triggerCelebration();
  }, [triggerCelebration]);

  // Confirm "Eat This!" -> Saves to D1 history and updates cooldown
  const handleConfirmChoice = async () => {
    if (!winner || confirming || confirmedChoiceId === winner.restaurant.id) return;
    setConfirming(true);
    try {
      const res = await fetch('/api/choose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restaurant_id: winner.restaurant.id,
          meal_type: activeMeal,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setConfirmedChoiceId(winner.restaurant.id);
        if (data.restaurant) {
          setRestaurants((prev) =>
            prev.map((r) => (r.id === data.restaurant.id ? data.restaurant : r))
          );
        }
        if (data.history) {
          setHistory(data.history);
        }
        showToast(`🥢 祝用餐愉快！已记录「${winner.restaurant.name}」`);
      } else {
        showToast(data.error || '记录失败');
      }
    } catch {
      showToast('网络请求失败');
    } finally {
      setConfirming(false);
    }
  };

  // CRUD Handlers for RestaurantManager
  const handleAddRestaurant = async (payload: Partial<Restaurant>): Promise<boolean> => {
    if (!adminPin) {
      setPinModalOpen(true);
      return false;
    }
    try {
      const res = await fetch('/api/restaurants', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Pin': adminPin,
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.status === 401) {
        localStorage.removeItem(PIN_STORAGE_KEY);
        setAdminPin(null);
        setPinModalOpen(true);
        showToast('管理口令已失效，请重新验证');
        return false;
      }
      if (data.ok && data.restaurant) {
        setRestaurants((prev) => [data.restaurant, ...prev]);
        showToast(`✅ 已添加「${data.restaurant.name}」`);
        return true;
      }
      showToast(data.error || '添加失败');
      return false;
    } catch {
      showToast('网络错误，添加失败');
      return false;
    }
  };

  const handleUpdateRestaurant = async (
    id: number,
    payload: Partial<Restaurant>
  ): Promise<boolean> => {
    if (!adminPin) {
      setPinModalOpen(true);
      return false;
    }
    try {
      const res = await fetch(`/api/restaurants/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Pin': adminPin,
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.status === 401) {
        localStorage.removeItem(PIN_STORAGE_KEY);
        setAdminPin(null);
        setPinModalOpen(true);
        showToast('管理口令已失效，请重新验证');
        return false;
      }
      if (data.ok && data.restaurant) {
        setRestaurants((prev) => prev.map((r) => (r.id === id ? data.restaurant : r)));
        return true;
      }
      showToast(data.error || '更新失败');
      return false;
    } catch {
      showToast('网络错误，更新失败');
      return false;
    }
  };

  const handleDeleteRestaurant = async (id: number): Promise<boolean> => {
    if (!adminPin) {
      setPinModalOpen(true);
      return false;
    }
    try {
      const res = await fetch(`/api/restaurants/${id}`, {
        method: 'DELETE',
        headers: {
          'X-Admin-Pin': adminPin,
        },
      });
      const data = await res.json();
      if (res.status === 401) {
        localStorage.removeItem(PIN_STORAGE_KEY);
        setAdminPin(null);
        setPinModalOpen(true);
        return false;
      }
      if (data.ok) {
        setRestaurants((prev) => prev.filter((r) => r.id !== id));
        showToast('🗑️ 已删除该餐厅');
        return true;
      }
      return false;
    } catch {
      showToast('删除失败');
      return false;
    }
  };

  const handleClearHistory = async () => {
    if (!adminPin) {
      setPinModalOpen(true);
      return;
    }
    if (!window.confirm('确定要清空近期就餐历史并重置所有餐厅的防腻冷却吗？')) return;
    try {
      const res = await fetch('/api/history/clear', {
        method: 'POST',
        headers: { 'X-Admin-Pin': adminPin },
      });
      const data = await res.json();
      if (data.ok) {
        setHistory([]);
        setRestaurants((prev) => prev.map((r) => ({ ...r, last_eaten_at: null })));
        showToast('✨ 历史记录与防腻冷却已重置');
      }
    } catch {
      showToast('操作失败');
    }
  };

  // Switch lunch / dinner mode
  const switchMealMode = (mode: 'lunch' | 'dinner') => {
    if (isSpinning || mode === activeMeal) return;
    setActiveMeal(mode);
    setWinner(null);
    setSpinCount(0);
    setConfirmedChoiceId(null);
  };

  return (
    <div className="min-h-screen bg-[#FAF6F0] dark:bg-[#171311] text-[#2C221E] dark:text-[#F5EFEA] transition-colors duration-300">
      {/* Subtle ambient top glow */}
      <div className="pointer-events-none fixed inset-x-0 top-0 h-80 bg-gradient-to-b from-orange-400/10 via-amber-300/5 to-transparent dark:from-orange-600/10 dark:via-transparent" />

      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-2xl bg-stone-900/95 dark:bg-amber-100/95 text-white dark:text-stone-900 text-xs sm:text-sm font-medium shadow-xl animate-fadeIn">
          {toast}
        </div>
      )}

      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-30 backdrop-blur-md bg-[#FAF6F0]/80 dark:bg-[#171311]/80 border-b border-amber-900/10 dark:border-amber-100/10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center text-white shadow-md shadow-orange-500/20">
              <Utensils className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-extrabold tracking-tight leading-none">
                今天吃什么？
              </h1>
              <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-1">
                Cloudflare D1 云端同步 · 智能权重美食决策器
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Lunch / Dinner Quick Switcher */}
            <div className="flex items-center p-1 rounded-2xl bg-stone-200/75 dark:bg-stone-800/90 border border-stone-300/50 dark:border-stone-700/60">
              <button
                type="button"
                onClick={() => switchMealMode('lunch')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                  activeMeal === 'lunch'
                    ? 'bg-white dark:bg-stone-900 text-orange-600 dark:text-orange-400 shadow-xs'
                    : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
                }`}
              >
                <Sun className="w-4 h-4 text-amber-500" />
                <span>午餐</span>
              </button>
              <button
                type="button"
                onClick={() => switchMealMode('dinner')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                  activeMeal === 'dinner'
                    ? 'bg-white dark:bg-stone-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                    : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
                }`}
              >
                <Moon className="w-4 h-4 text-indigo-400" />
                <span>晚餐</span>
              </button>
            </div>

            {/* Dark Mode Toggle */}
            <button
              type="button"
              onClick={() => setDarkMode((d) => !d)}
              className="p-2.5 rounded-2xl bg-stone-200/70 dark:bg-stone-800/80 text-stone-700 dark:text-stone-200 hover:bg-stone-300/70 dark:hover:bg-stone-700 transition-colors cursor-pointer"
              title={darkMode ? '切换浅色模式' : '切换深色模式'}
              aria-label="切换主题"
            >
              {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="relative max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-start">
          {/* Left Column: Lottery Machine & Winner Card & Recent History */}
          <div className="lg:col-span-5 space-y-6">
            {/* Lottery Stage Card */}
            <section className="rounded-3xl bg-white/95 dark:bg-[#231D1A]/95 border border-amber-900/10 dark:border-amber-100/10 shadow-[0_16px_45px_-15px_rgba(44,34,30,0.14)] p-5 sm:p-6">
              {/* Top Filter Pills */}
              <div className="flex items-center justify-between gap-2 mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-stone-400 dark:text-stone-500">
                  想吃什么类型？
                </span>
                <button
                  type="button"
                  onClick={() => setAntiRepeatEnabled((v) => !v)}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors cursor-pointer ${
                    antiRepeatEnabled
                      ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                      : 'bg-stone-200/70 dark:bg-stone-800 text-stone-500'
                  }`}
                  title="开启后，最近3天吃过的餐厅被抽中的概率会自动降低"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>近期防腻降权：{antiRepeatEnabled ? '已开启' : '已关闭'}</span>
                </button>
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-4 no-scrollbar">
                {CATEGORIES.map((cat) => {
                  const active = selectedCategory === cat;
                  return (
                    <button
                      key={cat}
                      type="button"
                      disabled={isSpinning}
                      onClick={() => setSelectedCategory(cat)}
                      className={`shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                        active
                          ? 'bg-orange-600 text-white shadow-sm shadow-orange-500/25'
                          : 'bg-stone-100 dark:bg-stone-800/90 text-stone-600 dark:text-stone-300 hover:bg-stone-200/70'
                      }`}
                    >
                      <span>{getCategoryEmoji(cat)}</span>
                      <span>{cat}</span>
                    </button>
                  );
                })}
              </div>

              {/* High-Performance 60fps Slot Machine */}
              <SlotMachine
                candidates={candidates}
                winner={winner}
                isSpinning={isSpinning}
                spinCount={spinCount}
                activeMeal={activeMeal}
                onSpinEnd={handleSpinEnd}
              />

              {/* Winner Detail Card (Revealed after spin finishes) */}
              {!isSpinning && winner && (
                <div className="mt-4 p-4 rounded-2xl bg-gradient-to-br from-orange-500/[0.08] via-amber-500/[0.05] to-transparent border border-orange-500/25 animate-fadeIn">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400 flex items-center gap-1">
                          <Sparkles className="w-3.5 h-3.5" /> 天意之选
                        </span>
                        {winner.cooldownLabel && (
                          <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300">
                            {winner.cooldownLabel}
                          </span>
                        )}
                      </div>
                      <h3 className="text-xl font-extrabold text-stone-900 dark:text-white mt-1">
                        {getCategoryEmoji(winner.restaurant.category)} {winner.restaurant.name}
                      </h3>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-orange-600 dark:text-orange-300 bg-orange-500/15 px-2.5 py-1 rounded-full">
                        <Flame className="w-3.5 h-3.5" /> 命中率{' '}
                        {Math.max(1, Math.round(winner.probability * 100))}%
                      </span>
                    </div>
                  </div>

                  {winner.restaurant.note && (
                    <p className="mt-2 text-xs sm:text-sm text-stone-600 dark:text-stone-300 flex items-start gap-1.5">
                      <Info className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
                      <span>{winner.restaurant.note}</span>
                    </p>
                  )}
                </div>
              )}

              {/* Primary Action Buttons */}
              <div className="mt-5 flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  disabled={isSpinning || candidates.length === 0 || loadingData}
                  onClick={handleDraw}
                  className="flex-1 py-4 px-6 rounded-2xl font-extrabold text-base sm:text-lg text-white bg-gradient-to-r from-[#E05A47] via-[#EC6E45] to-[#F28444] hover:brightness-105 active:scale-[0.99] shadow-lg shadow-orange-500/25 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2.5 transition-all cursor-pointer"
                >
                  {isSpinning ? (
                    <>
                      <Dices className="w-6 h-6 animate-spin" />
                      <span>正在命运抽取中...</span>
                    </>
                  ) : winner ? (
                    <>
                      <RotateCcw className="w-5 h-5" />
                      <span>不满意？再抽一次</span>
                    </>
                  ) : (
                    <>
                      <Dices className="w-6 h-6" />
                      <span>今天{activeMeal === 'lunch' ? '中午' : '晚上'}吃什么？</span>
                    </>
                  )}
                </button>

                {!isSpinning && winner && (
                  <button
                    type="button"
                    disabled={confirming || confirmedChoiceId === winner.restaurant.id}
                    onClick={handleConfirmChoice}
                    className={`py-4 px-5 rounded-2xl font-bold text-sm sm:text-base flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      confirmedChoiceId === winner.restaurant.id
                        ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30'
                        : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/20'
                    }`}
                  >
                    <Check className="w-5 h-5" />
                    <span>
                      {confirmedChoiceId === winner.restaurant.id ? '已决定吃这家' : '就吃这家！'}
                    </span>
                  </button>
                )}
              </div>
            </section>

            {/* Recent Meal History Card */}
            <section className="rounded-3xl bg-white/90 dark:bg-[#231D1A]/90 border border-amber-900/10 dark:border-amber-100/10 p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <History className="w-4 h-4 text-orange-500" />
                  <h3 className="text-sm font-bold text-stone-800 dark:text-stone-100">
                    近期选定记录（防腻参考）
                  </h3>
                </div>
                {history.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearHistory}
                    className="inline-flex items-center gap-1 text-xs text-stone-400 hover:text-red-500 transition-colors cursor-pointer"
                    title="清空记录并重置冷却"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>重置</span>
                  </button>
                )}
              </div>

              {history.length === 0 ? (
                <p className="text-xs text-stone-400 dark:text-stone-500 py-3 text-center">
                  抽中心仪餐厅后点击「就吃这家！」，即可在此记录并自动开启近期防腻降权
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {history.slice(0, 8).map((item) => (
                    <div
                      key={item.id}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-100 dark:bg-stone-800/80 text-xs text-stone-700 dark:text-stone-300"
                    >
                      <span>{getCategoryEmoji(item.category)}</span>
                      <span className="font-semibold">{item.restaurant_name}</span>
                      <span className="text-[10px] text-stone-400">
                        ({item.meal_type === 'lunch' ? '午' : '晚'})
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>

          {/* Right Column: Restaurant Option Pool & Weight Manager */}
          <div className="lg:col-span-7">
            <RestaurantManager
              restaurants={restaurants}
              adminPin={adminPin}
              onRequestUnlock={() => setPinModalOpen(true)}
              onLock={() => {
                localStorage.removeItem(PIN_STORAGE_KEY);
                setAdminPin(null);
                showToast('🔒 已锁定编辑权限');
              }}
              onAdd={handleAddRestaurant}
              onUpdate={handleUpdateRestaurant}
              onDelete={handleDeleteRestaurant}
            />
          </div>
        </div>
      </main>

      {/* Admin PIN Verification Modal */}
      <PinModal
        isOpen={pinModalOpen}
        onClose={() => setPinModalOpen(false)}
        onSuccess={(verifiedPin) => {
          localStorage.setItem(PIN_STORAGE_KEY, verifiedPin);
          setAdminPin(verifiedPin);
          setPinModalOpen(false);
          showToast('🔓 验证成功！现在可以自由增删和调整餐厅权重');
        }}
      />
    </div>
  );
}
export default App;
