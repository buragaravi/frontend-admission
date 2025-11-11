'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { auth } from '@/lib/auth';
import { leadAPI } from '@/lib/api';
import { User } from '@/types';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Skeleton, CardSkeleton } from '@/components/ui/Skeleton';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useTheme } from '@/app/providers';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
} from 'recharts';

interface Analytics {
  totalLeads: number;
  statusBreakdown: Record<string, number>;
  mandalBreakdown: Array<{ mandal: string; count: number }>;
  stateBreakdown: Array<{ state: string; count: number }>;
  recentActivity: {
    leadsUpdatedLast7Days: number;
  };
}

export default function UserDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const currentUser = auth.getUser();
    if (!currentUser) {
      router.push('/auth/login');
      return;
    }

    // Check if user is super admin - redirect to super admin dashboard
    if (currentUser.roleName === 'Super Admin') {
      router.push('/superadmin/dashboard');
      return;
    }

    setUser(currentUser);
    setIsLoading(false);
  }, [router]);

  // Fetch analytics
  const { data: analyticsData, isLoading: isLoadingAnalytics } = useQuery({
    queryKey: ['userAnalytics', user?._id],
    queryFn: async () => {
      if (!user?._id) return null;
      const response = await leadAPI.getAnalytics(user._id);
      return response.data || response;
    },
    enabled: !!user?._id,
    staleTime: 30000,
  });

  const analytics = (analyticsData?.data || analyticsData) as Analytics | null;
  const { theme } = useTheme();

  const chartColors = useMemo(
    () => ['#3b82f6', '#22c55e', '#f97316', '#a855f7', '#ef4444', '#14b8a6'],
    []
  );

  const tooltipStyle = useMemo(
    () => ({
      backgroundColor: theme === 'dark' ? '#0f172a' : '#ffffff',
      color: theme === 'dark' ? '#f8fafc' : '#1f2937',
      borderRadius: '12px',
      border:
        theme === 'dark'
          ? '1px solid rgba(148, 163, 184, 0.35)'
          : '1px solid rgba(148, 163, 184, 0.2)',
      boxShadow:
        theme === 'dark'
          ? '0 10px 30px rgba(15, 23, 42, 0.45)'
          : '0 10px 30px rgba(15, 23, 42, 0.15)',
      padding: '12px',
    }),
    [theme]
  );

  const chartGridColor = theme === 'dark' ? 'rgba(148, 163, 184, 0.25)' : '#e2e8f0';
  const chartTextColor = theme === 'dark' ? '#cbd5f5' : '#475569';

  const statusChartData = useMemo(() => {
    if (!analytics?.statusBreakdown) return [] as Array<{ name: string; value: number }>;
    return Object.entries(analytics.statusBreakdown).map(([status, count]) => ({
      name: status,
      value: typeof count === 'number' ? count : Number(count) || 0,
    }));
  }, [analytics]);

  const mandalChartData = useMemo(() => {
    if (!analytics?.mandalBreakdown) return [] as Array<{ name: string; value: number }>;
    return analytics.mandalBreakdown.map((item) => ({
      name: item.mandal,
      value: item.count,
    }));
  }, [analytics]);

  const stateChartData = useMemo(() => {
    if (!analytics?.stateBreakdown) return [] as Array<{ name: string; value: number }>;
    return analytics.stateBreakdown.map((item) => ({
      name: item.state,
      value: item.count,
    }));
  }, [analytics]);

  const handleLogout = () => {
    auth.logout();
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'interested':
        return 'bg-green-100 text-green-800 dark:bg-emerald-900/60 dark:text-emerald-200';
      case 'contacted':
        return 'bg-sky-100 text-sky-800 dark:bg-sky-900/60 dark:text-sky-200';
      case 'qualified':
        return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/60 dark:text-indigo-200';
      case 'converted':
        return 'bg-teal-100 text-teal-800 dark:bg-teal-900/60 dark:text-teal-200';
      case 'confirmed':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/60 dark:text-purple-200';
      case 'admitted':
      case 'joined':
        return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200';
      case 'not interested':
        return 'bg-red-100 text-red-800 dark:bg-rose-900/60 dark:text-rose-200';
      case 'partial':
        return 'bg-yellow-100 text-yellow-800 dark:bg-amber-900/60 dark:text-amber-200';
      case 'lost':
        return 'bg-gray-100 text-gray-800 dark:bg-slate-800/60 dark:text-slate-200';
      case 'new':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-slate-800/60 dark:text-slate-200';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <CardSkeleton />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative">
      {/* Background gradient effects */}
      <div className="fixed inset-0 bg-gradient-to-br from-blue-50/30 via-purple-50/20 to-pink-50/30 pointer-events-none dark:bg-gradient-to-br dark:from-slate-950/80 dark:via-slate-900/70 dark:to-slate-900/80"></div>
      <div className="fixed inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none dark:bg-[linear-gradient(to_right,rgba(148,163,184,0.12)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.12)_1px,transparent_1px)]"></div>
      
      <div className="relative z-10">
        {/* Header */}
        <header className="bg-white/80 backdrop-blur-md shadow-sm border-b border-gray-200/50 sticky top-0 z-20 dark:bg-slate-900/70 dark:border-slate-700/70">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">My Dashboard</h1>
                <p className="text-sm text-gray-600 dark:text-slate-300">
                  Welcome, {user?.name} ({user?.roleName || 'User'})
                </p>
              </div>
              <div className="flex gap-2 items-center">
                <ThemeToggle />
                <Button
                  variant="primary"
                  onClick={() => router.push('/user/leads')}
                  className="group"
                >
                  <span className="group-hover:scale-105 transition-transform inline-block">View My Leads</span>
                </Button>
                <Button variant="outline" onClick={handleLogout}>
                  Logout
                </Button>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Analytics Overview */}
          {isLoadingAnalytics ? (
            <Card>
              <div className="p-6">
                <CardSkeleton />
              </div>
            </Card>
          ) : analytics ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
              {/* Total Leads Card */}
              <Card>
                <div className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600 dark:text-slate-300">Total Leads</p>
                      <p className="text-3xl font-bold text-gray-900 dark:text-slate-100 mt-2">
                        {analytics.totalLeads || 0}
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/40 rounded-full flex items-center justify-center">
                      <svg className="w-6 h-6 text-blue-600 dark:text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Updated Leads Card */}
              <Card>
                <div className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600 dark:text-slate-300">Updated (7 days)</p>
                      <p className="text-3xl font-bold text-gray-900 dark:text-slate-100 mt-2">
                        {analytics.recentActivity?.leadsUpdatedLast7Days || 0}
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-green-100 dark:bg-emerald-900/40 rounded-full flex items-center justify-center">
                      <svg className="w-6 h-6 text-green-600 dark:text-emerald-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  </div>
                </div>
              </Card>

              {/* New Leads Card */}
              <Card>
                <div className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600 dark:text-slate-300">New Leads</p>
                      <p className="text-3xl font-bold text-gray-900 dark:text-slate-100 mt-2">
                        {analytics.statusBreakdown?.New || 0}
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/40 rounded-full flex items-center justify-center">
                      <svg className="w-6 h-6 text-purple-600 dark:text-purple-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Interested Leads Card */}
              <Card>
                <div className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600 dark:text-slate-300">Interested</p>
                      <p className="text-3xl font-bold text-gray-900 dark:text-slate-100 mt-2">
                        {analytics.statusBreakdown?.Interested || analytics.statusBreakdown?.interested || 0}
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-yellow-100 dark:bg-amber-900/40 rounded-full flex items-center justify-center">
                      <svg className="w-6 h-6 text-yellow-600 dark:text-amber-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          ) : null}

          {statusChartData.length > 0 && (
            <Card>
              <h2 className="text-xl font-semibold mb-4 dark:text-slate-100">Leads by Status</h2>
              <div className="grid gap-6 lg:grid-cols-2">
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={statusChartData}>
                      <CartesianGrid stroke={chartGridColor} strokeDasharray="3 3" />
                      <XAxis
                        dataKey="name"
                        stroke={chartTextColor}
                        tickLine={false}
                        axisLine={{ stroke: chartGridColor }}
                        tick={{ fill: chartTextColor, fontSize: 12 }}
                      />
                      <YAxis
                        stroke={chartTextColor}
                        allowDecimals={false}
                        tickLine={false}
                        axisLine={{ stroke: chartGridColor }}
                        tick={{ fill: chartTextColor, fontSize: 12 }}
                      />
                      <Tooltip
                        contentStyle={tooltipStyle}
                        cursor={{ fill: theme === 'dark' ? 'rgba(148, 163, 184, 0.12)' : 'rgba(59, 130, 246, 0.08)' }}
                      />
                      <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                        {statusChartData.map((entry, index) => (
                          <Cell
                            key={`status-${entry.name}`}
                            fill={chartColors[index % chartColors.length]}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="space-y-3">
                  {statusChartData.map((item) => (
                    <div
                      key={item.name}
                      className="p-4 rounded-lg border border-gray-200/60 dark:border-slate-700/60 bg-gray-50/60 dark:bg-slate-900/50 flex items-center justify-between"
                    >
                      <div>
                        <p className="text-sm font-medium text-gray-600 dark:text-slate-300">{item.name}</p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-slate-100">{item.value}</p>
                      </div>
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(item.name)}`}>
                        {item.value} leads
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          )}

          {/* Top Mandals */}
          {mandalChartData.length > 0 && (
            <Card>
              <h2 className="text-xl font-semibold mb-4 dark:text-slate-100">Top Mandals</h2>
              <div className="grid gap-6 lg:grid-cols-2">
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={mandalChartData.slice(0, 6)}
                      layout="vertical"
                      margin={{ top: 5, right: 20, bottom: 5, left: 5 }}
                    >
                      <CartesianGrid stroke={chartGridColor} strokeDasharray="3 3" />
                      <XAxis
                        type="number"
                        stroke={chartTextColor}
                        tickLine={false}
                        axisLine={{ stroke: chartGridColor }}
                        tick={{ fill: chartTextColor, fontSize: 12 }}
                      />
                      <YAxis
                        type="category"
                        dataKey="name"
                        stroke={chartTextColor}
                        tickLine={false}
                        axisLine={{ stroke: chartGridColor }}
                        tick={{ fill: chartTextColor, fontSize: 12 }}
                        width={120}
                      />
                      <Tooltip
                        contentStyle={tooltipStyle}
                        cursor={{ fill: theme === 'dark' ? 'rgba(148, 163, 184, 0.12)' : 'rgba(59, 130, 246, 0.08)' }}
                      />
                      <Bar dataKey="value" radius={[0, 8, 8, 0]}>
                        {mandalChartData.slice(0, 6).map((entry, index) => (
                          <Cell
                            key={`mandal-${entry.name}`}
                            fill={chartColors[index % chartColors.length]}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="space-y-3">
                  {mandalChartData.slice(0, 6).map((item, index) => (
                    <div
                      key={item.name}
                      className="flex justify-between items-center p-3 rounded-lg border border-gray-200/60 dark:border-slate-700/60 bg-gray-50/60 dark:bg-slate-900/50"
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: chartColors[index % chartColors.length] }}
                        />
                        <span className="font-medium text-gray-700 dark:text-slate-200">{item.name}</span>
                      </div>
                      <span className="text-lg font-semibold text-blue-600 dark:text-blue-300">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          )}

          {/* Leads by State */}
          {stateChartData.length > 0 && (
            <Card>
              <h2 className="text-xl font-semibold mb-4 dark:text-slate-100">Leads by State</h2>
              <div className="grid gap-6 lg:grid-cols-2">
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Tooltip
                        contentStyle={tooltipStyle}
                        cursor={{ fill: theme === 'dark' ? 'rgba(148, 163, 184, 0.12)' : 'rgba(59, 130, 246, 0.08)' }}
                      />
                      <Pie
                        data={stateChartData.slice(0, 8)}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={60}
                        outerRadius={90}
                        paddingAngle={4}
                        blendStroke
                      >
                        {stateChartData.slice(0, 8).map((entry, index) => (
                          <Cell
                            key={`state-${entry.name}`}
                            fill={chartColors[index % chartColors.length]}
                          />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="space-y-3">
                  {stateChartData.slice(0, 8).map((item, index) => (
                    <div
                      key={item.name}
                      className="flex justify-between items-center p-3 rounded-lg border border-gray-200/60 dark:border-slate-700/60 bg-gray-50/60 dark:bg-slate-900/50"
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: chartColors[index % chartColors.length] }}
                        />
                        <span className="font-medium text-gray-700 dark:text-slate-200">{item.name}</span>
                      </div>
                      <span className="text-lg font-semibold text-blue-600 dark:text-blue-300">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          )}
        </main>
      </div>
    </div>
  );
}

