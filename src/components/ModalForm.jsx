import React, { useState, useEffect } from 'react';
import { collection, addDoc, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { X } from 'lucide-react';
import { ActionButton, Card, Input, Select } from './UI';
import { 
  INCOME_CATEGORIES, 
  EXPENSE_CATEGORIES, 
  DAILY_CATEGORIES, 
  FIXED_EXPENSE_DEFAULTS 
} from '../constants';

export default function ModalForm({ isOpen, onClose, type, editingItem, db, appId }) {
  if (!isOpen) return null;

  const today = new Date().toISOString().split('T')[0];
  const [date, setDate] = useState(today);
  const [amount, setAmount] = useState('');
  const [item, setItem] = useState('');
  const [category, setCategory] = useState('');
  
  // --- 新增/修改的狀態 ---
  const [kolSalary, setKolSalary] = useState('');       // KOL 薪資
  const [invoiceNote, setInvoiceNote] = useState('');   // 發票費備註
  const [invoiceDeduction, setInvoiceDeduction] = useState(''); // 🆕 發票費扣除額
  const [expenseNote, setExpenseNote] = useState('');   // 🆕 支出備註 (會計費/稅金)
  
  const [fixedItems, setFixedItems] = useState(FIXED_EXPENSE_DEFAULTS.map(i => ({...i, value: ''})));
  const [isNonCathay, setIsNonCathay] = useState(false);
  const [time, setTime] = useState('12:00');
  const [location, setLocation] = useState('');
  const [todoType, setTodoType] = useState('待辦事項');

  // 初始化邏輯
  useEffect(() => {
    if (editingItem) {
      setDate(editingItem.date || today);
      
      if (type === 'income') {
         setAmount(editingItem.rawAmount);
         // 判斷是否為特殊類別以回填資料
         if (editingItem.category === 'KOL行銷費' || editingItem.item.includes('(KOL)')) {
            setCategory('KOL行銷費');
            setItem(editingItem.item.replace(' (KOL)', ''));
            setKolSalary(editingItem.kolSalary || '');
         } else if (editingItem.item.startsWith('發票費')) {
            setCategory('發票費');
            // 解析備註
            const notePart = editingItem.item.replace('發票費', '').replace(': ', '');
            setInvoiceNote(notePart);
            // 回填扣除額
            setInvoiceDeduction(editingItem.invoiceDeduction || '');
         } else {
            setCategory(INCOME_CATEGORIES.includes(editingItem.item) ? editingItem.item : '其他');
            setItem(editingItem.item);
         }
         setIsNonCathay(editingItem.fee > 0);

      } else if (type === 'expense') {
         setAmount(editingItem.amount);
         
         // 處理會計費與稅金的備註回填
         let cat = editingItem.item;
         let note = '';
         
         if (editingItem.item.startsWith('會計費')) {
             cat = '會計費';
             note = editingItem.item.replace('會計費', '').replace(': ', '');
         } else if (editingItem.item.startsWith('稅金')) {
             cat = '稅金';
             note = editingItem.item.replace('稅金', '').replace(': ', '');
         } else {
             // 檢查是否為預設類別
             const baseCat = EXPENSE_CATEGORIES.find(c => editingItem.item === c);
             cat = baseCat || '其他';
             if (cat === '其他') setItem(editingItem.item);
         }
         
         setCategory(cat);
         setExpenseNote(note);

      } else if (type === 'daily') {
         setAmount(editingItem.amount);
         setItem(editingItem.item);
         setCategory(DAILY_CATEGORIES.includes(editingItem.item) ? editingItem.item : '其他');
         if (!DAILY_CATEGORIES.includes(editingItem.item)) setItem(editingItem.item);
      } else if (type === 'event') {
         setItem(editingItem.title);
         setTime(editingItem.time);
         setLocation(editingItem.location);
      } else if (type === 'todo') {
         setItem(editingItem.text);
         setTodoType(editingItem.type);
      }
    } else {
      // 重置為預設值
      setDate(today);
      setAmount('');
      setItem('');
      setKolSalary(''); 
      setInvoiceNote(''); 
      setInvoiceDeduction(''); // 🆕 重置
      setExpenseNote('');     // 🆕 重置
      setTime('12:00');
      setLocation('');
      setIsNonCathay(false);
      setFixedItems(FIXED_EXPENSE_DEFAULTS.map(i => ({...i, value: ''})));
      
      if (type === 'daily' || type === 'daily_fixed') setCategory(DAILY_CATEGORIES[0]);
      else if (type === 'expense') setCategory(EXPENSE_CATEGORIES[0]);
      else if (type === 'income') setCategory(INCOME_CATEGORIES[0]);
      else if (type === 'todo') setTodoType('待辦事項');
    }
  }, [editingItem, type, isOpen]);

  const handleFixedChange = (index, val) => { 
    const newItems = [...fixedItems]; 
    newItems[index].value = val; 
    setFixedItems(newItems); 
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const commonData = { createdAt: editingItem ? editingItem.createdAt : serverTimestamp() }; 
      const collectionName = type === 'income' || type === 'expense' ? 'company_tx' : type === 'daily' || type === 'daily_fixed' ? 'daily_tx' : type === 'todo' ? 'todos' : 'events';
      
      let docData = {};

      if (type === 'income') {
        const numAmount = Number(amount);
        
        if (category === 'KOL行銷費') {
            // KOL 邏輯 (維持 30%)
            const tax = Math.round(numAmount - (numAmount / 1.05));
            const numKolSalary = Number(kolSalary);
            const baseForSurplus = numAmount - tax - numKolSalary;
            const surplus = Math.round(baseForSurplus * 0.3); // 30%
            const net = numAmount - tax - numKolSalary - surplus;

            docData = { 
                date, 
                item: item, 
                category: 'KOL行銷費', 
                rawAmount: numAmount, 
                tax, 
                kolSalary: numKolSalary,
                surplus, 
                fee: 0, 
                netAmount: net, 
                type: 'income', 
                ...commonData 
            };

        } else {
            // 一般收入 (維持 30%)
            const tax = Math.round(numAmount * 0.05);
            const baseSurplus = Math.round(numAmount * 0.30); // 30%
            const fee = isNonCathay ? 15 : 0;
            const surplus = baseSurplus - fee;
            const net = numAmount - tax - baseSurplus;
            
            let finalItemName = item;
            if (category === '其他') finalItemName = item;
            else if (category === '發票費') finalItemName = invoiceNote ? `發票費: ${invoiceNote}` : '發票費';
            else finalItemName = category;

            docData = { 
                date, 
                item: finalItemName, 
                category: category,
                rawAmount: numAmount, 
                tax, 
                surplus, 
                fee, 
                netAmount: net, 
                type: 'income',
                invoiceDeduction: category === '發票費' ? Number(invoiceDeduction) : 0, // 🆕 儲存扣除額
                ...commonData 
            };
        }

      } else if (type === 'expense') {
        // 處理會計費與稅金的備註
        let finalItemName = category;
        if (category === '其他') finalItemName = item;
        else if ((category === '會計費' || category === '稅金') && expenseNote) {
            finalItemName = `${category}: ${expenseNote}`; // 🆕 將備註加到名稱中
        }

        docData = { 
            date, 
            item: finalItemName, 
            category: category, // 儲存原始類別以便編輯時辨識
            amount: Number(amount), 
            type: 'expense', 
            ...commonData 
        };

      } else if (type === 'daily') {
        docData = { date, item: category === '其他' ? item : category, amount: Number(amount), ...commonData };
      } else if (type === 'daily_fixed') {
         const batchPromises = fixedItems.filter(fi => Number(fi.value) > 0).map(fi => addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'daily_tx'), { date, item: fi.label, amount: Number(fi.value), ...commonData }));
         await Promise.all(batchPromises);
         onClose();
         return;
      } else if (type === 'todo') {
         docData = { text: item, type: todoType, isDone: editingItem ? editingItem.isDone : false, ...commonData };
      } else if (type === 'event') {
         docData = { title: item, date, time, location, ...commonData };
      }

      if (editingItem) {
         await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', collectionName, editingItem.id), docData);
      } else {
         await addDoc(collection(db, 'artifacts', appId, 'public', 'data', collectionName), docData);
      }
      onClose();
    } catch (err) { alert("儲存失敗: " + err.message); }
  };

  // 預覽計算
  const renderIncomePreview = () => {
      const numAmount = Number(amount) || 0;
      
      if (category === 'KOL行銷費') {
          const tax = Math.round(numAmount - (numAmount / 1.05));
          const numKolSalary = Number(kolSalary) || 0;
          const baseForSurplus = numAmount - tax - numKolSalary;
          const surplus = Math.round(baseForSurplus * 0.3);
          const net = numAmount - tax - numKolSalary - surplus;

          return (
            <div className="bg-stone-50 p-3 rounded-xl mb-4 text-sm text-stone-600 space-y-2 border border-stone-100">
                <div className="flex justify-between items-center text-stone-400 text-xs"><span>計算公式: (總額-稅-薪資)*30% = 盈餘</span></div>
                <div className="flex justify-between items-center"><span>稅金 (5%)</span><span className="font-bold text-rose-500">-${tax}</span></div>
                <div className="flex justify-between items-center"><span>KOL 薪資</span><span className="font-bold text-rose-500">-${numKolSalary}</span></div>
                <div className="flex justify-between items-center">
                    <span>公司盈餘 (30%)</span>
                    <span className="font-bold text-emerald-600">-${surplus}</span>
                </div>
                <div className="border-t border-stone-200 pt-2 flex justify-between font-bold text-stone-800">
                    <span>實拿金額 (入日常)</span>
                    <span>${net}</span>
                </div>
            </div>
          );
      } else {
          // 一般收入預覽
          const tax = Math.round(numAmount * 0.05);
          const baseSurplus = Math.round(numAmount * 0.30); 
          const fee = isNonCathay ? 15 : 0;
          const net = numAmount - tax - baseSurplus;

          return (
            <div className="bg-stone-50 p-3 rounded-xl mb-4 text-sm text-stone-600 space-y-2 border border-stone-100">
                <div className="flex justify-between items-center"><span>預扣 5% 稅金</span><span className="font-bold text-rose-500">-${tax}</span></div>
                <div className="flex justify-between items-center">
                    <span>公司盈餘 (30% {isNonCathay ? '- 手續費' : ''})</span>
                    <span className="font-bold text-emerald-600">
                        -${baseSurplus - fee}
                    </span>
                </div>
                <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={isNonCathay} onChange={e => setIsNonCathay(e.target.checked)} className="accent-emerald-600 w-4 h-4"/><span>非國泰轉帳 (手續費 $15)</span></label>
                
                {/* 🆕 如果有輸入扣除額，可以在這裡顯示，但不影響目前的計算邏輯 (僅做紀錄) */}
                {invoiceDeduction && category === '發票費' && (
                    <div className="flex justify-between items-center"><span>紀錄: 扣除額</span><span className="font-bold text-stone-400">${invoiceDeduction}</span></div>
                )}

                <div className="border-t border-stone-200 pt-2 flex justify-between font-bold text-stone-800">
                    <span>實拿金額 (入日常)</span>
                    <span>${net}</span>
                </div>
            </div>
          );
      }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm" onClick={onClose}></div>
      <Card className="w-full max-w-sm relative z-10 animate-in fade-in zoom-in duration-200 max-h-[85vh] overflow-y-auto">
         <button onClick={onClose} className="absolute top-4 right-4 text-stone-400 hover:text-stone-600"><X size={24} /></button>
         <h3 className="text-xl font-bold text-stone-800 mb-6">
           {editingItem ? '編輯項目' : 
             <>
               {type === 'income' && '新增公司收入'}{type === 'expense' && '新增公司支出'}{type === 'daily' && '記一筆日常開銷'}{type === 'daily_fixed' && '新增固定支出'}{type === 'todo' && '新增待辦事項'}{type === 'event' && '新增行程'}
             </>
           }
         </h3>
         <form onSubmit={handleSubmit}>
            {/* 日期欄位 */}
            {['income', 'expense', 'daily', 'event', 'daily_fixed'].includes(type) && <Input type="date" value={date} onChange={e => setDate(e.target.value)} label="日期" required />}
            
            {/* 固定支出列表 */}
            {type === 'daily_fixed' && !editingItem && <div className="space-y-3 mb-4"><p className="text-xs text-stone-500 mb-2">請輸入本月金額 (填寫項目將自動加入)</p>{fixedItems.map((fi, idx) => (<div key={fi.label} className="flex items-center gap-2"><label className="text-sm font-bold text-stone-600 w-20">{fi.label}</label><input type="number" placeholder="0" value={fi.value} onChange={(e) => handleFixedChange(idx, e.target.value)} className="flex-1 bg-stone-50 border border-stone-200 rounded-lg p-2 text-stone-700 outline-none focus:border-emerald-300 text-right no-spinner" /></div>))}</div>}
            
            {/* 行程時間 */}
            {type === 'event' && <Input type="time" value={time} onChange={e => setTime(e.target.value)} label="時間" required />}
            
            {/* 類別選擇器 */}
            {type === 'income' && <Select value={category} onChange={e => setCategory(e.target.value)} options={INCOME_CATEGORIES} label="項目分類" />}
            {type === 'expense' && <Select value={category} onChange={e => setCategory(e.target.value)} options={EXPENSE_CATEGORIES} label="項目分類" />}
            {type === 'daily' && <Select value={category} onChange={e => setCategory(e.target.value)} options={DAILY_CATEGORIES} label="項目分類" />}
            {type === 'todo' && <Select value={todoType} onChange={e => setTodoType(e.target.value)} options={['待辦事項', '購物清單']} label="類型" />}
            
            {/* 名稱輸入欄位 (條件渲染) */}
            {(type === 'todo' || type === 'event' || (type === 'income' && category === '其他') || (type === 'income' && category === 'KOL行銷費') || (type === 'daily' && category === '其他') || (type === 'expense' && category === '其他')) && (
                <Input value={item} onChange={e => setItem(e.target.value)} placeholder={type === 'event' ? "行程名稱" : "輸入名稱..."} label="名稱" required />
            )}

            {/* 🆕 公司支出: 會計費/稅金 備註欄位 */}
            {type === 'expense' && (category === '會計費' || category === '稅金') && (
                <Input value={expenseNote} onChange={e => setExpenseNote(e.target.value)} placeholder="例如: 5月份、第一季..." label="備註" />
            )}

            {/* 發票費欄位 */}
            {type === 'income' && category === '發票費' && (
                <>
                    <Input value={invoiceNote} onChange={e => setInvoiceNote(e.target.value)} placeholder="例如: 廠商名稱、發票號碼..." label="發票備註" />
                    {/* 🆕 發票費扣除欄位 */}
                    <Input type="number" inputMode="numeric" value={invoiceDeduction} onChange={e => setInvoiceDeduction(e.target.value)} placeholder="0" label="扣除 (紀錄用)" className="no-spinner" />
                </>
            )}

            {/* 地點欄位 */}
            {type === 'event' && <Input value={location} onChange={e => setLocation(e.target.value)} placeholder="地點" label="地點" />}
            
            {/* 金額欄位 */}
            {['income', 'expense', 'daily'].includes(type) && (
                <Input type="number" inputMode="numeric" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0" label={category === 'KOL行銷費' ? "行銷費總金額 (含稅)" : "金額"} required className="no-spinner" />
            )}

            {/* KOL 薪資欄位 */}
            {type === 'income' && category === 'KOL行銷費' && (
                <Input type="number" inputMode="numeric" value={kolSalary} onChange={e => setKolSalary(e.target.value)} placeholder="0" label="KOL 薪資" required className="no-spinner" />
            )}
            
            {type === 'income' && renderIncomePreview()}

            <ActionButton type="submit" className="w-full mt-2">{type === 'daily_fixed' && !editingItem ? '一鍵加入' : (editingItem ? '確認修改' : '確認新增')}</ActionButton>
         </form>
      </Card>
    </div>
  );
}