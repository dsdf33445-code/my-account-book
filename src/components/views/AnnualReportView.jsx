// src/components/views/AnnualReportView.jsx

import React, { memo, useMemo } from 'react';
import { X, TrendingUp, TrendingDown, DollarSign, ArrowLeft } from 'lucide-react';
import { Card, DonutChart, ActionButton } from '../UI';
import { COMPANY_CAPITAL } from '../../constants';

const AnnualReportView = memo(function AnnualReportView({
  companyTx,
  currentYear,
  setActiveTab
}) {
  
  // 1. 過濾出本年度的所有交易 (日期以當年開頭)
  const annualTx = useMemo(() => {
    return companyTx.filter(tx => tx.date && tx.date.startsWith(currentYear));
  }, [companyTx, currentYear]);


  // 2. 計算年度總數據
  const { totalIncome, totalExpense, totalTax, netProfit, monthlyData } = useMemo(() => {
    let monthlyMap = new Array(12).fill(0).map((_, i) => ({ 
        month: `${currentYear}-${String(i + 1).padStart(2, '0')}`,
        revenue: 0,
        expense: 0,
        tax: 0,
    }));
    
    let totalIncome = 0;
    let totalExpense = 0;
    let totalTax = 0;

    annualTx.forEach(tx => {
        const monthIndex = parseInt(tx.date.slice(5, 7)) - 1;
        const amount = Number(tx.amount || tx.rawAmount || 0);

        if (tx.type === 'income') {
            totalIncome += amount;
            monthlyMap[monthIndex].revenue += amount;
            
            const taxAmount = Number(tx.tax || 0);
            totalTax += taxAmount;
            monthlyMap[monthIndex].tax += taxAmount;
            
        } else if (tx.type === 'expense') {
            totalExpense += amount;
            monthlyMap[monthIndex].expense += amount;
        }
        // settlement 不算在 YTD 收入支出裡，它只影響資產總額
    });
    
    const netProfit = totalIncome - totalExpense - totalTax;

    return { 
        totalIncome, 
        totalExpense, 
        totalTax, 
        netProfit,
        monthlyData: monthlyMap.filter(m => m.revenue > 0 || m.expense > 0),
    };
  }, [annualTx, currentYear]);

  // 3. 支出類別分析 (Chart Data)
  const expenseChartData = useMemo(() => {
    const categoryMap = {};
    annualTx.filter(t => t.type === 'expense').forEach(tx => {
      categoryMap[tx.item] = (categoryMap[tx.item] || 0) + Number(tx.amount);
    });
    return Object.keys(categoryMap).map(k => ({ label: k, value: categoryMap[k] })).sort((a,b) => b.value - a.value);
  }, [annualTx]);


  return (
    <div className="space-y-6 pb-24">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => setActiveTab('company')} className="text-stone-500 hover:text-emerald-600"><ArrowLeft size={24}/></button>
        <h2 className="text-3xl font-extrabold text-stone-800 flex items-center gap-2">
           <DollarSign size={28}/> {currentYear} 年度報表
        </h2>
      </div>

      {/* 總結卡片 */}
      <Card className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white p-6 shadow-xl">
        <div className="text-sm opacity-80">公司年度累計淨利 (YTD)</div>
        <div className="text-5xl font-extrabold mt-1">
          ${netProfit.toLocaleString()}
        </div>
        <div className="mt-4 pt-4 border-t border-blue-400/50 flex justify-between text-sm">
           <div className="flex flex-col">
               <span className="opacity-80">總收入</span>
               <span className="font-bold text-emerald-300">+{totalIncome.toLocaleString()}</span>
           </div>
           <div className="flex flex-col text-right">
               <span className="opacity-80">總支出 (含稅)</span>
               <span className="font-bold text-rose-300">-{ (totalExpense + totalTax).toLocaleString()}</span>
           </div>
        </div>
      </Card>

      {/* 詳細數據 */}
      <h3 className="text-xl font-bold text-stone-700 mt-6">📊 年度支出類別分析</h3>
      <Card>
         <DonutChart data={expenseChartData} />
      </Card>
      
      <h3 className="text-xl font-bold text-stone-700 mt-6">📈 月份明細總覽</h3>
      <div className="space-y-2">
         {monthlyData.map(m => {
            const monthlyNet = m.revenue - m.expense - m.tax;
            return (
                <Card key={m.month} className="!p-4 border-l-4 border-emerald-400">
                    <div className="font-bold text-stone-700 text-lg">{m.month}</div>
                    <div className="grid grid-cols-3 text-sm mt-1">
                        <div>收入: <span className="text-emerald-600 font-bold">+{m.revenue.toLocaleString()}</span></div>
                        <div>支出: <span className="text-rose-600 font-bold">-{m.expense.toLocaleString()}</span></div>
                        <div>稅: <span className="text-rose-600 font-bold">-{m.tax.toLocaleString()}</span></div>
                    </div>
                    <div className={`mt-2 text-md font-extrabold ${monthlyNet >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                        淨利: ${monthlyNet.toLocaleString()}
                    </div>
                </Card>
            );
         })}
         {monthlyData.length === 0 && <p className="text-stone-400 text-sm text-center py-8">本年度無交易紀錄。</p>}
      </div>

      <ActionButton onClick={() => setActiveTab('company')} className="w-full mt-6">
        <ArrowLeft size={20}/> 返回公司頁面
      </ActionButton>
    </div>
  );
});

export default AnnualReportView;