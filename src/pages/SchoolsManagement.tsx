import { useState, useEffect, useCallback } from 'react';
import {
  Search, Plus, MoreVertical, MapPin, Mail,
  Eye, Ban, CheckCircle, X, Filter,
  KeyRound, Trash2, Send, Download, Edit, CreditCard,
  Globe, Building
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

export interface SchoolData {
  id: string;
  logo: string;
  name: string;
  regNumber: string;
  owner: string;
  province: string;
  district: string;
  sector: string;
  cell: string;
  village: string;
  address: string;
  phone: string;
  altPhone: string;
  email: string;
  website: string;
  tinNumber: string;
  teachersCount: number;
  studentsCount: number;
  certificatesCount: number;
  examsCount: number;
  subscriptionPlan: 'Basic' | 'Pro' | 'Enterprise';
  regDate: string;
  expiryDate: string;
  remainingDays: number;
  status: 'Active' | 'Pending' | 'Expired' | 'Suspended';
  lastLogin: string;
  storageUsage: string;
  notes: string;
  schoolCode?: string;
}



export default function SchoolsManagement() {
  const [schools, setSchools] = useState<SchoolData[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [districtFilter, setDistrictFilter] = useState('All');
  const [subscriptionFilter, setSubscriptionFilter] = useState('All');
  const [loadingSchools, setLoadingSchools] = useState(false);
  const [schoolsError, setSchoolsError] = useState<string | null>(null);

  // Selected school for Drawer
  const [selectedSchool, setSelectedSchool] = useState<SchoolData | null>(null);

  // Active Dropdown Row ID
  const [activeDropdownId, setActiveDropdownId] = useState<string | null>(null);

  // Toast Notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Add School Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newSchoolName, setNewSchoolName] = useState('');
  const [newOwner, setNewOwner] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newDistrict, setNewDistrict] = useState('Gasabo');
  const [newPlan, setNewPlan] = useState<'Basic' | 'Pro' | 'Enterprise'>('Pro');
  const [provisioning, setProvisioning] = useState(false);
  const [newAccount, setNewAccount] = useState<{ email: string; password: string; schoolCode?: string } | null>(null);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const loadSchools = useCallback(async () => {
    setLoadingSchools(true);
    setSchoolsError(null);

    const { data, error } = await supabase
      .from('schools')
      .select('*');

    setLoadingSchools(false);

    if (error) {
      console.error('Failed to load schools:', error.message);
      setSchoolsError(error.message);
      return;
    }

    setSchools((data ?? []).map((school: any) => ({
      id: school.id,
      logo: '🏫',
      name: school.name ?? 'Unknown School',
      regNumber: school.reg_number ?? `SCH-${school.id}`,
      owner: school.owner ?? 'School Admin',
      province: school.province ?? 'Unknown',
      district: school.district ?? 'Unknown',
      sector: school.sector ?? 'Unknown',
      cell: school.cell ?? 'Unknown',
      village: school.village ?? 'Unknown',
      address: school.address ?? 'Not provided',
      phone: school.phone ?? '+250 788 000 000',
      altPhone: school.alt_phone ?? '+250 788 000 000',
      email: school.email ?? 'info@example.com',
      website: school.website ?? '',
      tinNumber: school.tin_number ?? 'N/A',
      teachersCount: school.teachers_count ?? 0,
      studentsCount: school.students_count ?? 0,
      certificatesCount: school.certificates_count ?? 0,
      examsCount: school.exams_count ?? 0,
      subscriptionPlan: school.subscription_plan ?? 'Basic',
      regDate: school.reg_date ?? 'Unknown',
      expiryDate: school.expiry_date ?? 'Unknown',
      remainingDays: school.remaining_days ?? 0,
      status: school.status ?? 'Pending',
      lastLogin: school.last_login ?? 'Unknown',
      storageUsage: school.storage_usage ?? '0 GB',
      notes: school.notes ?? 'No notes available',
    })));
  }, []);

  useEffect(() => {
    void loadSchools();
  }, [loadSchools]);

  // Filter logic
  const filteredSchools = schools.filter(sch => {
    const matchesSearch = sch.name.toLowerCase().includes(search.toLowerCase()) ||
      sch.regNumber.toLowerCase().includes(search.toLowerCase()) ||
      sch.owner.toLowerCase().includes(search.toLowerCase()) ||
      sch.email.toLowerCase().includes(search.toLowerCase());

    const matchesStatus = statusFilter === 'All' || sch.status === statusFilter;
    const matchesDistrict = districtFilter === 'All' || sch.district === districtFilter;
    const matchesSub = subscriptionFilter === 'All' || sch.subscriptionPlan === subscriptionFilter;

    return matchesSearch && matchesStatus && matchesDistrict && matchesSub;
  });

  const handleRegisterSchool = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSchoolName.trim() || !newOwner.trim() || !newEmail.trim()) return;
    setProvisioning(true);
    const { data, error } = await supabase.functions.invoke('provision-user', {
      body: { type: 'school', fullName: newOwner.trim(), email: newEmail.trim(), phone: newPhone.trim(), schoolName: newSchoolName.trim(), location: newDistrict, subscriptionPlan: newPlan.toLowerCase() },
    });
    setProvisioning(false);
    if (error || data?.error) { triggerToast(data?.error || error?.message || 'Could not register the school.'); return; }

    const newSch: SchoolData = {
      id: data.schoolId,
      logo: '🏫',
      name: newSchoolName.trim(),
      regNumber: data.schoolCode,
      owner: newOwner.trim(),
      province: 'Kigali City',
      district: newDistrict,
      sector: 'Central',
      cell: 'Cell A',
      village: 'Village 1',
      address: `${newDistrict} Main Road`,
      phone: newPhone.trim() || '+250 788 000 000',
      altPhone: '+250 788 111 111',
      email: newEmail.trim(),
      website: `https://${newSchoolName.toLowerCase().replace(/\s+/g, '')}.rw`,
      tinNumber: `100${Math.floor(100000 + Math.random() * 900000)}`,
      teachersCount: 1,
      studentsCount: 0,
      certificatesCount: 0,
      examsCount: 0,
      subscriptionPlan: newPlan,
      regDate: new Date().toISOString().split('T')[0],
      expiryDate: '2027-08-01',
      remainingDays: 365,
      status: 'Active',
      lastLogin: 'Just now',
      storageUsage: '0.1 GB',
      notes: 'Newly registered driving school via Super Admin Portal.'
    };

    setSchools(prev => [newSch, ...prev]);
    setShowAddModal(false);
    setNewAccount({ email: newEmail.trim(), password: data.temporaryPassword, schoolCode: data.schoolCode });
    triggerToast(`🎉 School "${newSch.name}" successfully registered!`);

    setNewSchoolName('');
    setNewOwner('');
    setNewPhone('');
    setNewEmail('');
  };

  const handleAction = async (actionName: string, sch: SchoolData) => {
    setActiveDropdownId(null);

    if (actionName === 'view') {
      setSelectedSchool(sch);
    } else if (actionName === 'activate') {
      setSchools(prev => prev.map(s => s.id === sch.id ? { ...s, status: 'Active' } : s));
      triggerToast(`✅ "${sch.name}" activated!`);
    } else if (actionName === 'deactivate') {
      setSchools(prev => prev.map(s => s.id === sch.id ? { ...s, status: 'Suspended' } : s));
      triggerToast(`⛔ "${sch.name}" suspended.`);
    } else if (actionName === 'reset_pass') {
      try {
        const { data, error } = await supabase.functions.invoke('provision-user', {
          body: { action: 'reset_password', email: sch.email },
        });
        if (error || data?.error) {
          triggerToast(`⚠️ Password reset failed: ${data?.error || error?.message}`);
        } else {
          setNewAccount({ email: sch.email, password: data.temporaryPassword, schoolCode: sch.schoolCode });
          triggerToast(`🔑 Password for ${sch.name} reset to: ${data.temporaryPassword}`);
        }
      } catch (err: any) {
        triggerToast(`⚠️ Password reset failed: ${err.message}`);
      }
    } else if (actionName === 'renew') {
      setSchools(prev => prev.map(s => s.id === sch.id ? { ...s, status: 'Active', remainingDays: 365 } : s));
      triggerToast(`💳 Subscription renewed for "${sch.name}" (365 days extended)`);
    } else if (actionName === 'delete') {
      setSchools(prev => prev.filter(s => s.id !== sch.id));
      if (selectedSchool?.id === sch.id) setSelectedSchool(null);
      triggerToast(`🗑️ "${sch.name}" deleted from platform.`);
    } else {
      triggerToast(`Executed "${actionName}" for ${sch.name}`);
    }
  };

  const getStatusBadge = (status: SchoolData['status']) => {
    switch (status) {
      case 'Active':
        return <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-extrabold text-[11px] border border-emerald-200">Active</span>;
      case 'Pending':
        return <span className="px-2.5 py-1 rounded-full bg-yellow-100 text-yellow-800 font-extrabold text-[11px] border border-yellow-200">Pending</span>;
      case 'Expired':
        return <span className="px-2.5 py-1 rounded-full bg-slate-200 text-slate-700 font-extrabold text-[11px] border border-slate-300">Expired</span>;
      case 'Suspended':
        return <span className="px-2.5 py-1 rounded-full bg-rose-100 text-rose-800 font-extrabold text-[11px] border border-rose-200">Suspended</span>;
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border border-slate-700 animate-in fade-in slide-in-from-top-4">
          <Send size={18} className="text-emerald-400" />
          <span className="text-xs font-bold">{toastMessage}</span>
          <button onClick={() => setToastMessage(null)} className="text-slate-400 hover:text-white ml-2"><X size={16} /></button>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 font-extrabold text-[11px] border border-blue-200">
              National Directory
            </span>
            <span className="text-xs text-slate-400 font-medium">DriveClass Rwanda Platform</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Schools Management</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage accredited driving school accounts, subscription renewals, instructor counts, and compliance.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => triggerToast('📊 Exporting full schools registry CSV...')}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold border border-slate-200 transition-all"
          >
            <Download size={15} className="text-emerald-600" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold shadow-sm transition-all"
          >
            <Plus size={16} />
            <span>Register New School</span>
          </button>
        </div>
      </div>

      {/* Top Filter & Search Controls */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative w-full sm:w-80">
          <Search size={16} className="absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search school name, reg number, owner, email..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* Status Filter */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5">
            <Filter size={13} className="text-slate-400" />
            <span className="text-slate-500 font-bold">Status:</span>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="bg-transparent text-slate-800 font-bold focus:outline-none cursor-pointer"
            >
              <option value="All">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Pending">Pending</option>
              <option value="Expired">Expired</option>
              <option value="Suspended">Suspended</option>
            </select>
          </div>

          {/* District Filter */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5">
            <MapPin size={13} className="text-slate-400" />
            <span className="text-slate-500 font-bold">District:</span>
            <select
              value={districtFilter}
              onChange={e => setDistrictFilter(e.target.value)}
              className="bg-transparent text-slate-800 font-bold focus:outline-none cursor-pointer"
            >
              <option value="All">All Districts</option>
              <option value="Gasabo">Gasabo</option>
              <option value="Musanze">Musanze</option>
              <option value="Gakenke">Gakenke</option>
              <option value="Nyagatare">Nyagatare</option>
              <option value="Rubavu">Rubavu</option>
              <option value="Huye">Huye</option>
              <option value="Kicukiro">Kicukiro</option>
            </select>
          </div>

          {/* Subscription Filter */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5">
            <CreditCard size={13} className="text-slate-400" />
            <span className="text-slate-500 font-bold">Plan:</span>
            <select
              value={subscriptionFilter}
              onChange={e => setSubscriptionFilter(e.target.value)}
              className="bg-transparent text-slate-800 font-bold focus:outline-none cursor-pointer"
            >
              <option value="All">All Plans</option>
              <option value="Basic">Basic</option>
              <option value="Pro">Pro</option>
              <option value="Enterprise">Enterprise</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Data Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50/80 text-slate-500 font-extrabold uppercase tracking-wider border-b border-slate-200/80">
                <th className="px-4 py-3.5">Logo / School Name</th>
                <th className="px-3 py-3.5">Reg Number</th>
                <th className="px-3 py-3.5">Owner</th>
                <th className="px-3 py-3.5">District</th>
                <th className="px-3 py-3.5">Phone & Email</th>
                <th className="px-3 py-3.5 text-center">Teachers</th>
                <th className="px-3 py-3.5 text-center">Students</th>
                <th className="px-3 py-3.5">Subscription</th>
                <th className="px-3 py-3.5">Reg Date</th>
                <th className="px-3 py-3.5">Remaining</th>
                <th className="px-3 py-3.5">Status</th>
                <th className="px-4 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredSchools.length === 0 ? (
                <tr>
                  <td colSpan={12} className="text-center py-12 text-slate-400 font-bold">
                    No driving schools found matching your search or filters.
                  </td>
                </tr>
              ) : (
                filteredSchools.map(sch => (
                  <tr
                    key={sch.id}
                    className="hover:bg-slate-50/80 transition-all cursor-pointer group"
                    onClick={() => setSelectedSchool(sch)}
                  >
                    {/* Logo & School Name */}
                    <td className="px-4 py-3.5 font-bold text-slate-900">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-lg shadow-xs flex-shrink-0 group-hover:scale-105 transition-transform">
                          {sch.logo}
                        </div>
                        <div className="min-w-0">
                          <p className="font-extrabold text-slate-900 truncate">{sch.name}</p>
                          <p className="text-[10px] text-slate-400 font-mono">{sch.tinNumber ? `TIN: ${sch.tinNumber}` : sch.province}</p>
                        </div>
                      </div>
                    </td>

                    {/* Reg Number */}
                    <td className="px-3 py-3.5 font-mono text-slate-700 font-bold">{sch.regNumber}</td>

                    {/* Owner */}
                    <td className="px-3 py-3.5 text-slate-800 font-bold">{sch.owner}</td>

                    {/* District */}
                    <td className="px-3 py-3.5 text-slate-600 font-medium">
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-semibold text-[11px]">
                        {sch.district}
                      </span>
                    </td>

                    {/* Contact */}
                    <td className="px-3 py-3.5 text-slate-600">
                      <p className="font-semibold text-slate-800">{sch.phone}</p>
                      <p className="text-[10px] text-slate-400 truncate max-w-[140px]">{sch.email}</p>
                    </td>

                    {/* Teachers Count */}
                    <td className="px-3 py-3.5 text-center font-bold text-slate-800">{sch.teachersCount}</td>

                    {/* Students Count */}
                    <td className="px-3 py-3.5 text-center font-bold text-blue-600">{sch.studentsCount}</td>

                    {/* Subscription */}
                    <td className="px-3 py-3.5">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                        sch.subscriptionPlan === 'Enterprise'
                          ? 'bg-purple-100 text-purple-800 border border-purple-200'
                          : sch.subscriptionPlan === 'Pro'
                          ? 'bg-blue-100 text-blue-800 border border-blue-200'
                          : 'bg-slate-100 text-slate-700 border border-slate-200'
                      }`}>
                        {sch.subscriptionPlan}
                      </span>
                    </td>

                    {/* Reg Date */}
                    <td className="px-3 py-3.5 text-slate-500 font-mono text-[11px]">{sch.regDate}</td>

                    {/* Remaining Days */}
                    <td className="px-3 py-3.5 font-bold font-mono">
                      {sch.remainingDays > 30 ? (
                        <span className="text-emerald-600">{sch.remainingDays} days</span>
                      ) : sch.remainingDays > 0 ? (
                        <span className="text-amber-600">{sch.remainingDays} days</span>
                      ) : (
                        <span className="text-rose-600">Expired</span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="px-3 py-3.5">{getStatusBadge(sch.status)}</td>

                    {/* Actions Dropdown */}
                    <td className="px-4 py-3.5 text-right relative" onClick={e => e.stopPropagation()}>
                      <button
                        onClick={() => setActiveDropdownId(activeDropdownId === sch.id ? null : sch.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-all"
                      >
                        <MoreVertical size={16} />
                      </button>

                      {/* Dropdown Menu */}
                      {activeDropdownId === sch.id && (
                        <div className="absolute right-4 top-10 w-52 bg-white rounded-2xl shadow-xl border border-slate-200 z-40 p-1.5 text-left animate-in fade-in slide-in-from-top-2">
                          <button
                            onClick={() => handleAction('view', sch)}
                            className="flex items-center gap-2 w-full px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 rounded-xl"
                          >
                            <Eye size={14} className="text-blue-600" /> 👁 View Details
                          </button>
                          <button
                            onClick={() => handleAction('edit', sch)}
                            className="flex items-center gap-2 w-full px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 rounded-xl"
                          >
                            <Edit size={14} className="text-amber-600" /> ✏ Edit School
                          </button>
                          <button
                            onClick={() => handleAction('reset_pass', sch)}
                            className="flex items-center gap-2 w-full px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 rounded-xl"
                          >
                            <Mail size={14} className="text-purple-600" /> 📧 Send Reset Email
                          </button>
                          <button
                            onClick={() => handleAction('reset_pass', sch)}
                            className="flex items-center gap-2 w-full px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 rounded-xl"
                          >
                            <KeyRound size={14} className="text-teal-600" /> 🔑 Reset Password
                          </button>

                          <div className="my-1 border-t border-slate-100" />

                          {sch.status === 'Active' ? (
                            <button
                              onClick={() => handleAction('deactivate', sch)}
                              className="flex items-center gap-2 w-full px-3 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 rounded-xl"
                            >
                              <Ban size={14} /> ⛔ Deactivate School
                            </button>
                          ) : (
                            <button
                              onClick={() => handleAction('activate', sch)}
                              className="flex items-center gap-2 w-full px-3 py-2 text-xs font-medium text-emerald-600 hover:bg-emerald-50 rounded-xl"
                            >
                              <CheckCircle size={14} /> ✅ Activate School
                            </button>
                          )}

                          <button
                            onClick={() => handleAction('renew', sch)}
                            className="flex items-center gap-2 w-full px-3 py-2 text-xs font-medium text-blue-600 hover:bg-blue-50 rounded-xl"
                          >
                            <CreditCard size={14} /> 💳 Renew Subscription
                          </button>

                          <div className="my-1 border-t border-slate-100" />

                          <button
                            onClick={() => handleAction('delete', sch)}
                            className="flex items-center gap-2 w-full px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-xl"
                          >
                            <Trash2 size={14} /> 🗑 Delete School
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Right-Side Sliding School Details Drawer */}
      {selectedSchool && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex justify-end" onClick={() => setSelectedSchool(null)}>
          <div
            className="w-full max-w-2xl bg-white h-full shadow-2xl overflow-y-auto p-6 space-y-6 flex flex-col justify-between border-l border-slate-200 animate-in slide-in-from-right duration-200"
            onClick={e => e.stopPropagation()}
          >
            {/* Drawer Header */}
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-2xl shadow-xs">
                    {selectedSchool.logo}
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-slate-900 leading-tight">{selectedSchool.name}</h2>
                    <p className="text-xs text-slate-400 font-mono mt-0.5">{selectedSchool.regNumber}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {getStatusBadge(selectedSchool.status)}
                  <button onClick={() => setSelectedSchool(null)} className="p-2 text-slate-400 hover:text-slate-800 rounded-xl hover:bg-slate-100">
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* Quick Stats Grid */}
              <div className="grid grid-cols-4 gap-3">
                <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl text-center space-y-0.5">
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Teachers</span>
                  <p className="text-lg font-black text-slate-800">{selectedSchool.teachersCount}</p>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl text-center space-y-0.5">
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Students</span>
                  <p className="text-lg font-black text-blue-600">{selectedSchool.studentsCount}</p>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl text-center space-y-0.5">
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Certificates</span>
                  <p className="text-lg font-black text-purple-600">{selectedSchool.certificatesCount}</p>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl text-center space-y-0.5">
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Exams Taken</span>
                  <p className="text-lg font-black text-teal-600">{selectedSchool.examsCount}</p>
                </div>
              </div>

              {/* Detailed Information Tabs / Breakdown */}
              <div className="space-y-4 text-xs">
                {/* School Ownership & Registration */}
                <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-3">
                  <h3 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-2">
                    <Building size={14} className="text-blue-600" /> Registration & Legal Entity
                  </h3>
                  <div className="grid grid-cols-2 gap-3 text-slate-700">
                    <div>
                      <span className="text-slate-400 block text-[10px]">Owner Name</span>
                      <strong className="text-slate-900">{selectedSchool.owner}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">TIN Number</span>
                      <strong className="text-slate-900 font-mono">{selectedSchool.tinNumber || 'N/A'}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Registration Date</span>
                      <strong className="text-slate-900 font-mono">{selectedSchool.regDate}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Last Admin Login</span>
                      <strong className="text-slate-900">{selectedSchool.lastLogin}</strong>
                    </div>
                  </div>
                </div>

                {/* Location Breakdown */}
                <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-3">
                  <h3 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-2">
                    <MapPin size={14} className="text-emerald-600" /> Physical Location (Rwanda Address)
                  </h3>
                  <div className="grid grid-cols-2 gap-3 text-slate-700">
                    <div>
                      <span className="text-slate-400 block text-[10px]">Province</span>
                      <span className="font-bold">{selectedSchool.province}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">District</span>
                      <span className="font-bold">{selectedSchool.district}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Sector / Cell / Village</span>
                      <span className="font-semibold">{selectedSchool.sector}, {selectedSchool.cell}, {selectedSchool.village}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Address Line</span>
                      <span className="font-semibold">{selectedSchool.address}</span>
                    </div>
                  </div>
                </div>

                {/* Contact Information */}
                <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-3">
                  <h3 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-2">
                    <Mail size={14} className="text-purple-600" /> Contact & Channels
                  </h3>
                  <div className="grid grid-cols-2 gap-3 text-slate-700">
                    <div>
                      <span className="text-slate-400 block text-[10px]">Primary Phone</span>
                      <span className="font-bold">{selectedSchool.phone}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Alternative Phone</span>
                      <span className="font-bold">{selectedSchool.altPhone}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Official Email</span>
                      <span className="font-bold text-blue-600">{selectedSchool.email}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Website</span>
                      <a href={selectedSchool.website} target="_blank" rel="noreferrer" className="text-blue-600 font-bold hover:underline flex items-center gap-1">
                        <Globe size={12} /> {selectedSchool.website || 'None'}
                      </a>
                    </div>
                  </div>
                </div>

                {/* Subscription Details */}
                <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-3">
                  <h3 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-2">
                    <CreditCard size={14} className="text-amber-600" /> Subscription & Storage
                  </h3>
                  <div className="grid grid-cols-2 gap-3 text-slate-700">
                    <div>
                      <span className="text-slate-400 block text-[10px]">Current Plan</span>
                      <span className="font-black text-purple-700">{selectedSchool.subscriptionPlan} Plan</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Expiry Date</span>
                      <span className="font-mono font-bold">{selectedSchool.expiryDate}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Remaining Days</span>
                      <span className="font-mono font-bold text-emerald-600">{selectedSchool.remainingDays} days</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Cloud Storage Used</span>
                      <span className="font-mono font-bold">{selectedSchool.storageUsage}</span>
                    </div>
                  </div>
                </div>

                {/* Notes */}
                {selectedSchool.notes && (
                  <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl text-amber-900 text-xs">
                    <strong>Admin Compliance Note:</strong> {selectedSchool.notes}
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Action Toolbar */}
            <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center gap-2">
              <button
                onClick={() => handleAction('renew', selectedSchool)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm"
              >
                <CreditCard size={14} /> Renew Subscription
              </button>

              <button
                onClick={() => handleAction('reset_pass', selectedSchool)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs border border-slate-200"
              >
                <KeyRound size={14} className="text-teal-600" /> Reset Password
              </button>

              {selectedSchool.status === 'Active' ? (
                <button
                  onClick={() => handleAction('deactivate', selectedSchool)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs border border-rose-200"
                >
                  <Ban size={14} /> Deactivate
                </button>
              ) : (
                <button
                  onClick={() => handleAction('activate', selectedSchool)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-xs border border-emerald-200"
                >
                  <CheckCircle size={14} /> Activate
                </button>
              )}

              <button
                onClick={() => handleAction('delete', selectedSchool)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600 font-bold text-xs border border-slate-200"
              >
                <Trash2 size={14} /> Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Register New School Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4" onClick={() => setShowAddModal(false)}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg p-6 space-y-5 border border-slate-200 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-extrabold text-slate-800 text-base flex items-center gap-2">
                <Plus size={18} className="text-blue-600" /> Register New Driving School
              </h3>
              <button onClick={() => setShowAddModal(false)} className="p-1 text-slate-400 hover:text-slate-700">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleRegisterSchool} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">School Name *</label>
                <input
                  type="text"
                  required
                  value={newSchoolName}
                  onChange={e => setNewSchoolName(e.target.value)}
                  placeholder="e.g. Kigali Express Drivers Academy"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Owner Name *</label>
                  <input
                    type="text"
                    required
                    value={newOwner}
                    onChange={e => setNewOwner(e.target.value)}
                    placeholder="e.g. Mugisha Jean"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">District Location *</label>
                  <select
                    value={newDistrict}
                    onChange={e => setNewDistrict(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  >
                    <option value="Gasabo">Gasabo</option>
                    <option value="Musanze">Musanze</option>
                    <option value="Gakenke">Gakenke</option>
                    <option value="Nyagatare">Nyagatare</option>
                    <option value="Rubavu">Rubavu</option>
                    <option value="Huye">Huye</option>
                    <option value="Kicukiro">Kicukiro</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Phone Number</label>
                  <input
                    type="tel"
                    value={newPhone}
                    onChange={e => setNewPhone(e.target.value)}
                    placeholder="+250 788 000 000"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Owner login email *</label>
                  <input
                    type="email"
                    value={newEmail}
                    onChange={e => setNewEmail(e.target.value)}
                    placeholder="owner@school.rw"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Initial Subscription Tier</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['Basic', 'Pro', 'Enterprise'] as const).map(tier => (
                    <button
                      key={tier}
                      type="button"
                      onClick={() => setNewPlan(tier)}
                      className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                        newPlan === tier
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {tier} Plan
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-600 font-bold hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 shadow-md"
                >
                  {provisioning ? 'Creating account…' : 'Confirm Registration'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {newAccount && (
        <div className="fixed inset-0 z-[60] bg-slate-950/60 flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-black text-slate-900">School owner account created</h3>
            <p className="text-sm text-slate-500">Save these credentials now. The temporary password is displayed only once.</p>
            <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4 text-sm space-y-2"><p><strong>School ID:</strong> {newAccount.schoolCode}</p><p><strong>Login:</strong> {newAccount.email}</p><p className="font-mono"><strong>Temporary password:</strong> {newAccount.password}</p></div>
            <p className="text-xs text-amber-700">The owner must set a new password on their first login.</p>
            <button onClick={() => setNewAccount(null)} className="w-full rounded-xl bg-blue-600 py-2.5 text-sm font-bold text-white">I have saved these credentials</button>
          </div>
        </div>
      )}
    </div>
  );
}
