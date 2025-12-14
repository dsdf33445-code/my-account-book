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
      <h2 className="text-2xl font-bold text-stone-800 mb-4">我的帳號</h2>

      <Card>
         <div className="flex items-center gap-4">
           <div className="w-16 h-16 bg-stone-200 rounded-full flex items-center justify-center text-stone-500">
             <User size={32} />
           </div>
           <div>
             <div className="text-xl font-bold text-stone-800">使用者 ID</div>
             <div className="text-sm text-stone-500 truncate w-48">{user?.uid}</div>
           </div>
         </div>
      </Card>

      {/* Account Status Card */}
      <Card>
        <div className="text-lg font-bold text-stone-700 mb-3">帳號安全性</div>
        {user?.isAnonymous ? (
          <div className="bg-orange-50 border border-orange-100 rounded-xl p-4 w-full mt-2 space-y-3">
            <div className="flex items-center gap-3">
              <div className="bg-orange-100 p-2 rounded-full text-orange-600">
                <AlertTriangle size={20} />
              </div>
              <div className="text-sm font-bold text-orange-800">匿名登入風險</div>
            </div>
            <p className="text-xs text-orange-600 leading-relaxed">
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
        {/* Google 登入後才顯示登出按鈕 */}
        {!user?.isAnonymous && (
           <button 
             onClick={handleLogout}
             className="w-full py-4 bg-white border border-stone-200 rounded-2xl text-stone-500 font-bold flex items-center justify-center gap-2 shadow-sm hover:shadow-md"
           >
             <LogOut size={20} /> 登出
           </button>
        )}
      </div>
    </div>
  );
}