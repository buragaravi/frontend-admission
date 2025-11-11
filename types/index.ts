// User Types
export interface User {
  _id: string;
  name: string;
  email: string;
  roleName: string; // 'Super Admin' or 'User'
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface CreateUserData {
  name: string;
  email: string;
  password: string;
  roleName: string;
}

export interface UpdateUserData {
  name?: string;
  email?: string;
  roleName?: string;
  isActive?: boolean;
}

// Lead Types
export interface Lead {
  _id: string;
  enquiryNumber?: string;
  hallTicketNumber?: string;
  name: string;
  phone: string;
  email?: string;
  fatherName: string;
  fatherPhone: string;
  motherName?: string;
  village: string;
  district: string;
  courseInterested?: string;
  mandal: string;
  state: string;
  quota: string;
  applicationStatus?: string;
  leadStatus?: string;
  admissionNumber?: string;
  gender?: string;
  rank?: number;
  interCollege?: string;
  dynamicFields?: Record<string, any>;
  assignedTo?: User | string;
  assignedAt?: string;
  assignedBy?: User | string;
  source?: string;
  lastFollowUp?: string;
  notes?: string;
  uploadedBy?: User | string;
  uploadBatchId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MessageTemplateVariable {
  key: string;
  label: string;
  defaultValue?: string;
  value?: string;
}

export interface MessageTemplate {
  _id: string;
  name: string;
  dltTemplateId: string;
  language: string;
  content: string;
  description?: string;
  isUnicode?: boolean;
  variables: MessageTemplateVariable[];
  variableCount: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export type CommunicationType = 'call' | 'sms';

export type CommunicationStatus = 'pending' | 'success' | 'failed';

export interface CommunicationRecord {
  _id: string;
  leadId: string;
  contactNumber: string;
  type: CommunicationType;
  direction: 'outgoing' | 'incoming';
  status: CommunicationStatus;
  remarks?: string;
  callOutcome?: string;
  durationSeconds?: number;
  template?: {
    templateId?: string;
    dltTemplateId?: string;
    name?: string;
    language?: string;
    originalContent?: string;
    renderedContent?: string;
    variables?: MessageTemplateVariable[];
  };
  providerMessageIds?: string[];
  metadata?: Record<string, any>;
  sentBy: User | string;
  sentAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface CommunicationHistoryResponse {
  items: CommunicationRecord[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface CommunicationTemplateUsage {
  templateId: string;
  templateName?: string;
  count: number;
}

export interface CommunicationStatsEntry {
  contactNumber: string;
  callCount: number;
  smsCount: number;
  lastContactedAt?: string;
  lastCallAt?: string;
  lastSmsAt?: string;
  templateUsage: CommunicationTemplateUsage[];
}

export interface CommunicationStatsResponse {
  stats: CommunicationStatsEntry[];
}

export type JoiningStatus = 'draft' | 'pending_approval' | 'approved';

export type JoiningDocumentStatus = 'pending' | 'received';

export interface JoiningCourseInfo {
  course?: string;
  branch?: string;
  quota?: string;
}

export interface JoiningStudentInfo {
  name: string;
  aadhaarNumber?: string;
  phone?: string;
  gender?: string;
  dateOfBirth?: string;
  notes?: string;
}

export interface JoiningParentInfo {
  name?: string;
  phone?: string;
  aadhaarNumber?: string;
}

export interface JoiningReservation {
  general: 'oc' | 'ews' | 'bc-a' | 'bc-b' | 'bc-c' | 'bc-d' | 'bc-e' | 'sc' | 'st';
  other?: string[];
}

export interface JoiningCommunicationAddress {
  doorOrStreet?: string;
  landmark?: string;
  villageOrCity?: string;
  mandal?: string;
  district?: string;
  pinCode?: string;
}

export interface JoiningRelativeAddress extends JoiningCommunicationAddress {
  name?: string;
  relationship?: string;
}

export interface JoiningQualifications {
  ssc?: boolean;
  interOrDiploma?: boolean;
  ug?: boolean;
  medium?: 'english' | 'telugu' | 'other' | '';
  otherMediumLabel?: string;
}

export interface JoiningEducationHistory {
  level: 'ssc' | 'inter_diploma' | 'ug' | 'other';
  otherLevelLabel?: string;
  courseOrBranch?: string;
  yearOfPassing?: string;
  institutionName?: string;
  institutionAddress?: string;
  hallTicketNumber?: string;
  totalMarksOrGrade?: string;
  cetRank?: string;
}

export interface JoiningSibling {
  name?: string;
  relation?: string;
  studyingStandard?: string;
  institutionName?: string;
}

export interface JoiningDocuments {
  ssc?: JoiningDocumentStatus;
  inter?: JoiningDocumentStatus;
  ugOrPgCmm?: JoiningDocumentStatus;
  transferCertificate?: JoiningDocumentStatus;
  studyCertificate?: JoiningDocumentStatus;
  aadhaarCard?: JoiningDocumentStatus;
  photos?: JoiningDocumentStatus;
  incomeCertificate?: JoiningDocumentStatus;
  casteCertificate?: JoiningDocumentStatus;
  cetRankCard?: JoiningDocumentStatus;
  cetHallTicket?: JoiningDocumentStatus;
  allotmentLetter?: JoiningDocumentStatus;
  joiningReport?: JoiningDocumentStatus;
  bankPassBook?: JoiningDocumentStatus;
  rationCard?: JoiningDocumentStatus;
}

export interface Joining {
  _id: string;
  leadId: string;
  status: JoiningStatus;
  courseInfo: JoiningCourseInfo;
  studentInfo: JoiningStudentInfo;
  parents: {
    father: JoiningParentInfo;
    mother: JoiningParentInfo;
  };
  reservation: JoiningReservation;
  address: {
    communication: JoiningCommunicationAddress;
    relatives: JoiningRelativeAddress[];
  };
  qualifications: JoiningQualifications;
  educationHistory: JoiningEducationHistory[];
  siblings: JoiningSibling[];
  documents: JoiningDocuments;
  draftUpdatedAt?: string;
  submittedAt?: string;
  submittedBy?: User | string;
  approvedAt?: string;
  approvedBy?: User | string;
  createdAt: string;
  updatedAt: string;
}

export interface JoiningListResponse {
  joinings: Array<Joining & { lead: Lead }>;
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface Admission {
  _id: string;
  leadId: string;
  joiningId: string;
  admissionNumber: string;
  status: 'active' | 'withdrawn';
  admissionDate: string;
  courseInfo: JoiningCourseInfo;
  studentInfo: JoiningStudentInfo;
  parents: {
    father: JoiningParentInfo;
    mother: JoiningParentInfo;
  };
  reservation: JoiningReservation;
  address: {
    communication: JoiningCommunicationAddress;
    relatives: JoiningRelativeAddress[];
  };
  qualifications: JoiningQualifications;
  educationHistory: JoiningEducationHistory[];
  siblings: JoiningSibling[];
  documents: JoiningDocuments;
  createdAt: string;
  updatedAt: string;
  createdBy?: User | string;
  updatedBy?: User | string;
}

export interface AdmissionListResponse {
  admissions: Array<Admission & { lead: Lead }>;
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface LeadUploadData {
  name: string;
  phone: string;
  email?: string;
  fatherName: string;
  fatherPhone: string;
  motherName?: string;
  village: string;
  district: string;
  courseInterested?: string;
  mandal: string;
  state?: string;
  quota?: string;
  applicationStatus?: string;
  gender?: string;
  rank?: number | string;
  interCollege?: string;
  hallTicketNumber?: string;
  dynamicFields?: Record<string, any>;
  [key: string]: any; // For dynamic fields
}

export interface BulkUploadResponse {
  batchId: string;
  total: number;
  success: number;
  errors: number;
  durationMs?: number;
  sheetsProcessed?: string[];
  errorDetails: Array<{
    sheet?: string;
    row: number;
    data: LeadUploadData;
    error: string;
  }>;
}

export interface BulkUploadInspectResponse {
  uploadToken: string;
  originalName: string;
  size: number;
  fileType: 'excel' | 'csv';
  sheetNames: string[];
  previews: Record<string, LeadUploadData[]>;
  previewAvailable: boolean;
  previewDisabledReason?: string;
  expiresInMs: number;
}

export interface LeadFilters {
  mandal?: string;
  state?: string;
  district?: string;
  quota?: string;
  leadStatus?: string;
  applicationStatus?: string;
  assignedTo?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface LeadPagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export interface FilterOptions {
  mandals: string[];
  districts: string[];
  states: string[];
  quotas: string[];
  leadStatuses: string[];
  applicationStatuses: string[];
}

export interface ActivityLog {
  _id: string;
  leadId: string;
  type: 'status_change' | 'comment' | 'follow_up' | 'quota_change' | 'joining_update';
  oldStatus?: string;
  newStatus?: string;
  comment?: string;
  performedBy: User | string;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}
