import React, { useState, useEffect } from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  LineChart,
  Line
} from 'recharts';
import {
  Users,
  Shield,
  UserCheck,
  TrendingUp,
  RefreshCw,
  AlertCircle,
  PieChart as PieIcon,
  BarChart3
} from 'lucide-react';
import { safeFetchJson } from '../../utils/api';

interface MemberStatsData {
  totalUsers: number;
  activeCount: number;
  disabledCount: number;
  roleDistribution: { name: string; count: number; fill: string }[];
  registrationTrends: {
    month: string;
    registrations: number;
    admins: number;
    members: number;
    users: number;
  }[];
  breakdownByRole: Record<string, number>;
}

export const AdminMemberStats: React.FC = () => {
  const [stats, setStats] = useState<MemberStatsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [chartType, setChartType] = useState<'pie' | 'bar'>('pie');

  const fetchStats = async () => {
    try {
      setIsLoading(true);
      setErrorMessage('');
      const token = localStorage.getItem('lalumiere_token');
      const res = await safeFetchJson<MemberStatsData>('/api/admin/members/stats', {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok && res.data) {
        setStats(res.data);
      } else {
        throw new Error(res.errorMessage || 'Failed to load member statistics');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Habaye ikosa mu gushaka imibare y\'abanyamuryango');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const COLORS = ['#1e3a8a', '#059669', '#d97706', '#7c3aed', '#dc2626'];

  if (isLoading) {
    return (
      <div className="bg-white rounded-3xl p-8 border border-slate-200/80 text-center space-y-3 shadow-xs">
        <div className="w-8 h-8 border-3 border-blue-900 border-t-amber-400 rounded-full animate-spin mx-auto" />
        <p className="text-xs font-semibold text-slate-600">Gushyira imibare n'ibishushanyo by'abanyamuryango ku murongo...</p>
      </div>
    );
  }

  if (errorMessage || !stats) {
    return (
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-3">
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMessage || 'Nta mibare yabashije kuboneka.'}</span>
        </div>
        <button
          onClick={fetchStats}
          className="px-3.5 py-1.5 bg-blue-950 text-white rounded-xl text-xs font-bold hover:bg-blue-900 transition-colors"
        >
          Ongera ugerageze (Retry)
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Top Header */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="font-extrabold text-base text-slate-900 font-serif flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-900" />
            <span>Imibare n'Ibishushanyo by'Abanyamuryango (Member Statistics)</span>
          </h3>
          <p className="text-xs text-slate-500">
            Ikwirakwizwa ry'inshingano (Roles: Admin, Member, User) n'umuvuduko wo kwiyandikisha
          </p>
        </div>

        <button
          onClick={fetchStats}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer self-start sm:self-auto"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Vugurura (Refresh)</span>
        </button>
      </div>

      {/* Summary KPI Badges */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase">Abiyandikishije Bose</span>
          <p className="text-2xl font-black text-slate-900 mt-1">{stats.totalUsers}</p>
          <p className="text-[10px] text-slate-500 mt-0.5">Total Registered Accounts</p>
        </div>

        <div className="bg-white p-4 rounded-3xl border border-blue-100 shadow-xs">
          <span className="text-[11px] font-bold text-blue-700 uppercase">Abayobozi (Admin)</span>
          <p className="text-2xl font-black text-blue-950 mt-1">
            {stats.roleDistribution.find(r => r.name === 'Admin')?.count || 0}
          </p>
          <p className="text-[10px] text-blue-600 mt-0.5">Super Admin, Admin, Mod</p>
        </div>

        <div className="bg-white p-4 rounded-3xl border border-emerald-100 shadow-xs">
          <span className="text-[11px] font-bold text-emerald-700 uppercase">Abaririmbyi (Member)</span>
          <p className="text-2xl font-black text-emerald-950 mt-1">
            {stats.roleDistribution.find(r => r.name === 'Member')?.count || 0}
          </p>
          <p className="text-[10px] text-emerald-600 mt-0.5">Choir Members & Singers</p>
        </div>

        <div className="bg-white p-4 rounded-3xl border border-amber-100 shadow-xs">
          <span className="text-[11px] font-bold text-amber-700 uppercase">Abitabiriye (User)</span>
          <p className="text-2xl font-black text-amber-950 mt-1">
            {stats.roleDistribution.find(r => r.name === 'User')?.count || 0}
          </p>
          <p className="text-[10px] text-amber-600 mt-0.5">Worshippers & Supporters</p>
        </div>
      </div>

      {/* Visual Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Chart 1: Role Distribution */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-extrabold text-sm text-slate-900 font-serif">
                Ikwirakwizwa ry'Inshingano (Role Distribution)
              </h4>
              <p className="text-[11px] text-slate-500">Admin vs Member vs User</p>
            </div>

            <div className="flex items-center bg-slate-100 p-0.5 rounded-lg text-xs">
              <button
                type="button"
                onClick={() => setChartType('pie')}
                className={`p-1.5 rounded-md transition-colors ${
                  chartType === 'pie' ? 'bg-white text-blue-900 shadow-2xs font-bold' : 'text-slate-500'
                }`}
                title="Pie Chart"
              >
                <PieIcon className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setChartType('bar')}
                className={`p-1.5 rounded-md transition-colors ${
                  chartType === 'bar' ? 'bg-white text-blue-900 shadow-2xs font-bold' : 'text-slate-500'
                }`}
                title="Bar Chart"
              >
                <BarChart3 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="h-64 w-full">
            {chartType === 'pie' ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.roleDistribution}
                    dataKey="count"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={85}
                    innerRadius={45}
                    paddingAngle={4}
                    label={({ name, percent }: any) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                  >
                    {stats.roleDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill || COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: any, name: any) => [`${value} abakoresha`, `Inshingano: ${name}`]}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.roleDistribution}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(value: any) => [`${value} abakoresha`, 'Umubare']} />
                  <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                    {stats.roleDistribution.map((entry, index) => (
                      <Cell key={`bar-${index}`} fill={entry.fill || COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Chart 2: Registration Trends Over Time */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-3">
          <div>
            <h4 className="font-extrabold text-sm text-slate-900 font-serif">
              Umuvuduko wo Kwiyandikisha (Registration Trends)
            </h4>
            <p className="text-[11px] text-slate-500">Ukwezi ku kundi (Monthly Trend)</p>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.registrationTrends}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="admins" name="Admins" stackId="a" fill="#1e3a8a" radius={[0, 0, 0, 0]} />
                <Bar dataKey="members" name="Members" stackId="a" fill="#059669" radius={[0, 0, 0, 0]} />
                <Bar dataKey="users" name="Users" stackId="a" fill="#d97706" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
