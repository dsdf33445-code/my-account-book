import React, { useMemo, memo } from 'react';
import { Plus, List, PieChart as PieChartIcon, Wallet, ArrowRight, Pencil, Trash2 } from 'lucide-react';
import { ActionButton, Card, DonutChart } from '../UI';

const DailyView = memo(function DailyView({
  dailyTx,
  companyTx,
  selectedMonth,
  setSelectedMonth,
  showDailyChart,
  setShowDailyChart,
  onAddClick,
  onAddFixedClick,
  onEditClick,
  onDeleteClick
}) {
  
  // 優化 1: 記憶篩選結果
  const monthlyExpenses = useMemo(() => 
    dailyTx.filter(tx => tx.date.startsWith(selectedMonth)), 
  [dailyTx, selectedMonth]);

  const monthlyIncomes = useMemo(() => 
    companyTx.filter(tx => tx.type === 'income' && tx.date.startsWith(selectedMonth)), 
  [companyTx, selectedMonth]);

  // 優化 2: 記憶金額計算
  const { totalExpense, totalIncome, balance } = useMemo(() => {
    const exp = monthlyExpenses.reduce((sum, t) => sum + Number(t.amount), 0);
    const inc = monthlyIncomes.reduce((sum, t) => sum + Number(t.netAmount || 0), 0);
    return { 
      totalExpense: exp, 
      totalIncome: inc, 
      balance: inc - exp 
    };
  }, [monthlyExpenses, monthlyIncomes]);
  
  // 優化 3: 記憶合併列表
  const combinedList = useMemo(() => {
    return [
      ...monthlyExpenses.map(t => ({ ...t, isIncome: false })),
      ...monthlyIncomes.map(t => ({ ...t, isIncome: true, amount: t.netAmount, item: `分潤: ${t.item}` }))
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [monthlyExpenses, monthlyIncomes]);

  // 優化 4: 記憶圖表數據
  const chartData = useMemo(() => {
      const categoryMap = {};
      monthlyExpenses.forEach(tx => { categoryMap[tx.item] = (categoryMap[tx.item] || 0) + Number(tx.amount); });
      return Object.keys(categoryMap).map(k => ({ label: k, value: categoryMap[k] })).sort((a,b) => b.value - a.value);
  }, [monthlyExpenses]);

  return (
    <div className="space-y-4 pb-24">
       {/* 月份篩選 */}
       <div className="flex justify-between items-center bg-white p-2 rounded-2xl shadow-sm border border-stone-100 mb-2">
         <span className="text-sm font-bold text-stone-500 pl-2">月份篩選</span>
         <input 
           type="month" 
           value={selectedMonth} 
           onChange={e => setSelectedMonth(e.target.value)} 
           className="bg-stone-50 border-none text-stone-700 font-bold rounded-xl px-3 py-1 text-sm focus:ring-2 focus:ring-emerald-200"
         />
      </div>

       {/* 收支看板 */}
       <div className="bg-white rounded-3xl p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-stone-100 grid grid-cols-3 divide-x divide-stone-100">
          <div className="px-2 text-center">
            <div className="text-xs text-stone-400 mb-1">本月收入</div>
            <div className="font-bold text-emerald-600 text-sm md:text-base">+${totalIncome.toLocaleString()}</div>
          </div>
          <div className="px-2 text-center">
            <div className="text-xs text-stone-400 mb-1">本月支出</div>
            <div className="font-bold text-rose-500 text-sm md:text-base">-${totalExpense.toLocaleString()}</div>
          </div>
           <div className="px-2 text-center">
            <div className="text-xs text-stone-400 mb-1">本月結餘</div>
            <div className={`font-bold text-sm md:text-base ${balance >= 0 ? 'text-stone-700' : 'text-rose-600'}`}>${balance.toLocaleString()}</div>
          </div>
       </div>

       <div className="flex gap-2">
          <ActionButton onClick={onAddClick} className="flex-1"><Plus size={18} /> 記一筆</ActionButton>
          <ActionButton onClick={onAddFixedClick} variant="secondary" className="!px-3">固定支出</ActionButton>
       </div>
       <button onClick={() => setShowDailyChart(!showDailyChart)} className={`w-full py-2 rounded-xl text-sm font-bold flex items-center justify-center gap-1 border border-stone-100 ${showDailyChart ? 'bg-emerald-50 text-emerald-600' : 'bg-white text-stone-400'}`}>{showDailyChart ? <List size={16}/> : <PieChartIcon size={16}/>} {showDailyChart ? '切換回列表' : '查看統計圖表'}</button>
       
       {showDailyChart ? <Card><h3 className="font-bold text-stone-700 mb-4 text-center">消費類別佔比 ({selectedMonth})</h3><DonutChart data={chartData} /></Card> :
          <div className="space-y-3 mt-4">
          {combinedList.map(tx => (
              <Card key={tx.id} className="!p-4 flex justify-between items-center">
                  <div className="flex gap-3 items-center">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${tx.isIncome ? 'bg-emerald-100 text-emerald-600' : 'bg-orange-100 text-orange-500'}`}>
                      {tx.isIncome ? <ArrowRight size={20} className="-rotate-45"/> : <Wallet size={20} />}
                    </div>
                    <div>
                      <div className="font-bold text-stone-700">{tx.item}</div>
                      <div className="text-xs text-stone-400">{tx.date}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`font-bold ${tx.isIncome ? 'text-emerald-600' : 'text-stone-700'}`}>
                      {tx.isIncome ? '+' : '-'}${Number(tx.amount).toLocaleString()}
                    </div>
                    <div className="flex justify-end gap-1 mt-1">
                      {!tx.isIncome && (
                        <>
                          <button type="button" onClick={() => onEditClick(tx, 'daily')} className="text-stone-300 hover:text-emerald-500 text-xs p-1"><Pencil size={14}/></button>
                          <button type="button" onClick={() => onDeleteClick('daily_tx', tx.id)} className="text-stone-300 hover:text-red-500 text-xs p-1"><Trash2 size={14}/></button>
                        </>
                      )}
                      {tx.isIncome && <span className="text-[10px] text-emerald-400 bg-emerald-50 px-1 rounded">公司匯入</span>}
                    </div>
                  </div>
              </Card>
          ))}
          {combinedList.length === 0 && <div className="text-center py-8 text-stone-400">本月沒有紀錄 🍃</div>}
          </div>
       }
    </div>
  );
});

export default DailyView;