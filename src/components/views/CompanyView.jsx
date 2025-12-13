import React, { useMemo, memo, useEffect, useState } from 'react';
import { Plus, List, PieChart as PieChartIcon, Pencil, Trash2, CheckCircle, Clock } from 'lucide-react';
import { ActionButton, Card, DonutChart } from '../UI';
import { COMPANY_CAPITAL } from '../../constants';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

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
  onDeleteClick,
  db, 
  appId
}) {
  const [autoSettleStatus, setAutoSettleStatus] = useState('checking'); // checking | done | none

  // --- 自動結算邏輯 (useEffect) ---
  useEffect(() => {
    if (companyTx.length === 0) return;

    const performAutoSettlement = async () => {
        // 1. 計算「上個月」的時間字串 (YYYY-MM)
        // 這是為了符合「每月1號計算上個月」的邏輯
        const now = new Date();
        const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        // 格式化為 YYYY-MM
        const lastMonthStr = lastMonthDate.toISOString().slice(0, 7);

        // 2. 檢查是否已經結算過
        const isSettled = companyTx.some(tx => 
            tx.type === 'settlement' && tx.item.includes(`${lastMonthStr} 盈餘結算`)
        );

        if (isSettled) {
            setAutoSettleStatus('done');
            return;
        }

        // 3. 如果還沒結算，開始計算上個月的數據
        const lastMonthTx = companyTx.filter(tx => tx.date.startsWith(lastMonthStr));
        
        const revenue = lastMonthTx
            .filter(t => t.type === 'income')
            .reduce((sum, t) => sum + (Number(t.rawAmount || t.amount) || 0), 0);
            
        const tax = lastMonthTx
            .filter(t => t.type === 'income')
            .reduce((sum, t) => sum + (Number(t.tax) || 0), 0);

        const expense = lastMonthTx
            .filter(t => t.type === 'expense')
            .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

        const netProfit = revenue - tax - expense;

        // 4. 執行結算寫入 (只有在獲利 > 0 時)
        if (netProfit > 0) {
            try {
                const companyShare = Math.round(netProfit * 0.3);
                const dailyShare = Math.round(netProfit * 0.7);

                // 寫入公司盈餘
                await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'company_tx'), {
                    date: new Date().toISOString().split('T')[0], // 記錄在操作當天
                    item: `${lastMonthStr} 盈餘結算`,
                    amount: companyShare,
                    type: 'settlement',
                    category: '結算',
                    createdAt: serverTimestamp()
                });

                // 寫入日常收入
                await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'daily_tx'), {
                    date: new Date().toISOString().split('T')[0],
                    item: `${lastMonthStr} 公司分潤`,
                    amount: dailyShare,
                    category: '公司匯入',
                    createdAt: serverTimestamp()
                });

                console.log(`自動結算完成: ${lastMonthStr}`);
                setAutoSettleStatus('done');
                // 可以選擇是否要 alert，自動化通常建議靜默執行，或用 UI 提示
            } catch (e) {
                console.error("自動結算失敗", e);
            }
        } else {
            setAutoSettleStatus('none'); // 無利潤不需結算
        }
    };

    performAutoSettlement();
  }, [companyTx, db, appId]); // 當資料載入或變動時檢查


  // --- 以下為 UI 顯示邏輯 (保持不變) ---

  // 計算總資產
  const currentAssets = useMemo(() => {
    const allTimeAssetGain = companyTx
      .filter(t => t.type === 'income' || t.type === 'settlement') 
      .reduce((sum, t) => {
        if (t.surplus !== undefined) return sum + Number(t.surplus);
        if (t.type === 'settlement') return sum + Number(t.amount);
        return sum;
      }, 0);
      
    const allTimeExpense = companyTx
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
      
    return COMPANY_CAPITAL + allTimeAssetGain - allTimeExpense;
  }, [companyTx]);

  // 篩選本月資料 (UI 顯示用，根據使用者選擇的月份)
  const filteredTx = useMemo(() => {
    return companyTx.filter(tx => tx.date.startsWith(selectedMonth));
  }, [companyTx, selectedMonth]);
  
  const { monthlyRevenue, monthlyExpense, netProfit } = useMemo(() => {
    const revenue = filteredTx
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + (Number(t.rawAmount || t.amount) || 0), 0);
      
    const tax = filteredTx
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + (Number(t.tax) || 0), 0);

    const expense = filteredTx
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
      
    return { 
        monthlyRevenue: revenue, 
        monthlyExpense: expense,
        netProfit: revenue - tax - expense
    };
  }, [filteredTx]);

  const chartData = useMemo(() => {
    const targetTx = filteredTx.filter(t => t.type === companySubTab);
    const categoryMap = {};
    targetTx.forEach(tx => {
      const amt = companySubTab === 'income' ? (tx.rawAmount || tx.amount) : tx.amount;
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
          <p className="text-emerald-100 text-sm font-medium mb-1">公司總資產 (含資本額+已結算盈餘)</p>
          <h1 className="text-4xl font-bold tracking-tight">${currentAssets.toLocaleString()}</h1>
          
          <div className="mt-4 flex gap-4 text-sm opacity-90 pt-2 border-t border-emerald-500/30">
            <div><span className="block text-emerald-200 text-xs">本月營收</span><span className="font-bold">+${monthlyRevenue.toLocaleString()}</span></div>
            <div className="w-px bg-emerald-500 h-8 self-center"></div>
            <div><span className="block text-emerald-200 text-xs">本月支出</span><span className="font-bold">-${monthlyExpense.toLocaleString()}</span></div>
            <div className="w-px bg-emerald-500 h-8 self-center"></div>
            <div><span className="block text-emerald-200 text-xs">預估淨利</span><span className="font-bold text-yellow-300">${netProfit.toLocaleString()}</span></div>
          </div>
        </div>
      </div>

      {/* 🆕 自動結算狀態顯示 (取代原本的按鈕) */}
      <div className="flex items-center justify-center gap-2 bg-stone-100 p-2 rounded-xl text-xs font-bold text-stone-500">
        {autoSettleStatus === 'done' && <><CheckCircle size={14} className="text-emerald-500"/> 上月盈餘已自動結算</>}
        {autoSettleStatus === 'checking' && <><Clock size={14} className="animate-spin"/> 檢查結算狀態...</>}
        {autoSettleStatus === 'none' && <>上月無盈餘，無需結算</>}
      </div>

      <div className="flex bg-stone-200 p-1 rounded-2xl">
        <button onClick={() => setCompanySubTab('income')} className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all ${companySubTab === 'income' ? 'bg-white text-emerald-700 shadow-sm' : 'text-stone-500'}`}>收入紀錄</button>
        <button onClick={() => setCompanySubTab('expense')} className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all ${companySubTab === 'expense' ? 'bg-white text-rose-600 shadow-sm' : 'text-stone-500'}`}>支出紀錄</button>
      </div>

      <div className="flex justify-between items-center">
          <button onClick={() => setShowCompanyChart(!showCompanyChart)} className={`p-2 rounded-xl text-sm font-bold flex items-center gap-1 ${showCompanyChart ? 'bg-emerald-100 text-emerald-700' : 'bg-white text-stone-500 border border-stone-200'}`}>{showCompanyChart ? <List size={16}/> : <PieChartIcon size={16}/>} {showCompanyChart ? '列表' : '分析'}</button>
         <ActionButton onClick={onAddClick} variant={companySubTab === 'income' ? 'primary' : 'danger'} className="!rounded-xl text-sm"><Plus size={16}/> 新增</ActionButton>
      </div>

      {showCompanyChart ? <Card><h3 className="font-bold text-stone-700 mb-4 text-center">{companySubTab === 'income' ? '收入' : '支出'}分佈 ({selectedMonth})</h3><DonutChart data={chartData} /></Card> : 
        <div className="space-y-3">
          {filteredTx.filter(t => t.type === companySubTab).map(tx => (
            <Card key={tx.id} className="!p-4 flex justify-between items-center">
                <div className="flex gap-3 items-center">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${companySubTab === 'income' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-500'}`}>
                    {tx.type === 'settlement' ? '💰' : (companySubTab === 'income' ? '$' : '💸')}
                  </div>
                  <div><div className="font-bold text-stone-700">{tx.item}</div><div className="text-xs text-stone-400">{tx.date}</div></div>
                </div>
                <div className="text-right">
                  <div className={`font-bold ${companySubTab === 'income' ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {companySubTab === 'income' ? '+' : '-'}${Number(tx.amount || tx.rawAmount).toLocaleString()}
                  </div>
                  {tx.tax > 0 && companySubTab === 'income' && (
                     <div className="text-[10px] text-stone-400">稅金 -${tx.tax}</div>
                  )}
                  {tx.invoiceDeduction > 0 && companySubTab === 'income' && (
                     <div className="text-[10px] text-stone-400">扣除 -${tx.invoiceDeduction}</div>
                  )}
                  {tx.type === 'settlement' && <span className="text-[10px] bg-yellow-100 text-yellow-700 px-1 rounded">自動結算</span>}
                  
                  <div className="flex justify-end gap-1 mt-1">
                    {/* 結算單不開放編輯，避免數據錯亂，但允許刪除以觸發重新計算 */}
                    {tx.type !== 'settlement' && (
                        <button type="button" onClick={() => onEditClick(tx, companySubTab)} className="text-stone-300 hover:text-emerald-500 text-xs p-1"><Pencil size={14}/></button>
                    )}
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