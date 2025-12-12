import React, { memo } from 'react';
import { Plus, Check, Pencil, Trash2 } from 'lucide-react';
import { ActionButton } from '../UI';

const TodoView = memo(function TodoView({
  todos,
  todoFilter,
  setTodoFilter,
  onAddClick,
  onToggleTodo,
  onEditClick,
  onDeleteClick
}) {
  const filteredTodos = todos.filter(t => t.type === todoFilter);

  return (
    <div className="space-y-4 pb-24">
       <h2 className="text-2xl font-bold text-stone-800 mb-4">待辦清單</h2>
       <div className="flex gap-2 mb-4">
          <button onClick={() => setTodoFilter('待辦事項')} className={`px-4 py-2 rounded-xl text-sm font-bold border-2 ${todoFilter === '待辦事項' ? 'bg-emerald-100 border-emerald-200 text-emerald-700' : 'bg-white border-stone-100 text-stone-400'}`}>待辦事項</button>
          <button onClick={() => setTodoFilter('購物清單')} className={`px-4 py-2 rounded-xl text-sm font-bold border-2 ${todoFilter === '購物清單' ? 'bg-orange-100 border-orange-200 text-orange-700' : 'bg-white border-stone-100 text-stone-400'}`}>購物清單</button>
       </div>
       
       <div className="flex gap-2 mb-4">
          <ActionButton onClick={onAddClick} className="!py-2 !px-4 text-sm w-full"><Plus size={16}/> 新增項目</ActionButton>
       </div>
       
       <div className="grid grid-cols-1 gap-3">
         {filteredTodos.map(todo => (
           <div key={todo.id} className={`bg-white p-4 rounded-2xl shadow-sm border flex items-center gap-3 transition-colors ${todo.isDone ? 'border-emerald-200 bg-emerald-50/50' : 'border-stone-100'}`}>
              <button type="button" onClick={() => onToggleTodo(todo)} className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all flex-shrink-0 ${todo.isDone ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-stone-300 hover:border-emerald-400'}`}>{todo.isDone && <Check size={14} strokeWidth={3} />}</button>
              <div className="flex-1"><span className={`text-stone-700 font-medium ${todo.isDone ? 'line-through text-stone-400' : ''}`}>{todo.text}</span></div>
              {todoFilter === '購物清單' && <span className="text-xs bg-orange-100 text-orange-600 px-2 py-1 rounded-md">Buy</span>}
              <div className="flex gap-1">
                <button type="button" onClick={() => onEditClick(todo, 'todo')} className="text-stone-300 hover:text-emerald-500 p-2 z-10"><Pencil size={16}/></button>
                <button type="button" onClick={() => onDeleteClick('todos', todo.id)} className="text-stone-300 hover:text-rose-500 p-2 z-10"><Trash2 size={16}/></button>
              </div>
           </div>
         ))}
         {filteredTodos.length === 0 && <div className="text-center text-stone-400 py-10">{todoFilter === '購物清單' ? '沒有要買的東西 🛒' : '事情都做完了！ ✨'}</div>}
       </div>
    </div>
  );
});

export default TodoView;