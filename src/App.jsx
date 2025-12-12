import React, { useState, useEffect, useCallback } from 'react';
import { initializeApp } from 'firebase/app';
import './index.css';
import { 
  getAuth, 
  signInAnonymously, 
  onAuthStateChanged
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  onSnapshot, 
  query, 
  orderBy, 
  deleteDoc,
  updateDoc,
  doc
} from 'firebase/firestore';
import { 
  Briefcase, 
  Wallet, 
  CheckSquare, 
  Calendar as CalendarIcon,
  AlertTriangle,
} from 'lucide-react';

// --- Components ---
import ModalForm from './components/ModalForm';
import { Card } from './components/UI';
import CompanyView from './components/views/CompanyView';
import DailyView from './components/views/DailyView';
import CalendarView from './components/views/CalendarView';
import TodoView from './components/views/TodoView';

// --- 1. Firebase Config ---
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app); 
const db = getFirestore(app);
const appId = "my-account-book-v1";

export default function App() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('company'); 
  const [isLoading, setIsLoading] = useState(true);

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

  // --- Auth & Init ---
  useEffect(() => {
    signInAnonymously(auth).catch(err => console.error("Login Failed:", err));
    return onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (!u) setIsLoading(false);
    });
  }, []);

  // --- Data Listeners ---
  useEffect(() => {
    if (!user) return;
    setIsLoading(true);
    const getPublicCollection = (name) => collection(db, 'artifacts', appId, 'public', 'data', name);
    
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
      s => {
        setEvents(s.docs.map(d => ({ id: d.id, ...d.data() })));
        setIsLoading(false);
      },
      e => console.error("Events Sync Error:", e)
    );

    return () => { unsubCompany(); unsubDaily(); unsubTodos(); unsubEvents(); };
  }, [user]);

  // --- Optimized Global Handlers (useCallback) ---
  
  const triggerDelete = useCallback((collectionName, id, title = "確定要刪除嗎？") => {
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
  }, []); // db, appId are stable external/consts

  const triggerEdit = useCallback((item, type) => {
    setEditingItem(item);
    setModalType(type);
    setIsModalOpen(true);
  }, []);

  const toggleTodo = useCallback(async (todo) => {
    try { 
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'todos', todo.id), { 
        isDone: !todo.isDone 
      }); 
    } catch (e) { console.error(e); }
  }, []);

  const openModal = useCallback((type) => {
    setEditingItem(null);
    setModalType(type);
    setIsModalOpen(true);
  }, []);

  // --- Sub-components (Can be extracted too, but okay here for now) ---
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

  const BottomNav = () => {
    const navItems = [{ id: 'calendar', icon: CalendarIcon, label: '行事曆' }, { id: 'company', icon: Briefcase, label: '公司' }, { id: 'daily', icon: Wallet, label: '日常' }, { id: 'todo', icon: CheckSquare, label: '待辦' }];
    return (
      <div className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-md border-t border-stone-100 pb-safe pt-2 px-6 z-40 rounded-t-3xl shadow-[0_-5px_20px_rgba(0,0,0,0.03)]">
         <div className="flex justify-between items-center max-w-md mx-auto h-16">{navItems.map(item => { const isActive = activeTab === item.id; return (<button key={item.id} onClick={() => setActiveTab(item.id)} className={`flex flex-col items-center gap-1 transition-all duration-300 ${isActive ? 'text-emerald-600 -translate-y-2' : 'text-stone-400 hover:text-stone-600'}`}><div className={`p-2 rounded-2xl transition-all ${isActive ? 'bg-emerald-100 shadow-sm' : 'bg-transparent'}`}><item.icon size={24} strokeWidth={isActive ? 2.5 : 2} /></div><span className={`text-[10px] font-bold ${isActive ? 'opacity-100' : 'opacity-0 h-0 overflow-hidden'}`}>{item.label}</span></button>) })}</div>
      </div>
    );
  };

  if (isLoading) return <div className="flex h-screen items-center justify-center text-stone-500">載入中...</div>;

  return (
    <div className="min-h-screen bg-[#FDF6E3] text-stone-700 font-sans selection:bg-emerald-200">
       <style>{`@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@400;500;700&display=swap'); body { font-family: 'Microsoft JhengHei', 'Noto Sans TC', sans-serif; } .pb-safe { padding-bottom: env(safe-area-inset-bottom, 20px); } input[type=number]::-webkit-inner-spin-button, input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; } .no-spinner { -moz-appearance: textfield; }`}</style>
       <div className="max-w-md mx-auto min-h-screen relative shadow-2xl bg-stone-50">
          <div className="h-10 w-full bg-stone-50"></div>
          <main className="p-5">
            {activeTab === 'calendar' && (
              <CalendarView 
                events={events}
                onAddClick={() => openModal('event')}
                onEditClick={triggerEdit}
                onDeleteClick={triggerDelete}
              />
            )}
            
            {activeTab === 'company' && (
              <CompanyView 
                companyTx={companyTx}
                selectedMonth={selectedMonth}
                setSelectedMonth={setSelectedMonth}
                companySubTab={companySubTab}
                setCompanySubTab={setCompanySubTab}
                showCompanyChart={showCompanyChart}
                setShowCompanyChart={setShowCompanyChart}
                onAddClick={() => openModal(companySubTab)}
                onEditClick={triggerEdit}
                onDeleteClick={triggerDelete}
              />
            )}

            {activeTab === 'daily' && (
              <DailyView 
                dailyTx={dailyTx}
                companyTx={companyTx}
                selectedMonth={selectedMonth}
                setSelectedMonth={setSelectedMonth}
                showDailyChart={showDailyChart}
                setShowDailyChart={setShowDailyChart}
                onAddClick={() => openModal('daily')}
                onAddFixedClick={() => openModal('daily_fixed')}
                onEditClick={triggerEdit}
                onDeleteClick={triggerDelete}
              />
            )}

            {activeTab === 'todo' && (
              <TodoView 
                todos={todos}
                todoFilter={todoFilter}
                setTodoFilter={setTodoFilter}
                onAddClick={() => openModal('todo')}
                onToggleTodo={toggleTodo}
                onEditClick={triggerEdit}
                onDeleteClick={triggerDelete}
              />
            )}
          </main>
          
          <ModalForm 
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            type={modalType}
            editingItem={editingItem}
            db={db}
            appId={appId}
          />
          <ConfirmModal />
          <BottomNav />
       </div>
    </div>
  );
}