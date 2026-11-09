import { Restaurant } from '../types';

export interface WeightedCandidate {
  restaurant: Restaurant;
  baseWeight: number;
  cooldownFactor: number;
  effectiveWeight: number;
  probability: number;
  cooldownLabel: string | null;
}

/**
 * Calculates the cooldown factor based on when the restaurant was last eaten.
 * - Eaten within 24 hours: 0.1x weight (90% reduction)
 * - Eaten within 24-48 hours: 0.4x weight (60% reduction)
 * - Eaten within 48-72 hours: 0.7x weight (30% reduction)
 * - More than 72 hours or never: 1.0x weight
 */
export function getCooldownInfo(
  lastEatenAt: string | null,
  antiRepeatEnabled: boolean
): { factor: number; label: string | null } {
  if (!lastEatenAt) {
    return { factor: 1, label: null };
  }

  const eatenTime = new Date(lastEatenAt).getTime();
  if (Number.isNaN(eatenTime)) {
    return { factor: 1, label: null };
  }

  const hoursAgo = (Date.now() - eatenTime) / (1000 * 60 * 60);
  if (hoursAgo < 0) {
    return { factor: 1, label: null };
  }

  if (hoursAgo < 24) {
    return {
      factor: antiRepeatEnabled ? 0.1 : 1,
      label: hoursAgo < 1 ? '刚刚吃过' : `${Math.floor(hoursAgo)}小时前吃过`,
    };
  }
  if (hoursAgo < 48) {
    return {
      factor: antiRepeatEnabled ? 0.4 : 1,
      label: '昨天吃过',
    };
  }
  if (hoursAgo < 72) {
    return {
      factor: antiRepeatEnabled ? 0.7 : 1,
      label: '前天吃过',
    };
  }

  const daysAgo = Math.floor(hoursAgo / 24);
  return {
    factor: 1,
    label: daysAgo <= 14 ? `${daysAgo}天前吃过` : null,
  };
}

export function computeCandidates(
  restaurants: Restaurant[],
  activeMeal: 'lunch' | 'dinner',
  selectedCategory: string,
  antiRepeatEnabled: boolean
): WeightedCandidate[] {
  const filtered = restaurants.filter((r) => {
    if (!r.enabled) return false;
    const matchesMeal = r.meal_time === 'both' || r.meal_time === activeMeal;
    if (!matchesMeal) return false;
    const matchesCategory = selectedCategory === '全部' || r.category === selectedCategory;
    return matchesCategory;
  });

  const rawList = filtered.map((restaurant) => {
    const baseWeight = Math.max(1, Math.min(10, restaurant.weight));
    const { factor, label } = getCooldownInfo(restaurant.last_eaten_at, antiRepeatEnabled);
    const effectiveWeight = Number((baseWeight * factor).toFixed(2));
    return {
      restaurant,
      baseWeight,
      cooldownFactor: factor,
      effectiveWeight,
      probability: 0,
      cooldownLabel: label,
    };
  });

  const totalWeight = rawList.reduce((acc, item) => acc + item.effectiveWeight, 0);

  return rawList.map((item) => ({
    ...item,
    probability: totalWeight > 0 ? item.effectiveWeight / totalWeight : 0,
  }));
}

/**
 * Picks one candidate using weighted random selection.
 * Optionally lowers the immediate previous pick's weight if there are >1 candidates
 * so clicking "Re-draw" feels responsive and rarely lands on the exact same item twice in a row.
 */
export function pickWeightedRandom(
  candidates: WeightedCandidate[],
  excludeImmediateId?: number | null
): WeightedCandidate | null {
  if (candidates.length === 0) return null;
  if (candidates.length === 1) return candidates[0];

  const adjusted = candidates.map((c) => ({
    candidate: c,
    weight:
      excludeImmediateId && c.restaurant.id === excludeImmediateId
        ? c.effectiveWeight * 0.15
        : c.effectiveWeight,
  }));

  const total = adjusted.reduce((sum, item) => sum + item.weight, 0);
  if (total <= 0) {
    return candidates[Math.floor(Math.random() * candidates.length)];
  }

  let threshold = Math.random() * total;
  for (const item of adjusted) {
    threshold -= item.weight;
    if (threshold <= 0) {
      return item.candidate;
    }
  }

  return adjusted[adjusted.length - 1].candidate;
}
