interface BadgeProps {
  status: 'active' | 'suspended' | 'live' | 'scheduled' | 'pass' | 'fail' | string;
  className?: string;
}

const statusMap: Record<string, { label: string; className: string }> = {
  active:    { label: 'Active',    className: 'bg-green-100 text-green-700' },
  suspended: { label: 'Suspended', className: 'bg-red-100 text-red-600' },
  live:      { label: 'Live',      className: 'bg-green-100 text-green-700 animate-pulse' },
  scheduled: { label: 'Scheduled', className: 'bg-blue-100 text-blue-600' },
  pass:      { label: 'Pass',      className: 'bg-green-100 text-green-700' },
  fail:      { label: 'Fail',      className: 'bg-red-100 text-red-600' },
};

export default function StatusBadge({ status, className = '' }: BadgeProps) {
  const cfg = statusMap[status.toLowerCase()] || { label: status, className: 'bg-slate-100 text-slate-600' };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${cfg.className} ${className}`}>
      {cfg.label}
    </span>
  );
}
