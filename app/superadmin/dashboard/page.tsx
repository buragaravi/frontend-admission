'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { auth } from '@/lib/auth';
import { userAPI, leadAPI } from '@/lib/api';
import { User } from '@/types';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { showToast } from '@/lib/toast';
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

export default function SuperAdminDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [showAddLeadDialog, setShowAddLeadDialog] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    roleName: 'User',
  });
  const [leadFormData, setLeadFormData] = useState({
    name: '',
    phone: '',
    email: '',
    fatherName: '',
    fatherPhone: '',
    village: '',
    courseInterested: '',
    mandal: '',
    state: 'Andhra Pradesh',
    quota: '',
  });
  const [isSubmittingLead, setIsSubmittingLead] = useState(false);
  const [filterOptions, setFilterOptions] = useState<any>(null);

  useEffect(() => {
    const currentUser = auth.getUser();
    if (!currentUser) {
      router.push('/auth/login');
      return;
    }

    // Check if user is super admin
    if (currentUser.roleName !== 'Super Admin') {
      router.push('/user/dashboard');
      return;
    }

    setUser(currentUser);
    loadData();
  }, [router]);

  const loadData = async () => {
    try {
      const usersData = await userAPI.getAll();
      setUsers(usersData.data || usersData);
      
      // Load filter options for lead form
      try {
        const options = await leadAPI.getFilterOptions();
        setFilterOptions(options.data || options);
      } catch (error) {
        console.error('Error loading filter options:', error);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await userAPI.create(formData);
      setShowCreateUser(false);
      setFormData({ name: '', email: '', password: '', roleName: 'User' });
      showToast.success('User created successfully!');
      loadData();
    } catch (error: any) {
      showToast.error(error.response?.data?.message || 'Failed to create user');
    }
  };

  const handleLogout = () => {
    auth.logout();
  };

  const handleLeadFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setLeadFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleAddLead = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingLead(true);

    try {
      await leadAPI.create({
        name: leadFormData.name,
        phone: leadFormData.phone,
        email: leadFormData.email || undefined,
        fatherName: leadFormData.fatherName,
        fatherPhone: leadFormData.fatherPhone,
        village: leadFormData.village,
        courseInterested: leadFormData.courseInterested || undefined,
        mandal: leadFormData.mandal,
        state: leadFormData.state || 'Andhra Pradesh',
        quota: leadFormData.quota || undefined,
        source: 'Manual Entry',
      });

      // Reset form and close dialog
      setLeadFormData({
        name: '',
        phone: '',
        email: '',
        fatherName: '',
        fatherPhone: '',
        village: '',
        courseInterested: '',
        mandal: '',
        state: 'Andhra Pradesh',
        quota: '',
      });
      setShowAddLeadDialog(false);
      showToast.success('Lead created successfully!');
    } catch (error: any) {
      showToast.error(error.response?.data?.message || 'Failed to create lead');
    } finally {
      setIsSubmittingLead(false);
    }
  };

  // Fetch analytics for selected user
  const { data: analyticsData, isLoading: isLoadingAnalytics } = useQuery({
    queryKey: ['userAnalytics', selectedUserId],
    queryFn: async () => {
      if (!selectedUserId) return null;
      const response = await leadAPI.getAnalytics(selectedUserId);
      return response.data || response;
    },
    enabled: !!selectedUserId,
    staleTime: 30000, // Cache for 30 seconds
  });

  const analytics = (analyticsData?.data || analyticsData) as Analytics | null;
  const selectedUser = users.find(u => u._id === selectedUserId);
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
              <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Super Admin Dashboard</h1>
              <p className="text-sm text-gray-600 dark:text-slate-300">Welcome, {user?.name}</p>
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <Button variant="outline" onClick={handleLogout}>
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Actions */}
        <div className="mb-6 flex gap-4 flex-wrap">
          <Button 
            onClick={() => setShowCreateUser(true)}
            className="group"
          >
            <span className="group-hover:scale-105 transition-transform inline-block">Create User</span>
          </Button>
          <Button 
            onClick={() => router.push('/superadmin/leads')}
            variant="primary"
            className="group"
          >
            <span className="group-hover:scale-105 transition-transform inline-block">View Leads</span>
          </Button>
          <Button 
            onClick={() => router.push('/superadmin/leads/upload')}
            variant="primary"
            className="group"
          >
            <span className="group-hover:scale-105 transition-transform inline-block">Bulk Upload Leads</span>
          </Button>
          <Button 
            onClick={() => router.push('/superadmin/leads/assign')}
            variant="primary"
            className="group"
          >
            <span className="group-hover:scale-105 transition-transform inline-block">Assign Leads</span>
          </Button>
          <Button
            onClick={() => router.push('/superadmin/joining')}
            variant="primary"
            className="group"
          >
            <span className="group-hover:scale-105 transition-transform inline-block">Joining Module</span>
          </Button>
          <Button 
            onClick={() => router.push('/superadmin/communications/templates')}
            variant="primary"
            className="group"
          >
            <span className="group-hover:scale-105 transition-transform inline-block">Manage Templates</span>
          </Button>
          <Button 
            onClick={() => setShowAddLeadDialog(true)}
            variant="primary"
            className="group"
          >
            <span className="group-hover:scale-105 transition-transform inline-block">Add Individual Lead</span>
          </Button>
        </div>

        {/* Create User Modal */}
        {showCreateUser && (
          <Card className="mb-6">
            <h3 className="text-lg font-semibold mb-4">Create New User</h3>
            <form onSubmit={handleCreateUser} className="space-y-4">
              <Input
                label="Name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
              <Input
                label="Email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
              <Input
                label="Password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
              />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Role
                </label>
                <select
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={formData.roleName}
                  onChange={(e) => setFormData({ ...formData, roleName: e.target.value })}
                  required
                >
                  <option value="User">User</option>
                  <option value="Super Admin">Super Admin</option>
                </select>
              </div>
              <div className="flex gap-2">
                <Button type="submit">Create User</Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowCreateUser(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </Card>
        )}

        {/* Add Individual Lead Dialog */}
        {showAddLeadDialog && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <Card className="max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Add Individual Lead</h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAddLeadDialog(false)}
                >
                  ✕
                </Button>
              </div>
              <form onSubmit={handleAddLead} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Name *"
                    name="name"
                    value={leadFormData.name}
                    onChange={handleLeadFormChange}
                    required
                  />
                  <Input
                    label="Phone Number *"
                    name="phone"
                    type="tel"
                    value={leadFormData.phone}
                    onChange={handleLeadFormChange}
                    required
                  />
                  <Input
                    label="Email (Optional)"
                    name="email"
                    type="email"
                    value={leadFormData.email}
                    onChange={handleLeadFormChange}
                  />
                  <Input
                    label="Father's Name *"
                    name="fatherName"
                    value={leadFormData.fatherName}
                    onChange={handleLeadFormChange}
                    required
                  />
                  <Input
                    label="Father's Phone *"
                    name="fatherPhone"
                    type="tel"
                    value={leadFormData.fatherPhone}
                    onChange={handleLeadFormChange}
                    required
                  />
                  <Input
                    label="Village *"
                    name="village"
                    value={leadFormData.village}
                    onChange={handleLeadFormChange}
                    required
                  />
                  <Input
                    label="Course Interested (Optional)"
                    name="courseInterested"
                    value={leadFormData.courseInterested}
                    onChange={handleLeadFormChange}
                  />
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Mandal *
                    </label>
                    <select
                      name="mandal"
                      value={leadFormData.mandal}
                      onChange={handleLeadFormChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white/80 backdrop-blur-sm"
                    >
                      <option value="">Select Mandal</option>
                      {filterOptions?.mandals?.map((mandal: string) => (
                        <option key={mandal} value={mandal}>
                          {mandal}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      State *
                    </label>
                    <select
                      name="state"
                      value={leadFormData.state}
                      onChange={handleLeadFormChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white/80 backdrop-blur-sm"
                    >
                      <option value="">Select State</option>
                      {filterOptions?.states?.map((state: string) => (
                        <option key={state} value={state}>
                          {state}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Quota *
                    </label>
                    <select
                      name="quota"
                      value={leadFormData.quota}
                      onChange={handleLeadFormChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white/80 backdrop-blur-sm"
                    >
                      <option value="">Select Quota</option>
                      {filterOptions?.quotas?.map((quota: string) => (
                        <option key={quota} value={quota}>
                          {quota}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="flex gap-2 pt-4">
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={isSubmittingLead}
                    className="flex-1"
                  >
                    {isSubmittingLead ? 'Creating...' : 'Create Lead'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowAddLeadDialog(false)}
                    disabled={isSubmittingLead}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </Card>
          </div>
        )}


        {/* User Analytics View */}
        {selectedUserId && selectedUser ? (
          <div className="space-y-6">
            {/* Back Button */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button
                  variant="outline"
                  onClick={() => setSelectedUserId(null)}
                  className="group"
                >
                  <svg className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Back to Users
                </Button>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    {selectedUser.name}'s Analytics
                  </h2>
                  <p className="text-sm text-gray-600">{selectedUser.email}</p>
                </div>
              </div>
              <Button
                variant="primary"
                onClick={() => router.push(`/superadmin/users/${selectedUserId}/leads`)}
                className="group"
              >
                <svg className="w-4 h-4 mr-2 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                View User's Assigned Leads
              </Button>
            </div>

            {/* Analytics Overview */}
            {isLoadingAnalytics ? (
              <Card>
                <div className="p-6">
                  <CardSkeleton />
                </div>
              </Card>
            ) : analytics ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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

                  {/* Recent Activity Card */}
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

                {/* Status Breakdown */}
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

                {/* States Breakdown */}
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
              </>
            ) : (
              <Card>
                <div className="text-center py-8">
                  <p className="text-gray-600">No analytics data available for this user.</p>
                </div>
              </Card>
            )}
          </div>
        ) : (
          /* Users List */
          <Card title="Users">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gradient-to-r from-gray-50 to-gray-100/50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white/50 divide-y divide-gray-200">
                  {users.map((user) => (
                    <tr 
                      key={user._id}
                      onClick={() => setSelectedUserId(user._id)}
                      className="hover:bg-blue-50/50 transition-colors duration-200 cursor-pointer"
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {user.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {user.email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {user.roleName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full transition-all ${
                            user.isActive
                              ? 'bg-gradient-to-r from-green-100 to-green-200 text-green-800 shadow-sm'
                              : 'bg-gradient-to-r from-red-100 to-red-200 text-red-800 shadow-sm'
                          }`}
                        >
                          {user.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </main>
      </div>
    </div>
  );
}

