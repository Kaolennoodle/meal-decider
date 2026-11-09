import React, { useEffect, useState } from 'react';
import { Sparkles, UtensilsCrossed } from 'lucide-react';
import { getCategoryEmoji } from '../types';
import { WeightedCandidate } from '../utils/lottery';

interface SlotMachineProps {
  candidates: WeightedCandidate[];
  winner: WeightedCandidate | null;
  isSpinning: boolean;
  spinCount: number;
  activeMeal: 'lunch' | 'dinner';
  onSpinEnd: () => void;
}

const ITEM_HEIGHT = 96; // px per slot row
const TOTAL_SLOTS = 34; // total virtual items in the reel
const WINNER_INDEX = TOTAL_SLOTS - 3; // index where the reel stops

export const SlotMachine: React.FC<SlotMachineProps> = ({
  candidates,
  winner,
  isSpinning,
  spinCount,
  activeMeal,
  onSpinEnd,
}) => {
  const [reelItems, setReelItems] = useState<WeightedCandidate[]>([]);
  const [offsetY, setOffsetY] = useState<number>(0);
  const [transitionActive, setTransitionActive] = useState<boolean>(false);

  // Build reel and trigger GPU-accelerated translate3d spin when spinCount increments
  useEffect(() => {
    if (spinCount === 0 || !winner || candidates.length === 0) {
      return;
    }

    // Build a 34-item reel ending with `winner` at WINNER_INDEX
    const generated: WeightedCandidate[] = [];
    for (let i = 0; i < TOTAL_SLOTS; i++) {
      if (i === WINNER_INDEX) {
        generated.push(winner);
      } else {
        // Pick random candidate, avoiding consecutive duplicates for visual variety
        let pick = candidates[Math.floor(Math.random() * candidates.length)];
        if (candidates.length > 1 && i > 0 && pick.restaurant.id === generated[i - 1].restaurant.id) {
          const altPool = candidates.filter((c) => c.restaurant.id !== generated[i - 1].restaurant.id);
          pick = altPool[Math.floor(Math.random() * altPool.length)];
        }
        // Also avoid putting winner right before WINNER_INDEX if possible
        if (
          candidates.length > 1 &&
          i === WINNER_INDEX - 1 &&
          pick.restaurant.id === winner.restaurant.id
        ) {
          const altPool = candidates.filter((c) => c.restaurant.id !== winner.restaurant.id);
          pick = altPool[Math.floor(Math.random() * altPool.length)];
        }
        generated.push(pick);
      }
    }

    // Step 1: Instantly reset reel position without transition
    setTransitionActive(false);
    setReelItems(generated);
    setOffsetY(0);

    // Step 2: Next double-RAF frame, enable transition and translate to WINNER_INDEX
    let raf1 = 0;
    let raf2 = 0;
    raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        setTransitionActive(true);
        setOffsetY(WINNER_INDEX * ITEM_HEIGHT);
      });
    });

    const timer = window.setTimeout(() => {
      onSpinEnd();
    }, 2250);

    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
      clearTimeout(timer);
    };
  }, [spinCount]);

  const hasCandidates = candidates.length > 0;

  return (
    <div className="relative w-full">
      {/* Outer decorative Warm Bistro casing */}
      <div className="relative rounded-3xl p-3 sm:p-4 bg-gradient-to-b from-[#2E231E] via-[#231B17] to-[#1A1412] dark:from-[#261E1A] dark:to-[#14100E] shadow-[0_20px_50px_-12px_rgba(44,34,30,0.35)] border border-amber-500/20">
        {/* Top indicator lights */}
        <div className="flex items-center justify-between px-3 pb-2.5 text-xs font-medium text-amber-200/75">
          <div className="flex items-center gap-2">
            <span
              className={`inline-block w-2.5 h-2.5 rounded-full transition-colors duration-300 ${
                isSpinning
                  ? 'bg-amber-400 animate-ping'
                  : winner
                  ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]'
                  : 'bg-amber-500/50'
              }`}
            />
            <span className="tracking-wider uppercase text-[11px] text-amber-100/70">
              {activeMeal === 'lunch' ? 'LUNCH EDITION · 午间灵感' : 'DINNER EDITION · 晚间寻味'}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-amber-300/80">
            <Sparkles className="w-3.5 h-3.5" />
            <span>候选池 {candidates.length} 家</span>
          </div>
        </div>

        {/* Slot Window Viewport */}
        <div
          className="relative overflow-hidden rounded-2xl bg-[#FFFDF9] dark:bg-[#1E1916] border-2 border-amber-900/20 dark:border-amber-500/15 shadow-inner"
          style={{ height: `${ITEM_HEIGHT * 2.25}px` }}
        >
          {/* Center Selection Highlight Frame */}
          <div
            className={`pointer-events-none absolute left-2 right-2 z-20 rounded-xl border-2 transition-all duration-300 ${
              isSpinning
                ? 'border-orange-400/50 bg-orange-500/[0.03]'
                : winner
                ? 'border-orange-500 bg-orange-500/[0.05] shadow-[0_0_25px_rgba(224,90,71,0.18)]'
                : 'border-amber-900/10 dark:border-amber-100/10'
            }`}
            style={{
              height: `${ITEM_HEIGHT - 8}px`,
              top: `${(ITEM_HEIGHT * 2.25 - (ITEM_HEIGHT - 8)) / 2}px`,
            }}
          >
            {/* Left & Right pointers */}
            <div className="absolute -left-2.5 top-1/2 -translate-y-1/2 w-0 h-0 border-t-[7px] border-t-transparent border-b-[7px] border-b-transparent border-l-[9px] border-l-orange-500" />
            <div className="absolute -right-2.5 top-1/2 -translate-y-1/2 w-0 h-0 border-t-[7px] border-t-transparent border-b-[7px] border-b-transparent border-r-[9px] border-r-orange-500" />
          </div>

          {/* Top & Bottom 3D Drum Gradient Overlays (Zero filter lag) */}
          <div className="pointer-events-none absolute inset-x-0 top-0 h-14 z-10 bg-gradient-to-b from-[#FAF5EE] via-[#FAF5EE]/80 to-transparent dark:from-[#1E1916] dark:via-[#1E1916]/80" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-14 z-10 bg-gradient-to-t from-[#FAF5EE] via-[#FAF5EE]/80 to-transparent dark:from-[#1E1916] dark:via-[#1E1916]/80" />

          {/* Empty State */}
          {!hasCandidates ? (
            <div className="h-full flex flex-col items-center justify-center text-center px-6 text-stone-400 dark:text-stone-500">
              <UtensilsCrossed className="w-8 h-8 mb-2 text-orange-400/70" />
              <p className="text-sm font-medium text-stone-600 dark:text-stone-300">
                当前筛选条件下还没有可抽的餐厅
              </p>
              <p className="text-xs mt-1">
                请切换分类标签，或在选项库中添加支持「{activeMeal === 'lunch' ? '午餐' : '晚餐'}」的餐厅
              </p>
            </div>
          ) : spinCount === 0 || reelItems.length === 0 ? (
            /* Idle Ready State before first spin */
            <div className="h-full flex flex-col items-center justify-center px-6 text-center select-none">
              <div className="flex items-center gap-3 mb-1.5">
                <span className="text-3xl sm:text-4xl animate-bounce">
                  {activeMeal === 'lunch' ? '🍱' : '🍲'}
                </span>
                <span className="text-2xl sm:text-3xl font-extrabold tracking-tight text-stone-800 dark:text-stone-100">
                  今天{activeMeal === 'lunch' ? '中午' : '晚上'}吃什么？
                </span>
              </div>
              <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-400">
                点击下方按钮启动美食滚轮 · 按权重与防腻系数智能抽取
              </p>
            </div>
          ) : (
            /* GPU-Accelerated Reel Track */
            <div
              className="will-change-transform select-none"
              style={{
                paddingTop: `${(ITEM_HEIGHT * 2.25 - ITEM_HEIGHT) / 2}px`,
                transform: `translate3d(0, -${offsetY}px, 0)`,
                transition: transitionActive
                  ? 'transform 2.2s cubic-bezier(0.12, 0.85, 0.20, 1.015)'
                  : 'none',
              }}
            >
              {reelItems.map((item, idx) => {
                const isFinalWinner = !isSpinning && idx === WINNER_INDEX;
                return (
                  <div
                    key={`${item.restaurant.id}-${idx}`}
                    className="flex items-center justify-between px-5 sm:px-7"
                    style={{ height: `${ITEM_HEIGHT}px` }}
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <span
                        className={`text-3xl sm:text-4xl shrink-0 transition-transform duration-300 ${
                          isFinalWinner ? 'scale-110' : ' opacity-85'
                        }`}
                      >
                        {getCategoryEmoji(item.restaurant.category)}
                      </span>
                      <div className="min-w-0 text-left">
                        <div
                          className={`font-bold truncate transition-colors ${
                            isFinalWinner
                              ? 'text-xl sm:text-2xl text-orange-600 dark:text-orange-400'
                              : 'text-lg sm:text-xl text-stone-700 dark:text-stone-200'
                          }`}
                        >
                          {item.restaurant.name}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 text-xs text-stone-500 dark:text-stone-400 truncate">
                          <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-800 dark:text-amber-300 font-medium">
                            {item.restaurant.category}
                          </span>
                          {item.restaurant.note && (
                            <span className="truncate opacity-80">{item.restaurant.note}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="shrink-0 ml-3 text-right">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-orange-500/10 text-orange-600 dark:text-orange-300">
                        权重 {item.restaurant.weight}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
