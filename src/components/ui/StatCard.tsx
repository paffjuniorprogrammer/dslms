interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color?: string;
  bgColor?: string;
  trend?: string;
  change?: string;
  changeType?: 'increase' | 'decrease' | 'neutral' | string;
}

export default function StatCard({ title, value, icon, color = 'text-blue-600', bgColor = 'bg-blue-50', trend, change, changeType = 'neutral' }: StatCardProps) {
  const supportingText = change ?? trend;
  const supportingColor = changeType === 'increase'
    ? 'text-emerald-600'
    : changeType === 'decrease'
      ? 'text-rose-600'
      : 'text-slate-500';
  return (
    <div className="bg-white rounded-2xl p-4 border border-slate-200/80 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-slate-200/60 transition-all duration-200">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-slate-500 mb-1">{title}</p>
          <p className="text-2xl font-bold text-slate-800">{value}</p>
          {supportingText && <p className={`mt-1 text-[11px] font-semibold ${supportingColor}`}>{supportingText}</p>}
        </div>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${bgColor}`}>
          <span className={color}>{icon}</span>
        </div>
      </div>
    </div>
  );
}
