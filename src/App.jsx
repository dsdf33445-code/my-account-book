import React, { useState, useEffect, useCallback } from 'react';
import { initializeApp } from 'firebase/app';
import './index.css';
import { User as UserIcon } from 'lucide-react'; 
import ProfileView from './components/views/ProfileView'; 
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
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = firebaseConfig.projectId;

export default function App() {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('company');
  
  // Data States
  const [companyTx, setCompanyTx] = useState([]);
  const [dailyTx, setDailyTx] = useState([]);
  const [events, setEvents] = useState([]);
  const [todos, setTodos] = useState([]);

  // UI States
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [companySubTab, setCompanySubTab] = useState('income');
  const [showCompanyChart, setShowCompanyChart] = useState(false);
  const [showDailyChart, setShowDailyChart] = useState(false);
  const [todoFilter, setTodoFilter] = useState('待辦事項');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState('income');
  const [editingItem, setEditingItem] = useState(null);
  const [confirmModal, setConfirmModal] = useState({ show: false, collection: '', id: '' });

  // 🆕 核心修正：優化驗證邏輯，防止重複登入與狀態遺失
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        // 如果已經有使用者（不論是 Google 還是匿名），直接設定狀態
        setUser(currentUser);
        setIsLoading(false);
      } else {
        // 只有在完全沒有使用者狀態時，才嘗試匿名登入
        signInAnonymously(auth)
          .then((result) => {
            setUser(result.user);
            setIsLoading(false);
          })
          .catch((error) => {
            console.error("Firebase Auth Error:", error);
            setIsLoading(false);
          });
      }
    });

    return () => unsubscribe();
  }, []);

  // Firestore Realtime Listeners
  useEffect(() => {
    if (!user) return;
    const base = `artifacts/${appId}/public/data`;
    
    const unsub = [
      onSnapshot(query(collection(db, `${base}/company_tx`), orderBy('date', 'desc')), s => setCompanyTx(s.docs.map(d => ({id: d.id, ...d.data()})))),
      onSnapshot(query(collection(db, `${base}/daily_tx`), orderBy('date', 'desc')), s => setDailyTx(s.docs.map(d => ({id: d.id, ...d.data()})))),
      onSnapshot(query(collection(db, `${base}/events`), orderBy('date', 'asc')), s => setEvents(s.docs.map(d => ({id: d.id, ...d.data()})))),
      onSnapshot(query(collection(db, `${base}/todos`), orderBy('createdAt', 'desc')), s => setTodos(s.docs.map(d => ({id: d.id, ...d.data()})))),
    ];
    return () => unsub.forEach(fn => fn());
  }, [user, appId]);

  const openModal = (type, item = null) => {
    setModalType(type);
    setEditingItem(item);
    setIsModalOpen(true);
  };

  const triggerEdit = (item, type) => openModal(type, item);
  const triggerDelete = (col, id) => setConfirmModal({ show: true, collection: col, id });

  const handleDelete = async () => {
    try {
      await deleteDoc(doc(db, `artifacts/${appId}/public/data/${confirmModal.collection}`, confirmModal.id));
      setConfirmModal({ show: false, collection: '', id: '' });
    } catch (err) { alert("刪除失敗"); }
  };

  const toggleTodo = async (todo) => {
    await updateDoc(doc(db, `artifacts/${appId}/public/data/todos`, todo.id), { isDone: !todo.isDone });
  };

  if (isLoading) return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center">
      <div className="animate-pulse flex flex-col items-center gap-4">
        <div className="w-12 h-12 bg-emerald-200 rounded-full"></div>
        <p className="text-stone-400 font-bold">載入中...</p>
      </div>
    </div>
  );

  // Components (Nav/Modal)
  const BottomNav = () => (
    <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-md bg-white/80 backdrop-blur-xl border border-white/20 shadow-[0_20px_50px_rgba(0,0,0,0.1)] rounded-3xl p-2 z-40 flex justify-around items-center">
      {[
        { id: 'company', icon: Briefcase, label: '公司' },
        { id: 'daily', icon: Wallet, label: '日常' },
        { id: 'calendar', icon: CalendarIcon, label: '行事曆' },
        { id: 'todo', icon: CheckSquare, label: '待辦' },
        { id: 'profile', icon: UserIcon, label: '我的' }
      ].map(tab => (
        <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`relative flex flex-col items-center py-2 px-4 rounded-2xl transition-all duration-300 ${activeTab === tab.id ? 'text-emerald-600 scale-110' : 'text-stone-400 hover:text-stone-600'}`}>
          <tab.icon size={22} strokeWidth={activeTab === tab.id ? 2.5 : 2} />
          <span className="text-[10px] mt-1 font-bold">{tab.label}</span>
          {activeTab === tab.id && <div className="absolute -bottom-1 w-1 h-1 bg-emerald-600 rounded-full"></div>}
        </button>
      ))}
    </nav>
  );

  const ConfirmModal = () => !confirmModal.show ? null : (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-stone-900/60 backdrop-blur-sm" onClick={() => setConfirmModal({show:false})}></div>
      <Card className="w-full max-w-xs relative z-10 text-center">
        <AlertTriangle className="mx-auto text-rose-500 mb-4" size={48} />
        <h3 className="text-lg font-bold text-stone-800 mb-2">確定要刪除嗎？</h3>
        <p className="text-stone-500 text-sm mb-6">此動作無法復原。</p>
        <div className="flex gap-3">
          <button onClick={() => setConfirmModal({show:false})} className="flex-1 py-3 font-bold text-stone-500 bg-stone-100 rounded-xl">取消</button>
          <button onClick={handleDelete} className="flex-1 py-3 font-bold text-white bg-rose-500 rounded-xl shadow-lg shadow-rose-200">刪除</button>
        </div>
      </Card>
    </div>
  );

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 pb-10">
       <div className="max-w-md mx-auto px-4 pt-6">
          <main className="animate-in fade-in slide-in-from-bottom-4 duration-500">
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
                db={db}
                appId={appId}
              />
            )}

            {activeTab === 'calendar' && (
              <CalendarView 
                events={events}
                onAddClick={() => openModal('event')}
                onEditClick={triggerEdit}
                onDeleteClick={triggerDelete}
              />
            )}

            {activeTab === 'daily' && (
              <DailyView 
                dailyTx={dailyTx}
                selectedMonth={selectedMonth}
                setSelectedMonth={setSelectedMonth}
                showDailyChart={showDailyChart}
                setShowDailyChart={setShowDailyChart}
                onAddClick={() => openModal('daily')}
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

            {activeTab === 'profile' && (
              <ProfileView user={user} />
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