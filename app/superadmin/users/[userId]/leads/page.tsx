'use client';

import { useEffect, useState, useRef, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { auth } from '@/lib/auth';
import { leadAPI, userAPI } from '@/lib/api';
import { Lead, LeadFilters, FilterOptions, User } from '@/types';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';

// Debounce hook for search
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

export default function UserLeadsViewPage() {
  const router = useRouter();
  const params = useParams();
  const userId = params?.userId as string;
  const [currentUser, setCurrentUser] = useState(auth.getUser());
  const [viewingUser, setViewingUser] = useState<User | null>(null);
  const [page, setPage] = useState(1);
  const [limit] = useState(50);
  const [search, setSearch] = useState('');
  const [enquiryNumber, setEnquiryNumber] = useState('');
  const [filters, setFilters] = useState<LeadFilters>({});
  const [showFilters, setShowFilters] = useState(false);
  const [filterOptions, setFilterOptions] = useState<FilterOptions | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const queryClient = useQueryClient();

  // Debounce search inputs
  const debouncedSearch = useDebounce(search, 500);
  const debouncedEnquiryNumber = useDebounce(enquiryNumber, 500);
  
  // Track previous search values to detect actual changes
  const prevSearchRef = useRef<string>('');
  const prevEnquiryRef = useRef<string>('');

  // Reset to page 1 when search or enquiry number changes
  useEffect(() => {
    const searchChanged = debouncedSearch !== prevSearchRef.current;
    const enquiryChanged = debouncedEnquiryNumber !== prevEnquiryRef.current;
    
    if (searchChanged || enquiryChanged) {
      setPage(1);
      prevSearchRef.current = debouncedSearch;
      prevEnquiryRef.current = debouncedEnquiryNumber;
    }
  }, [debouncedSearch, debouncedEnquiryNumber]);

  // Check authentication and mount state
  useEffect(() => {
    setIsMounted(true);
    const user = auth.getUser();
    if (!user) {
      router.push('/auth/login');
      return;
    }
    if (user.roleName !== 'Super Admin') {
      router.push('/user/dashboard');
      return;
    }
    setCurrentUser(user);
  }, [router]);

  // Fetch viewing user info
  const { data: userData } = useQuery({
    queryKey: ['user', userId],
    queryFn: async () => {
      const response = await userAPI.getById(userId);
      return response.data || response;
    },
    enabled: !!userId && !!currentUser,
  });

  useEffect(() => {
    if (userData) {
      setViewingUser(userData);
    }
  }, [userData]);

  // Load filter options
  useEffect(() => {
    const loadFilterOptions = async () => {
      try {
        const options = await leadAPI.getFilterOptions();
        setFilterOptions(options.data || options);
      } catch (error) {
        console.error('Error loading filter options:', error);
      }
    };
    if (currentUser && userId) {
      loadFilterOptions();
    }
  }, [currentUser, userId]);

  // Build query filters - include assignedTo filter
  const queryFilters = useMemo(() => {
    const query: LeadFilters = {
      page,
      limit,
      assignedTo: userId, // Filter by the user we're viewing
      ...filters,
    };
    if (debouncedSearch) {
      query.search = debouncedSearch;
    }
    if (debouncedEnquiryNumber) {
      query.enquiryNumber = debouncedEnquiryNumber;
    }
    return query;
  }, [page, limit, userId, filters, debouncedSearch, debouncedEnquiryNumber]);

  // Fetch leads with React Query
  const {
    data: leadsData,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['leads', queryFilters],
    queryFn: async () => {
      const response = await leadAPI.getAll(queryFilters);
      return response.data || response;
    },
    enabled: !!currentUser && !!userId,
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });

  const leads = leadsData?.leads || [];
  const pagination = leadsData?.pagination || { page: 1, limit: 50, total: 0, pages: 1 };

  // Handle filter changes
  const handleFilterChange = (key: keyof LeadFilters, value: string | undefined) => {
    setFilters((prev) => {
      const newFilters = { ...prev };
      if (value && value !== '') {
        newFilters[key] = value;
      } else {
        delete newFilters[key];
      }
      setPage(1);
      return newFilters;
    });
  };

  // Clear all filters
  const clearFilters = () => {
    setFilters({});
    setSearch('');
    setEnquiryNumber('');
    setPage(1);
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Get status badge color
  const getStatusColor = (status?: string) => {
    switch (status?.toLowerCase()) {
      case 'interested':
        return 'bg-green-100 text-green-800';
      case 'not interested':
        return 'bg-red-100 text-red-800';
      case 'partial':
        return 'bg-yellow-100 text-yellow-800';
      case 'new':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Prevent hydration mismatch
  if (!isMounted || !currentUser || !userId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative">
      {/* Background gradient effects */}
      <div className="fixed inset-0 bg-gradient-to-br from-blue-50/30 via-purple-50/20 to-pink-50/30 pointer-events-none"></div>
      <div className="fixed inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none"></div>
      
      <div className="relative z-10">
        {/* Header */}
        <header className="bg-white/80 backdrop-blur-md shadow-sm border-b border-gray-200/50 sticky top-0 z-20">
          <div className="max-w-[95%] mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {viewingUser ? `${viewingUser.name}'s Assigned Leads` : 'User Leads'}
                </h1>
                <p className="text-sm text-gray-600">
                  {viewingUser?.email || 'Loading user info...'}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => router.push('/superadmin/dashboard')}
                >
                  Back to Dashboard
                </Button>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-[95%] mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Search and Filters */}
          <Card className="mb-6">
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Search by Enquiry Number
                  </label>
                  <Input
                    type="text"
                    placeholder="ENQ24000001 or 24000001 or 000001"
                    value={enquiryNumber}
                    onChange={(e) => setEnquiryNumber(e.target.value)}
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Search by Name/Phone/Email
                  </label>
                  <Input
                    type="text"
                    placeholder="Search leads..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full"
                  />
                </div>
                <div className="flex items-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setShowFilters(!showFilters)}
                    className="w-full"
                  >
                    {showFilters ? 'Hide' : 'Show'} Filters
                  </Button>
                  {(Object.keys(filters).length > 0 || search || enquiryNumber) && (
                    <Button
                      variant="outline"
                      onClick={clearFilters}
                      className="w-full"
                    >
                      Clear
                    </Button>
                  )}
                </div>
              </div>

              {/* Filter Row */}
              {showFilters && (
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 pt-4 border-t border-gray-200">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Mandal
                    </label>
                    <select
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white/80 backdrop-blur-sm"
                      value={filters.mandal || ''}
                      onChange={(e) => handleFilterChange('mandal', e.target.value)}
                    >
                      <option value="">All Mandals</option>
                      {filterOptions?.mandals?.map((mandal) => (
                        <option key={mandal} value={mandal}>
                          {mandal}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      State
                    </label>
                    <select
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white/80 backdrop-blur-sm"
                      value={filters.state || ''}
                      onChange={(e) => handleFilterChange('state', e.target.value)}
                    >
                      <option value="">All States</option>
                      {filterOptions?.states?.map((state) => (
                        <option key={state} value={state}>
                          {state}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Quota
                    </label>
                    <select
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white/80 backdrop-blur-sm"
                      value={filters.quota || ''}
                      onChange={(e) => handleFilterChange('quota', e.target.value)}
                    >
                      <option value="">All Quotas</option>
                      {filterOptions?.quotas?.map((quota) => (
                        <option key={quota} value={quota}>
                          {quota}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Status
                    </label>
                    <select
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white/80 backdrop-blur-sm"
                      value={filters.status || ''}
                      onChange={(e) => handleFilterChange('status', e.target.value)}
                    >
                      <option value="">All Statuses</option>
                      {filterOptions?.statuses?.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* Results Summary */}
          <div className="mb-4 flex justify-between items-center">
            <p className="text-sm text-gray-600">
              Showing {leads.length} of {pagination.total} leads
              {pagination.total > 0 && (
                <span className="ml-2">
                  (Page {pagination.page} of {pagination.pages})
                </span>
              )}
            </p>
            {isLoading && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                Loading...
              </div>
            )}
          </div>

          {/* Leads Table */}
          {isError ? (
            <Card>
              <div className="text-center py-8">
                <p className="text-red-600 mb-4">
                  Error loading leads: {error instanceof Error ? error.message : 'Unknown error'}
                </p>
                <Button onClick={() => refetch()}>Retry</Button>
              </div>
            </Card>
          ) : leads.length === 0 && !isLoading ? (
            <Card>
              <div className="text-center py-8">
                <p className="text-gray-600">No leads assigned to this user yet</p>
              </div>
            </Card>
          ) : (
            <Card>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gradient-to-r from-gray-50 to-gray-100/50">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Enquiry #
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Name
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Phone
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Email
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Mandal
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        State
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Created
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white/50 divide-y divide-gray-200">
                    {leads.map((lead: Lead) => (
                      <tr
                        key={lead._id}
                        className="hover:bg-blue-50/50 transition-colors duration-200 cursor-pointer"
                        onClick={() => router.push(`/superadmin/leads/${lead._id}`)}
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-mono font-medium text-blue-600">
                          {lead.enquiryNumber || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {lead.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {lead.phone}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {lead.email || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {lead.mandal}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {lead.state}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full transition-all ${getStatusColor(
                              lead.status
                            )}`}
                          >
                            {lead.status || 'New'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {lead.createdAt ? formatDate(lead.createdAt) : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {pagination.pages > 1 && (
                <div className="mt-6 pt-4 border-t border-gray-200 flex justify-between items-center gap-4">
                  <div className="flex items-center gap-2">
                    {/* First Page Button */}
                    <Button
                      variant="outline"
                      onClick={() => setPage(1)}
                      disabled={page === 1 || isLoading}
                      size="sm"
                      className="p-2"
                      title="First Page"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                      </svg>
                    </Button>
                    
                    {/* Previous Page Button */}
                    <Button
                      variant="outline"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1 || isLoading}
                      size="sm"
                      className="p-2"
                      title="Previous Page"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </Button>

                    {/* Page Numbers */}
                    <div className="flex gap-1">
                      {Array.from({ length: Math.min(5, pagination.pages) }, (_, i) => {
                        let pageNum;
                        if (pagination.pages <= 5) {
                          pageNum = i + 1;
                        } else if (page <= 3) {
                          pageNum = i + 1;
                        } else if (page >= pagination.pages - 2) {
                          pageNum = pagination.pages - 4 + i;
                        } else {
                          pageNum = page - 2 + i;
                        }
                        return (
                          <Button
                            key={pageNum}
                            variant={page === pageNum ? 'primary' : 'outline'}
                            onClick={() => setPage(pageNum)}
                            disabled={isLoading}
                            size="sm"
                            className="min-w-[40px]"
                          >
                            {pageNum}
                          </Button>
                        );
                      })}
                    </div>

                    {/* Next Page Button */}
                    <Button
                      variant="outline"
                      onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))}
                      disabled={page === pagination.pages || isLoading}
                      size="sm"
                      className="p-2"
                      title="Next Page"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </Button>

                    {/* Last Page Button */}
                    <Button
                      variant="outline"
                      onClick={() => setPage(pagination.pages)}
                      disabled={page === pagination.pages || isLoading}
                      size="sm"
                      className="p-2"
                      title="Last Page"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                      </svg>
                    </Button>
                  </div>

                  {/* Jump to Page Dropdown (only if pages > 50) */}
                  {pagination.pages > 50 && (
                    <div className="flex items-center gap-2">
                      <label className="text-sm text-gray-600">Jump to:</label>
                      <select
                        value={page}
                        onChange={(e) => setPage(Number(e.target.value))}
                        disabled={isLoading}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white/80 backdrop-blur-sm text-sm"
                      >
                        {Array.from({ length: Math.ceil(pagination.pages / 50) }, (_, i) => {
                          const pageValue = (i + 1) * 50;
                          if (pageValue <= pagination.pages) {
                            return (
                              <option key={pageValue} value={pageValue}>
                                Page {pageValue}
                              </option>
                            );
                          }
                          return null;
                        })}
                        {!Array.from({ length: Math.ceil(pagination.pages / 50) }, (_, i) => (i + 1) * 50).includes(page) && (
                          <option value={page}>Page {page} (Current)</option>
                        )}
                      </select>
                    </div>
                  )}

                  {/* Page Info */}
                  <div className="text-sm text-gray-600">
                    Page {pagination.page} of {pagination.pages}
                  </div>
                </div>
              )}
            </Card>
          )}
        </main>
      </div>
    </div>
  );
}

