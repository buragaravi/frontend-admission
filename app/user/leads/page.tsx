'use client';

import { useEffect, useState, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { auth } from '@/lib/auth';
import { leadAPI } from '@/lib/api';
import { Lead, LeadFilters, FilterOptions } from '@/types';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { showToast } from '@/lib/toast';
import { Skeleton, TableSkeleton, CardSkeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { ThemeToggle } from '@/components/ThemeToggle';

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

export default function UserLeadsPage() {
  const router = useRouter();
  const [user, setUser] = useState(auth.getUser());
  const [page, setPage] = useState(1);
  const [limit] = useState(50);
  const [search, setSearch] = useState('');
  const [enquiryNumber, setEnquiryNumber] = useState('');
  const [filters, setFilters] = useState<LeadFilters>({});
  const [showFilters, setShowFilters] = useState(false);
  const [filterOptions, setFilterOptions] = useState<FilterOptions | null>(null);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [comment, setComment] = useState('');
  const [newStatus, setNewStatus] = useState('');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [searchSuggestions, setSearchSuggestions] = useState<Lead[]>([]);
  const [enquirySuggestions, setEnquirySuggestions] = useState<Lead[]>([]);
  const [showSearchSuggestions, setShowSearchSuggestions] = useState(false);
  const [showEnquirySuggestions, setShowEnquirySuggestions] = useState(false);
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
    const currentUser = auth.getUser();
    if (!currentUser) {
      router.push('/auth/login');
      return;
    }
    if (currentUser.roleName === 'Super Admin') {
      router.push('/superadmin/dashboard');
      return;
    }
    setUser(currentUser);
  }, [router]);

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
    if (user) {
      loadFilterOptions();
    }
  }, [user]);

  useEffect(() => {
    let active = true;

    const fetchSuggestions = async () => {
      try {
        const response = await leadAPI.getAll({
          ...filters,
          search: debouncedSearch,
          page: 1,
          limit: 5,
        });
        if (!active) return;
        const results = response.data?.leads || response.leads || [];
        setSearchSuggestions(results);
      } catch (error) {
        if (!active) return;
        setSearchSuggestions([]);
      }
    };

    if (debouncedSearch && debouncedSearch.length >= 2) {
      fetchSuggestions();
    } else {
      setSearchSuggestions([]);
    }

    return () => {
      active = false;
    };
  }, [debouncedSearch, filters]);

  useEffect(() => {
    let active = true;

    const fetchSuggestions = async () => {
      try {
        const response = await leadAPI.getAll({
          ...filters,
          enquiryNumber: debouncedEnquiryNumber,
          page: 1,
          limit: 5,
        });
        if (!active) return;
        const results = response.data?.leads || response.leads || [];
        setEnquirySuggestions(results);
      } catch (error) {
        if (!active) return;
        setEnquirySuggestions([]);
      }
    };

    if (debouncedEnquiryNumber && debouncedEnquiryNumber.length >= 2) {
      fetchSuggestions();
    } else {
      setEnquirySuggestions([]);
    }

    return () => {
      active = false;
    };
  }, [debouncedEnquiryNumber, filters]);

  // Build query filters
  const queryFilters = useMemo(() => {
    const query: LeadFilters = {
      page,
      limit,
      ...filters,
    };
    if (debouncedSearch) {
      query.search = debouncedSearch;
    }
    if (debouncedEnquiryNumber) {
      query.enquiryNumber = debouncedEnquiryNumber;
    }
    return query;
  }, [page, limit, filters, debouncedSearch, debouncedEnquiryNumber]);

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
    enabled: !!user,
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

  // Open comment modal
  const handleOpenCommentModal = (lead: Lead, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedLead(lead);
    setComment('');
    setNewStatus(lead.status || '');
    setShowCommentModal(true);
  };

  // Handle status change
  const handleStatusChange = (status: string) => {
    setNewStatus(status);
  };

  // Mutation for adding activity
  const addActivityMutation = useMutation({
    mutationFn: async (data: { comment?: string; newStatus?: string }) => {
      if (!selectedLead) return;
      return await leadAPI.addActivity(selectedLead._id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['lead', selectedLead?._id] });
      setShowCommentModal(false);
      setShowConfirmModal(false);
      setSelectedLead(null);
      setComment('');
      setNewStatus('');
    },
    onError: (error: any) => {
      console.error('Error adding activity:', error);
      showToast.error(error.response?.data?.message || 'Failed to add activity');
    },
  });

  // Handle save comment/status
  const handleSaveActivity = () => {
    if (!selectedLead) return;
    
    const hasComment = comment.trim().length > 0;
    const hasStatusChange = newStatus && newStatus !== selectedLead.status;

    if (!hasComment && !hasStatusChange) {
      showToast.error('Please add a comment or change the status');
      return;
    }

    // If status is changing, show confirmation first
    if (hasStatusChange) {
      setShowConfirmModal(true);
    } else {
      // Just save comment without confirmation
      addActivityMutation.mutate({
        comment: hasComment ? comment.trim() : undefined,
        newStatus: undefined,
      });
    }
  };

  // Confirm status change
  const handleConfirmStatusChange = () => {
    if (!selectedLead) return;
    setShowConfirmModal(false);
    addActivityMutation.mutate({
      comment: comment.trim() ? comment.trim() : undefined,
      newStatus: newStatus && newStatus !== selectedLead.status ? newStatus : undefined,
    });
  };

  // Prevent hydration mismatch
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
      <div className="fixed inset-0 bg-gradient-to-br from-blue-50/30 via-purple-50/20 to-pink-50/30 pointer-events-none"></div>
      <div className="fixed inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none"></div>
      
      <div className="relative z-10">
        {/* Header */}
        <header className="bg-white/80 backdrop-blur-md shadow-sm border-b border-gray-200/50 sticky top-0 z-20 dark:bg-slate-900/70 dark:border-slate-700/70">
          <div className="max-w-[95%] mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">My Leads</h1>
                <p className="text-sm text-gray-600 dark:text-slate-300">
                  Manage your assigned leads
                </p>
              </div>
              <div className="flex gap-2 items-center">
                <ThemeToggle />
                <Button
                  variant="outline"
                  onClick={() => router.push('/user/dashboard')}
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
                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-1">
                    Search by Enquiry Number
                  </label>
                  <Input
                    type="text"
                    placeholder="ENQ24000001 or 24000001 or 000001"
                    value={enquiryNumber}
                    onChange={(e) => setEnquiryNumber(e.target.value)}
                    onFocus={() => setShowEnquirySuggestions(true)}
                    onBlur={() => setTimeout(() => setShowEnquirySuggestions(false), 150)}
                    className="w-full"
                  />
                  {showEnquirySuggestions && enquirySuggestions.length > 0 && (
                    <div className="absolute z-20 mt-2 w-full bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl shadow-lg overflow-hidden">
                      {enquirySuggestions.map((suggestion) => (
                        <button
                          key={`user-enquiry-suggestion-${suggestion._id}`}
                          type="button"
                          className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-slate-200 hover:bg-blue-50 dark:hover:bg-slate-800/60 flex justify-between gap-3"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            if (suggestion.enquiryNumber) {
                              setEnquiryNumber(suggestion.enquiryNumber);
                              setPage(1);
                            }
                            setShowEnquirySuggestions(false);
                          }}
                        >
                          <span className="font-medium">{suggestion.enquiryNumber || '—'}</span>
                          <span className="text-xs text-gray-500 dark:text-slate-400">{suggestion.name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-1">
                    Search by Name/Phone/Email
                  </label>
                  <Input
                    type="text"
                    placeholder="Search leads..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    onFocus={() => setShowSearchSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowSearchSuggestions(false), 150)}
                    className="w-full"
                  />
                  {showSearchSuggestions && searchSuggestions.length > 0 && (
                    <div className="absolute z-20 mt-2 w-full bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl shadow-lg overflow-hidden">
                      {searchSuggestions.map((suggestion) => (
                        <button
                          key={`user-search-suggestion-${suggestion._id}`}
                          type="button"
                          className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-slate-200 hover:bg-blue-50 dark:hover:bg-slate-800/60 flex flex-col gap-1"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            const value = suggestion.name || suggestion.phone || suggestion.email || '';
                            if (value) {
                              setSearch(value);
                              setPage(1);
                            }
                            setShowSearchSuggestions(false);
                          }}
                        >
                          <span className="font-medium">{suggestion.name || suggestion.phone || 'Untitled Lead'}</span>
                          <span className="text-xs text-gray-500 dark:text-slate-400 flex gap-2">
                            {suggestion.phone && <span>{suggestion.phone}</span>}
                            {suggestion.email && <span>{suggestion.email}</span>}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
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
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-1">
                      Mandal
                    </label>
                    <select
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white/80 backdrop-blur-sm text-sm dark:bg-slate-900/50 dark:border-slate-700 dark:text-slate-100"
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
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-1">
                      State
                    </label>
                    <select
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white/80 backdrop-blur-sm text-sm dark:bg-slate-900/50 dark:border-slate-700 dark:text-slate-100"
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
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-1">
                      Quota
                    </label>
                    <select
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white/80 backdrop-blur-sm text-sm dark:bg-slate-900/50 dark:border-slate-700 dark:text-slate-100"
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
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-1">
                      Status
                    </label>
                    <select
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white/80 backdrop-blur-sm text-sm dark:bg-slate-900/50 dark:border-slate-700 dark:text-slate-100"
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
            <p className="text-sm text-gray-600 dark:text-slate-300">
              Showing {leads.length} of {pagination.total} leads
              {pagination.total > 0 && (
                <span className="ml-2">
                  (Page {pagination.page} of {pagination.pages})
                </span>
              )}
            </p>
            {isLoading && (
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-slate-300">
                <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                Loading...
              </div>
            )}
          </div>

          {/* Leads Table */}
          {isError ? (
            <Card>
              <div className="text-center py-8">
                <p className="text-red-600 dark:text-rose-300 mb-4">
                  Error loading leads: {error instanceof Error ? error.message : 'Unknown error'}
                </p>
                <Button onClick={() => refetch()}>Retry</Button>
              </div>
            </Card>
          ) : leads.length === 0 && !isLoading ? (
            <Card>
              <EmptyState
                title="No leads assigned yet"
                description="You don't have any leads assigned to you. Contact your administrator to get started."
                icon={
                  <svg className="w-16 h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                }
              />
            </Card>
          ) : isLoading ? (
            <Card>
              <div className="p-6">
                <TableSkeleton rows={5} cols={10} />
              </div>
            </Card>
          ) : (
            <>
              <div className="grid gap-4 md:hidden">
                {leads.map((lead: Lead) => (
                  <Card
                    key={`mobile-user-${lead._id}`}
                    className="p-4 bg-white/80 dark:bg-slate-900/60"
                    onClick={() => router.push(`/user/leads/${lead._id}`)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-slate-400">Enquiry #</p>
                        <p className="text-sm font-semibold text-gray-900 dark:text-slate-100">
                          {lead.enquiryNumber || '—'}
                        </p>
                      </div>
                      <span
                        className={`px-2 py-0.5 text-[11px] font-semibold rounded-full ${getStatusColor(lead.status)}`}
                      >
                        {lead.status || 'New'}
                      </span>
                    </div>

                    <div className="mt-4 space-y-3 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500 dark:text-slate-400">Name</span>
                        <span className="font-medium text-gray-900 dark:text-slate-100">{lead.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500 dark:text-slate-400">Phone</span>
                        <span className="font-medium text-blue-600 dark:text-blue-300">{lead.phone}</span>
                      </div>
                      {lead.email && (
                        <div className="flex justify-between">
                          <span className="text-gray-500 dark:text-slate-400">Email</span>
                          <span className="text-gray-700 dark:text-slate-200 truncate max-w-[55%] text-right">{lead.email}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-gray-500 dark:text-slate-400">Mandal</span>
                        <span className="text-gray-700 dark:text-slate-200">{lead.mandal}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500 dark:text-slate-400">Village</span>
                        <span className="text-gray-700 dark:text-slate-200">{lead.village}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500 dark:text-slate-400">State</span>
                        <span className="text-gray-700 dark:text-slate-200">{lead.state}</span>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/user/leads/${lead._id}`);
                        }}
                      >
                        View Details
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenCommentModal(lead, e);
                        }}
                      >
                        Comment / Update Status
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>

              <Card className="hidden md:block">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
                    <thead className="bg-gradient-to-r from-gray-50 to-gray-100/50 dark:from-slate-900/60 dark:to-slate-900/40">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider dark:text-slate-200">
                          Enquiry #
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider dark:text-slate-200">
                          Name
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider dark:text-slate-200">
                          Phone
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider hidden sm:table-cell dark:text-slate-200">
                          Email
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider hidden md:table-cell dark:text-slate-200">
                          Mandal
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider hidden lg:table-cell dark:text-slate-200">
                          Village
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider hidden lg:table-cell dark:text-slate-200">
                          State
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider dark:text-slate-200">
                          Status
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider hidden md:table-cell dark:text-slate-200">
                          Created At
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider dark:text-slate-200">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white/50 dark:bg-slate-900/30 divide-y divide-gray-200 dark:divide-slate-700">
                      {leads.map((lead: Lead) => (
                        <tr
                          key={lead._id}
                          className="hover:bg-blue-50/50 dark:hover:bg-slate-800/60 transition-colors duration-200 cursor-pointer"
                          onClick={() => router.push(`/user/leads/${lead._id}`)}
                        >
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600 dark:text-blue-300">
                            {lead.enquiryNumber || '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-slate-100">
                            {lead.name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-slate-300">
                            {lead.phone}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-slate-300 hidden sm:table-cell">
                            {lead.email || '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-slate-300 hidden md:table-cell">
                            {lead.mandal}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-slate-300 hidden lg:table-cell">
                            {lead.village}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-slate-300 hidden lg:table-cell">
                            {lead.state}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenCommentModal(lead, e);
                              }}
                              className={`px-2 py-0.5 inline-flex text-xs leading-4 font-semibold rounded-full transition-all cursor-pointer hover:opacity-80 ${getStatusColor(
                                lead.status
                              )}`}
                              title="Click to update status"
                            >
                              {lead.status || 'New'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-slate-300 hidden md:table-cell">
                            {lead.createdAt ? new Date(lead.createdAt).toLocaleDateString() : '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenCommentModal(lead, e);
                                }}
                              >
                                Comment
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  router.push(`/user/leads/${lead._id}`);
                                }}
                              >
                                View
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </>
          )}

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
                  <label className="text-sm text-gray-600 dark:text-slate-300">Jump to:</label>
                  <select
                    value={page}
                    onChange={(e) => setPage(Number(e.target.value))}
                    disabled={isLoading}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white/80 backdrop-blur-sm text-sm dark:bg-slate-900/50 dark:border-slate-700 dark:text-slate-100"
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
              <div className="text-sm text-gray-600 dark:text-slate-300">
                Page {pagination.page} of {pagination.pages}
              </div>
            </div>
          )}

          {/* Comment/Status Update Modal */}
          {showCommentModal && selectedLead && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <Card className="max-w-md w-full">
                <h2 className="text-xl font-semibold mb-4">Add Comment / Update Status</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-1">
                      Current Status: <span className="font-semibold">{selectedLead.status || 'New'}</span>
                    </label>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-1">
                      Update Status
                    </label>
                    <select
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white/80 backdrop-blur-sm text-sm dark:bg-slate-900/50 dark:border-slate-700 dark:text-slate-100"
                      value={newStatus}
                      onChange={(e) => handleStatusChange(e.target.value)}
                    >
                      <option value="">Keep Current Status</option>
                      <option value="New">New</option>
                      <option value="Interested">Interested</option>
                      <option value="Not Interested">Not Interested</option>
                      <option value="Partial">Partial</option>
                      <option value="Confirmed">Confirmed</option>
                      <option value="Lost">Lost</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-1">
                      Comment
                    </label>
                    <textarea
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white/80 backdrop-blur-sm min-h-[100px] dark:bg-slate-900/50 dark:border-slate-700 dark:text-slate-100"
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder="Add a comment..."
                    />
                  </div>
                  <div className="flex gap-2 pt-4">
                    <Button
                      variant="primary"
                      onClick={handleSaveActivity}
                      disabled={addActivityMutation.isPending || (!comment.trim() && newStatus === selectedLead.status)}
                    >
                      {addActivityMutation.isPending ? 'Saving...' : 'Save'}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowCommentModal(false);
                        setShowConfirmModal(false);
                        setComment('');
                        setNewStatus('');
                        setSelectedLead(null);
                      }}
                      disabled={addActivityMutation.isPending}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {/* Confirmation Modal */}
          {showConfirmModal && selectedLead && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <Card className="max-w-md w-full">
                <h2 className="text-xl font-semibold mb-4">Confirm Status Change</h2>
                <div className="space-y-4">
                  <p className="text-gray-700 dark:text-slate-200">
                    Are you sure you want to change the status from{' '}
                    <span className="font-semibold">{selectedLead.status || 'New'}</span> to{' '}
                    <span className="font-semibold">{newStatus}</span>?
                  </p>
                  <div className="flex gap-2 pt-4">
                    <Button
                      variant="primary"
                      onClick={handleConfirmStatusChange}
                      disabled={addActivityMutation.isPending}
                    >
                      {addActivityMutation.isPending ? 'Saving...' : 'Confirm'}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowConfirmModal(false);
                        setNewStatus(selectedLead.status || '');
                      }}
                      disabled={addActivityMutation.isPending}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </Card>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

