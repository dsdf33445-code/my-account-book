import React from 'react';
import { CHART_COLORS } from '../constants';

export const ActionButton = ({ onClick, children, className = "", variant = "primary", type = "button" }) => {
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

export const Card = ({ children, className = "" }) => (
  <div className={`bg-white rounded-3xl p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-stone-100 ${className}`}>
    {children}
  </div>
);

export const Input = ({ label, className = "", ...props }) => (
  <div className="flex flex-col gap-1 mb-3">
    {label && <label className="text-xs font-bold text-stone-500 ml-1">{label}</label>}
    <input 
      className={`w-full bg-stone-50 border-2 border-stone-100 rounded-xl p-3 text-stone-700 focus:outline-none focus:border-emerald-300 focus:bg-white transition-colors ${className}`}
      {...props}
    />
  </div>
);

export const Select = ({ label, options, ...props }) => (
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

export const DonutChart = ({ data }) => {
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