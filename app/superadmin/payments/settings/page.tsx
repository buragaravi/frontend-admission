'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useDashboardHeader } from '@/components/layout/DashboardShell';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { courseAPI, paymentSettingsAPI } from '@/lib/api';
import { showToast } from '@/lib/toast';
import { cn } from '@/lib/utils';
import { CashfreeConfigPreview, CoursePaymentSettings, Course } from '@/types';

type FeeFormState = {
  defaultFee: string;
  currency: string;
  branchFees: Record<string, string>;
};

const ensureFeeFormState = (
  courseId: string,
  forms: Record<string, FeeFormState>,
  courseSettings: CoursePaymentSettings[]
): FeeFormState => {
  if (forms[courseId]) {
    return forms[courseId];
  }
  const course = courseSettings.find((item) => item.course._id === courseId);
  if (!course) {
    return { defaultFee: '', currency: 'INR', branchFees: {} };
  }
  const branchFees = course.payment.branchFees.reduce<Record<string, string>>((acc, config) => {
    if (config.branch?._id) {
      acc[config.branch._id] = config.amount ? String(config.amount) : '';
    }
    return acc;
  }, {});
  return {
    defaultFee: course.payment.defaultFee?.amount ? String(course.payment.defaultFee.amount) : '',
    currency: course.payment.defaultFee?.currency || 'INR',
    branchFees,
  };
};

const formatAmount = (value: string | number | null | undefined, currency = 'INR') => {
  if (value === null || value === undefined) {
    return 'Not set';
  }

  let numeric: number | null = null;

  if (typeof value === 'number') {
    numeric = value;
  } else if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) {
      numeric = null;
    } else {
      const parsed = Number.parseFloat(trimmed);
      numeric = Number.isNaN(parsed) ? null : parsed;
    }
  }

  if (numeric === null) {
    return 'Not set';
  }

  const currencyPrefix = currency === 'INR' ? '₹' : `${currency} `;
  return `${currencyPrefix}${numeric.toLocaleString('en-IN', {
    maximumFractionDigits: 2,
  })}`;
};

export default function PaymentSettingsPage() {
  const { setHeaderContent, clearHeaderContent } = useDashboardHeader();

  useEffect(() => {
    setHeaderContent(
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
          Payment Configuration
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Define admission fees per course and branch, and manage Cashfree credentials for online
          collections.
        </p>
      </div>
    );
    return () => clearHeaderContent();
  }, [setHeaderContent, clearHeaderContent]);

  const {
    data: paymentSettingsResponse,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['payment-settings', 'courses'],
    queryFn: async () => {
      const response = await paymentSettingsAPI.listCourseSettings({ showInactive: true });
      return response;
    },
  });

  const courseSettings: CoursePaymentSettings[] = useMemo(() => {
    const payload = paymentSettingsResponse?.data;
    if (Array.isArray(payload)) {
      return payload as CoursePaymentSettings[];
    }
    if (payload && Array.isArray((payload as any).data)) {
      return (payload as any).data as CoursePaymentSettings[];
    }
    return [];
  }, [paymentSettingsResponse]);

  const {
    data: cashfreeConfigResponse,
    refetch: refetchCashfree,
    isLoading: isLoadingCashfree,
  } = useQuery({
    queryKey: ['payments', 'cashfree-config'],
    queryFn: async () => {
      const response = await paymentSettingsAPI.getCashfreeConfig();
      return response;
    },
  });

  const cashfreeConfig: CashfreeConfigPreview | null = useMemo(() => {
    const payload = cashfreeConfigResponse?.data;
    if (!payload) return null;
    if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
      if ('provider' in (payload as any) || 'environment' in (payload as any)) {
        return payload as CashfreeConfigPreview;
      }
      if ('data' in (payload as any) && (payload as any).data) {
        return (payload as any).data as CashfreeConfigPreview;
      }
    }
    return null;
  }, [cashfreeConfigResponse]);

  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [feeForms, setFeeForms] = useState<Record<string, FeeFormState>>({});
  const [cashfreeForm, setCashfreeForm] = useState({
    clientId: '',
    clientSecret: '',
    environment: 'sandbox' as 'sandbox' | 'production',
    isDirty: false,
  });
  const [isFeePanelExpanded, setIsFeePanelExpanded] = useState(true);
  const [isCashfreeExpanded, setIsCashfreeExpanded] = useState(false);
  const [isCreateCourseOpen, setIsCreateCourseOpen] = useState(false);
  const [courseModalForm, setCourseModalForm] = useState({ name: '', code: '', description: '' });
  const [branchModalCourseId, setBranchModalCourseId] = useState<string | null>(null);
  const [branchModalForm, setBranchModalForm] = useState({ name: '', code: '', description: '' });
  const [isEditingDefaults, setIsEditingDefaults] = useState(false);
  const [editingBranchId, setEditingBranchId] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedCourseId && courseSettings.length > 0) {
      setSelectedCourseId(courseSettings[0].course._id);
    }
    setFeeForms((prev) => {
      const next = { ...prev };
      courseSettings.forEach((course) => {
        next[course.course._id] = ensureFeeFormState(course.course._id, prev, courseSettings);
      });
      return next;
    });
  }, [courseSettings, selectedCourseId]);

  useEffect(() => {
    if (cashfreeConfig && !cashfreeForm.isDirty) {
      setCashfreeForm((prev) => ({
        ...prev,
        environment: cashfreeConfig.environment || 'sandbox',
      }));
    }
  }, [cashfreeConfig, cashfreeForm.isDirty]);

  useEffect(() => {
    setIsEditingDefaults(false);
    setEditingBranchId(null);
  }, [selectedCourseId]);

  const selectedCourse = useMemo(() => {
    if (!selectedCourseId) return null;
    return courseSettings.find((item) => item.course._id === selectedCourseId) || null;
  }, [courseSettings, selectedCourseId]);

  const selectedCourseForm = useMemo(() => {
    if (!selectedCourse) return null;
    return ensureFeeFormState(selectedCourse.course._id, feeForms, courseSettings);
  }, [selectedCourse, feeForms, courseSettings]);

  const selectedCourseBranchCount = selectedCourse?.branches.length ?? 0;
  const selectedCourseDefaultFeeSummary = selectedCourseForm?.defaultFee
    ? `Default fee ₹${Number(selectedCourseForm.defaultFee || 0).toLocaleString('en-IN')}`
    : 'Default fee not set';
  const selectedCourseCurrency = selectedCourseForm?.currency || 'INR';
  const branchModalCourse = useMemo(() => {
    if (!branchModalCourseId) return null;
    return courseSettings.find((item) => item.course._id === branchModalCourseId)?.course || null;
  }, [branchModalCourseId, courseSettings]);
  const cashfreeStatusSummary = isLoadingCashfree
    ? 'Checking status…'
    : cashfreeConfig
    ? `Mode ${cashfreeConfig.environment} · ${cashfreeConfig.clientIdPreview}`
    : 'Not configured yet';

  const saveFeesMutation = useMutation({
    mutationFn: ({
      courseId,
      payload,
    }: {
      courseId: string;
      payload: {
        defaultFee?: number | null;
        currency?: string;
        fees?: Array<{ branchId: string; amount: number }>;
      };
    }) => paymentSettingsAPI.upsertCourseFees(courseId, payload),
    onSuccess: () => {
      showToast.success('Payment configuration saved');
      refetch();
    },
    onError: (error: any) => {
      showToast.error(error?.response?.data?.message || 'Failed to save payment configuration');
    },
  });

  const updateCashfreeMutation = useMutation({
    mutationFn: (payload: {
      clientId: string;
      clientSecret: string;
      environment: 'sandbox' | 'production';
      confirmChange?: boolean;
    }) => paymentSettingsAPI.updateCashfreeConfig(payload),
    onSuccess: () => {
      showToast.success('Cashfree credentials updated');
      setCashfreeForm({
        clientId: '',
        clientSecret: '',
        environment: cashfreeForm.environment,
        isDirty: false,
      });
      refetchCashfree();
    },
    onError: async (error: any) => {
      if (error?.response?.data?.confirmationRequired) {
        const shouldConfirm = window.confirm(
          'Updating Cashfree credentials will impact ongoing transactions. Do you want to proceed?'
        );
        if (shouldConfirm) {
          updateCashfreeMutation.mutate({
            clientId: cashfreeForm.clientId.trim(),
            clientSecret: cashfreeForm.clientSecret.trim(),
            environment: cashfreeForm.environment,
            confirmChange: true,
          });
        }
        return;
      }
      showToast.error(error?.response?.data?.message || 'Failed to update Cashfree credentials');
    },
  });

  const createCourseMutation = useMutation({
    mutationFn: (payload: { name: string; code?: string; description?: string }) =>
      courseAPI.create(payload),
    onSuccess: () => {
      showToast.success('Course created successfully');
      setCourseModalForm({ name: '', code: '', description: '' });
      setIsCreateCourseOpen(false);
      refetch();
    },
    onError: (error: any) => {
      showToast.error(error?.response?.data?.message || 'Failed to create course');
    },
  });

  const createBranchMutation = useMutation({
    mutationFn: ({
      courseId,
      payload,
    }: {
      courseId: string;
      payload: { name: string; code?: string; description?: string };
    }) => courseAPI.createBranch(courseId, payload),
    onSuccess: () => {
      showToast.success('Branch added successfully');
      setBranchModalCourseId(null);
      setBranchModalForm({ name: '', code: '', description: '' });
      refetch();
    },
    onError: (error: any) => {
      showToast.error(error?.response?.data?.message || 'Failed to add branch');
    },
  });

  const handleApplySameForAll = useCallback(
    (courseId: string) => {
      setFeeForms((prev) => {
        const form = ensureFeeFormState(courseId, prev, courseSettings);
        if (!form.defaultFee) {
          showToast.error('Set a default fee before applying to all branches.');
          return prev;
        }
        const nextForm: FeeFormState = {
          ...form,
          branchFees: Object.keys(form.branchFees).reduce<Record<string, string>>(
            (acc, branchId) => {
              acc[branchId] = form.defaultFee;
              return acc;
            },
            {}
          ),
        };
        return {
          ...prev,
          [courseId]: nextForm,
        };
      });
    },
    [courseSettings]
  );

  const handleSaveFees = (courseId: string) => {
    const form = ensureFeeFormState(courseId, feeForms, courseSettings);
    const parsedDefaultFee =
      form.defaultFee.trim() === '' ? null : Number.parseFloat(form.defaultFee);
    if (parsedDefaultFee !== null && (Number.isNaN(parsedDefaultFee) || parsedDefaultFee < 0)) {
      showToast.error('Default fee must be a non-negative number');
      return;
    }
    const branchFeesArray = Object.entries(form.branchFees)
      .map(([branchId, amount]) => ({
        branchId,
        amount: Number.parseFloat(amount),
      }))
      .filter((entry) => !Number.isNaN(entry.amount) && entry.amount >= 0);

    saveFeesMutation.mutate({
      courseId,
      payload: {
        defaultFee: parsedDefaultFee,
        currency: form.currency || 'INR',
        fees: branchFeesArray,
      },
    });
  };

  const handleCashfreeSave = () => {
    if (!cashfreeForm.clientId.trim() || !cashfreeForm.clientSecret.trim()) {
      showToast.error('Client ID and Client Secret are required');
      return;
    }
    updateCashfreeMutation.mutate({
      clientId: cashfreeForm.clientId.trim(),
      clientSecret: cashfreeForm.clientSecret.trim(),
      environment: cashfreeForm.environment,
    });
  };

  const isSavingFees = saveFeesMutation.isPending;
  const isSavingCashfree = updateCashfreeMutation.isPending;
  const isCreatingCourse = createCourseMutation.isPending;
  const isCreatingBranch = createBranchMutation.isPending;

  const openCreateCourseModal = () => {
    setCourseModalForm({ name: '', code: '', description: '' });
    setIsCreateCourseOpen(true);
  };

  const handleCreateCourse = () => {
    if (!courseModalForm.name.trim()) {
      showToast.error('Course name is required');
      return;
    }

    createCourseMutation.mutate({
      name: courseModalForm.name.trim(),
      code: courseModalForm.code.trim() || undefined,
      description: courseModalForm.description.trim() || undefined,
    });
  };

  const openBranchModal = (course: Course) => {
    setBranchModalCourseId(course._id);
    setBranchModalForm({ name: '', code: '', description: '' });
  };

  const handleCreateBranch = () => {
    if (!branchModalCourseId) return;
    if (!branchModalForm.name.trim()) {
      showToast.error('Branch name is required');
      return;
    }

    createBranchMutation.mutate({
      courseId: branchModalCourseId,
      payload: {
        name: branchModalForm.name.trim(),
        code: branchModalForm.code.trim() || undefined,
        description: branchModalForm.description.trim() || undefined,
      },
    });
  };

  return (
    <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[300px,1fr]">
      <aside className="rounded-3xl border border-white/60 bg-white/95 p-4 shadow-lg shadow-blue-100/20 backdrop-blur dark:border-slate-800 dark:bg-slate-900/70 dark:shadow-none">
        <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Courses</h2>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Select a course to configure admission fees.
        </p>
        <div className="mt-4 flex items-center justify-between gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
            Available
          </span>
          <Button variant="primary" size="sm" onClick={openCreateCourseModal} disabled={isCreatingCourse}>
            Add Course
          </Button>
        </div>
         <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {isLoading ? (
            <div className="rounded-xl border border-slate-200 bg-white/80 px-3 py-2 text-xs text-slate-500 dark:border-slate-700 dark:bg-slate-900/60">
              Loading courses…
            </div>
          ) : courseSettings.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 px-3 py-2 text-xs text-slate-500 dark:border-slate-600 dark:text-slate-400">
              No courses available. Add courses first.
            </div>
          ) : (
            courseSettings.map((course) => {
              const isActive = selectedCourseId === course.course._id;
              const summaryForm =
                feeForms[course.course._id] ||
                ensureFeeFormState(course.course._id, feeForms, courseSettings);
              const defaultFeeLabel = summaryForm.defaultFee
                ? `Default: ₹${Number(summaryForm.defaultFee || 0).toLocaleString('en-IN')}`
                : 'Default fee not set';

              return (
                 <div
                  key={course.course._id}
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelectedCourseId(course.course._id)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      setSelectedCourseId(course.course._id);
                    }
                  }}
                   className={cn(
                     'rounded-xl border border-slate-200/50 bg-white/90 px-4 py-4 text-left text-sm outline-none shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md dark:border-slate-700/60 dark:bg-slate-900/70',
                    isActive
                       ? 'border-blue-200 bg-blue-50/70 text-blue-900 shadow-sm dark:border-blue-500/40 dark:bg-blue-900/25 dark:text-blue-100'
                       : 'text-slate-600 dark:text-slate-300'
                  )}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-700 dark:text-slate-100">
                        {course.course.name}
                      </p>
                      <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">{defaultFeeLabel}</p>
                    </div>
                    <span
                      className={cn(
                        'text-[10px] font-semibold uppercase tracking-wide',
                        course.course.isActive ? 'text-emerald-500' : 'text-slate-400'
                      )}
                    >
                      {course.course.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>

                   <div className="mt-3 grid gap-2 rounded-lg bg-slate-50/60 p-3 text-xs text-slate-500 dark:bg-slate-900/60 dark:text-slate-400">
                     <div className="flex items-center justify-between gap-2">
                       <span className="uppercase tracking-wide text-slate-400 dark:text-slate-500">Code</span>
                       <span className="font-medium text-slate-700 dark:text-slate-200">
                         {course.course.code || '—'}
                       </span>
                     </div>
                     <div className="flex items-center justify-between gap-2">
                       <span className="uppercase tracking-wide text-slate-400 dark:text-slate-500">
                         Branches
                       </span>
                       <span className="font-semibold text-slate-700 dark:text-slate-200">
                         {course.branches.length}
                       </span>
                     </div>
                     <div className="text-[11px] leading-snug text-slate-500 dark:text-slate-400">
                       {course.course.description || 'No description provided.'}
                     </div>
                  </div>

                </div>
              );
            })
          )}
        </div>
      </aside>

      <div className="space-y-6">
        <section className="rounded-3xl border border-white/60 bg-white/95 p-6 shadow-lg shadow-blue-100/20 backdrop-blur dark:border-slate-800 dark:bg-slate-900/70 dark:shadow-none">
          {isLoading ? (
            <div className="text-sm text-slate-500 dark:text-slate-400">Loading configuration…</div>
          ) : !selectedCourse ? (
            <div className="text-sm text-slate-500 dark:text-slate-400">
              Select a course to begin configuring fees.
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4 dark:border-slate-700">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                    {selectedCourse.course.name}
                  </h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {selectedCourseBranchCount} branch{selectedCourseBranchCount === 1 ? '' : 'es'}
                    {selectedCourse.course.code ? ` · Code ${selectedCourse.course.code}` : ''}
                    {' · '}
                    {selectedCourseDefaultFeeSummary}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setIsFeePanelExpanded((prev) => !prev)}
                  >
                    {isFeePanelExpanded ? 'Hide Details' : 'Configure'}
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isSavingFees}>
                    Refresh
                  </Button>
                </div>
              </div>

              {isFeePanelExpanded && (
                <div className="mt-4 space-y-4">
                   <div className="rounded-2xl border border-slate-200/60 bg-white/85 p-5 dark:border-slate-800/70 dark:bg-slate-900/70">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
                          Base configuration
                        </p>
                        <div className="mt-3 space-y-2 text-sm text-slate-600 dark:text-slate-300">
                          <div className="flex items-center justify-between gap-4">
                            <span className="text-xs uppercase tracking-wide text-slate-400 dark:text-slate-500">
                              Default fee
                            </span>
                            <span className="font-semibold text-slate-900 dark:text-slate-100">
                              {formatAmount(selectedCourseForm!.defaultFee, selectedCourseCurrency)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-4">
                            <span className="text-xs uppercase tracking-wide text-slate-400 dark:text-slate-500">
                              Currency
                            </span>
                            <span className="font-medium text-slate-700 dark:text-slate-200">
                              {selectedCourseCurrency}
                            </span>
                          </div>
                        </div>
                      </div>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setIsEditingDefaults((prev) => !prev)}
                      >
                        {isEditingDefaults ? 'Hide Fields' : 'Edit Defaults'}
                      </Button>
                    </div>

                    {isEditingDefaults && (
                      <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                        <Input
                          label="Default Admission Fee"
                          type="number"
                          min={0}
                          value={selectedCourseForm!.defaultFee}
                          onChange={(event) =>
                            setFeeForms((prev) => ({
                              ...prev,
                              [selectedCourse.course._id]: {
                                ...(prev[selectedCourse.course._id] ||
                                  ensureFeeFormState(selectedCourse.course._id, prev, courseSettings)),
                                defaultFee: event.target.value,
                              },
                            }))
                          }
                          placeholder="e.g. 50000"
                        />
                        <Input
                          label="Currency"
                          value={selectedCourseForm!.currency}
                          onChange={(event) =>
                            setFeeForms((prev) => ({
                              ...prev,
                              [selectedCourse.course._id]: {
                                ...(prev[selectedCourse.course._id] ||
                                  ensureFeeFormState(selectedCourse.course._id, prev, courseSettings)),
                                currency: event.target.value.toUpperCase(),
                              },
                            }))
                          }
                          placeholder="INR"
                        />
                      </div>
                    )}
                  </div>

                   <div className="rounded-2xl border border-slate-200/60 bg-white/85 p-5 dark:border-slate-800/70 dark:bg-slate-900/70">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
                        Branch overrides
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {selectedCourse.branches.length > 0 && (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleApplySameForAll(selectedCourse.course._id)}
                            disabled={!selectedCourseForm!.defaultFee}
                          >
                            Apply same for all
                          </Button>
                        )}
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => openBranchModal(selectedCourse.course)}
                          disabled={isCreatingBranch}
                        >
                          Add Branch
                        </Button>
                      </div>
                    </div>
                    {selectedCourse.branches.length > 0 ? (
                      <div className="mt-3 grid gap-3 md:grid-cols-2">
                        {selectedCourse.branches.map((branch) => {
                          const branchValue = selectedCourseForm!.branchFees[branch._id] || '';
                          const inheritsDefault = branchValue === '';
                          const isBranchEditing = editingBranchId === branch._id;
                          const displayedAmount = inheritsDefault
                            ? selectedCourseForm!.defaultFee
                            : branchValue;

                          return (
                             <div
                               key={branch._id}
                               className="rounded-xl border border-slate-200/60 bg-white/90 p-4 transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md dark:border-slate-700/60 dark:bg-slate-900/70"
                             >
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                                    {branch.name}
                                  </p>
                                   <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                     {branch.code ? `Code: ${branch.code}` : 'No code assigned'}
                                   </div>
                                   {branch.description && (
                                     <div className="mt-2 text-[11px] leading-snug text-slate-500 dark:text-slate-400">
                                       {branch.description}
                                     </div>
                                   )}
                                </div>
                                <div className="flex flex-col items-end gap-2">
                                  {!branch.isActive && (
                                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-600 dark:bg-amber-900/40 dark:text-amber-300">
                                      Inactive
                                    </span>
                                  )}
                                  <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={() =>
                                      setEditingBranchId((prev) => (prev === branch._id ? null : branch._id))
                                    }
                                  >
                                    {isBranchEditing ? 'Close' : inheritsDefault ? 'Set Amount' : 'Edit Amount'}
                                  </Button>
                                </div>
                              </div>

                              <div className="mt-3 space-y-1 text-sm text-slate-600 dark:text-slate-300">
                                <div className="flex items-center justify-between gap-3">
                                  <span className="text-xs uppercase tracking-wide text-slate-400 dark:text-slate-500">
                                    Configured fee
                                  </span>
                                  <span className="font-semibold text-slate-900 dark:text-slate-100">
                                    {inheritsDefault
                                      ? `${formatAmount(
                                          selectedCourseForm!.defaultFee,
                                          selectedCourseCurrency
                                        )} (default)`
                                      : formatAmount(branchValue, selectedCourseCurrency)}
                                  </span>
                                </div>
                              </div>

                              {isBranchEditing && (
                                <Input
                                  className="mt-3"
                                  label="Branch Fee Override"
                                  type="number"
                                  min={0}
                                  value={branchValue}
                                  onChange={(event) =>
                                    setFeeForms((prev) => {
                                      const nextForm =
                                        prev[selectedCourse.course._id] ||
                                        ensureFeeFormState(selectedCourse.course._id, prev, courseSettings);
                                      return {
                                        ...prev,
                                        [selectedCourse.course._id]: {
                                          ...nextForm,
                                          branchFees: {
                                            ...nextForm.branchFees,
                                            [branch._id]: event.target.value,
                                          },
                                        },
                                      };
                                    })
                                  }
                                  placeholder="Leave blank to inherit default"
                                />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="mt-3 rounded-2xl border border-dashed border-slate-300 bg-white/60 p-4 text-xs text-slate-500 dark:border-slate-700 dark:bg-slate-900/30 dark:text-slate-400">
                        No branches defined for this course yet. Add the first branch to configure fees.
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="mt-6 flex justify-end gap-3">
                <Button variant="secondary" size="sm" onClick={() => refetch()} disabled={isSavingFees}>
                  Reset
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => handleSaveFees(selectedCourse.course._id)}
                  disabled={isSavingFees}
                >
                  {isSavingFees ? 'Saving…' : 'Save Configuration'}
                </Button>
              </div>
            </>
          )}
        </section>

        <section className="rounded-3xl border border-white/60 bg-white/95 p-6 shadow-lg shadow-blue-100/20 backdrop-blur dark:border-slate-800 dark:bg-slate-900/70 dark:shadow-none">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Cashfree Gateway</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">{cashfreeStatusSummary}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setIsCashfreeExpanded((prev) => !prev)}
              >
                {isCashfreeExpanded ? 'Hide Form' : 'Edit Credentials'}
              </Button>
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-slate-200 bg-white/90 p-4 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-300">
            {isLoadingCashfree ? (
              <p className="text-xs text-slate-500 dark:text-slate-400">Checking Cashfree configuration…</p>
            ) : cashfreeConfig ? (
              <div className="grid gap-1 text-xs">
                <span>
                  Provider: <span className="font-semibold uppercase">{cashfreeConfig.provider}</span>
                </span>
                <span>
                  Mode: <span className="font-semibold capitalize">{cashfreeConfig.environment}</span>
                </span>
                <span>
                  Client ID: <span className="font-mono">{cashfreeConfig.clientIdPreview}</span>
                </span>
                <span>
                  Client Secret: <span className="font-mono">{cashfreeConfig.clientSecretPreview}</span>
                </span>
                {cashfreeConfig.updatedAt && (
                  <span>
                    Updated:{' '}
                    <span className="font-semibold">
                      {new Date(cashfreeConfig.updatedAt).toLocaleString()}
                    </span>
                  </span>
                )}
              </div>
            ) : (
              <p className="text-xs text-slate-500 dark:text-slate-400">Cashfree credentials not configured.</p>
            )}
          </div>

          {isCashfreeExpanded && (
            <div className="mt-6 space-y-4 rounded-2xl border border-slate-200 bg-white/95 p-4 dark:border-slate-800 dark:bg-slate-900/65">
              <div className="grid gap-4 md:grid-cols-2">
                <Input
                  label="Cashfree Client ID"
                  value={cashfreeForm.clientId}
                  onChange={(event) =>
                    setCashfreeForm((prev) => ({
                      ...prev,
                      clientId: event.target.value,
                      isDirty: true,
                    }))
                  }
                  placeholder="Enter new client ID"
                />
                <Input
                  label="Cashfree Client Secret"
                  type="password"
                  value={cashfreeForm.clientSecret}
                  onChange={(event) =>
                    setCashfreeForm((prev) => ({
                      ...prev,
                      clientSecret: event.target.value,
                      isDirty: true,
                    }))
                  }
                  placeholder="Enter new client secret"
                />
                <div className="md:col-span-2">
                  <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
                    Environment
                  </label>
                  <select
                    value={cashfreeForm.environment}
                    onChange={(event) =>
                      setCashfreeForm((prev) => ({
                        ...prev,
                        environment: event.target.value as 'sandbox' | 'production',
                        isDirty: true,
                      }))
                    }
                    className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-sm font-medium text-gray-700 shadow-sm transition hover:border-gray-300 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-100"
                  >
                    <option value="sandbox">Sandbox</option>
                    <option value="production">Production</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() =>
                    setCashfreeForm({
                      clientId: '',
                      clientSecret: '',
                      environment: cashfreeConfig?.environment || 'sandbox',
                      isDirty: false,
                    })
                  }
                  disabled={isSavingCashfree}
                >
                  Clear
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleCashfreeSave}
                  disabled={isSavingCashfree}
                >
                  {isSavingCashfree ? 'Saving…' : 'Save Credentials'}
                </Button>
              </div>
            </div>
          )}
        </section>
      </div>

      {isCreateCourseOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="relative w-full max-w-md rounded-3xl border border-white/10 bg-white/95 p-6 shadow-2xl shadow-blue-500/20 dark:border-slate-700 dark:bg-slate-900">
            <button
              type="button"
              onClick={() => setIsCreateCourseOpen(false)}
              className="absolute right-4 top-4 text-slate-400 transition hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
              aria-label="Close add course modal"
            >
              ×
            </button>
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                  Create Course
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Add a new course to manage admission fees and branch configuration.
                </p>
              </div>
              <Input
                label="Course Name"
                value={courseModalForm.name}
                onChange={(event) =>
                  setCourseModalForm((prev) => ({ ...prev, name: event.target.value }))
                }
                placeholder="e.g. Bachelor of Technology"
              />
              <Input
                label="Course Code"
                value={courseModalForm.code}
                onChange={(event) =>
                  setCourseModalForm((prev) => ({ ...prev, code: event.target.value }))
                }
                placeholder="Optional identifier"
              />
              <Input
                label="Description"
                value={courseModalForm.description}
                onChange={(event) =>
                  setCourseModalForm((prev) => ({ ...prev, description: event.target.value }))
                }
                placeholder="Short description (optional)"
              />
              <div className="flex justify-end gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setIsCreateCourseOpen(false)}
                  disabled={isCreatingCourse}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleCreateCourse}
                  disabled={isCreatingCourse}
                >
                  {isCreatingCourse ? 'Creating…' : 'Create Course'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {branchModalCourseId && branchModalCourse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="relative w-full max-w-md rounded-3xl border border-white/10 bg-white/95 p-6 shadow-2xl shadow-blue-500/20 dark:border-slate-700 dark:bg-slate-900">
            <button
              type="button"
              onClick={() => setBranchModalCourseId(null)}
              className="absolute right-4 top-4 text-slate-400 transition hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
              aria-label="Close add branch modal"
            >
              ×
            </button>
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                  Add Branch
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Create a new branch under{' '}
                  <span className="font-semibold text-slate-900 dark:text-slate-100">
                    {branchModalCourse.name}
                  </span>
                  .
                </p>
              </div>
              <Input
                label="Branch Name"
                value={branchModalForm.name}
                onChange={(event) =>
                  setBranchModalForm((prev) => ({ ...prev, name: event.target.value }))
                }
                placeholder="e.g. Computer Science Engineering"
              />
              <Input
                label="Branch Code"
                value={branchModalForm.code}
                onChange={(event) =>
                  setBranchModalForm((prev) => ({ ...prev, code: event.target.value }))
                }
                placeholder="Optional identifier"
              />
              <Input
                label="Description"
                value={branchModalForm.description}
                onChange={(event) =>
                  setBranchModalForm((prev) => ({ ...prev, description: event.target.value }))
                }
                placeholder="Short description (optional)"
              />
              <div className="flex justify-end gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setBranchModalCourseId(null)}
                  disabled={isCreatingBranch}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleCreateBranch}
                  disabled={isCreatingBranch}
                >
                  {isCreatingBranch ? 'Saving…' : 'Add Branch'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


