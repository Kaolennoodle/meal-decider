import React, { useState } from 'react';
import {
  Plus,
  Search,
  Sun,
  Moon,
  Clock,
  Trash2,
  Edit3,
  Check,
  X,
  Lock,
  Unlock,
  SlidersHorizontal,
  Flame,
  Eye,
  EyeOff,
} from 'lucide-react';
import { CATEGORIES, getCategoryEmoji, MealTime, Restaurant } from '../types';

interface RestaurantManagerProps {
  restaurants: Restaurant[];
  adminPin: string | null;
  onRequestUnlock: () => void;
  onLock: () => void;
  onAdd: (data: Partial<Restaurant>) => Promise<boolean>;
  onUpdate: (id: number, data: Partial<Restaurant>) => Promise<boolean>;
  onDelete: (id: number) => Promise<boolean>;
}

const EDITABLE_CATEGORIES = CATEGORIES.filter((c) => c !== '全部');

export const RestaurantManager: React.FC<RestaurantManagerProps> = ({
  restaurants,
  adminPin,
  onRequestUnlock,
  onLock,
  onAdd,
  onUpdate,
  onDelete,
}) => {
  const [search, setSearch] = useState('');
  const [mealFilter, setMealFilter] = useState<'all' | 'lunch' | 'dinner'>('all');
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form state for Add / Edit
  const [formName, setFormName] = useState('');
  const [formMealTime, setFormMealTime] = useState<MealTime>('both');
  const [formWeight, setFormWeight] = useState<number>(6);
  const [formCategory, setFormCategory] = useState<string>('正餐');
  const [formNote, setFormNote] = useState('');

  const isUnlocked = Boolean(adminPin);

  const openAddForm = () => {
    if (!isUnlocked) {
      onRequestUnlock();
      return;
    }
    setEditingId(null);
    setFormName('');
    setFormMealTime('both');
    setFormWeight(6);
    setFormCategory('正餐');
    setFormNote('');
    setIsAdding(true);
  };

  const openEditForm = (r: Restaurant) => {
    if (!isUnlocked) {
      onRequestUnlock();
      return;
    }
    setIsAdding(false);
    setEditingId(r.id);
    setFormName(r.name);
    setFormMealTime(r.meal_time);
    setFormWeight(r.weight);
    setFormCategory(r.category);
    setFormNote(r.note);
  };

  const cancelForm = () => {
    setIsAdding(false);
    setEditingId(null);
  };

  const handleSaveNew = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;
    setSubmitting(true);
    const ok = await onAdd({
      name: formName.trim(),
      meal_time: formMealTime,
      weight: formWeight,
      category: formCategory,
      note: formNote.trim(),
      enabled: 1,
    });
    setSubmitting(false);
    if (ok) {
      setIsAdding(false);
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId === null || !formName.trim()) return;
    setSubmitting(true);
    const ok = await onUpdate(editingId, {
      name: formName.trim(),
      meal_time: formMealTime,
      weight: formWeight,
      category: formCategory,
      note: formNote.trim(),
    });
    setSubmitting(false);
    if (ok) {
      setEditingId(null);
    }
  };

  const handleQuickWeightChange = async (r: Restaurant, newWeight: number) => {
    if (!isUnlocked) {
      onRequestUnlock();
      return;
    }
    if (newWeight === r.weight) return;
    await onUpdate(r.id, { weight: newWeight });
  };

  const handleToggleEnabled = async (r: Restaurant) => {
    if (!isUnlocked) {
      onRequestUnlock();
      return;
    }
    await onUpdate(r.id, { enabled: r.enabled ? 0 : 1 });
  };

  const handleDelete = async (r: Restaurant) => {
    if (!isUnlocked) {
      onRequestUnlock();
      return;
    }
    if (!window.confirm(`确定要从选项库中删除「${r.name}」吗？`)) return;
    await onDelete(r.id);
  };

  const filteredList = restaurants.filter((r) => {
    const matchesSearch =
      !search.trim() ||
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      r.category.toLowerCase().includes(search.toLowerCase()) ||
      r.note.toLowerCase().includes(search.toLowerCase());
    if (!matchesSearch) return false;

    if (mealFilter === 'lunch') {
      return r.meal_time === 'lunch' || r.meal_time === 'both';
    }
    if (mealFilter === 'dinner') {
      return r.meal_time === 'dinner' || r.meal_time === 'both';
    }
    return true;
  });

  const renderMealBadge = (mealTime: MealTime) => {
    if (mealTime === 'lunch') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-amber-500/15 text-amber-700 dark:text-amber-300">
          <Sun className="w-3 h-3" /> 仅午餐
        </span>
      );
    }
    if (mealTime === 'dinner') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-indigo-500/15 text-indigo-700 dark:text-indigo-300">
          <Moon className="w-3 h-3" /> 仅晚餐
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
        <Clock className="w-3 h-3" /> 午/晚通用
      </span>
    );
  };

  return (
    <div className="rounded-3xl bg-white/90 dark:bg-[#231D1A]/90 border border-amber-900/10 dark:border-amber-100/10 shadow-[0_12px_40px_-15px_rgba(44,34,30,0.12)] p-5 sm:p-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-stone-200/80 dark:border-stone-800">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-orange-500/15 text-orange-600 dark:text-orange-400 flex items-center justify-center">
            <SlidersHorizontal className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold text-stone-800 dark:text-stone-100">
                餐厅选项库与权重管理
              </h2>
              <span className="text-xs px-2 py-0.5 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 font-medium">
                共 {restaurants.length} 家
              </span>
            </div>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              自由增删餐厅、设置午/晚餐营业时段与被抽中的权重（1~10）
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={isUnlocked ? onLock : onRequestUnlock}
            title={isUnlocked ? '已解锁编辑权限，点击锁定' : '点击输入口令解锁编辑'}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer ${
              isUnlocked
                ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/25'
                : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700'
            }`}
          >
            {isUnlocked ? (
              <>
                <Unlock className="w-3.5 h-3.5" />
                <span>已解锁编辑</span>
              </>
            ) : (
              <>
                <Lock className="w-3.5 h-3.5" />
                <span>解锁编辑</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={openAddForm}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold text-white bg-gradient-to-r from-orange-600 to-amber-500 hover:from-orange-500 hover:to-amber-400 shadow-sm shadow-orange-500/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>新增选项</span>
          </button>
        </div>
      </div>

      {/* Add / Edit Inline Drawer Form */}
      {(isAdding || editingId !== null) && (
        <form
          onSubmit={isAdding ? handleSaveNew : handleSaveEdit}
          className="mt-4 p-4 sm:p-5 rounded-2xl bg-amber-50/70 dark:bg-stone-900/80 border border-orange-500/25 space-y-4 animate-fadeIn"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-stone-800 dark:text-stone-100 flex items-center gap-1.5">
              <span>{isAdding ? '✨ 新增餐厅选项' : '✏️ 编辑餐厅信息'}</span>
            </h3>
            <button
              type="button"
              onClick={cancelForm}
              className="p-1 rounded-lg text-stone-400 hover:text-stone-600 dark:hover:text-stone-200"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-medium text-stone-600 dark:text-stone-300 mb-1">
                餐厅/美食名称 *
              </label>
              <input
                type="text"
                required
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="例如：阿婆牛杂煲 / 南门小吃街"
                className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-sm text-stone-800 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-orange-500/40"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-600 dark:text-stone-300 mb-1">
                所属分类
              </label>
              <select
                value={formCategory}
                onChange={(e) => setFormCategory(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-sm text-stone-800 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-orange-500/40"
              >
                {EDITABLE_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {getCategoryEmoji(cat)} {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Meal Time Selector */}
            <div>
              <label className="block text-xs font-medium text-stone-600 dark:text-stone-300 mb-1">
                营业与供应时段
              </label>
              <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-stone-200/60 dark:bg-stone-800">
                {(
                  [
                    { value: 'both', label: '全天通用' },
                    { value: 'lunch', label: '仅午餐' },
                    { value: 'dinner', label: '仅晚餐' },
                  ] as const
                ).map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setFormMealTime(opt.value)}
                    className={`py-1.5 px-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      formMealTime === opt.value
                        ? 'bg-white dark:bg-stone-700 text-orange-600 dark:text-orange-300 shadow-xs'
                        : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Weight Slider */}
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-medium text-stone-600 dark:text-stone-300">
                  抽中权重（偏好度）
                </span>
                <span className="font-bold text-orange-600 dark:text-orange-400">
                  {formWeight} / 10{' '}
                  {formWeight >= 8 ? '🔥 强烈想吃' : formWeight <= 3 ? '🧊 偶尔保底' : '👍 正常'}
                </span>
              </div>
              <input
                type="range"
                min={1}
                max={10}
                value={formWeight}
                onChange={(e) => setFormWeight(Number(e.target.value))}
                className="w-full accent-orange-500 cursor-pointer mt-1.5"
              />
              <div className="flex justify-between text-[10px] text-stone-400 mt-0.5">
                <span>1 (太远/不太爱)</span>
                <span>5 (普通)</span>
                <span>10 (最爱首选)</span>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-stone-600 dark:text-stone-300 mb-1">
              备注描述（选填：招牌菜、人均价格、距离等）
            </label>
            <input
              type="text"
              value={formNote}
              onChange={(e) => setFormNote(e.target.value)}
              placeholder="例如：人均 ¥35 · 必点招牌酸汤肥牛 · 步行 8 分钟"
              className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-sm text-stone-800 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-orange-500/40"
            />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={cancelForm}
              className="px-4 py-2 rounded-xl text-xs font-medium text-stone-600 dark:text-stone-300 bg-stone-200/70 dark:bg-stone-800 hover:bg-stone-300/70 transition-colors cursor-pointer"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-orange-600 hover:bg-orange-500 disabled:opacity-50 transition-colors cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>{submitting ? '保存中...' : '保存餐厅'}</span>
            </button>
          </div>
        </form>
      )}

      {/* Search & Filter Controls */}
      <div className="mt-4 flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索餐厅名称、分类或备注..."
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-stone-100/80 dark:bg-stone-800/70 border border-stone-200/70 dark:border-stone-700/70 text-xs sm:text-sm text-stone-800 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-orange-500/30"
          />
        </div>

        <div className="flex items-center gap-1 p-1 rounded-xl bg-stone-100 dark:bg-stone-800/90 self-start sm:self-auto">
          {(
            [
              { key: 'all', label: '全部时段' },
              { key: 'lunch', label: '🌞 午餐可吃' },
              { key: 'dinner', label: '🌙 晚餐可吃' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setMealFilter(tab.key)}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                mealFilter === tab.key
                  ? 'bg-white dark:bg-stone-700 text-orange-600 dark:text-orange-300 shadow-xs'
                  : 'text-stone-500 dark:text-stone-400 hover:text-stone-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Restaurant List */}
      <div className="mt-4 space-y-2.5 max-h-[520px] overflow-y-auto pr-1">
        {filteredList.length === 0 ? (
          <div className="py-12 text-center text-stone-400 dark:text-stone-500 text-sm">
            没有找到匹配的餐厅选项
          </div>
        ) : (
          filteredList.map((r) => (
            <div
              key={r.id}
              className={`group rounded-2xl p-3.5 sm:p-4 border transition-all ${
                r.enabled
                  ? 'bg-[#FAF7F2]/70 dark:bg-stone-900/50 border-stone-200/80 dark:border-stone-800 hover:border-orange-500/30'
                  : 'bg-stone-100/50 dark:bg-stone-900/20 border-stone-200/40 dark:border-stone-800/40 opacity-60'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                {/* Left Info */}
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 dark:bg-amber-500/15 flex items-center justify-center text-xl shrink-0">
                    {getCategoryEmoji(r.category)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-sm sm:text-base text-stone-800 dark:text-stone-100 truncate">
                        {r.name}
                      </span>
                      {renderMealBadge(r.meal_time)}
                      <span className="px-2 py-0.5 rounded-md text-[11px] bg-stone-200/70 dark:bg-stone-800 text-stone-600 dark:text-stone-300">
                        {r.category}
                      </span>
                      {!r.enabled && (
                        <span className="px-2 py-0.5 rounded-md text-[11px] bg-stone-300 dark:bg-stone-700 text-stone-600 dark:text-stone-300">
                          已暂停抽取
                        </span>
                      )}
                    </div>
                    {r.note && (
                      <p className="text-xs text-stone-500 dark:text-stone-400 mt-1 line-clamp-1">
                        {r.note}
                      </p>
                    )}
                  </div>
                </div>

                {/* Right Controls: Weight Quick Adjust + Actions */}
                <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-stone-200/60 dark:border-stone-800/60 shrink-0">
                  {/* Quick Weight Control */}
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 text-xs font-semibold text-orange-600 dark:text-orange-400 min-w-[62px]">
                      <Flame className="w-3.5 h-3.5 fill-orange-500/20" />
                      <span>权重 {r.weight}</span>
                    </div>
                    <input
                      type="range"
                      min={1}
                      max={10}
                      value={r.weight}
                      onChange={(e) => handleQuickWeightChange(r, Number(e.target.value))}
                      title={
                        isUnlocked
                          ? `拖动修改「${r.name}」的抽中权重`
                          : '点击或拖动将提示解锁编辑权限'
                      }
                      className="w-20 sm:w-24 accent-orange-500 cursor-pointer"
                    />
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleToggleEnabled(r)}
                      title={r.enabled ? '暂停该餐厅参与抽奖' : '恢复该餐厅参与抽奖'}
                      className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-200/60 dark:hover:bg-stone-800 transition-colors cursor-pointer"
                    >
                      {r.enabled ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => openEditForm(r)}
                      title="编辑详情"
                      className="p-1.5 rounded-lg text-stone-400 hover:text-orange-600 dark:hover:text-orange-400 hover:bg-orange-500/10 transition-colors cursor-pointer"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(r)}
                      title="删除餐厅"
                      className="p-1.5 rounded-lg text-stone-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
