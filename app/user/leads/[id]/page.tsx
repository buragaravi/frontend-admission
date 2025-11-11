'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { auth } from '@/lib/auth';
import { leadAPI } from '@/lib/api';
import { Lead, User, ActivityLog } from '@/types';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { showToast } from '@/lib/toast';

export default function UserLeadDetailPage() {
  const router = useRouter();
  const params = useParams();
  const queryClient = useQueryClient();
  const leadId = params?.id as string;
  const [user, setUser] = useState<User | null>(null);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [showStatusUpdate, setShowStatusUpdate] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [comment, setComment] = useState('');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

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

  // Fetch lead data
  const {
    data: leadData,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['lead', leadId],
    queryFn: async () => {
      const response = await leadAPI.getById(leadId);
      return response.data || response;
    },
    enabled: !!leadId && !!user,
    staleTime: 30000,
  });

  // Extract lead from response structure
  const lead = (leadData?.data || leadData) as Lead | undefined;

  // Fetch activity logs
  useEffect(() => {
    if (leadId && lead) {
      setIsLoadingLogs(true);
      leadAPI.getActivityLogs(leadId)
        .then((response) => {
          const logs = response.data?.logs || response.logs || [];
          setActivityLogs(logs);
        })
        .catch((error) => {
          console.error('Error loading activity logs:', error);
        })
        .finally(() => {
          setIsLoadingLogs(false);
        });
    }
  }, [leadId, lead]);

  // Handle status change
  const handleStatusChange = (status: string) => {
    setNewStatus(status);
  };

  // Mutation for adding activity (status update)
  const addActivityMutation = useMutation({
    mutationFn: async (data: { comment?: string; newStatus?: string }) => {
      return await leadAPI.addActivity(leadId, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead', leadId] });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      setShowStatusUpdate(false);
      setShowConfirmModal(false);
      setComment('');
      setNewStatus('');
      showToast.success('Status updated successfully!');
      // Reload activity logs
      if (leadId) {
        leadAPI.getActivityLogs(leadId)
          .then((response) => {
            const logs = response.data?.logs || response.logs || [];
            setActivityLogs(logs);
          })
          .catch((error) => {
            console.error('Error loading activity logs:', error);
          });
      }
    },
    onError: (error: any) => {
      console.error('Error adding activity:', error);
      showToast.error(error.response?.data?.message || 'Failed to update status');
    },
  });

  // Handle save status update
  const handleSaveStatusUpdate = () => {
    if (!lead) return;
    
    const hasComment = comment.trim().length > 0;
    const hasStatusChange = newStatus && newStatus !== lead.status;

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
    if (!lead) return;
    setShowConfirmModal(false);
    addActivityMutation.mutate({
      comment: comment.trim() ? comment.trim() : undefined,
      newStatus: newStatus && newStatus !== lead.status ? newStatus : undefined,
    });
  };

  const getStatusColor = (status?: string) => {
    switch ((status || '').toLowerCase()) {
      case 'interested':
        return 'bg-green-100 text-green-800';
      case 'contacted':
        return 'bg-sky-100 text-sky-800';
      case 'qualified':
        return 'bg-indigo-100 text-indigo-800';
      case 'converted':
        return 'bg-teal-100 text-teal-800';
      case 'confirmed':
        return 'bg-purple-100 text-purple-800';
      case 'admitted':
      case 'joined':
        return 'bg-emerald-100 text-emerald-800';
      case 'not interested':
        return 'bg-red-100 text-red-800';
      case 'partial':
        return 'bg-yellow-100 text-yellow-800';
      case 'lost':
        return 'bg-gray-300 text-gray-800';
      case 'new':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Prevent hydration mismatch
  if (!isMounted || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading lead details...</p>
        </div>
      </div>
    );
  }

  if (isError || !lead) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <div className="text-center py-8">
            <p className="text-red-600 mb-4">
              {error instanceof Error ? error.message : 'Lead not found'}
            </p>
            <Button onClick={() => router.push('/user/leads')}>
              Back to Leads
            </Button>
          </div>
        </Card>
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
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Lead Details</h1>
                <p className="text-sm text-gray-600">
                  {lead.enquiryNumber || 'No Enquiry Number'}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => router.push('/user/leads')}
                >
                  Back to Leads
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowStatusUpdate(true);
                    setNewStatus(lead?.status || '');
                    setComment('');
                  }}
                >
                  Update Status
                </Button>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Details */}
            <div className="lg:col-span-2 space-y-6">
              {/* Basic Information */}
              <Card>
                <h2 className="text-xl font-semibold mb-4">Basic Information</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">
                      Enquiry Number
                    </label>
                    <p className="text-lg font-mono font-semibold text-blue-600">
                      {lead.enquiryNumber || '-'}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">
                      Status
                    </label>
                    <span
                      onClick={() => {
                        setShowStatusUpdate(true);
                        setNewStatus(lead?.status || '');
                        setComment('');
                      }}
                      className={`px-3 py-1 inline-flex text-sm leading-5 font-semibold rounded-full cursor-pointer hover:opacity-80 transition-opacity ${getStatusColor(
                        lead.status
                      )}`}
                      title="Click to update status"
                    >
                      {lead.status || 'New'}
                    </span>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">
                      Name
                    </label>
                    <p className="text-gray-900 font-medium">{lead.name}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">
                      Phone
                    </label>
                    <p className="text-gray-900">{lead.phone}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">
                      Email
                    </label>
                    <p className="text-gray-900">{lead.email || '-'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">
                      Course Interested
                    </label>
                    <p className="text-gray-900">{lead.courseInterested || '-'}</p>
                  </div>
                </div>
              </Card>

              {/* Father Information */}
              <Card>
                <h2 className="text-xl font-semibold mb-4">Father Information</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">
                      Father Name
                    </label>
                    <p className="text-gray-900 font-medium">{lead.fatherName}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">
                      Father Phone
                    </label>
                    <p className="text-gray-900">{lead.fatherPhone}</p>
                  </div>
                </div>
              </Card>

              {/* Location Information */}
              <Card>
                <h2 className="text-xl font-semibold mb-4">Location Information</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">
                      Mandal
                    </label>
                    <p className="text-gray-900">{lead.mandal}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">
                      Village
                    </label>
                    <p className="text-gray-900">{lead.village}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">
                      State
                    </label>
                    <p className="text-gray-900">{lead.state}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">
                      Quota
                    </label>
                    <p className="text-gray-900">{lead.quota}</p>
                  </div>
                </div>
              </Card>

              {/* Notes */}
              {lead.notes && (
                <Card>
                  <h2 className="text-xl font-semibold mb-4">Notes</h2>
                  <p className="text-gray-700 whitespace-pre-wrap">{lead.notes}</p>
                </Card>
              )}

              {/* Dynamic Fields */}
              {lead.dynamicFields && Object.keys(lead.dynamicFields).length > 0 && (
                <Card>
                  <h2 className="text-xl font-semibold mb-4">Additional Information</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.entries(lead.dynamicFields).map(([key, value]) => (
                      <div key={key}>
                        <label className="block text-sm font-medium text-gray-500 mb-1">
                          {key}
                        </label>
                        <p className="text-gray-900">{String(value)}</p>
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Metadata */}
              <Card>
                <h2 className="text-xl font-semibold mb-4">Metadata</h2>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">
                      Source
                    </label>
                    <p className="text-gray-900">{lead.source || '-'}</p>
                  </div>
                  {lead.lastFollowUp && (
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-1">
                        Last Follow Up
                      </label>
                      <p className="text-gray-900">{formatDate(lead.lastFollowUp)}</p>
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">
                      Created At
                    </label>
                    <p className="text-gray-900">{formatDate(lead.createdAt)}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">
                      Updated At
                    </label>
                    <p className="text-gray-900">{formatDate(lead.updatedAt)}</p>
                  </div>
                </div>
              </Card>

              {/* Status Changes Timeline */}
              <Card>
                <h2 className="text-xl font-semibold mb-4">Status Changes</h2>
                {isLoadingLogs ? (
                  <div className="text-center py-4">
                    <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                  </div>
                ) : (
                  (() => {
                    const statusChanges = activityLogs.filter((log: ActivityLog) => log.type === 'status_change');
                    return statusChanges.length === 0 ? (
                      <p className="text-gray-500 text-center py-4 text-sm">No status changes yet</p>
                    ) : (
                      <div className="space-y-0 max-h-[400px] overflow-y-auto">
                        {statusChanges.map((log: ActivityLog, index: number) => (
                          <div key={log._id} className="relative pl-8 pb-6 last:pb-0">
                            {index !== statusChanges.length - 1 && (
                              <div className="absolute left-3 top-6 bottom-0 w-0.5 bg-gradient-to-b from-blue-400 to-blue-200"></div>
                            )}
                            <div className="absolute left-0 top-1 w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 border-2 border-white shadow-md flex items-center justify-center">
                              <div className="w-2 h-2 rounded-full bg-white"></div>
                            </div>
                            <div className="bg-gradient-to-r from-blue-50/50 to-transparent rounded-lg p-3 border-l-2 border-blue-400">
                              <div className="flex justify-between items-start mb-2">
                                <div>
                                  <span className="text-sm font-semibold text-gray-900">
                                    {typeof log.performedBy === 'object' ? log.performedBy.name : 'Unknown'}
                                  </span>
                                  <span className="text-xs text-gray-500 ml-2">
                                    {formatDate(log.createdAt)}
                                  </span>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 text-sm">
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(log.oldStatus || '')}`}>
                                  {log.oldStatus || 'N/A'}
                                </span>
                                <span className="text-gray-400">→</span>
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(log.newStatus || '')}`}>
                                  {log.newStatus || 'N/A'}
                                </span>
                              </div>
                              {log.comment && (
                                <p className="text-xs text-gray-600 mt-2 italic">"{log.comment}"</p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })()
                )}
              </Card>

              {/* Comments Timeline */}
              <Card>
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold">Comments</h2>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setShowStatusUpdate(true);
                      setNewStatus(lead?.status || '');
                      setComment('');
                    }}
                  >
                    Add Comment
                  </Button>
                </div>
                {isLoadingLogs ? (
                  <div className="text-center py-4">
                    <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                  </div>
                ) : (
                  (() => {
                    const comments = activityLogs.filter((log: ActivityLog) => log.type === 'comment');
                    return comments.length === 0 ? (
                      <p className="text-gray-500 text-center py-4 text-sm">No comments yet</p>
                    ) : (
                      <div className="space-y-0 max-h-[400px] overflow-y-auto">
                        {comments.map((log: ActivityLog, index: number) => (
                          <div key={log._id} className="relative pl-8 pb-6 last:pb-0">
                            {index !== comments.length - 1 && (
                              <div className="absolute left-3 top-6 bottom-0 w-0.5 bg-gradient-to-b from-purple-400 to-purple-200"></div>
                            )}
                            <div className="absolute left-0 top-1 w-6 h-6 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 border-2 border-white shadow-md flex items-center justify-center">
                              <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
                              </svg>
                            </div>
                            <div className="bg-gradient-to-r from-purple-50/50 to-transparent rounded-lg p-3 border-l-2 border-purple-400">
                              <div className="flex justify-between items-start mb-2">
                                <div>
                                  <span className="text-sm font-semibold text-gray-900">
                                    {typeof log.performedBy === 'object' ? log.performedBy.name : 'Unknown'}
                                  </span>
                                  <span className="text-xs text-gray-500 ml-2">
                                    {formatDate(log.createdAt)}
                                  </span>
                                </div>
                              </div>
                              <p className="text-sm text-gray-700 whitespace-pre-wrap bg-white/60 p-3 rounded-lg border border-purple-100">
                                {log.comment}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })()
                )}
              </Card>
            </div>
          </div>

          {/* Status Update Modal */}
          {showStatusUpdate && lead && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <Card className="max-w-md w-full">
                <h2 className="text-xl font-semibold mb-4">Update Status / Add Comment</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Current Status: <span className="font-semibold">{lead.status || 'New'}</span>
                    </label>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Update Status
                    </label>
                    <select
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white/80 backdrop-blur-sm"
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
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Comment
                    </label>
                    <textarea
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white/80 backdrop-blur-sm min-h-[100px]"
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder="Add a comment..."
                    />
                  </div>
                  <div className="flex gap-2 pt-4">
                    <Button
                      variant="primary"
                      onClick={handleSaveStatusUpdate}
                      disabled={addActivityMutation.isPending || (!comment.trim() && newStatus === lead.status)}
                    >
                      {addActivityMutation.isPending ? 'Saving...' : 'Save'}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowStatusUpdate(false);
                        setShowConfirmModal(false);
                        setComment('');
                        setNewStatus('');
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
          {showConfirmModal && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <Card className="max-w-md w-full">
                <h2 className="text-xl font-semibold mb-4">Confirm Status Change</h2>
                <div className="space-y-4">
                  <p className="text-gray-700">
                    Are you sure you want to change the status from{' '}
                    <span className="font-semibold">{lead?.status || 'New'}</span> to{' '}
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
                        setNewStatus(lead?.status || '');
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

