import React, { useMemo, memo, useState } from 'react';
import { Plus, List, PieChart as PieChartIcon, Pencil, Trash2, Calculator, CheckCircle, X, TrendingUp, Building2, Home } from 'lucide-react';
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
  // UI 狀態
  const [showSettleModal, setShowSettleModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // 防呆：檢查使用者選擇的月份是否已結算
  const isSettled = useMemo(() => {
    return companyTx.some(tx => 
      tx.type === 'settlement' && 
      (tx.item.includes(`${selectedMonth} 盈餘結算`) || tx.date.startsWith(selectedMonth))
    );
}, [companyTx, selectedMonth]);

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

  // 篩選本月資料
  const filteredTx = useMemo(() => {
    return companyTx.filter(tx => tx.date.startsWith(selectedMonth));
  }, [companyTx, selectedMonth]);
  
  // 計算本月營收與支出
  const { monthlyRevenue, monthlyTax, monthlyExpense, netProfit } = useMemo(() => {
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
        monthlyTax: tax,
        monthlyExpense: expense,
        netProfit: revenue - tax - expense
    };
  }, [filteredTx]);

  // 執行結算寫入
  const handleConfirmSettle = async () => {
    setIsProcessing(true);
    try {
        // 優化邏輯：確保加總等於淨利 (避免 0.3+0.7 四捨五入誤差)
        const companyShare = Math.round(netProfit * 0.3);
        const dailyShare = netProfit - companyShare; 

        // 1. 寫入公司盈餘記錄
        await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'company_tx'), {
            date: new Date().toISOString().split('T')[0],
            item: `${selectedMonth} 盈餘結算`,
            amount: companyShare,
            type: 'settlement',
            category: '結算',
            createdAt: serverTimestamp()
        });

        // 2. 寫入日常收入記錄
        await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'daily_tx'), {
            date: new Date().toISOString().split('T')[0],
            item: `${selectedMonth} 公司分潤`,
            amount: dailyShare,
            category: '公司匯入',
            createdAt: serverTimestamp()
        });

        alert("✅ 結算完成！");
        setShowSettleModal(false);
    } catch (e) {
        alert("結算失敗: " + e.message);
    } finally {
        setIsProcessing(false);
    }
  };

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
    <div className="space-y-4 pb-24 relative">
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

      {/* 手動結算按鈕 */}
      <div className="flex gap-2">
        <button 
            onClick={() => setShowSettleModal(true)}
            disabled={netProfit <= 0 || isSettled}
            className={`flex-1 font-bold py-3 rounded-2xl shadow-sm flex items-center justify-center gap-2 transition-all 
                ${isSettled 
                    ? 'bg-stone-200 text-stone-500 cursor-not-allowed' 
                    : (netProfit <= 0 
                        ? 'bg-stone-100 text-stone-400 cursor-not-allowed' 
                        : 'bg-emerald-100 text-emerald-700 active:scale-95 shadow-emerald-200 hover:bg-emerald-200') 
                }`}
        >
            {isSettled ? <CheckCircle size={18} /> : <Calculator size={18} />}
            {isSettled 
                ? '本月已結算' 
                : '結算本月分配'
            }
        </button>
      </div>

      {/* 美化後的結算確認視窗 (Modal) */}
      {showSettleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-stone-900/60 backdrop-blur-sm animate-in fade-in" onClick={() => setShowSettleModal(false)}></div>
            <div className="bg-white w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl relative z-10 animate-in zoom-in-95 duration-200">
                {/* Modal Header */}
                <div className="bg-emerald-600 p-5 text-white flex justify-between items-start">
                    <div>
                        <h3 className="text-xl font-bold flex items-center gap-2"><TrendingUp size={20}/> 結算確認</h3>
                        <p className="text-emerald-100 text-xs mt-1">月份: {selectedMonth}</p>
                    </div>
                    <button onClick={() => setShowSettleModal(false)} className="text-emerald-200 hover:text-white"><X size={24}/></button>
                </div>

                {/* Modal Body */}
                <div className="p-6 space-y-4">
                    {/* 算式區塊 */}
                    <div className="space-y-2 text-sm text-stone-600 bg-stone-50 p-3 rounded-xl border border-stone-100">
                        <div className="flex justify-between"><span>總收入</span><span className="font-bold text-stone-800">${monthlyRevenue.toLocaleString()}</span></div>
                        <div className="flex justify-between"><span>總稅金</span><span className="font-bold text-rose-500">-${monthlyTax.toLocaleString()}</span></div>
                        <div className="flex justify-between"><span>總支出</span><span className="font-bold text-rose-500">-${monthlyExpense.toLocaleString()}</span></div>
                        <div className="border-t border-stone-200 my-1"></div>
                        <div className="flex justify-between text-base"><span>淨利潤</span><span className="font-bold text-emerald-600">${netProfit.toLocaleString()}</span></div>
                    </div>

                    {/* 分配區塊 */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-emerald-50 border border-emerald-100 p-3 rounded-2xl flex flex-col items-center text-center">
                            <div className="bg-emerald-100 p-2 rounded-full mb-2 text-emerald-600"><Building2 size={20}/></div>
                            <span className="text-xs text-emerald-800 font-bold mb-1">公司盈餘 (30%)</span>
                            <span className="text-lg font-bold text-emerald-700">${Math.round(netProfit * 0.3).toLocaleString()}</span>
                        </div>
                        <div className="bg-orange-50 border border-orange-100 p-3 rounded-2xl flex flex-col items-center text-center">
                            <div className="bg-orange-100 p-2 rounded-full mb-2 text-orange-600"><Home size={20}/></div>
                            <span className="text-xs text-orange-800 font-bold mb-1">日常收入 (70%)</span>
                            <span className="text-lg font-bold text-orange-700">${(netProfit - Math.round(netProfit * 0.3)).toLocaleString()}</span>
                        </div>
                    </div>

                    <p className="text-xs text-center text-stone-400">
                        點擊確認後，系統將自動寫入帳本。
                    </p>

                    <button 
                        onClick={handleConfirmSettle}
                        disabled={isProcessing}
                        className="w-full py-3 bg-emerald-600 text-white font-bold rounded-xl shadow-lg shadow-emerald-200 hover:bg-emerald-700 active:scale-95 transition-all flex justify-center gap-2"
                    >
                        {isProcessing ? '處理中...' : '確認分配'}
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* Tabs */}
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