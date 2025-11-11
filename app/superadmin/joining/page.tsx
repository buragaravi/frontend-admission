'use client';

import { useCallback, useMemo, useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { joiningAPI } from '@/lib/api';
import { JoiningListResponse, JoiningStatus } from '@/types';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

const statusOptions: Array<{ label: string; value: JoiningStatus | 'all' }> = [
  { label: 'All', value: 'all' },
  { label: 'Draft', value: 'draft' },
  { label: 'Pending Approval', value: 'pending_approval' },
  { label: 'Approved', value: 'approved' },
];

const JoiningListPage = () => {
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<JoiningStatus | 'all'>('all');

  const queryKey = useMemo(
    () => ['joinings', page, limit, searchTerm, statusFilter],
    [page, limit, searchTerm, statusFilter]
  );

  const { data, isLoading, isFetching } = useQuery<JoiningListResponse>({
    queryKey,
    queryFn: async () => {
      const response = await joiningAPI.list({
        page,
        limit,
        search: searchTerm,
        status: statusFilter === 'all' ? undefined : statusFilter,
      });
      return response.data;
    },
    keepPreviousData: true,
  });

  const handleStatusChange = useCallback((event: React.ChangeEvent<HTMLSelectElement>) => {
    setStatusFilter(event.target.value as JoiningStatus | 'all');
    setPage(1);
  }, []);

  const totalPages = data?.pagination.pages ?? 1;

  const isEmpty = !isLoading && (data?.joinings?.length ?? 0) === 0;

  const getStatusBadge = (status: JoiningStatus) => {
    switch (status) {
      case 'approved':
        return 'bg-emerald-100 text-emerald-700';
      case 'pending_approval':
        return 'bg-amber-100 text-amber-700';
      default:
        return 'bg-blue-100 text-blue-700';
    }
  };

  const formatDate = (date?: string) => {
    if (!date) return '—';
    return new Date(date).toLocaleString();
  };

  return (
    <div className="min-h-screen relative">
      <div className="pointer-events-none fixed inset-0 bg-gradient-to-br from-sky-50/50 via-purple-50/40 to-rose-50/40 dark:from-slate-950/90 dark:via-slate-900/80 dark:to-slate-900/85" />
      <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(to_right,#94a3b81a_1px,transparent_1px),linear-gradient(to_bottom,#94a3b81a_1px,transparent_1px)] bg-[size:28px_28px]" />

      <div className="relative z-10">
        <header className="sticky top-0 z-20 border-b border-white/60 bg-white/80 backdrop-blur-lg dark:border-slate-800/60 dark:bg-slate-950/70">
          <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-blue-500 dark:text-blue-300">
                Admissions Pipeline
              </p>
              <h1 className="mt-2 text-3xl font-semibold text-slate-900 dark:text-slate-100">
                Joining Module
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-600 dark:text-slate-400">
                Track confirmed leads, manage their joining forms, and finalise admission records
                with confidence.
              </p>
            </div>
            <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
              <Input
                placeholder="Search by name, phone, hall ticket…"
                value={searchTerm}
                onChange={(event) => {
                  setSearchTerm(event.target.value);
                  setPage(1);
                }}
              />
              <select
                className="w-full rounded-xl border-2 border-slate-200/80 bg-white px-4 py-3 text-sm font-medium text-slate-600 shadow-sm transition hover:border-slate-300 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-300 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-100"
                value={statusFilter}
                onChange={handleStatusChange}
              >
                {statusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <Card className="overflow-hidden border border-white/40 shadow-lg shadow-blue-100/30 dark:border-slate-800/70 dark:shadow-none">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200/80 dark:divide-slate-800/80">
                <thead className="bg-slate-50/80 backdrop-blur-sm dark:bg-slate-900/70">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Student
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Contact
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Course / Branch
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Quota
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Status
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Last Updated
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white/80 backdrop-blur-sm dark:divide-slate-800 dark:bg-slate-900/60">
                  {isLoading || isFetching ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-16 text-center text-sm text-slate-500">
                        <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-blue-400 border-t-transparent"></div>
                        <p className="mt-4 text-xs uppercase tracking-[0.3em] text-slate-400">
                          Loading joinings…
                        </p>
                      </td>
                    </tr>
                  ) : isEmpty ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-16 text-center text-sm text-slate-500">
                        <p className="font-medium text-slate-600 dark:text-slate-400">
                          No confirmed leads found.
                        </p>
                        <p className="mt-1 text-xs uppercase tracking-[0.3em] text-slate-400">
                          Update a lead to “Confirmed” to begin the joining workflow.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    data?.joinings?.map((entry) => (
                      <tr
                        key={entry._id}
                        className="transition hover:bg-blue-50/60 dark:hover:bg-slate-800/60"
                      >
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                              {entry.lead?.name || entry.studentInfo?.name || '—'}
                            </span>
                            <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                              {entry.lead?.hallTicketNumber && (
                                <span>HT No: {entry.lead.hallTicketNumber}</span>
                              )}
                              {entry.lead?.admissionNumber && (
                                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-200">
                                  Admission #{entry.lead.admissionNumber}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="text-sm text-slate-900 dark:text-slate-100">
                              {entry.studentInfo?.phone || entry.lead?.phone || '—'}
                            </span>
                            {entry.lead?.fatherPhone && (
                              <span className="text-xs text-slate-500">
                                Father: {entry.lead.fatherPhone}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="text-sm text-slate-900 dark:text-slate-100">
                              {entry.courseInfo?.course || entry.lead?.courseInterested || '—'}
                            </span>
                            <span className="text-xs text-slate-500">
                              {entry.courseInfo?.branch || 'Branch pending'}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-900 dark:text-slate-100">
                          {entry.courseInfo?.quota || entry.lead?.quota || '—'}
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${getStatusBadge(entry.status)}`}
                          >
                            <span className="inline-block h-2 w-2 rounded-full bg-current opacity-70" />
                            {entry.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-500">
                          {formatDate(entry.updatedAt)}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <Link href={`/superadmin/joining/${entry.leadId}`}>
                            <Button
                              variant="primary"
                              className="group inline-flex items-center gap-2"
                            >
                              <span className="transition-transform group-hover:-translate-x-0.5">
                                Open Form
                              </span>
                              <svg
                                className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M9 5l7 7-7 7"
                                />
                              </svg>
                            </Button>
                          </Link>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>

          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-end gap-3">
              <Button
                variant="secondary"
                disabled={page <= 1 || isFetching}
                onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
              >
                Previous
              </Button>
              <span className="text-sm text-slate-600 dark:text-slate-300">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="secondary"
                disabled={page >= totalPages || isFetching}
                onClick={() => setPage((prev) => Math.min(prev + 1, totalPages))}
              >
                Next
              </Button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default JoiningListPage;


