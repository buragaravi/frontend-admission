'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { reportAPI, userAPI } from '@/lib/api';
import { format } from 'date-fns';

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<'calls' | 'conversions'>('calls');
  const [callFilters, setCallFilters] = useState({
    startDate: format(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd'),
    userId: '',
  });
  const [conversionFilters, setConversionFilters] = useState({
    startDate: format(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd'),
    userId: '',
    period: 'custom' as 'weekly' | 'monthly' | 'custom',
  });

  const { data: users } = useQuery({
    queryKey: ['users'],
    queryFn: () => userAPI.getAll(),
  });

  const { data: callReports, isLoading: isLoadingCalls, error: callReportsError } = useQuery({
    queryKey: ['callReports', callFilters],
    queryFn: () => reportAPI.getDailyCallReports(callFilters),
    enabled: activeTab === 'calls',
    retry: 2,
  });

  const { data: conversionReports, isLoading: isLoadingConversions, error: conversionReportsError } = useQuery({
    queryKey: ['conversionReports', conversionFilters],
    queryFn: () => reportAPI.getConversionReports(conversionFilters),
    enabled: activeTab === 'conversions',
    retry: 2,
  });

  // Log errors separately
  useEffect(() => {
    if (callReportsError) {
      console.error('Error fetching call reports:', callReportsError);
    }
  }, [callReportsError]);

  useEffect(() => {
    if (conversionReportsError) {
      console.error('Error fetching conversion reports:', conversionReportsError);
    }
  }, [conversionReportsError]);

  const handlePeriodChange = (period: 'weekly' | 'monthly' | 'custom') => {
    const now = new Date();
    let start: Date, end: Date;

    if (period === 'weekly') {
      start = new Date(now);
      start.setDate(start.getDate() - 7);
      end = new Date(now);
    } else if (period === 'monthly') {
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      end = new Date(now);
    } else {
      start = new Date(now);
      start.setDate(start.getDate() - 30);
      end = new Date(now);
    }

    setConversionFilters({
      ...conversionFilters,
      period,
      startDate: format(start, 'yyyy-MM-dd'),
      endDate: format(end, 'yyyy-MM-dd'),
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Reports</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            View call reports and lead conversion analytics
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200 dark:border-slate-700">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('calls')}
            className={`
              whitespace-nowrap border-b-2 px-1 py-4 text-sm font-medium transition-colors
              ${
                activeTab === 'calls'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
              }
            `}
          >
            Daily Call Reports
          </button>
          <button
            onClick={() => setActiveTab('conversions')}
            className={`
              whitespace-nowrap border-b-2 px-1 py-4 text-sm font-medium transition-colors
              ${
                activeTab === 'conversions'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
              }
            `}
          >
            Conversion Reports
          </button>
        </nav>
      </div>

      {/* Call Reports Tab */}
      {activeTab === 'calls' && (
        <div className="space-y-6">
          {/* Filters */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Start Date</label>
                <input
                  type="date"
                  value={callFilters.startDate}
                  onChange={(e) => setCallFilters({ ...callFilters, startDate: e.target.value })}
                  className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">End Date</label>
                <input
                  type="date"
                  value={callFilters.endDate}
                  onChange={(e) => setCallFilters({ ...callFilters, endDate: e.target.value })}
                  className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">User</label>
                <select
                  value={callFilters.userId}
                  onChange={(e) => setCallFilters({ ...callFilters, userId: e.target.value })}
                  className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700"
                >
                  <option value="">All Users</option>
                  {users?.map((user: any) => (
                    <option key={user._id} value={user._id}>
                      {user.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Summary */}
          {callReports?.summary && callReports.summary.length > 0 && (
            <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800">
              <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-slate-100">Summary</h2>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                {callReports.summary.map((summary: any) => (
                  <div key={summary.userId} className="rounded-lg border border-slate-200 p-4 dark:border-slate-700">
                    <p className="text-sm font-medium text-slate-600 dark:text-slate-400">{summary.userName}</p>
                    <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-100">{summary.totalCalls}</p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-500">
                      Avg: {summary.averageCallsPerDay} calls/day
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-500">
                      Avg Duration: {Math.floor(summary.averageDuration / 60)}m {summary.averageDuration % 60}s
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Detailed Reports */}
          {isLoadingCalls ? (
            <div className="text-center py-8 text-slate-500">Loading call reports...</div>
          ) : callReportsError ? (
            <div className="rounded-xl border border-red-200 bg-red-50 p-8 text-center dark:border-red-800 dark:bg-red-900/20">
              <p className="text-red-600 dark:text-red-400">
                Failed to load call reports. Please check your filters and try again.
              </p>
            </div>
          ) : callReports?.reports && callReports.reports.length > 0 ? (
            <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                  <thead className="bg-slate-50 dark:bg-slate-900">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        User
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        Calls
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        Total Duration
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        Avg Duration
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white dark:divide-slate-700 dark:bg-slate-800">
                    {callReports.reports.map((report: any, idx: number) => (
                      <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-900 dark:text-slate-100">
                          {format(new Date(report.date), 'MMM dd, yyyy')}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-900 dark:text-slate-100">
                          {report.userName}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-900 dark:text-slate-100">
                          {report.callCount}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-900 dark:text-slate-100">
                          {Math.floor(report.totalDuration / 60)}m {report.totalDuration % 60}s
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-900 dark:text-slate-100">
                          {Math.floor(report.averageDuration / 60)}m {report.averageDuration % 60}s
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-slate-200 bg-white p-8 text-center dark:border-slate-700 dark:bg-slate-800">
              <p className="text-slate-500 dark:text-slate-400">No call reports found for the selected period.</p>
            </div>
          )}
        </div>
      )}

      {/* Conversion Reports Tab */}
      {activeTab === 'conversions' && (
        <div className="space-y-6">
          {/* Filters */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
            <div className="mb-4 flex gap-2">
              <button
                onClick={() => handlePeriodChange('weekly')}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                  conversionFilters.period === 'weekly'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600'
                }`}
              >
                Weekly
              </button>
              <button
                onClick={() => handlePeriodChange('monthly')}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                  conversionFilters.period === 'monthly'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600'
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => handlePeriodChange('custom')}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                  conversionFilters.period === 'custom'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600'
                }`}
              >
                Custom Range
              </button>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Start Date</label>
                <input
                  type="date"
                  value={conversionFilters.startDate}
                  onChange={(e) => setConversionFilters({ ...conversionFilters, startDate: e.target.value })}
                  disabled={conversionFilters.period !== 'custom'}
                  className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:opacity-50 dark:border-slate-600 dark:bg-slate-700"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">End Date</label>
                <input
                  type="date"
                  value={conversionFilters.endDate}
                  onChange={(e) => setConversionFilters({ ...conversionFilters, endDate: e.target.value })}
                  disabled={conversionFilters.period !== 'custom'}
                  className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:opacity-50 dark:border-slate-600 dark:bg-slate-700"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Counsellor</label>
                <select
                  value={conversionFilters.userId}
                  onChange={(e) => setConversionFilters({ ...conversionFilters, userId: e.target.value })}
                  className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700"
                >
                  <option value="">All Counsellors</option>
                  {users?.map((user: any) => (
                    <option key={user._id} value={user._id}>
                      {user.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Summary */}
          {conversionReports?.summary && (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
              <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Total Leads</p>
                <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-100">
                  {conversionReports.summary.totalLeads}
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Total Admissions</p>
                <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-100">
                  {conversionReports.summary.totalAdmissions}
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Conversion Rate</p>
                <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-100">
                  {conversionReports.summary.overallConversionRate}%
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Counsellors</p>
                <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-100">
                  {conversionReports.summary.totalCounsellors}
                </p>
              </div>
            </div>
          )}

          {/* Detailed Reports */}
          {isLoadingConversions ? (
            <div className="text-center py-8 text-slate-500">Loading conversion reports...</div>
          ) : conversionReportsError ? (
            <div className="rounded-xl border border-red-200 bg-red-50 p-8 text-center dark:border-red-800 dark:bg-red-900/20">
              <p className="text-red-600 dark:text-red-400">
                Failed to load conversion reports. Please check your filters and try again.
              </p>
            </div>
          ) : conversionReports?.reports && conversionReports.reports.length > 0 ? (
            <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                  <thead className="bg-slate-50 dark:bg-slate-900">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        Counsellor
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        Total Leads
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        Converted
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        Conversion Rate
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white dark:divide-slate-700 dark:bg-slate-800">
                    {conversionReports.reports.map((report: any) => (
                      <tr key={report.userId} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                        <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-slate-900 dark:text-slate-100">
                          {report.userName}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-900 dark:text-slate-100">
                          {report.totalLeads}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-900 dark:text-slate-100">
                          {report.convertedLeads}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm">
                          <span
                            className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                              report.conversionRate >= 50
                                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                                : report.conversionRate >= 30
                                ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                                : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                            }`}
                          >
                            {report.conversionRate}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-slate-200 bg-white p-8 text-center dark:border-slate-700 dark:bg-slate-800">
              <p className="text-slate-500 dark:text-slate-400">No conversion reports found for the selected period.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

