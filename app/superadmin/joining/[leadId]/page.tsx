'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { joiningAPI, admissionAPI } from '@/lib/api';
import { showToast } from '@/lib/toast';
import {
  Joining,
  JoiningDocumentStatus,
  JoiningDocuments,
  JoiningEducationHistory,
  JoiningRelativeAddress,
  JoiningReservation,
  JoiningSibling,
  JoiningStatus,
  Admission,
} from '@/types';

const documentLabels: Record<keyof JoiningDocuments, string> = {
  ssc: 'SSC',
  inter: 'Intermediate',
  ugOrPgCmm: 'UG / PG CMM',
  transferCertificate: 'Transfer Certificate',
  studyCertificate: 'Study Certificate',
  aadhaarCard: 'Aadhaar Card',
  photos: 'Photos (5)',
  incomeCertificate: 'Income Certificate',
  casteCertificate: 'Caste Certificate',
  cetRankCard: 'CET Rank Card',
  cetHallTicket: 'CET Hall Ticket',
  allotmentLetter: 'Allotment Letter',
  joiningReport: 'Joining Report',
  bankPassBook: 'Bank Pass Book',
  rationCard: 'Ration Card',
};

type JoiningFormState = {
  courseInfo: Joining['courseInfo'];
  studentInfo: Joining['studentInfo'];
  parents: Joining['parents'];
  reservation: JoiningReservation;
  address: Joining['address'];
  qualifications: Joining['qualifications'];
  educationHistory: JoiningEducationHistory[];
  siblings: JoiningSibling[];
  documents: JoiningDocuments;
};

const defaultDocuments: JoiningDocuments = {
  ssc: 'pending',
  inter: 'pending',
  ugOrPgCmm: 'pending',
  transferCertificate: 'pending',
  studyCertificate: 'pending',
  aadhaarCard: 'pending',
  photos: 'pending',
  incomeCertificate: 'pending',
  casteCertificate: 'pending',
  cetRankCard: 'pending',
  cetHallTicket: 'pending',
  allotmentLetter: 'pending',
  joiningReport: 'pending',
  bankPassBook: 'pending',
  rationCard: 'pending',
};

const buildInitialState = (joining?: Joining): JoiningFormState => ({
  courseInfo: {
    course: joining?.courseInfo?.course || '',
    branch: joining?.courseInfo?.branch || '',
    quota: joining?.courseInfo?.quota || '',
  },
  studentInfo: {
    name: joining?.studentInfo?.name || '',
    aadhaarNumber: joining?.studentInfo?.aadhaarNumber || '',
    phone: joining?.studentInfo?.phone || '',
    gender: joining?.studentInfo?.gender || '',
    dateOfBirth: joining?.studentInfo?.dateOfBirth || '',
    notes: joining?.studentInfo?.notes || 'As per SSC for no issues',
  },
  parents: {
    father: {
      name: joining?.parents?.father?.name || '',
      phone: joining?.parents?.father?.phone || '',
      aadhaarNumber: joining?.parents?.father?.aadhaarNumber || '',
    },
    mother: {
      name: joining?.parents?.mother?.name || '',
      phone: joining?.parents?.mother?.phone || '',
      aadhaarNumber: joining?.parents?.mother?.aadhaarNumber || '',
    },
  },
  reservation: {
    general: joining?.reservation?.general || 'oc',
    other: joining?.reservation?.other || [],
  },
  address: {
    communication: {
      doorOrStreet: joining?.address?.communication?.doorOrStreet || '',
      landmark: joining?.address?.communication?.landmark || '',
      villageOrCity: joining?.address?.communication?.villageOrCity || '',
      mandal: joining?.address?.communication?.mandal || '',
      district: joining?.address?.communication?.district || '',
      pinCode: joining?.address?.communication?.pinCode || '',
    },
    relatives: joining?.address?.relatives?.length
      ? joining.address.relatives.map((relative) => ({
          name: relative.name || '',
          relationship: relative.relationship || '',
          doorOrStreet: relative.doorOrStreet || '',
          landmark: relative.landmark || '',
          villageOrCity: relative.villageOrCity || '',
          mandal: relative.mandal || '',
          district: relative.district || '',
          pinCode: relative.pinCode || '',
        }))
      : [],
  },
  qualifications: {
    ssc: joining?.qualifications?.ssc || false,
    interOrDiploma: joining?.qualifications?.interOrDiploma || false,
    ug: joining?.qualifications?.ug || false,
    medium: joining?.qualifications?.medium || '',
    otherMediumLabel: joining?.qualifications?.otherMediumLabel || '',
  },
  educationHistory: joining?.educationHistory?.length
    ? joining.educationHistory.map((item) => ({
        level: item.level,
        otherLevelLabel: item.otherLevelLabel || '',
        courseOrBranch: item.courseOrBranch || '',
        yearOfPassing: item.yearOfPassing || '',
        institutionName: item.institutionName || '',
        institutionAddress: item.institutionAddress || '',
        hallTicketNumber: item.hallTicketNumber || '',
        totalMarksOrGrade: item.totalMarksOrGrade || '',
        cetRank: item.cetRank || '',
      }))
    : [],
  siblings: joining?.siblings?.length
    ? joining.siblings.map((sibling) => ({
        name: sibling.name || '',
        relation: sibling.relation || '',
        studyingStandard: sibling.studyingStandard || '',
        institutionName: sibling.institutionName || '',
      }))
    : [],
  documents: {
    ...defaultDocuments,
    ...(joining?.documents || {}),
  },
});

const maskAadhaar = (value?: string) => {
  const digitsOnly = value?.replace(/\D/g, '') || '';
  if (!digitsOnly) return '';
  if (digitsOnly.length <= 4) return digitsOnly;
  const masked = digitsOnly
    .slice(0, -4)
    .replace(/\d/g, '•')
    .replace(/(.{4})/g, '$1 ')
    .trim();
  const suffix = digitsOnly.slice(-4);
  return `${masked} ${suffix}`;
};

const JoiningDetailPage = () => {
  const params = useParams();
  const router = useRouter();
  const leadId = Array.isArray(params?.leadId) ? params.leadId[0] : params?.leadId;

  const [formState, setFormState] = useState<JoiningFormState>(buildInitialState());
  const [status, setStatus] = useState<JoiningStatus>('draft');
  const [meta, setMeta] = useState<{
    updatedAt?: string;
    submittedAt?: string;
    approvedAt?: string;
    admissionNumber?: string;
  }>({});
  const [admissionRecord, setAdmissionRecord] = useState<Admission | null>(null);
  const [hasAppliedAdmissionSnapshot, setHasAppliedAdmissionSnapshot] = useState(false);
  const [otherReservationInput, setOtherReservationInput] = useState('');
  const [showStudentAadhaar, setShowStudentAadhaar] = useState(false);
  const [showFatherAadhaar, setShowFatherAadhaar] = useState(false);
  const [showMotherAadhaar, setShowMotherAadhaar] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['joining', leadId],
    enabled: !!leadId,
    queryFn: async () => {
      const response = await joiningAPI.getByLeadId(leadId as string);
      return response;
    },
  });

  const lead = data?.data?.lead;

  useEffect(() => {
    if (data?.data?.joining) {
      const joining: Joining = data.data.joining;
      setStatus(joining.status);
      setMeta({
        updatedAt: joining.updatedAt,
        submittedAt: joining.submittedAt as string | undefined,
        approvedAt: joining.approvedAt as string | undefined,
        admissionNumber: lead?.admissionNumber,
      });

      if (joining.status !== 'approved' || !hasAppliedAdmissionSnapshot) {
        setFormState(buildInitialState(joining));
      }
    }
  }, [data, lead?.admissionNumber, hasAppliedAdmissionSnapshot]);

  const {
    data: admissionData,
    isLoading: isLoadingAdmission,
    refetch: refetchAdmission,
  } = useQuery({
    queryKey: ['admission', leadId, status],
    enabled: !!leadId && status === 'approved',
    queryFn: async () => {
      const response = await admissionAPI.getByLeadId(leadId as string);
      return response;
    },
  });

  useEffect(() => {
    if (status === 'approved') {
      if (admissionData?.data?.admission) {
        const record = admissionData.data.admission as Admission;
        setAdmissionRecord(record);
        setMeta((prev) => ({
          ...prev,
          admissionNumber: record.admissionNumber || prev.admissionNumber,
        }));
        if (!hasAppliedAdmissionSnapshot) {
          setFormState(buildInitialState(record as unknown as Joining));
          setHasAppliedAdmissionSnapshot(true);
        }
      }
    } else {
      setAdmissionRecord(null);
      if (hasAppliedAdmissionSnapshot) {
        setHasAppliedAdmissionSnapshot(false);
      }
    }
  }, [status, admissionData, hasAppliedAdmissionSnapshot]);

  const handleCourseChange = (field: 'course' | 'branch' | 'quota', value: string) => {
    setFormState((prev) => ({
      ...prev,
      courseInfo: {
        ...prev.courseInfo,
        [field]: value,
      },
    }));
  };

  const handleStudentInfoChange = (field: keyof JoiningFormState['studentInfo'], value: string) => {
    setFormState((prev) => ({
      ...prev,
      studentInfo: {
        ...prev.studentInfo,
        [field]: value,
      },
    }));
  };

  const handleParentChange = (
    role: 'father' | 'mother',
    field: keyof JoiningFormState['parents']['father'],
    value: string
  ) => {
    setFormState((prev) => ({
      ...prev,
      parents: {
        ...prev.parents,
        [role]: {
          ...prev.parents[role],
          [field]: value,
        },
      },
    }));
  };

  const handleReservationGeneralChange = (value: JoiningReservation['general']) => {
    setFormState((prev) => ({
      ...prev,
      reservation: {
        ...prev.reservation,
        general: value,
      },
    }));
  };

  const addOtherReservation = () => {
    if (!otherReservationInput.trim()) return;
    setFormState((prev) => ({
      ...prev,
      reservation: {
        ...prev.reservation,
        other: Array.from(
          new Set([...(prev.reservation.other || []), otherReservationInput.trim()])
        ),
      },
    }));
    setOtherReservationInput('');
  };

  const removeOtherReservation = (value: string) => {
    setFormState((prev) => ({
      ...prev,
      reservation: {
        ...prev.reservation,
        other: (prev.reservation.other || []).filter((item) => item !== value),
      },
    }));
  };

  const handleCommunicationAddressChange = (
    field: keyof JoiningFormState['address']['communication'],
    value: string
  ) => {
    setFormState((prev) => ({
      ...prev,
      address: {
        ...prev.address,
        communication: {
          ...prev.address.communication,
          [field]: value,
        },
      },
    }));
  };

  const updateRelative = (
    index: number,
    field: keyof JoiningRelativeAddress,
    value: string
  ) => {
    setFormState((prev) => {
      const nextRelatives = [...prev.address.relatives];
      nextRelatives[index] = {
        ...nextRelatives[index],
        [field]: value,
      };
      return {
        ...prev,
        address: {
          ...prev.address,
          relatives: nextRelatives,
        },
      };
    });
  };

  const addRelative = () => {
    setFormState((prev) => ({
      ...prev,
      address: {
        ...prev.address,
        relatives: [
          ...prev.address.relatives,
          {
            name: '',
            relationship: '',
            doorOrStreet: '',
            landmark: '',
            villageOrCity: '',
            mandal: '',
            district: '',
            pinCode: '',
          },
        ],
      },
    }));
  };

  const removeRelative = (index: number) => {
    setFormState((prev) => {
      const copy = [...prev.address.relatives];
      copy.splice(index, 1);
      return {
        ...prev,
        address: {
          ...prev.address,
          relatives: copy,
        },
      };
    });
  };

  const toggleQualification = (field: keyof JoiningFormState['qualifications']) => {
    setFormState((prev) => ({
      ...prev,
      qualifications: {
        ...prev.qualifications,
        [field]: !prev.qualifications[field],
      },
    }));
  };

  const handleQualificationMediumChange = (
    field: 'medium' | 'otherMediumLabel',
    value: string
  ) => {
    setFormState((prev) => ({
      ...prev,
      qualifications: {
        ...prev.qualifications,
        [field]: value,
      },
    }));
  };

  const updateEducationHistory = (
    index: number,
    field: keyof JoiningEducationHistory,
    value: string
  ) => {
    setFormState((prev) => {
      const copy = [...prev.educationHistory];
      copy[index] = {
        ...copy[index],
        [field]: value,
      };
      return {
        ...prev,
        educationHistory: copy,
      };
    });
  };

  const addEducationHistory = () => {
    setFormState((prev) => ({
      ...prev,
      educationHistory: [
        ...prev.educationHistory,
        {
          level: 'ssc',
          courseOrBranch: '',
          yearOfPassing: '',
          institutionName: '',
          institutionAddress: '',
          hallTicketNumber: '',
          totalMarksOrGrade: '',
          cetRank: '',
          otherLevelLabel: '',
        },
      ],
    }));
  };

  const removeEducationHistory = (index: number) => {
    setFormState((prev) => {
      const copy = [...prev.educationHistory];
      copy.splice(index, 1);
      return {
        ...prev,
        educationHistory: copy,
      };
    });
  };

  const updateSibling = (index: number, field: keyof JoiningSibling, value: string) => {
    setFormState((prev) => {
      const copy = [...prev.siblings];
      copy[index] = {
        ...copy[index],
        [field]: value,
      };
      return {
        ...prev,
        siblings: copy,
      };
    });
  };

  const addSibling = () => {
    setFormState((prev) => ({
      ...prev,
      siblings: [
        ...prev.siblings,
        { name: '', relation: '', studyingStandard: '', institutionName: '' },
      ],
    }));
  };

  const removeSibling = (index: number) => {
    setFormState((prev) => {
      const copy = [...prev.siblings];
      copy.splice(index, 1);
      return {
        ...prev,
        siblings: copy,
      };
    });
  };

  const updateDocumentStatus = (
    key: keyof JoiningDocuments,
    value: JoiningDocumentStatus
  ) => {
    setFormState((prev) => ({
      ...prev,
      documents: {
        ...prev.documents,
        [key]: value,
      },
    }));
  };

  const payloadForSave = useMemo(() => {
    return {
      courseInfo: formState.courseInfo,
      studentInfo: formState.studentInfo,
      parents: formState.parents,
      reservation: {
        general: formState.reservation.general,
        other: formState.reservation.other || [],
      },
      address: formState.address,
      qualifications: formState.qualifications,
      educationHistory: formState.educationHistory,
      siblings: formState.siblings,
      documents: formState.documents,
    };
  }, [formState]);

  const saveDraftMutation = useMutation({
    mutationFn: async () => {
      if (!leadId) return null;
      return joiningAPI.saveDraft(leadId, payloadForSave);
    },
    onSuccess: () => {
      showToast.success('Joining form saved as draft');
      refetch();
    },
    onError: (error: any) => {
      console.error('Error saving draft:', error);
      showToast.error(error.response?.data?.message || 'Failed to save draft');
    },
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!leadId) return null;
      return joiningAPI.submit(leadId);
    },
    onSuccess: () => {
      showToast.success('Joining form submitted for approval');
      refetch();
    },
    onError: (error: any) => {
      console.error('Error submitting joining form:', error);
      showToast.error(error.response?.data?.message || 'Failed to submit form');
    },
  });

  const approveMutation = useMutation({
    mutationFn: async () => {
      if (!leadId) return null;
      return joiningAPI.approve(leadId);
    },
    onSuccess: (response: any) => {
      const payload = response?.data || response;
      const joiningData = payload?.data?.joining || payload?.joining;
      const generatedAdmissionNumber =
        payload?.data?.admissionNumber || payload?.admissionNumber || null;

      showToast.success('Joining form approved');

      if (joiningData) {
        setStatus((joiningData.status as JoiningStatus) || 'approved');
        setMeta((prev) => ({
          ...prev,
          updatedAt: joiningData.updatedAt,
          submittedAt: joiningData.submittedAt,
          approvedAt: joiningData.approvedAt,
          admissionNumber:
            generatedAdmissionNumber || joiningData.admissionNumber || prev.admissionNumber,
        }));
      } else {
        setStatus('approved');
        setMeta((prev) => ({
          ...prev,
          admissionNumber: generatedAdmissionNumber || prev.admissionNumber,
        }));
      }

      setHasAppliedAdmissionSnapshot(false);
      setAdmissionRecord(null);
      refetch();
      refetchAdmission();
    },
    onError: (error: any) => {
      console.error('Error approving joining form:', error);
      showToast.error(error.response?.data?.message || 'Failed to approve form');
    },
  });

  const updateAdmissionMutation = useMutation({
    mutationFn: async (payload: any) => {
      if (!leadId) return null;
      return admissionAPI.updateByLeadId(leadId, payload);
    },
    onSuccess: () => {
      showToast.success('Admission record updated');
      setHasAppliedAdmissionSnapshot(false);
      refetchAdmission();
    },
    onError: (error: any) => {
      console.error('Error updating admission record:', error);
      showToast.error(error.response?.data?.message || 'Failed to update admission record');
    },
  });

  const isSubmitting = submitMutation.isPending;
  const isSaving = saveDraftMutation.isPending;
  const isApproving = approveMutation.isPending;
  const isUpdatingAdmission = updateAdmissionMutation.isPending;

  const canSubmit = status !== 'approved' && status !== 'pending_approval';
  const canApprove = status === 'pending_approval';
  const isAdmissionEditable = status === 'approved';
  const admissionNumberDisplay =
    meta.admissionNumber || admissionRecord?.admissionNumber || lead?.admissionNumber || null;
  const isBusy = isLoading || (isAdmissionEditable && isLoadingAdmission && !admissionRecord);

  const handleSaveAdmissionRecord = () => {
    updateAdmissionMutation.mutate(payloadForSave);
  };

  if (!leadId) {
    return (
      <div className="p-6">
        <p className="text-sm text-red-500">Invalid URL. Lead identifier is missing.</p>
      </div>
    );
  }

  const statusBadgeClass =
    status === 'approved'
      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-200'
      : status === 'pending_approval'
      ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-200'
      : 'bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-200';

  const statusLabel = status.replace('_', ' ');

  return (
    <div className="relative min-h-screen">
      <div className="pointer-events-none fixed inset-0 bg-gradient-to-br from-sky-50/50 via-purple-50/40 to-rose-50/35 dark:from-slate-950/90 dark:via-slate-900/85 dark:to-slate-900/80" />
      <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(to_right,#94a3b81a_1px,transparent_1px),linear-gradient(to_bottom,#94a3b81a_1px,transparent_1px)] bg-[size:28px_28px]" />

      <div className="relative z-10">
        <div className="mx-auto max-w-7xl px-4 pb-24 pt-10 sm:px-6 lg:px-8">
          <div className="mb-8 flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <button
                onClick={() => router.back()}
                className="inline-flex items-center text-sm font-medium text-blue-600 transition hover:text-blue-700 dark:text-blue-300"
              >
                <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back
              </button>
              <h1 className="mt-4 text-3xl font-semibold text-slate-900 dark:text-slate-100">
                Joining &amp; Admission Workspace
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-600 dark:text-slate-400">
                Capture all joining details, review admission readiness, and keep records polished for
                onboarding.
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 font-semibold ${statusBadgeClass}`}>
                  <span className="inline-block h-2 w-2 rounded-full bg-current opacity-75" />
                  {statusLabel}
                </span>
                {lead?.enquiryNumber && (
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-600 dark:bg-slate-800/70 dark:text-slate-200">
                    Enquiry #{lead.enquiryNumber}
                  </span>
                )}
                {admissionNumberDisplay && (
                  <span className="rounded-full bg-emerald-100 px-3 py-1 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-200">
                    Admission #{admissionNumberDisplay}
                  </span>
                )}
                {meta.updatedAt && (
                  <span>
                    Last updated: <strong>{new Date(meta.updatedAt).toLocaleString()}</strong>
                  </span>
                )}
                {meta.submittedAt && (
                  <span>
                    Submitted: <strong>{new Date(meta.submittedAt).toLocaleString()}</strong>
                  </span>
                )}
                {meta.approvedAt && (
                  <span>
                    Approved: <strong>{new Date(meta.approvedAt).toLocaleString()}</strong>
                  </span>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              {isAdmissionEditable ? (
                <>
                  <Button
                    variant="primary"
                    disabled={isUpdatingAdmission || isBusy}
                    onClick={handleSaveAdmissionRecord}
                    className="group inline-flex items-center gap-2"
                  >
                    {isUpdatingAdmission ? 'Updating…' : 'Update Admission'}
                    <svg
                      className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </Button>
                  <Button variant="outline" onClick={() => router.push('/superadmin/joining')}>
                    Joining List
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant="secondary"
                    disabled={isSaving || isAdmissionEditable}
                    onClick={() => saveDraftMutation.mutate()}
                  >
                    {isSaving ? 'Saving…' : 'Save Draft'}
                  </Button>
                  <Button
                    variant="primary"
                    disabled={!canSubmit || isSubmitting}
                    onClick={() => submitMutation.mutate()}
                  >
                    {isSubmitting ? 'Submitting…' : 'Submit for Approval'}
                  </Button>
                  {canApprove && (
                    <Button
                      variant="primary"
                      disabled={isApproving}
                      onClick={() => approveMutation.mutate()}
                    >
                      {isApproving ? 'Approving…' : 'Approve'}
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>

          {isBusy ? (
            <div className="rounded-2xl border border-white/60 bg-white/90 p-12 text-center shadow-lg shadow-blue-100/20 backdrop-blur dark:border-slate-800 dark:bg-slate-900/80 dark:shadow-none">
              <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-blue-400 border-t-transparent" />
              <p className="mt-4 text-sm font-medium text-slate-600 dark:text-slate-300">
                {status === 'approved' ? 'Loading admission record…' : 'Loading joining details…'}
              </p>
            </div>
          ) : (
            <div className="space-y-10">
          <section className="rounded-2xl border border-white/60 bg-white/95 p-6 shadow-lg shadow-blue-100/20 backdrop-blur dark:border-slate-800 dark:bg-slate-900/70 dark:shadow-none">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">
              Course & Quota
            </h2>
            <p className="text-sm text-gray-500">
              These values default from the confirmed lead. Adjust if the student opted for a
              different program.
            </p>
            <div
              className={`mt-6 grid gap-4 ${
                admissionNumberDisplay ? 'md:grid-cols-4' : 'md:grid-cols-3'
              }`}
            >
              <Input
                label="Course"
                value={formState.courseInfo.course}
                onChange={(event) => handleCourseChange('course', event.target.value)}
                placeholder="e.g. B.Tech"
              />
              <Input
                label="Branch"
                value={formState.courseInfo.branch}
                onChange={(event) => handleCourseChange('branch', event.target.value)}
                placeholder="e.g. CSE"
              />
              <Input
                label="Quota"
                value={formState.courseInfo.quota}
                onChange={(event) => handleCourseChange('quota', event.target.value)}
                placeholder="e.g. Convenor / Management"
              />
              {admissionNumberDisplay && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700 shadow-sm dark:border-emerald-900/60 dark:bg-emerald-900/40 dark:text-emerald-200">
                  Admission Number
                  <div className="mt-1 text-lg font-bold tracking-wide">{admissionNumberDisplay}</div>
                </div>
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-white/60 bg-white/95 p-6 shadow-lg shadow-blue-100/20 backdrop-blur dark:border-slate-800 dark:bg-slate-900/70 dark:shadow-none">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">
              1. Student Information
            </h2>
            <p className="text-sm text-gray-500">Reference: As per SSC for no issues.</p>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <Input
                label="Student Name"
                value={formState.studentInfo.name}
                onChange={(event) => handleStudentInfoChange('name', event.target.value)}
              />
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-200">
                  Aadhaar Number
                </label>
                <div className="flex gap-2">
                  <input
                    type={showStudentAadhaar ? 'text' : 'password'}
                    value={formState.studentInfo.aadhaarNumber || ''}
                    onChange={(event) =>
                      handleStudentInfoChange('aadhaarNumber', event.target.value)
                    }
                    placeholder="12-digit Aadhaar number"
                    className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:border-slate-700 dark:bg-slate-900/70"
                    maxLength={14}
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setShowStudentAadhaar((prev) => !prev)}
                  >
                    {showStudentAadhaar ? 'Hide' : 'Show'}
                  </Button>
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  Stored securely. Masked by default for privacy.
                </p>
              </div>
              <Input
                label="Student Phone (10 digits)"
                value={formState.studentInfo.phone || ''}
                onChange={(event) => handleStudentInfoChange('phone', event.target.value)}
                maxLength={10}
                placeholder="Enter 10-digit number"
              />
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-200">
                    Gender
                  </label>
                  <select
                    value={formState.studentInfo.gender || ''}
                    onChange={(event) => handleStudentInfoChange('gender', event.target.value)}
                    className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-sm font-medium text-gray-700 shadow-sm transition hover:border-gray-300 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-100"
                  >
                    <option value="">Select</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <Input
                  label="Date of Birth (DD-MM-YYYY)"
                  value={formState.studentInfo.dateOfBirth || ''}
                  onChange={(event) => handleStudentInfoChange('dateOfBirth', event.target.value)}
                  placeholder="e.g. 12-07-2006"
                  maxLength={10}
                />
              </div>
              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-200">
                  Notes
                </label>
                <textarea
                  value={formState.studentInfo.notes || ''}
                  onChange={(event) => handleStudentInfoChange('notes', event.target.value)}
                  rows={3}
                  className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:border-slate-700 dark:bg-slate-900/70"
                />
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-white/60 bg-white/95 p-6 shadow-lg shadow-blue-100/20 backdrop-blur dark:border-slate-800 dark:bg-slate-900/70 dark:shadow-none">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">
              2. Parents Details
            </h2>
            <div className="mt-6 grid gap-6 md:grid-cols-2">
              <div>
                <h3 className="text-md font-semibold text-gray-800 dark:text-slate-200">
                  Father Information
                </h3>
                <div className="mt-4 space-y-3">
                  <Input
                    label="Father Name"
                    value={formState.parents.father.name || ''}
                    onChange={(event) => handleParentChange('father', 'name', event.target.value)}
                  />
                  <Input
                    label="Father Phone"
                    value={formState.parents.father.phone || ''}
                    onChange={(event) => handleParentChange('father', 'phone', event.target.value)}
                    maxLength={10}
                  />
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-200">
                      Father Aadhaar Number
                    </label>
                    <div className="flex gap-2">
                      <input
                        type={showFatherAadhaar ? 'text' : 'password'}
                        value={formState.parents.father.aadhaarNumber || ''}
                        onChange={(event) =>
                          handleParentChange('father', 'aadhaarNumber', event.target.value)
                        }
                        placeholder="12-digit Aadhaar number"
                        className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:border-slate-700 dark:bg-slate-900/70"
                        maxLength={14}
                      />
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => setShowFatherAadhaar((prev) => !prev)}
                      >
                        {showFatherAadhaar ? 'Hide' : 'Show'}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
              <div>
                <h3 className="text-md font-semibold text-gray-800 dark:text-slate-200">
                  Mother Information
                </h3>
                <div className="mt-4 space-y-3">
                  <Input
                    label="Mother Name"
                    value={formState.parents.mother.name || ''}
                    onChange={(event) => handleParentChange('mother', 'name', event.target.value)}
                  />
                  <Input
                    label="Mother Phone"
                    value={formState.parents.mother.phone || ''}
                    onChange={(event) => handleParentChange('mother', 'phone', event.target.value)}
                    maxLength={10}
                  />
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-200">
                      Mother Aadhaar Number
                    </label>
                    <div className="flex gap-2">
                      <input
                        type={showMotherAadhaar ? 'text' : 'password'}
                        value={formState.parents.mother.aadhaarNumber || ''}
                        onChange={(event) =>
                          handleParentChange('mother', 'aadhaarNumber', event.target.value)
                        }
                        placeholder="12-digit Aadhaar number"
                        className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:border-slate-700 dark:bg-slate-900/70"
                        maxLength={14}
                      />
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => setShowMotherAadhaar((prev) => !prev)}
                      >
                        {showMotherAadhaar ? 'Hide' : 'Show'}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-white/60 bg-white/95 p-6 shadow-lg shadow-blue-100/20 backdrop-blur dark:border-slate-800 dark:bg-slate-900/70 dark:shadow-none">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">
              3. Reservation Category
            </h2>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-200">
                  General Reservation Category<span className="text-red-500">*</span>
                </label>
                <select
                  value={formState.reservation.general}
                  onChange={(event) =>
                    handleReservationGeneralChange(
                      event.target.value as JoiningReservation['general']
                    )
                  }
                  className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-sm font-medium text-gray-700 shadow-sm transition hover:border-gray-300 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-100"
                >
                  <option value="oc">OC</option>
                  <option value="ews">EWS</option>
                  <option value="bc-a">BC-A</option>
                  <option value="bc-b">BC-B</option>
                  <option value="bc-c">BC-C</option>
                  <option value="bc-d">BC-D</option>
                  <option value="bc-e">BC-E</option>
                  <option value="sc">SC</option>
                  <option value="st">ST</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-200">
                  Other Reservations
                </label>
                <div className="flex gap-2">
                  <Input
                    value={otherReservationInput}
                    onChange={(event) => setOtherReservationInput(event.target.value)}
                    placeholder="Add NCC, Sports, PH, etc."
                  />
                  <Button type="button" variant="secondary" onClick={addOtherReservation}>
                    Add
                  </Button>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {(formState.reservation.other || []).map((value) => (
                    <span
                      key={value}
                      className="inline-flex items-center gap-2 rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700"
                    >
                      {value}
                      <button
                        className="text-blue-500"
                        onClick={() => removeOtherReservation(value)}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                  {(formState.reservation.other || []).length === 0 && (
                    <span className="text-xs text-gray-500">No additional reservations added.</span>
                  )}
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-white/60 bg-white/95 p-6 shadow-lg shadow-blue-100/20 backdrop-blur dark:border-slate-800 dark:bg-slate-900/70 dark:shadow-none">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">
              4. Address for Communication (Uppercase)
            </h2>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <Input
                label="Door No / Street Name"
                value={formState.address.communication.doorOrStreet || ''}
                onChange={(event) =>
                  handleCommunicationAddressChange('doorOrStreet', event.target.value.toUpperCase())
                }
              />
              <Input
                label="Landmark"
                value={formState.address.communication.landmark || ''}
                onChange={(event) =>
                  handleCommunicationAddressChange('landmark', event.target.value.toUpperCase())
                }
              />
              <Input
                label="Village / Town / City"
                value={formState.address.communication.villageOrCity || ''}
                onChange={(event) =>
                  handleCommunicationAddressChange('villageOrCity', event.target.value.toUpperCase())
                }
              />
              <Input
                label="Mandal"
                value={formState.address.communication.mandal || ''}
                onChange={(event) =>
                  handleCommunicationAddressChange('mandal', event.target.value.toUpperCase())
                }
              />
              <Input
                label="District"
                value={formState.address.communication.district || ''}
                onChange={(event) =>
                  handleCommunicationAddressChange('district', event.target.value.toUpperCase())
                }
              />
              <Input
                label="PIN Code"
                value={formState.address.communication.pinCode || ''}
                onChange={(event) =>
                  handleCommunicationAddressChange('pinCode', event.target.value)
                }
                maxLength={6}
              />
            </div>
          </section>

          <section className="rounded-2xl border border-white/60 bg-white/95 p-6 shadow-lg shadow-blue-100/20 backdrop-blur dark:border-slate-800 dark:bg-slate-900/70 dark:shadow-none">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">
                  5. Relatives / Friends (Optional)
                </h2>
                <p className="text-sm text-gray-500">
                  Capture additional contact addresses. Add as many as required.
                </p>
              </div>
              <Button type="button" variant="secondary" onClick={addRelative}>
                Add Address
              </Button>
            </div>
            <div className="mt-6 space-y-6">
              {formState.address.relatives.length === 0 && (
                <p className="rounded-xl border border-dashed border-gray-300 p-4 text-sm text-gray-500">
                  No relative or friend addresses added.
                </p>
              )}
              {formState.address.relatives.map((relative, index) => (
                <div
                  key={`relative-${index}`}
                  className="rounded-xl border border-gray-200 p-4 shadow-sm dark:border-slate-700"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-gray-700 dark:text-slate-200">
                      Address #{index + 1}
                    </h3>
                    <button
                      className="text-sm text-red-500"
                      onClick={() => removeRelative(index)}
                    >
                      Remove
                    </button>
                  </div>
                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <Input
                      label="Name"
                      value={relative.name || ''}
                      onChange={(event) => updateRelative(index, 'name', event.target.value)}
                    />
                    <Input
                      label="Relationship"
                      value={relative.relationship || ''}
                      onChange={(event) =>
                        updateRelative(index, 'relationship', event.target.value)
                      }
                    />
                    <Input
                      label="Door / Street"
                      value={relative.doorOrStreet || ''}
                      onChange={(event) =>
                        updateRelative(index, 'doorOrStreet', event.target.value.toUpperCase())
                      }
                    />
                    <Input
                      label="Landmark"
                      value={relative.landmark || ''}
                      onChange={(event) =>
                        updateRelative(index, 'landmark', event.target.value.toUpperCase())
                      }
                    />
                    <Input
                      label="Village / City"
                      value={relative.villageOrCity || ''}
                      onChange={(event) =>
                        updateRelative(index, 'villageOrCity', event.target.value.toUpperCase())
                      }
                    />
                    <Input
                      label="Mandal"
                      value={relative.mandal || ''}
                      onChange={(event) =>
                        updateRelative(index, 'mandal', event.target.value.toUpperCase())
                      }
                    />
                    <Input
                      label="District"
                      value={relative.district || ''}
                      onChange={(event) =>
                        updateRelative(index, 'district', event.target.value.toUpperCase())
                      }
                    />
                    <Input
                      label="PIN Code"
                      value={relative.pinCode || ''}
                      onChange={(event) => updateRelative(index, 'pinCode', event.target.value)}
                      maxLength={6}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-white/60 bg-white/95 p-6 shadow-lg shadow-blue-100/20 backdrop-blur dark:border-slate-800 dark:bg-slate-900/70 dark:shadow-none">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">
              6. Qualified Examinations
            </h2>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div className="space-y-3">
                {[
                  { key: 'ssc', label: 'SSC' },
                  { key: 'interOrDiploma', label: 'Inter / Diploma' },
                  { key: 'ug', label: 'UG' },
                ].map((item) => (
                  <label key={item.key} className="flex items-center gap-3 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={Boolean(formState.qualifications[item.key as 'ssc'])}
                      onChange={() =>
                        toggleQualification(item.key as keyof JoiningFormState['qualifications'])
                      }
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    {item.label}
                  </label>
                ))}
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-200">
                  Medium of Instruction
                </label>
                <select
                  value={formState.qualifications.medium || ''}
                  onChange={(event) =>
                    handleQualificationMediumChange('medium', event.target.value)
                  }
                  className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-sm font-medium text-gray-700 shadow-sm transition hover:border-gray-300 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-100"
                >
                  <option value="">Select</option>
                  <option value="english">English</option>
                  <option value="telugu">Telugu</option>
                  <option value="other">Other</option>
                </select>
                {formState.qualifications.medium === 'other' && (
                  <Input
                    className="mt-3"
                    placeholder="Specify medium"
                    value={formState.qualifications.otherMediumLabel || ''}
                    onChange={(event) =>
                      handleQualificationMediumChange('otherMediumLabel', event.target.value)
                    }
                  />
                )}
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-white/60 bg-white/95 p-6 shadow-lg shadow-blue-100/20 backdrop-blur dark:border-slate-800 dark:bg-slate-900/70 dark:shadow-none">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">
                  7. Education History
                </h2>
                <p className="text-sm text-gray-500">
                  Add every school or college the student has studied. Include year, course, and
                  identifiers.
                </p>
              </div>
              <Button type="button" variant="secondary" onClick={addEducationHistory}>
                Add Entry
              </Button>
            </div>
            <div className="mt-6 space-y-6">
              {formState.educationHistory.length === 0 && (
                <p className="rounded-xl border border-dashed border-gray-300 p-4 text-sm text-gray-500">
                  No education history added. Include SSC, Inter/Diploma, UG, and others if
                  applicable.
                </p>
              )}
              {formState.educationHistory.map((entry, index) => (
                <div
                  key={`edu-${index}`}
                  className="rounded-xl border border-gray-200 p-4 shadow-sm dark:border-slate-700"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-gray-700 dark:text-slate-200">
                      Entry #{index + 1}
                    </h3>
                    <button className="text-sm text-red-500" onClick={() => removeEducationHistory(index)}>
                      Remove
                    </button>
                  </div>
                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-200">
                        Level
                      </label>
                      <select
                        value={entry.level}
                        onChange={(event) =>
                          updateEducationHistory(index, 'level', event.target.value)
                        }
                        className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-sm font-medium text-gray-700 shadow-sm transition hover:border-gray-300 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-100"
                      >
                        <option value="ssc">SSC</option>
                        <option value="inter_diploma">Inter / Diploma</option>
                        <option value="ug">UG</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    {entry.level === 'other' && (
                      <Input
                        label="Specify Level"
                        value={entry.otherLevelLabel || ''}
                        onChange={(event) =>
                          updateEducationHistory(index, 'otherLevelLabel', event.target.value)
                        }
                      />
                    )}
                    <Input
                      label="Course / Branch"
                      value={entry.courseOrBranch || ''}
                      onChange={(event) =>
                        updateEducationHistory(index, 'courseOrBranch', event.target.value)
                      }
                    />
                    <Input
                      label="Year of Passing"
                      value={entry.yearOfPassing || ''}
                      onChange={(event) =>
                        updateEducationHistory(index, 'yearOfPassing', event.target.value)
                      }
                    />
                    <Input
                      label="School / College Name"
                      value={entry.institutionName || ''}
                      onChange={(event) =>
                        updateEducationHistory(index, 'institutionName', event.target.value)
                      }
                    />
                    <Input
                      label="School / College Address"
                      value={entry.institutionAddress || ''}
                      onChange={(event) =>
                        updateEducationHistory(index, 'institutionAddress', event.target.value)
                      }
                    />
                    <Input
                      label="Hall Ticket Number"
                      value={entry.hallTicketNumber || ''}
                      onChange={(event) =>
                        updateEducationHistory(index, 'hallTicketNumber', event.target.value)
                      }
                    />
                    <Input
                      label="Total Marks / Grade / %"
                      value={entry.totalMarksOrGrade || ''}
                      onChange={(event) =>
                        updateEducationHistory(index, 'totalMarksOrGrade', event.target.value)
                      }
                    />
                    <Input
                      label="CET Rank (Optional)"
                      value={entry.cetRank || ''}
                      onChange={(event) =>
                        updateEducationHistory(index, 'cetRank', event.target.value)
                      }
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-white/60 bg-white/95 p-6 shadow-lg shadow-blue-100/20 backdrop-blur dark:border-slate-800 dark:bg-slate-900/70 dark:shadow-none">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">
                  8. Siblings (Optional)
                </h2>
                <p className="text-sm text-gray-500">Record siblings currently studying.</p>
              </div>
              <Button type="button" variant="secondary" onClick={addSibling}>
                Add Sibling
              </Button>
            </div>
            <div className="mt-6 space-y-6">
              {formState.siblings.length === 0 && (
                <p className="rounded-xl border border-dashed border-gray-300 p-4 text-sm text-gray-500">
                  No siblings recorded.
                </p>
              )}
              {formState.siblings.map((sibling, index) => (
                <div
                  key={`sibling-${index}`}
                  className="rounded-xl border border-gray-200 p-4 shadow-sm dark:border-slate-700"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-gray-700 dark:text-slate-200">
                      Sibling #{index + 1}
                    </h3>
                    <button className="text-sm text-red-500" onClick={() => removeSibling(index)}>
                      Remove
                    </button>
                  </div>
                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <Input
                      label="Name"
                      value={sibling.name || ''}
                      onChange={(event) => updateSibling(index, 'name', event.target.value)}
                    />
                    <Input
                      label="Relation"
                      value={sibling.relation || ''}
                      onChange={(event) => updateSibling(index, 'relation', event.target.value)}
                    />
                    <Input
                      label="Studying Standard"
                      value={sibling.studyingStandard || ''}
                      onChange={(event) =>
                        updateSibling(index, 'studyingStandard', event.target.value)
                      }
                    />
                    <Input
                      label="College / School Name"
                      value={sibling.institutionName || ''}
                      onChange={(event) =>
                        updateSibling(index, 'institutionName', event.target.value)
                      }
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-white/60 bg-white/95 p-6 shadow-lg shadow-blue-100/20 backdrop-blur dark:border-slate-800 dark:bg-slate-900/70 dark:shadow-none">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">
              9. Documents Checklist
            </h2>
            <p className="text-sm text-gray-500">
              Mark each document as received to track joining completeness.
            </p>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {Object.entries(documentLabels).map(([key, label]) => (
                <div
                  key={key}
                  className="flex items-center justify-between rounded-xl border border-gray-200 px-4 py-3 shadow-sm dark:border-slate-700"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-800 dark:text-slate-200">{label}</p>
                  </div>
                  <select
                    value={formState.documents[key as keyof JoiningDocuments] || 'pending'}
                    onChange={(event) =>
                      updateDocumentStatus(
                        key as keyof JoiningDocuments,
                        event.target.value as JoiningDocumentStatus
                      )
                    }
                    className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold uppercase text-gray-700 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-100"
                  >
                    <option value="pending">Pending</option>
                    <option value="received">Received</option>
                  </select>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
  </div>
</div>
  );
};

export default JoiningDetailPage;


