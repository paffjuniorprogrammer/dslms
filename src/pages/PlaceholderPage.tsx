import { School } from 'lucide-react';

export default function PlaceholderPage({ title, description }: { title: string; description: string }) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">{title}</h1>
        <p className="text-sm text-slate-500 mt-0.5">{description}</p>
      </div>
      <div className="bg-white rounded-xl border border-slate-100 p-16 flex flex-col items-center justify-center">
        <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center mb-4">
          <School size={28} className="text-blue-500" />
        </div>
        <h3 className="text-lg font-semibold text-slate-800">Coming Next</h3>
        <p className="text-sm text-slate-500 mt-1 text-center max-w-sm">
          This page is part of the DriveClass Rwanda platform and will be built in the next step.
        </p>
      </div>
    </div>
  );
}
