// src/constants.js

export const COMPANY_CAPITAL = 500000;

export const INCOME_CATEGORIES = ['冠智薪資', 'KOL行銷費', '發票費', '其他'];

// 修改：刪除了 'KOL薪資' 和 '行銷部薪資'
export const EXPENSE_CATEGORIES = ['冠智生活費', '毓萱生活費', '會計費', '稅金', '其他'];

export const DAILY_CATEGORIES = [
  '房租', '水費', '電費', '網路費', '機車保險', '機車保養', 
  '汽車停車位', '汽車保養', '汽車保險', '汽車牌照稅', '汽車燃料稅', 
  '個人保險費', '生活用品費', '餐費', '貓咪費用', '保養費', '其他'
];

export const FIXED_EXPENSE_DEFAULTS = [
  { label: '房租', default: 0 },
  { label: '水費', default: 0 },
  { label: '電費', default: 0 },
  { label: '網路費', default: 0 },
  { label: '管理費', default: 0 },
  { label: '機車保險', default: 0 },
  { label: '汽車保險', default: 0 },
  { label: '個人保險', default: 0 },
];

export const CHART_COLORS = ['#10B981', '#F59E0B', '#3B82F6', '#EF4444', '#8B5CF6', '#EC4899', '#6366F1', '#14B8A6'];