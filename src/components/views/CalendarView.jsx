import React, { memo } from 'react';
import { Plus, Calendar as CalendarIcon, Clock, MapPin, Pencil, X, Trash2 } from 'lucide-react';
import { ActionButton, Card } from '../UI';

const CalendarView = memo(function CalendarView({
  events,
  onAddClick,
  onEditClick,
  onDeleteClick
}) {
  const today = new Date().toISOString().split('T')[0];
  const todayEvents = events.filter(e => e.date === today);
  const upcomingEvents = events.filter(e => e.date > today);

  return (
    <div className="space-y-4 pb-24">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold text-stone-800">行事曆</h2>
        <ActionButton onClick={onAddClick} className="!py-2 !px-4 text-sm"><Plus size={16} /> 新增</ActionButton>
      </div>
      
      {/* 今日事項 */}
      <Card className="bg-emerald-50 border-emerald-100">
        <div className="flex items-center gap-2 text-emerald-800 font-bold mb-3"><CalendarIcon size={20} /><span>今日事項 ({today})</span></div>
        {todayEvents.length === 0 ? <p className="text-stone-400 text-sm text-center py-4">今天沒有安排，好好休息吧！🌿</p> : 
          <div className="space-y-3">
            {todayEvents.map(ev => (
              <div key={ev.id} className="bg-white p-3 rounded-xl shadow-sm flex flex-col gap-1 relative group">
                 <div className="absolute top-2 right-2 flex gap-1 z-10">
                   <button type="button" onClick={() => onEditClick(ev, 'event')} className="text-stone-300 hover:text-emerald-500 p-2"><Pencil size={16}/></button>
                   <button type="button" onClick={() => onDeleteClick('events', ev.id)} className="text-stone-300 hover:text-rose-500 p-2"><X size={16}/></button>
                 </div>
                <div className="flex items-center gap-2 font-bold text-stone-700"><Clock size={14} className="text-emerald-500" />{ev.time}</div>
                <div className="text-lg text-stone-800">{ev.title}</div>
                {ev.location && <div className="flex items-center gap-1 text-sm text-stone-500"><MapPin size={12} /> {ev.location}</div>}
              </div>
            ))}
          </div>
        }
      </Card>

      {/* 即將到來 */}
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
               <button type="button" onClick={() => onEditClick(ev, 'event')} className="text-stone-300 hover:text-emerald-500 p-2"><Pencil size={18}/></button>
               <button type="button" onClick={() => onDeleteClick('events', ev.id)} className="text-stone-300 hover:text-rose-500 p-2"><Trash2 size={18}/></button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
});

export default CalendarView;