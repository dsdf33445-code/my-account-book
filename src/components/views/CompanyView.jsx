import React, { useMemo, memo } from 'react';
import { Plus, List, PieChart as PieChartIcon, Pencil, Trash2 } from 'lucide-react';
import { ActionButton, Card, DonutChart } from '../UI';
import { COMPANY_CAPITAL } from '../../constants';

const CompanyView = memo(function CompanyView({ 
  companyTx, 
  selectedMonth, 
  setSelectedMonth, 
  companySubTab, 
  setCompanySubTab, 
  showCompanyChart, 
  setShowCompanyChart,
  onAddClick,
  onEditClick,
  onDeleteClick
}) {
  
  // 優化 1: 計算總資產 (依賴 companyTx)
  const currentAssets = useMemo(() => {
    const allTimeAssetGain = companyTx
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + (Number(t.surplus !== undefined ? t.surplus : t.netAmount) || 0), 0);
      
    const allTimeExpense = companyTx
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
      
    return COMPANY_CAPITAL + allTimeAssetGain - allTimeExpense;
  }, [companyTx]);

  // 優化 2: 篩選本月資料 (依賴 companyTx, selectedMonth)
  const filteredTx = useMemo(() => {
    return companyTx.filter(tx => tx.date.startsWith(selectedMonth));
  }, [companyTx, selectedMonth]);
  
  // 優化 3: 計算本月營收與支出 (依賴 filteredTx)
  const { monthlyRevenue, monthlyExpense } = useMemo(() => {
    const revenue = filteredTx
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + (Number(t.rawAmount || t.netAmount) || 0), 0);
      
    const expense = filteredTx
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
      
    return { monthlyRevenue: revenue, monthlyExpense: expense };
  }, [filteredTx]);

  // 優化 4: 圖表數據 (依賴 filteredTx, companySubTab)
  const chartData = useMemo(() => {
    const targetTx = filteredTx.filter(t => t.type === companySubTab);
    const categoryMap = {};
    targetTx.forEach(tx => {
      const amt = companySubTab === 'income' ? (tx.rawAmount || tx.netAmount) : tx.amount;
      categoryMap[tx.item] = (categoryMap[tx.item] || 0) + Number(amt);
    });
    return Object.keys(categoryMap).map(k => ({ label: k, value: categoryMap[k] })).sort((a,b) => b.value - a.value);
  }, [filteredTx, companySubTab]);

  return (
    <div className="space-y-4 pb-24">
      {/* Date Filter */}
      <div className="flex justify-between items-center bg-white p-2 rounded-2xl shadow-sm border border-stone-100">
         <span className="text-sm font-bold text-stone-500 pl-2">月份篩選</span>
         <input 
           type="month" 
           value={selectedMonth} 
           onChange={e => setSelectedMonth(e.target.value)} 
           className="bg-stone-50 border-none text-stone-700 font-bold rounded-xl px-3 py-1 text-sm focus:ring-2 focus:ring-emerald-200"
         />
      </div>

      {/* Asset Card */}
      <div className="bg-gradient-to-br from-emerald-600 to-teal-700 rounded-3xl p-6 text-white shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full -mr-10 -mt-10 blur-2xl"></div>
        <div className="relative z-10">
          <p className="text-emerald-100 text-sm font-medium mb-1">公司總資產 (含資本額+盈餘)</p>
          <h1 className="text-4xl font-bold tracking-tight">${currentAssets.toLocaleString()}</h1>
          <div className="mt-4 flex gap-4 text-sm opacity-90 pt-2 border-t border-emerald-500/30">
            <div><span className="block text-emerald-200 text-xs">本月營收</span><span className="font-bold">+${monthlyRevenue.toLocaleString()}</span></div>
            <div className="w-px bg-emerald-500 h-8 self-center"></div>
            <div><span className="block text-emerald-200 text-xs">本月支出</span><span className="font-bold">-${monthlyExpense.toLocaleString()}</span></div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-stone-200 p-1 rounded-2xl">
        <button onClick={() => setCompanySubTab('income')} className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all ${companySubTab === 'income' ? 'bg-white text-emerald-700 shadow-sm' : 'text-stone-500'}`}>收入紀錄</button>
        <button onClick={() => setCompanySubTab('expense')} className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all ${companySubTab === 'expense' ? 'bg-white text-rose-600 shadow-sm' : 'text-stone-500'}`}>支出紀錄</button>
      </div>

      {/* Controls */}
      <div className="flex justify-between items-center">
          <button onClick={() => setShowCompanyChart(!showCompanyChart)} className={`p-2 rounded-xl text-sm font-bold flex items-center gap-1 ${showCompanyChart ? 'bg-emerald-100 text-emerald-700' : 'bg-white text-stone-500 border border-stone-200'}`}>{showCompanyChart ? <List size={16}/> : <PieChartIcon size={16}/>} {showCompanyChart ? '列表' : '分析'}</button>
         <ActionButton onClick={onAddClick} variant={companySubTab === 'income' ? 'primary' : 'danger'} className="!rounded-xl text-sm"><Plus size={16}/> 新增</ActionButton>
      </div>

      {/* Content List/Chart */}
      {showCompanyChart ? <Card><h3 className="font-bold text-stone-700 mb-4 text-center">{companySubTab === 'income' ? '收入' : '支出'}分佈 ({selectedMonth})</h3><DonutChart data={chartData} /></Card> : 
        <div className="space-y-3">
          {filteredTx.filter(t => t.type === companySubTab).map(tx => (
            <Card key={tx.id} className="!p-4 flex justify-between items-center">
                <div className="flex gap-3 items-center">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${companySubTab === 'income' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-500'}`}>{companySubTab === 'income' ? '$' : '💸'}</div>
                  <div><div className="font-bold text-stone-700">{tx.item}</div><div className="text-xs text-stone-400">{tx.date}</div></div>
                </div>
                <div className="text-right">
                  <div className={`font-bold ${companySubTab === 'income' ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {companySubTab === 'income' ? '+' : '-'}${Number(companySubTab === 'income' ? (tx.rawAmount || tx.netAmount) : tx.amount).toLocaleString()}
                  </div>
                  {companySubTab === 'income' && (
                     <div className="text-[10px] text-stone-400 flex flex-col items-end">
                        {tx.surplus !== undefined && <span>保留盈餘 +${tx.surplus}</span>}
                        {tx.tax > 0 && <span>含稅 ${tx.tax}</span>}
                     </div>
                  )}
                  <div className="flex justify-end gap-1 mt-1">
                    <button type="button" onClick={() => onEditClick(tx, companySubTab)} className="text-stone-300 hover:text-emerald-500 text-xs p-1"><Pencil size={14}/></button>
                    <button type="button" onClick={() => onDeleteClick('company_tx', tx.id)} className="text-stone-300 hover:text-red-500 text-xs p-1"><Trash2 size={14}/></button>
                  </div>
                </div>
            </Card>
          ))}
          {filteredTx.filter(t => t.type === companySubTab).length === 0 && <div className="text-center py-8 text-stone-400">本月沒有紀錄 🍃</div>}
        </div>
      }
    </div>
  );
});

export default CompanyView;