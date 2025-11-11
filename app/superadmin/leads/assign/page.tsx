'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { auth } from '@/lib/auth';
import { leadAPI, userAPI } from '@/lib/api';
import { User, FilterOptions } from '@/types';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { showToast } from '@/lib/toast';
import { ThemeToggle } from '@/components/ThemeToggle';

export default function AssignLeadsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [user, setUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [mandal, setMandal] = useState('');
  const [state, setState] = useState('');
  const [count, setCount] = useState(1000);
  const [filterOptions, setFilterOptions] = useState<FilterOptions | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  // Check authentication
  useEffect(() => {
    setIsMounted(true);
    const currentUser = auth.getUser();
    if (!currentUser) {
      router.push('/auth/login');
      return;
    }
    if (currentUser.roleName !== 'Super Admin') {
      router.push('/user/dashboard');
      return;
    }
    setUser(currentUser);
  }, [router]);

  // Load users and filter options
  useEffect(() => {
    const loadData = async () => {
      try {
        const [usersData, optionsData] = await Promise.all([
          userAPI.getAll(),
          leadAPI.getFilterOptions(),
        ]);
        setUsers(usersData.data || usersData);
        setFilterOptions(optionsData.data || optionsData);
      } catch (error) {
        console.error('Error loading data:', error);
      }
    };
    if (user) {
      loadData();
    }
  }, [user]);

  // Assignment mutation
  const assignMutation = useMutation({
    mutationFn: async (data: {
      userId: string;
      mandal?: string;
      state?: string;
      count: number;
    }) => {
      return await leadAPI.assignLeads(data);
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      const assignedCount = response.data?.assigned || response.assigned || 0;
      const userName = response.data?.userName || 'user';
      showToast.success(`Successfully assigned ${assignedCount} leads to ${userName}`);
      // Reset form
      setSelectedUserId('');
      setMandal('');
      setState('');
      setCount(1000);
    },
    onError: (error: any) => {
      console.error('Error assigning leads:', error);
      showToast.error(error.response?.data?.message || 'Failed to assign leads');
    },
  });

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId) {
      showToast.error('Please select a user');
      return;
    }
    if (count <= 0) {
      showToast.error('Count must be greater than 0');
      return;
    }
    assignMutation.mutate({
      userId: selectedUserId,
      mandal: mandal || undefined,
      state: state || undefined,
      count: parseInt(String(count)),
    });
  };

  if (!isMounted || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-slate-300">Loading...</p>
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
                <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Assign Leads to Users</h1>
                <p className="text-sm text-gray-600 dark:text-slate-300">
                  Assign unassigned leads to users based on mandal and state
                </p>
              </div>
              <div className="flex items-center gap-2">
                <ThemeToggle />
                <Button
                  variant="outline"
                  onClick={() => router.push('/superadmin/leads')}
                >
                  Back to Leads
                </Button>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Card>
            <h2 className="text-xl font-semibold mb-6 dark:text-slate-100">Assign Leads</h2>
            <form onSubmit={handleAssign} className="space-y-6">
              {/* User Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-1">
                  Select User *
                </label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white/80 backdrop-blur-sm dark:bg-slate-900/50 dark:border-slate-700 dark:text-slate-100"
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  required
                >
                  <option value="">Select a user...</option>
                  {users
                    .filter((u) => u.roleName === 'User' && u.isActive)
                    .map((u) => (
                      <option key={u._id} value={u._id}>
                        {u.name} ({u.email})
                      </option>
                    ))}
                </select>
              </div>

              {/* Mandal Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-1">
                  Mandal (Optional)
                </label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white/80 backdrop-blur-sm dark:bg-slate-900/50 dark:border-slate-700 dark:text-slate-100"
                  value={mandal}
                  onChange={(e) => setMandal(e.target.value)}
                >
                  <option value="">All Mandals</option>
                  {filterOptions?.mandals?.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                  Leave empty to assign from all mandals
                </p>
              </div>

              {/* State Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-1">
                  State (Optional)
                </label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white/80 backdrop-blur-sm dark:bg-slate-900/50 dark:border-slate-700 dark:text-slate-100"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                >
                  <option value="">All States</option>
                  {filterOptions?.states?.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                  Leave empty to assign from all states
                </p>
              </div>

              {/* Count */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-1">
                  Number of Leads to Assign *
                </label>
                <Input
                  type="number"
                  min="1"
                  value={count}
                  onChange={(e) => setCount(parseInt(e.target.value) || 0)}
                  required
                  placeholder="e.g., 1000"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Number of unassigned leads to assign to this user
                </p>
              </div>

              {/* Info Box */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  <strong>Note:</strong> This will assign unassigned leads matching the selected criteria (mandal/state) to the selected user. 
                  If no mandal or state is selected, leads from all mandals/states will be assigned.
                </p>
              </div>

              {/* Submit Button */}
              <div className="flex gap-2 pt-4">
                <Button
                  type="submit"
                  variant="primary"
                  disabled={assignMutation.isPending || !selectedUserId}
                >
                  {assignMutation.isPending ? 'Assigning...' : 'Assign Leads'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setSelectedUserId('');
                    setMandal('');
                    setState('');
                    setCount(1000);
                  }}
                  disabled={assignMutation.isPending}
                >
                  Reset
                </Button>
              </div>
            </form>
          </Card>
        </main>
      </div>
    </div>
  );
}

