export type MealTime = 'lunch' | 'dinner' | 'both';

export interface Restaurant {
  id: number;
  name: string;
  meal_time: MealTime;
  weight: number;
  category: string;
  note: string;
  enabled: number;
  last_eaten_at: string | null;
  eat_count: number;
  created_at: string;
}

export interface MealHistoryItem {
  id: number;
  restaurant_id: number;
  restaurant_name: string;
  category: string;
  meal_type: 'lunch' | 'dinner';
  chosen_at: string;
}

export const CATEGORIES = [
  '全部',
  '正餐',
  '面食粉类',
  '快餐简餐',
  '小吃夜宵',
  '火锅烤肉',
  '轻食沙拉',
  '异国料理',
] as const;

export const CATEGORY_EMOJI: Record<string, string> = {
  全部: '🍽️',
  正餐: '🥘',
  面食粉类: '🍜',
  快餐简餐: '🍱',
  小吃夜宵: '🍢',
  火锅烤肉: '🍲',
  轻食沙拉: '🥗',
  异国料理: '🍣',
};

export function getCategoryEmoji(category: string): string {
  return CATEGORY_EMOJI[category] || '🍴';
}
