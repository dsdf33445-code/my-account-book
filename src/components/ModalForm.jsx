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
  
  // --- 狀態定義 ---
  const [tax, setTax] = useState('');                   
  const [invoiceNote, setInvoiceNote] = useState('');   
  const [expenseNote, setExpenseNote] = useState('');   
  
  const [fixedItems, setFixedItems] = useState(FIXED_EXPENSE_DEFAULTS.map(i => ({...i, value: ''})));
  const [time, setTime] = useState('12:00');
  const [location, setLocation] = useState('');
  const [todoType, setTodoType] = useState('待辦事項');

  // 初始化邏輯
  useEffect(() => {
    if (editingItem) {
      setDate(editingItem.date || today);
      
      if (type === 'income') {
         setAmount(editingItem.rawAmount || editingItem.amount); 
         setTax(editingItem.tax || ''); 

         if (editingItem.category === 'KOL行銷費') {
            setCategory('KOL行銷費');
            setItem(editingItem.item);
         } else if (editingItem.category === '發票費') {
            setCategory('發票費');
            const notePart = editingItem.item.replace('發票費', '').replace(': ', '');
            setInvoiceNote(notePart);
         } else {
            setCategory(INCOME_CATEGORIES.includes(editingItem.item) ? editingItem.item : '其他');
            setItem(editingItem.item);
         }

      } else if (type === 'expense') {
         setAmount(editingItem.amount);
         let cat = editingItem.item;
         let note = '';
         const categoriesWithNotes = ['會計費', '稅金', 'KOL薪資'];
         const foundCat = categoriesWithNotes.find(c => editingItem.item.startsWith(c));

         if (foundCat) {
             cat = foundCat;
             note = editingItem.item.replace(foundCat, '').replace(': ', '');
         } else {
             const baseCat = EXPENSE_CATEGORIES.find(c => editingItem.item === c);
             cat = baseCat || '其他';
             if (cat === '其他') setItem(editingItem.item);
         }
         setCategory(cat);
         setExpenseNote(note);

      } else if (type === 'daily') {
         setAmount(editingItem.amount);
         let cat = editingItem.item;
         let note = '';
         
         // 🆕 孝親費編輯初始化
         if (editingItem.item.startsWith('孝親費')) {
             cat = '孝親費';
             note = editingItem.item.replace('孝親費', '').replace(': ', '');
         } else {
             const baseCat = DAILY_CATEGORIES.find(c => editingItem.item === c);
             cat = baseCat || '其他';
             if (cat === '其他') setItem(editingItem.item);
         }
         setCategory(cat);
         setExpenseNote(note);

      } else if (type === 'event') {
         setItem(editingItem.title);
         setTime(editingItem.time);
         setLocation(editingItem.location);
      } else if (type === 'todo') {
         setItem(editingItem.text);
         setTodoType(editingItem.type);
      }
    } else {
      // 重置
      setDate(today);
      setAmount('');
      setTax(''); 
      setItem('');
      setInvoiceNote(''); 
      setExpenseNote('');     
      setTime('12:00');
      setLocation('');
      setFixedItems(FIXED_EXPENSE_DEFAULTS.map(i => ({...i, value: ''})));
      
      if (type === 'daily' || type === 'daily_fixed') setCategory(DAILY_CATEGORIES[0]);
      else if (type === 'expense') setCategory(EXPENSE_CATEGORIES[0]);
      else if (type === 'income') setCategory(INCOME_CATEGORIES[0]);
      else if (type === 'todo') setTodoType('待辦事項');
    }
  }, [editingItem, type, isOpen, today]);

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
        const numTax = Number(tax); 
        let finalItemName = item;
        if (category === '其他' || category === 'KOL行銷費') finalItemName = item;
        else if (category === '發票費') finalItemName = invoiceNote ? `發票費: ${invoiceNote}` : '發票費';
        else finalItemName = category;

        docData = { 
            date, item: finalItemName, category, amount: numAmount, rawAmount: numAmount, tax: numTax,
            surplus: 0, netAmount: 0, type: 'income', ...commonData 
        };

      } else if (type === 'expense') {
        let finalItemName = category;
        if (category === '其他') finalItemName = item;
        else if ((category === '會計費' || category === '稅金' || category === 'KOL薪資') && expenseNote) {
            finalItemName = `${category}: ${expenseNote}`;
        }
        docData = { date, item: finalItemName, category, amount: Number(amount), type: 'expense', ...commonData };

      } else if (type === 'daily') {
        let finalItemName = category;
        if (category === '其他') finalItemName = item;
        // 🆕 孝親費儲存邏輯
        else if (category === '孝親費' && expenseNote) {
            finalItemName = `孝親費: ${expenseNote}`;
        }
        docData = { date, item: finalItemName, category, amount: Number(amount), ...commonData };

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
            
            {type === 'event' && <Input type="time" value={time} onChange={e => setTime(e.target.value)} label="時間" required />}
            
            {type === 'income' && <Select value={category} onChange={e => setCategory(e.target.value)} options={INCOME_CATEGORIES} label="項目分類" />}
            {type === 'expense' && <Select value={category} onChange={e => setCategory(e.target.value)} options={EXPENSE_CATEGORIES} label="項目分類" />}
            {type === 'daily' && <Select value={category} onChange={e => setCategory(e.target.value)} options={DAILY_CATEGORIES} label="項目分類" />}
            {type === 'todo' && <Select value={todoType} onChange={e => setTodoType(e.target.value)} options={['待辦事項', '購物清單']} label="類型" />}
            
            {(type === 'todo' || type === 'event' || (type === 'income' && category === '其他') || (type === 'income' && category === 'KOL行銷費') || (type === 'daily' && category === '其他') || (type === 'expense' && category === '其他')) && (
                <Input value={item} onChange={e => setItem(e.target.value)} placeholder={type === 'event' ? "行程名稱" : "輸入名稱..."} label="名稱" required />
            )}

            {/* 發票費備註 */}
            {type === 'income' && category === '發票費' && (
                <Input value={invoiceNote} onChange={e => setInvoiceNote(e.target.value)} placeholder="例如: 廠商名稱、發票號碼..." label="發票備註" />
            )}

            {/* 🆕 公司支出備註 或 日常孝親費備註 */}
            {((type === 'expense' && (category === '會計費' || category === '稅金' || category === 'KOL薪資')) || (type === 'daily' && category === '孝親費')) && (
                <Input value={expenseNote} onChange={e => setExpenseNote(e.target.value)} placeholder="例如: 5月份、父親節..." label="備註" />
            )}

            {type === 'event' && <Input value={location} onChange={e => setLocation(e.target.value)} placeholder="地點" label="地點" />}
            
            {['income', 'expense', 'daily'].includes(type) && (
                <Input type="number" inputMode="numeric" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0" label="金額" required className="no-spinner" />
            )}

            {type === 'income' && (
                <Input type="number" inputMode="numeric" value={tax} onChange={e => setTax(e.target.value)} placeholder="0" label="稅金" className="no-spinner" />
            )}

            <ActionButton type="submit" className="w-full mt-2">{type === 'daily_fixed' && !editingItem ? '一鍵加入' : (editingItem ? '確認修改' : '確認新增')}</ActionButton>
         </form>
      </Card>
    </div>
  );
}