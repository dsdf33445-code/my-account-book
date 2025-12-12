// src/components/ModalForm.jsx
import React, { useState, useEffect } from 'react';
import { collection, addDoc, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { X } from 'lucide-react';
import { ActionButton, Card, Input, Select } from './UI'; // 引用 UI 元件
import { 
  INCOME_CATEGORIES, 
  EXPENSE_CATEGORIES, 
  DAILY_CATEGORIES, 
  FIXED_EXPENSE_DEFAULTS 
} from '../constants'; // 引用常數

export default function ModalForm({ isOpen, onClose, type, editingItem, db, appId }) {
  if (!isOpen) return null;

  const today = new Date().toISOString().split('T')[0];
  const [date, setDate] = useState(today);
  const [amount, setAmount] = useState('');
  const [item, setItem] = useState('');
  const [category, setCategory] = useState('');
  const [fixedItems, setFixedItems] = useState(FIXED_EXPENSE_DEFAULTS.map(i => ({...i, value: ''})));
  const [isNonCathay, setIsNonCathay] = useState(false);
  const [time, setTime] = useState('12:00');
  const [location, setLocation] = useState('');
  const [todoType, setTodoType] = useState('待辦事項');

  // 初始化邏輯 (當 Modal 開啟或 editingItem 改變時執行)
  useEffect(() => {
    if (editingItem) {
      setDate(editingItem.date || today);
      if (type === 'income') {
         setAmount(editingItem.rawAmount);
         setItem(editingItem.item);
         setIsNonCathay(editingItem.fee > 0);
         setCategory(INCOME_CATEGORIES.includes(editingItem.item) ? editingItem.item : '其他');
         if (!INCOME_CATEGORIES.includes(editingItem.item)) setItem(editingItem.item);
      } else if (type === 'expense' || type === 'daily') {
         setAmount(editingItem.amount);
         setItem(editingItem.item);
         const cats = type === 'expense' ? EXPENSE_CATEGORIES : DAILY_CATEGORIES;
         setCategory(cats.includes(editingItem.item) ? editingItem.item : '其他');
         if (!cats.includes(editingItem.item)) setItem(editingItem.item);
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
        const tax = Math.round(numAmount * 0.05);
        const baseSurplus = Math.round(numAmount * 0.08);
        const fee = isNonCathay ? 15 : 0;
        const surplus = baseSurplus - fee;
        const net = numAmount - tax - baseSurplus;
        
        docData = { date, item: category === '其他' ? item : category,HVrawAmount: numAmount, tax, surplus, fee, netAmount: net, type: 'income', ...commonData };
      } else if (type === 'expense') {
        docData = { date, item: category === '其他' ? item : category, amount: Number(amount), type: 'expense', ...commonData };
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
            {['income', 'expense', 'daily', 'event', 'daily_fixed'].includes(type) && <Input type="date" value={date} onChange={e => setDate(e.target.value)} label="日期" required />}
            {type === 'daily_fixed' && !editingItem && <div className="space-y-3 mb-4"><p className="text-xs text-stone-500 mb-2">請輸入本月金額 (填寫項目將自動加入)</p>{fixedItems.map((fi, idx) => (<div key={fi.label} className="flex items-center gap-2"><label className="text-sm font-bold text-stone-600 w-20">{fi.label}</label><input type="number" placeholder="0" value={fi.value} onChange={(e) => handleFixedChange(idx, e.target.value)} className="flex-1 bg-stone-50 border border-stone-200 rounded-lg p-2 text-stone-700 outline-none focus:border-emerald-300 text-right no-spinner" /></div>))}</div>}
            {type === 'event' && <Input type="time" value={time} onChange={e => setTime(e.target.value)} label="時間" required />}
            {type === 'income' && <Select value={category} onChange={e => setCategory(e.target.value)} options={INCOME_CATEGORIES} label="項目分類" />}
            {type === 'expense' && <Select value={category} onChange={e => setCategory(e.target.value)} options={EXPENSE_CATEGORIES} label="項目分類" />}
            {type === 'daily' && <Select value={category} onChange={e => setCategory(e.target.value)} options={DAILY_CATEGORIES} label="項目分類" />}
            {type === 'todo' && <Select value={todoType} onChange={e => setTodoType(e.target.value)} options={['待辦事項', '購物清單']} label="類型" />}
            {(type === 'todo' || type === 'event' || (category === '其他' && type !== 'daily_fixed')) && <Input value={item} onChange={e => setItem(e.target.value)} placeholder={type === 'event' ? "行程名稱" : "輸入名稱..."} label="名稱" required />}
            {type === 'event' && <Input value={location} onChange={e => setLocation(e.target.value)} placeholder="地點" label="地點" />}
            {['income', 'expense', 'daily'].includes(type) && <Input type="number" inputMode="numeric" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0" label="金額" required className="no-spinner" />}
            
            {type === 'income' && (
               <div className="bg-stone-50 p-3 rounded-xl mb-4 text-sm text-stone-600 space-y-2 border border-stone-100">
                  <div className="flex justify-between items-center"><span>預扣 5% 稅金</span><span className="font-bold text-rose-500">-${Math.round((Number(amount) || 0) * 0.05)}</span></div>
                  <div className="flex justify-between items-center">
                      <span>公司盈餘 (8% {isNonCathay ? '- 手續費' : ''})</span>
                      <span className="font-bold text-emerald-600">
                          -${Math.round((Number(amount) || 0) * 0.08) - (isNonCathay ? 15 : 0)}
                      </span>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={isNonCathay} onChange={e => setIsNonCathay(e.target.checked)} className="accent-emerald-600 w-4 h-4"/><span>非國泰轉帳 (手續費 $15, 由盈餘扣除)</span></label>
                  <div className="border-t border-stone-200 pt-2 flex justify-between font-bold text-stone-800">
                    <span>實拿金額 (入日常)</span>
                    <span>${(Number(amount) || 0) - Math.round((Number(amount) || 0) * 0.05) - Math.round((Number(amount) || 0) * 0.08)}</span>
                  </div>
               </div>
            )}

            <ActionButton type="submit" className="w-full mt-2">{type === 'daily_fixed' && !editingItem ? '一鍵加入' : (editingItem ? '確認修改' : '確認新增')}</ActionButton>
         </form>
      </Card>
    </div>
  );
}