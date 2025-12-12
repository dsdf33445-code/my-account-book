import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInAnonymously, 
  onAuthStateChanged
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  deleteDoc,
  updateDoc,
  doc,
  serverTimestamp
} from 'firebase/firestore';
import { 
  Briefcase, 
  Wallet, 
  CheckSquare, 
  Plus, 
  Trash2, 
  Calendar as CalendarIcon,
  MapPin,
  Clock,
  X,
  Check,
  PieChart as PieChartIcon,
  List,
  AlertTriangle,
  Pencil,
  ArrowRight
} from 'lucide-react';

// --- 1. Firebase 設定 (已填入您的資訊) ---
const firebaseConfig = {
  apiKey: "AIzaSyBuP0ldQRjl-NZbJH3t8dnPJrPkfuUB7GQ",
  authDomain: "my-account-book-ee9f4.firebaseapp.com",
  projectId: "my-account-book-ee9f4",
  storageBucket: "my-account-book-ee9f4.firebasestorage.app",
  messagingSenderId: "175280379344",
  appId: "1:175280379344:web:f207facd3e94d9ee0915d5",
  measurementId: "G-6C9M4J5N7V"
};

// --- 2. 初始化 Firebase (關鍵步驟：定義 auth) ---
const app = initializeApp(firebaseConfig);
const auth = getAuth(app); // 這裡定義了 auth，確保它存在
const db = getFirestore(app);
const appId = "my-account-book-v1"; // 固定 App ID，確保資料路徑穩定

// --- Constants & Types ---
const COMPANY_CAPITAL = 500000;

const INCOME_CATEGORIES = ['冠智薪資', 'KOL行銷費', '發票費', '其他'];
const EXPENSE_CATEGORIES = ['冠智生活費', '毓萱生活費', 'KOL薪資', '行銷部薪資', '會計費', '稅金', '其他'];

const DAILY_CATEGORIES = [
  '房租', '水費', '電費', '網路費', '機車保險', '機車保養', 
  '汽車停車位', '汽車保養', '汽車保險', '汽車牌照稅', '汽車燃料稅', 
  '個人保險費', '生活用品費', '餐費', '貓咪費用', '保養費', '其他'
];

const FIXED_EXPENSE_DEFAULTS = [
  { label: '房租', default: 0 },
  { label: '水費', default: 0 },
  { label: '電費', default: 0 },
  { label: '網路費', default: 0 },
  { label: '管理費', default: 0 },
  { label: '機車保險', default: 0 },
  { label: '汽車保險', default: 0 },
  { label: '個人保險', default: 0 },
];

const CHART_COLORS = ['#10B981', '#F59E0B', '#3B82F6', '#EF4444', '#8B5CF6', '#EC4899', '#6366F1', '#14B8A6'];

// --- Helper Components ---

const ActionButton = ({ onClick, children, className = "", variant = "primary", type = "button" }) => {
  const baseStyle = "transition-all active:scale-95 font-bold py-3 px-6 rounded-2xl shadow-sm flex items-center justify-center gap-2";
  const variants = {
    primary: "bg-emerald-600 text-white shadow-emerald-200 hover:bg-emerald-700",
    secondary: "bg-stone-200 text-stone-700 hover:bg-stone-300",
    danger: "bg-rose-100 text-rose-600 hover:bg-rose-200",
    outline: "border-2 border-emerald-600 text-emerald-700 hover:bg-emerald-50",
    ghost: "bg-transparent text-stone-500 hover:bg-stone-100"
  };

  return (
    <button type={type} onClick={onClick} className={`${baseStyle} ${variants[variant]} ${className}`}>
      {children}
    </button>
  );
};

const Card = ({ children, className = "" }) => (
  <div className={`bg-white rounded-3xl p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-stone-100 ${className}`}>
    {children}
  </div>
);

const Input = ({ label, className = "", ...props }) => (
  <div className="flex flex-col gap-1 mb-3">
    {label && <label className="text-xs font-bold text-stone-500 ml-1">{label}</label>}
    <input 
      className={`w-full bg-stone-50 border-2 border-stone-100 rounded-xl p-3 text-stone-700 focus:outline-none focus:border-emerald-300 focus:bg-white transition-colors ${className}`}
      {...props}
    />
  </div>
);

const Select = ({ label, options, ...props }) => (
  <div className="flex flex-col gap-1 mb-3">
    {label && <label className="text-xs font-bold text-stone-500 ml-1">{label}</label>}
    <select 
      className="w-full bg-stone-50 border-2 border-stone-100 rounded-xl p-3 text-stone-700 focus:outline-none focus:border-emerald-300 focus:bg-white transition-colors appearance-none"
      {...props}
    >
      {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
    </select>
  </div>
);

const DonutChart = ({ data }) => {
  if (!data || data.length === 0) return <div className="text-center text-stone-300 py-4">無數據可分析</div>;
  const total = data.reduce((acc, cur) => acc + cur.value, 0);
  let cumulativePercent = 0;
  const getCoordinatesForPercent = (percent) => [Math.cos(2 * Math.PI * percent), Math.sin(2 * Math.PI * percent)];
  
  const slices = data.map((slice, i) => {
    const startPercent = cumulativePercent;
    const slicePercent = slice.value / total;
    cumulativePercent += slicePercent;
    const endPercent = cumulativePercent;
    const [startX, startY] = getCoordinatesForPercent(startPercent);
    const [endX, endY] = getCoordinatesForPercent(endPercent);
    const largeArcFlag = slicePercent > 0.5 ? 1 : 0;
    const pathData = [`M ${startX} ${startY}`, `A 1 1 0 ${largeArcFlag} 1 ${endX} ${endY}`, `L 0 0`].join(' ');
    return { pathData, color: CHART_COLORS[i % CHART_COLORS.length], ...slice };
  });

  return (
    <div className="flex items-center gap-4">
      <div className="w-32 h-32 flex-shrink-0 relative">
        <svg viewBox="-1 -1 2 2" className="transform -rotate-90 w-full h-full">
           {slices.map((slice, i) => <path key={i} d={slice.pathData} fill={slice.color} />)}
           <circle cx="0" cy="0" r="0.6" fill="white" />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-stone-500 flex-col">
           <span>總計</span><span>${total.toLocaleString()}</span>
        </div>
      </div>
      <div className="flex-1 space-y-1 text-xs">
        {data.slice(0, 5).map((d, i) => (
          <div key={i} className="flex justify-between items-center">
            <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}></span><span className="text-stone-600 truncate max-w-[80px]">{d.label}</span></div>
            <span className="font-bold text-stone-700">${d.value.toLocaleString()}</span>
          </div>
        ))}
        {data.length > 5 && <div className="text-stone-400 pl-4">...還有 {data.length - 5} 項</div>}
      </div>
    </div>
  );
};

// --- Main App Component ---
export default function App() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('company'); 
  
  // Data States
  const [companyTx, setCompanyTx] = useState([]);
  const [dailyTx, setDailyTx] = useState([]);
  const [todos, setTodos] = useState([]);
  const [events, setEvents] = useState([]);
  
  // UI States
  const [todoFilter, setTodoFilter] = useState('待辦事項');
  const [companySubTab, setCompanySubTab] = useState('income');
  const [showCompanyChart, setShowCompanyChart] = useState(false);
  const [showDailyChart, setShowDailyChart] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState(null); 
  const [editingItem, setEditingItem] = useState(null); 
  
  // Confirm Modal State
  const [confirmConfig, setConfirmConfig] = useState({ isOpen: false, title: '', message: '', onConfirm: null });

  // --- Auth & Init (Simplified) ---
  useEffect(() => {
    // 直接使用匿名登入
    signInAnonymously(auth).catch(err => console.error("Login Failed:", err));
    return onAuthStateChanged(auth, setUser);
  }, []);

  // --- Data Listeners ---
  useEffect(() => {
    if (!user) return;
    const getPublicCollection = (name) => collection(db, 'artifacts', appId, 'public', 'data', name);
    
    // Error handling added to listeners
    const unsubCompany = onSnapshot(query(getPublicCollection('company_tx'), orderBy('date', 'desc')), 
      s => setCompanyTx(s.docs.map(d => ({ id: d.id, ...d.data() }))),
      e => console.error("Company Sync Error:", e)
    );
    
    const unsubDaily = onSnapshot(query(getPublicCollection('daily_tx'), orderBy('date', 'desc')), 
      s => setDailyTx(s.docs.map(d => ({ id: d.id, ...d.data() }))),
      e => console.error("Daily Sync Error:", e)
    );
    
    const unsubTodos = onSnapshot(query(getPublicCollection('todos'), orderBy('createdAt', 'desc')), 
      s => setTodos(s.docs.map(d => ({ id: d.id, ...d.data() }))),
      e => console.error("Todos Sync Error:", e)
    );
    
    const unsubEvents = onSnapshot(query(getPublicCollection('events'), orderBy('date', 'asc')), 
      s => setEvents(s.docs.map(d => ({ id: d.id, ...d.data() }))),
      e => console.error("Events Sync Error:", e)
    );

    return () => { unsubCompany(); unsubDaily(); unsubTodos(); unsubEvents(); };
  }, [user]);

  // --- Handlers ---
  const triggerDelete = (collectionName, id, title = "確定要刪除嗎？") => {
    setConfirmConfig({
      isOpen: true,
      title,
      message: "刪除後將無法復原此項目。",
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', collectionName, id));
        } catch (e) { console.error(e); }
        setConfirmConfig(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const triggerEdit = (item, type) => {
    setEditingItem(item);
    setModalType(type);
    setIsModalOpen(true);
  };

  const toggleTodo = async (todo) => {
    try { await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'todos', todo.id), { isDone: !todo.isDone }); } catch (e) { console.error(e); }
  };

  // --- Views ---
  const CalendarView = () => {
    const today = new Date().toISOString().split('T')[0];
    const todayEvents = events.filter(e => e.date === today);
    const upcomingEvents = events.filter(e => e.date > today);

    return (
      <div className="space-y-4 pb-24">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-stone-800">行事曆</h2>
          <ActionButton onClick={() => { setEditingItem(null); setModalType('event'); setIsModalOpen(true); }} className="!py-2 !px-4 text-sm"><Plus size={16} /> 新增</ActionButton>
        </div>
        <Card className="bg-emerald-50 border-emerald-100">
          <div className="flex items-center gap-2 text-emerald-800 font-bold mb-3"><CalendarIcon size={20} /><span>今日事項 ({today})</span></div>
          {todayEvents.length === 0 ? <p className="text-stone-400 text-sm text-center py-4">今天沒有安排，好好休息吧！🌿</p> : 
            <div className="space-y-3">
              {todayEvents.map(ev => (
                <div key={ev.id} className="bg-white p-3 rounded-xl shadow-sm flex flex-col gap-1 relative group">
                   <div className="absolute top-2 right-2 flex gap-1 z-10">
                     <button type="button" onClick={() => triggerEdit(ev, 'event')} className="text-stone-300 hover:text-emerald-500 p-2"><Pencil size={16}/></button>
                     <button type="button" onClick={() => triggerDelete('events', ev.id)} className="text-stone-300 hover:text-rose-500 p-2"><X size={16}/></button>
                   </div>
                  <div className="flex items-center gap-2 font-bold text-stone-700"><Clock size={14} className="text-emerald-500" />{ev.time}</div>
                  <div className="text-lg text-stone-800">{ev.title}</div>
                  {ev.location && <div className="flex items-center gap-1 text-sm text-stone-500"><MapPin size={12} /> {ev.location}</div>}
                </div>
              ))}
            </div>
          }
        </Card>
        <h3 className="text-lg font-bold text-stone-600 mt-6 ml-1">即將到來</h3>
        <div className="space-y-3">
          {upcomingEvents.length === 0 && <p className="text-stone-400 text-sm ml-1">沒有即將到來的活動。</p>}
          {upcomingEvents.map(ev => (
            <Card key={ev.id} className="!p-4 flex justify-between items-center group relative">
              <div>
                 <div className="text-xs font-bold text-emerald-600 bg-emerald-50 inline-block px-2 py-1 rounded-lg mb-1">{ev.date}</div>
                <div className="font-bold text-stone-700">{ev.title}</div>
                <div className="text-sm text-stone-400 flex items-center gap-1 mt-1">{ev.time} @ {ev.location || '無地點'}</div>
              </div>
              <div className="flex items-center gap-1 z-10">
                 <button type="button" onClick={() => triggerEdit(ev, 'event')} className="text-stone-300 hover:text-emerald-500 p-2"><Pencil size={18}/></button>
                 <button type="button" onClick={() => triggerDelete('events', ev.id)} className="text-stone-300 hover:text-rose-500 p-2"><Trash2 size={18}/></button>
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  };

  const CompanyView = () => {
    // 1. Calculate All-time Totals for Capital
    // Logic: Asset only increases by Surplus (8% - fee). If surplus is undefined (legacy), use netAmount.
    const allTimeAssetGain = companyTx.filter(t => t.type === 'income').reduce((sum, t) => sum + (Number(t.surplus !== undefined ? t.surplus : t.netAmount) || 0), 0);
    const allTimeExpense = companyTx.filter(t => t.type === 'expense').reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
    const currentAssets = COMPANY_CAPITAL + allTimeAssetGain - allTimeExpense;

    // 2. Filter by Month
    const filteredTx = companyTx.filter(tx => tx.date.startsWith(selectedMonth));
    
    // Monthly stats for display
    const monthlyRevenue = filteredTx.filter(t => t.type === 'income').reduce((sum, t) => sum + (Number(t.rawAmount || t.netAmount) || 0), 0);
    // Adjusted monthlyAssetGain logic to use surplus
    const monthlyAssetGain = filteredTx.filter(t => t.type === 'income').reduce((sum, t) => sum + (Number(t.surplus !== undefined ? t.surplus : t.netAmount) || 0), 0);
    const monthlyExpense = filteredTx.filter(t => t.type === 'expense').reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

    const chartData = useMemo(() => {
      const targetTx = filteredTx.filter(t => t.type === companySubTab);
      const categoryMap = {};
      targetTx.forEach(tx => {
        // Chart uses Raw amount for income breakdown to see where money comes from
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
        <div className="flex bg-stone-200 p-1 rounded-2xl">
          <button onClick={() => setCompanySubTab('income')} className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all ${companySubTab === 'income' ? 'bg-white text-emerald-700 shadow-sm' : 'text-stone-500'}`}>收入紀錄</button>
          <button onClick={() => setCompanySubTab('expense')} className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all ${companySubTab === 'expense' ? 'bg-white text-rose-600 shadow-sm' : 'text-stone-500'}`}>支出紀錄</button>
        </div>
        <div className="flex justify-between items-center">
            <button onClick={() => setShowCompanyChart(!showCompanyChart)} className={`p-2 rounded-xl text-sm font-bold flex items-center gap-1 ${showCompanyChart ? 'bg-emerald-100 text-emerald-700' : 'bg-white text-stone-500 border border-stone-200'}`}>{showCompanyChart ? <List size={16}/> : <PieChartIcon size={16}/>} {showCompanyChart ? '列表' : '分析'}</button>
           <ActionButton onClick={() => { setEditingItem(null); setModalType(companySubTab); setIsModalOpen(true); }} variant={companySubTab === 'income' ? 'primary' : 'danger'} className="!rounded-xl text-sm"><Plus size={16}/> 新增</ActionButton>
        </div>
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
                      <button type="button" onClick={() => triggerEdit(tx, companySubTab)} className="text-stone-300 hover:text-emerald-500 text-xs p-1"><Pencil size={14}/></button>
                      <button type="button" onClick={() => triggerDelete('company_tx', tx.id)} className="text-stone-300 hover:text-red-500 text-xs p-1"><Trash2 size={14}/></button>
                    </div>
                  </div>
              </Card>
            ))}
            {filteredTx.filter(t => t.type === companySubTab).length === 0 && <div className="text-center py-8 text-stone-400">本月沒有紀錄 🍃</div>}
          </div>
        }
      </div>
    );
  };

  const DailyView = () => {
    const monthlyExpenses = dailyTx.filter(tx => tx.date.startsWith(selectedMonth));
    const totalExpense = monthlyExpenses.reduce((sum, t) => sum + Number(t.amount), 0);

    const monthlyIncomes = companyTx.filter(tx => tx.type === 'income' && tx.date.startsWith(selectedMonth));
    const totalIncome = monthlyIncomes.reduce((sum, t) => sum + Number(t.netAmount || 0), 0);

    const balance = totalIncome - totalExpense;
    
    const combinedList = [
      ...monthlyExpenses.map(t => ({ ...t, isIncome: false })),
      ...monthlyIncomes.map(t => ({ ...t, isIncome: true, amount: t.netAmount, item: `分潤: ${t.item}` }))
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const chartData = useMemo(() => {
        const categoryMap = {};
        monthlyExpenses.forEach(tx => { categoryMap[tx.item] = (categoryMap[tx.item] || 0) + Number(tx.amount); });
        return Object.keys(categoryMap).map(k => ({ label: k, value: categoryMap[k] })).sort((a,b) => b.value - a.value);
    }, [monthlyExpenses]);

    return (
      <div className="space-y-4 pb-24">
         <div className="flex justify-between items-center bg-white p-2 rounded-2xl shadow-sm border border-stone-100 mb-2">
           <span className="text-sm font-bold text-stone-500 pl-2">月份篩選</span>
           <input 
             type="month" 
             value={selectedMonth} 
             onChange={e => setSelectedMonth(e.target.value)} 
             className="bg-stone-50 border-none text-stone-700 font-bold rounded-xl px-3 py-1 text-sm focus:ring-2 focus:ring-emerald-200"
           />
        </div>

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
            <ActionButton onClick={() => { setEditingItem(null); setModalType('daily'); setIsModalOpen(true); }} className="flex-1"><Plus size={18} /> 記一筆</ActionButton>
            <ActionButton onClick={() => { setEditingItem(null); setModalType('daily_fixed'); setIsModalOpen(true); }} variant="secondary" className="!px-3">固定支出</ActionButton>
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
                            <button type="button" onClick={() => triggerEdit(tx, 'daily')} className="text-stone-300 hover:text-emerald-500 text-xs p-1"><Pencil size={14}/></button>
                            <button type="button" onClick={() => triggerDelete('daily_tx', tx.id)} className="text-stone-300 hover:text-red-500 text-xs p-1"><Trash2 size={14}/></button>
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
  };

  const TodoView = () => {
    const filteredTodos = todos.filter(t => t.type === todoFilter);
    return (
      <div className="space-y-4 pb-24">
         <h2 className="text-2xl font-bold text-stone-800 mb-4">待辦清單</h2>
         <div className="flex gap-2 mb-4">
            <button onClick={() => setTodoFilter('待辦事項')} className={`px-4 py-2 rounded-xl text-sm font-bold border-2 ${todoFilter === '待辦事項' ? 'bg-emerald-100 border-emerald-200 text-emerald-700' : 'bg-white border-stone-100 text-stone-400'}`}>待辦事項</button>
            <button onClick={() => setTodoFilter('購物清單')} className={`px-4 py-2 rounded-xl text-sm font-bold border-2 ${todoFilter === '購物清單' ? 'bg-orange-100 border-orange-200 text-orange-700' : 'bg-white border-stone-100 text-stone-400'}`}>購物清單</button>
         </div>
         <div className="flex gap-2 mb-4"><ActionButton onClick={() => { setEditingItem(null); setModalType('todo'); setIsModalOpen(true); }} className="!py-2 !px-4 text-sm w-full"><Plus size={16}/> 新增項目</ActionButton></div>
         <div className="grid grid-cols-1 gap-3">
           {filteredTodos.map(todo => (
             <div key={todo.id} className={`bg-white p-4 rounded-2xl shadow-sm border flex items-center gap-3 transition-colors ${todo.isDone ? 'border-emerald-200 bg-emerald-50/50' : 'border-stone-100'}`}>
                <button type="button" onClick={() => toggleTodo(todo)} className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all flex-shrink-0 ${todo.isDone ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-stone-300 hover:border-emerald-400'}`}>{todo.isDone && <Check size={14} strokeWidth={3} />}</button>
                <div className="flex-1"><span className={`text-stone-700 font-medium ${todo.isDone ? 'line-through text-stone-400' : ''}`}>{todo.text}</span></div>
                {todoFilter === '購物清單' && <span className="text-xs bg-orange-100 text-orange-600 px-2 py-1 rounded-md">Buy</span>}
                <div className="flex gap-1">
                  <button type="button" onClick={() => triggerEdit(todo, 'todo')} className="text-stone-300 hover:text-emerald-500 p-2 z-10"><Pencil size={16}/></button>
                  <button type="button" onClick={() => triggerDelete('todos', todo.id)} className="text-stone-300 hover:text-rose-500 p-2 z-10"><Trash2 size={16}/></button>
                </div>
             </div>
           ))}
           {filteredTodos.length === 0 && <div className="text-center text-stone-400 py-10">{todoFilter === '購物清單' ? '沒有要買的東西 🛒' : '事情都做完了！ ✨'}</div>}
         </div>
      </div>
    );
  };

  // Removed MembersView

  // --- Confirm Modal ---
  const ConfirmModal = () => {
    if (!confirmConfig.isOpen) return null;
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm" onClick={() => setConfirmConfig(p => ({...p, isOpen: false}))}></div>
        <Card className="w-full max-w-xs relative z-10 animate-in fade-in zoom-in duration-200 text-center">
           <div className="w-12 h-12 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-4 text-rose-500"><AlertTriangle size={24}/></div>
           <h3 className="text-lg font-bold text-stone-800 mb-2">{confirmConfig.title}</h3>
           <p className="text-stone-500 text-sm mb-6">{confirmConfig.message}</p>
           <div className="flex gap-2">
             <button onClick={() => setConfirmConfig(p => ({...p, isOpen: false}))} className="flex-1 py-3 bg-stone-100 text-stone-600 font-bold rounded-xl hover:bg-stone-200">取消</button>
             <button onClick={confirmConfig.onConfirm} className="flex-1 py-3 bg-rose-500 text-white font-bold rounded-xl hover:bg-rose-600 shadow-lg shadow-rose-200">刪除</button>
           </div>
        </Card>
      </div>
    );
  };

  const ModalForm = () => {
    if (!isModalOpen) return null;
    const today = new Date().toISOString().split('T')[0];
    const [date, setDate] = useState(today);
    const [amount, setAmount] = useState('');
    const [item, setItem] = useState('');
    const [category, setCategory] = useState(INCOME_CATEGORIES[0]);
    const [fixedItems, setFixedItems] = useState(FIXED_EXPENSE_DEFAULTS.map(i => ({...i, value: ''})));
    const [isNonCathay, setIsNonCathay] = useState(false);
    const [time, setTime] = useState('12:00');
    const [location, setLocation] = useState('');
    const [todoType, setTodoType] = useState('待辦事項');

    useEffect(() => {
      if (editingItem) {
        setDate(editingItem.date || today);
        if (modalType === 'income') {
           setAmount(editingItem.rawAmount);
           setItem(editingItem.item);
           setIsNonCathay(editingItem.fee > 0);
           setCategory(INCOME_CATEGORIES.includes(editingItem.item) ? editingItem.item : '其他');
           if (!INCOME_CATEGORIES.includes(editingItem.item)) setItem(editingItem.item);
        } else if (modalType === 'expense' || modalType === 'daily') {
           setAmount(editingItem.amount);
           setItem(editingItem.item);
           const cats = modalType === 'expense' ? EXPENSE_CATEGORIES : DAILY_CATEGORIES;
           setCategory(cats.includes(editingItem.item) ? editingItem.item : '其他');
           if (!cats.includes(editingItem.item)) setItem(editingItem.item);
        } else if (modalType === 'event') {
           setItem(editingItem.title);
           setTime(editingItem.time);
           setLocation(editingItem.location);
        } else if (modalType === 'todo') {
           setItem(editingItem.text);
           setTodoType(editingItem.type);
        }
      } else {
        setDate(today);
        setAmount('');
        setItem('');
        setTime('12:00');
        setLocation('');
        setIsNonCathay(false);
        if (modalType === 'daily' || modalType === 'daily_fixed') setCategory(DAILY_CATEGORIES[0]);
        else if (modalType === 'expense') setCategory(EXPENSE_CATEGORIES[0]);
        else if (modalType === 'income') setCategory(INCOME_CATEGORIES[0]);
        else if (modalType === 'todo') setTodoType('待辦事項');
      }
    }, [editingItem, modalType, isModalOpen]);

    const handleFixedChange = (index, val) => { const newItems = [...fixedItems]; newItems[index].value = val; setFixedItems(newItems); };
    const handleSubmit = async (e) => {
      e.preventDefault();
      try {
        const commonData = { createdAt: editingItem ? editingItem.createdAt : serverTimestamp() }; 
        const collectionName = modalType === 'income' || modalType === 'expense' ? 'company_tx' : modalType === 'daily' || modalType === 'daily_fixed' ? 'daily_tx' : modalType === 'todo' ? 'todos' : 'events';
        
        let docData = {};

        if (modalType === 'income') {
          const numAmount = Number(amount);
          const tax = Math.round(numAmount * 0.05);
          const baseSurplus = Math.round(numAmount * 0.08);
          const fee = isNonCathay ? 15 : 0;
          const surplus = baseSurplus - fee;
          const net = numAmount - tax - baseSurplus;
          
          docData = { date, item: category === '其他' ? item : category, rawAmount: numAmount, tax, surplus, fee, netAmount: net, type: 'income', ...commonData };
        } else if (modalType === 'expense') {
          docData = { date, item: category === '其他' ? item : category, amount: Number(amount), type: 'expense', ...commonData };
        } else if (modalType === 'daily') {
          docData = { date, item: category === '其他' ? item : category, amount: Number(amount), ...commonData };
        } else if (modalType === 'daily_fixed') {
           const batchPromises = fixedItems.filter(fi => Number(fi.value) > 0).map(fi => addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'daily_tx'), { date, item: fi.label, amount: Number(fi.value), ...commonData }));
           await Promise.all(batchPromises);
           setIsModalOpen(false);
           return;
        } else if (modalType === 'todo') {
           docData = { text: item, type: todoType, isDone: editingItem ? editingItem.isDone : false, ...commonData };
        } else if (modalType === 'event') {
           docData = { title: item, date, time, location, ...commonData };
        }

        if (editingItem) {
           await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', collectionName, editingItem.id), docData);
        } else {
           await addDoc(collection(db, 'artifacts', appId, 'public', 'data', collectionName), docData);
        }
        setIsModalOpen(false);
      } catch (err) { alert("儲存失敗: " + err.message); }
    };

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}></div>
        <Card className="w-full max-w-sm relative z-10 animate-in fade-in zoom-in duration-200 max-h-[85vh] overflow-y-auto">
           <button onClick={() => setIsModalOpen(false)} className="absolute top-4 right-4 text-stone-400 hover:text-stone-600"><X size={24} /></button>
           <h3 className="text-xl font-bold text-stone-800 mb-6">
             {editingItem ? '編輯項目' : 
               <>
                 {modalType === 'income' && '新增公司收入'}{modalType === 'expense' && '新增公司支出'}{modalType === 'daily' && '記一筆日常開銷'}{modalType === 'daily_fixed' && '新增固定支出'}{modalType === 'todo' && '新增待辦事項'}{modalType === 'event' && '新增行程'}
               </>
             }
           </h3>
           <form onSubmit={handleSubmit}>
              {['income', 'expense', 'daily', 'event', 'daily_fixed'].includes(modalType) && <Input type="date" value={date} onChange={e => setDate(e.target.value)} label="日期" required />}
              {modalType === 'daily_fixed' && !editingItem && <div className="space-y-3 mb-4"><p className="text-xs text-stone-500 mb-2">請輸入本月金額 (填寫項目將自動加入)</p>{fixedItems.map((fi, idx) => (<div key={fi.label} className="flex items-center gap-2"><label className="text-sm font-bold text-stone-600 w-20">{fi.label}</label><input type="number" placeholder="0" value={fi.value} onChange={(e) => handleFixedChange(idx, e.target.value)} className="flex-1 bg-stone-50 border border-stone-200 rounded-lg p-2 text-stone-700 outline-none focus:border-emerald-300 text-right no-spinner" /></div>))}</div>}
              {modalType === 'event' && <Input type="time" value={time} onChange={e => setTime(e.target.value)} label="時間" required />}
              {modalType === 'income' && <Select value={category} onChange={e => setCategory(e.target.value)} options={INCOME_CATEGORIES} label="項目分類" />}
              {modalType === 'expense' && <Select value={category} onChange={e => setCategory(e.target.value)} options={EXPENSE_CATEGORIES} label="項目分類" />}
              {modalType === 'daily' && <Select value={category} onChange={e => setCategory(e.target.value)} options={DAILY_CATEGORIES} label="項目分類" />}
              {modalType === 'todo' && <Select value={todoType} onChange={e => setTodoType(e.target.value)} options={['待辦事項', '購物清單']} label="類型" />}
              {(modalType === 'todo' || modalType === 'event' || (category === '其他' && modalType !== 'daily_fixed')) && <Input value={item} onChange={e => setItem(e.target.value)} placeholder={modalType === 'event' ? "行程名稱" : "輸入名稱..."} label="名稱" required />}
              {modalType === 'event' && <Input value={location} onChange={e => setLocation(e.target.value)} placeholder="地點" label="地點" />}
              {['income', 'expense', 'daily'].includes(modalType) && <Input type="number" inputMode="numeric" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0" label="金額" required className="no-spinner" />}
              
              {modalType === 'income' && (
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

              <ActionButton type="submit" className="w-full mt-2">{modalType === 'daily_fixed' && !editingItem ? '一鍵加入' : (editingItem ? '確認修改' : '確認新增')}</ActionButton>
           </form>
        </Card>
      </div>
    );
  };

  const BottomNav = () => {
    const navItems = [{ id: 'calendar', icon: CalendarIcon, label: '行事曆' }, { id: 'company', icon: Briefcase, label: '公司' }, { id: 'daily', icon: Wallet, label: '日常' }, { id: 'todo', icon: CheckSquare, label: '待辦' }];
    return (
      <div className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-md border-t border-stone-100 pb-safe pt-2 px-6 z-40 rounded-t-3xl shadow-[0_-5px_20px_rgba(0,0,0,0.03)]">
         <div className="flex justify-between items-center max-w-md mx-auto h-16">{navItems.map(item => { const isActive = activeTab === item.id; return (<button key={item.id} onClick={() => setActiveTab(item.id)} className={`flex flex-col items-center gap-1 transition-all duration-300 ${isActive ? 'text-emerald-600 -translate-y-2' : 'text-stone-400 hover:text-stone-600'}`}><div className={`p-2 rounded-2xl transition-all ${isActive ? 'bg-emerald-100 shadow-sm' : 'bg-transparent'}`}><item.icon size={24} strokeWidth={isActive ? 2.5 : 2} /></div><span className={`text-[10px] font-bold ${isActive ? 'opacity-100' : 'opacity-0 h-0 overflow-hidden'}`}>{item.label}</span></button>) })}</div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#FDF6E3] text-stone-700 font-sans selection:bg-emerald-200">
       <style>{`@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@400;500;700&display=swap'); body { font-family: 'Microsoft JhengHei', 'Noto Sans TC', sans-serif; } .pb-safe { padding-bottom: env(safe-area-inset-bottom, 20px); } input[type=number]::-webkit-inner-spin-button, input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; } .no-spinner { -moz-appearance: textfield; }`}</style>
       <div className="max-w-md mx-auto min-h-screen relative shadow-2xl bg-stone-50">
          <div className="h-10 w-full bg-stone-50"></div>
          <main className="p-5">{activeTab === 'calendar' && <CalendarView />}{activeTab === 'company' && <CompanyView />}{activeTab === 'daily' && <DailyView />}{activeTab === 'todo' && <TodoView />}</main>
          <ModalForm />
          <ConfirmModal />
          <BottomNav />
       </div>
    </div>
  );
}