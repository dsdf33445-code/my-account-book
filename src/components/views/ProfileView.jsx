import React, { useState } from 'react';
import { getAuth, GoogleAuthProvider, linkWithPopup, signOut } from 'firebase/auth';
import { User, LogOut, ShieldCheck, AlertTriangle } from 'lucide-react';
import { Card, ActionButton } from '../UI';

export default function ProfileView({ user }) {
  const [isProcessing, setIsProcessing] = useState(false);
  const auth = getAuth();

  // 處理綁定 Google 帳號
  const handleLinkGoogle = async () => {
    setIsProcessing(true);
    const provider = new GoogleAuthProvider();

    try {
      // 這是關鍵：將目前的匿名使用者 "連結" 到 Google 帳號
      await linkWithPopup(auth.currentUser, provider);
      alert("✅ 綁定成功！您的資料現在永久安全了。");
    } catch (error) {
      console.error(error);
      if (error.code === 'auth/credential-already-in-use') {
        alert("❌ 此 Google 帳號已被其他使用者綁定。請換一個帳號，或先登出再登入。");
      } else {
        alert("綁定失敗: " + error.message);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  // 登出
  const handleLogout = () => {
    if (confirm("確定要登出嗎？")) {
      signOut(auth);
    }
  };

  return (
    <div className="space-y-6 pb-24">
      <h2 className="text-2xl font-bold text-stone-800 mb-4">會員中心</h2>

      <Card className="flex flex-col items-center gap-4 py-8">
        <div className={`w-20 h-20 rounded-full flex items-center justify-center text-3xl shadow-sm ${user?.isAnonymous ? 'bg-stone-200 text-stone-500' : 'bg-emerald-100 text-emerald-600'}`}>
          {user?.photoURL ? <img src={user.photoURL} alt="User" className="w-full h-full rounded-full" /> : <User size={40} />}
        </div>
        
        <div className="text-center">
          <div className="text-lg font-bold text-stone-700">
            {user?.displayName || (user?.isAnonymous ? '訪客使用者' : '使用者')}
          </div>
          <div className="text-sm text-stone-400 font-mono mt-1">
            ID: {user?.uid?.slice(0, 6)}...
          </div>
        </div>

        {user?.isAnonymous ? (
          <div className="bg-orange-50 border border-orange-100 rounded-xl p-4 w-full mt-2">
            <div className="flex items-center gap-2 text-orange-600 font-bold mb-1">
              <AlertTriangle size={18} />
              <span>帳號尚未綁定</span>
            </div>
            <p className="text-xs text-orange-400 mb-3">
              您目前是匿名登入。若清除快取或更換手機，**資料將會永久遺失**。
            </p>
            <ActionButton 
              onClick={handleLinkGoogle} 
              className="w-full text-sm !py-2 bg-gradient-to-r from-orange-400 to-amber-500 border-none text-white shadow-orange-200"
              disabled={isProcessing}
            >
              {isProcessing ? '處理中...' : '立即綁定 Google'}
            </ActionButton>
          </div>
        ) : (
          <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 w-full mt-2 flex items-center gap-3">
            <div className="bg-emerald-100 p-2 rounded-full text-emerald-600">
              <ShieldCheck size={20} />
            </div>
            <div>
              <div className="text-sm font-bold text-emerald-800">帳號已保護</div>
              <div className="text-xs text-emerald-600">綁定於: {user?.email}</div>
            </div>
          </div>
        )}
      </Card>

      <div className="space-y-3">
        {!user?.isAnonymous && (
           <button 
             onClick={handleLogout}
             className="w-full py-4 bg-white border border-stone-200 rounded-2xl text-stone-500 font-bold flex items-center justify-center gap-2 hover:bg-stone-50 transition-colors"
           >
             <LogOut size={18} /> 登出帳號
           </button>
        )}
        <div className="text-center text-xs text-stone-300 mt-8">
          Build v1.0.0 • Mobile-first Design
        </div>
      </div>
    </div>
  );
}