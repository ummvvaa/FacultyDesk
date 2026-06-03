export interface User {
  id: number;
  username: string;
  email?: string;
  role: 'ROLE_ADMIN' | 'ROLE_TEACHER' | 'ROLE_USER' | 'ROLE_ROBOT';
  path?: string;
  createDate?: string;
  academicDegree?: string;
  position?: string;
  phone?: string;
  office?: string;
  researchAreas?: string;
  publications?: string;
  englishLevel?: EnglishLevel;
  // Phase 7
  academicTitle?: string;
  employmentRate?: number;
  scopusAuthorId?: string;
  orcid?: string;
  googleScholarUrl?: string;
  aiSummary?: string;
}

export interface Record {
  id: number;
  title: string;
  description: string;
  createdAt: string;
  pdf?: string;
  status?: 'PENDING' | 'APPROVED' | 'REJECTED' | 'RETURNED';
  semester?: string;
  type?: string;
  comments?: string;
  author?: User;
  category?: Category;
}

export interface Category {
  id: number;
  name: string;
  records?: Record[];
}

export interface Activity {
  id: number;
  action: string;
  objectType: string;
  objectName: string;
  createdAt: string;
  user?: User;
}

export type NotificationPriority = 'LOW' | 'NORMAL' | 'HIGH';

export type NotificationType =
  | 'KKK_COLLECTION_STARTED' | 'KKK_STATUS_CHANGED'
  | 'SCOPUS_UPDATE_REQUIRED'
  | 'QUARTERLY_DEADLINE' | 'SEMESTER_DEADLINE'
  | 'DEADLINE_REMINDER' | 'DEADLINE_APPROACHING_WEEK' | 'DEADLINE_APPROACHING_3DAYS' | 'DEADLINE_TOMORROW' | 'DEADLINE_OVERDUE'
  | 'TEMPLATE_UPDATED' | 'TEMPLATE_NEW'
  | 'GENERATED_DOCUMENT_UPLOADED'
  | 'REPORT_RETURNED' | 'REPORT_ACCEPTED' | 'REPORT_REJECTED' | 'NEW_ADMIN_COMMENT'
  | 'ROBOT_COMPLETED' | 'ROBOT_FAILED'
  | 'PUBLICATION_VERIFIED' | 'PUBLICATION_REJECTED' | 'PUBLICATION_NEEDS_CORRECTION'
  | 'NEW_MESSAGE' | 'FRIENDSHIP_REQUEST' | 'FRIENDSHIP_ACCEPTED'
  // legacy
  | 'REPORT_APPROVED' | 'FRIEND_REQUEST' | 'MESSAGE' | 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR';

export interface Notification {
  id: number;
  title: string;
  message: string;
  type: NotificationType;
  priority: NotificationPriority;
  read: boolean;
  createdAt: string;
  relatedId?: number;
  relatedType?: string;
}

export interface Message {
  id: number;
  content: string;
  createdAt: string;
  read: boolean;
  sender: User;
  receiver: User;
}

export interface Friendship {
  id: number;
  requester: User;
  addressee: User;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
  createdAt: string;
}

export type TemplateStatus = 'ACTIVE' | 'ARCHIVED' | 'DRAFT';
export type TemplateSemester = 'FALL' | 'SPRING' | 'SUMMER' | 'ALL';
export type TemplateFileType = 'DOCX' | 'PDF' | 'XLSX' | 'OTHER';
export type TemplateCategory =
  | 'TEACHING_WORKLOAD'
  | 'KKK_DOCUMENTS'
  | 'SCIENTIFIC_REPORTS'
  | 'SERVICE_NOTES'
  | 'PROTOCOLS'
  | 'PRACTICE_DOCUMENTS'
  | 'DIPLOMA_SUPERVISION'
  | 'QUALIFICATION_DOCUMENTS'
  | 'DEPARTMENT_FORMS'
  | 'OTHER';

export interface Template {
  id: number;
  name: string;
  version: string;
  description: string;
  filePath: string;
  active: boolean;
  createdAt: string;
  updatedAt?: string;
  lastUpdateDate?: string;
  academicYear?: string;
  semester?: TemplateSemester;
  fileType?: TemplateFileType;
  status: TemplateStatus;
  templateCategory?: TemplateCategory;
  downloadCount?: number;
}

export interface TemplateFilters {
  search?: string;
  year?: string;
  category?: TemplateCategory;
  type?: TemplateFileType;
  status?: TemplateStatus;
  uploadedBy?: number;
}

export type DocumentType =
  | 'INDIVIDUAL_WORKLOAD'
  | 'SEMESTER_WORKLOAD'
  | 'PRACTICE_SUPERVISION'
  | 'DIPLOMA_SUPERVISION'
  | 'KKK_DOCUMENT'
  | 'OTHER';

export type GeneratedDocStatus =
  | 'GENERATED'
  | 'UPLOADED'
  | 'VIEWED'
  | 'DOWNLOADED'
  | 'NEEDS_REVIEW'
  | 'ERROR';

export interface GeneratedDocument {
  id: number;
  title: string;
  documentType: DocumentType;
  sourceExcelFile?: string;
  generationDate?: string;
  status: GeneratedDocStatus;
  filePath?: string;
  originalFileName?: string;
  fileSize?: number;
  comment?: string;
  robotRunId?: number;
  createdAt?: string;
  teacherId?: number;
  teacherUsername?: string;
}

export interface GeneratedDocumentAdminFilters {
  teacherId?: number;
  documentType?: DocumentType;
  dateFrom?: string;
  dateTo?: string;
  sourceExcel?: string;
  status?: GeneratedDocStatus;
  page?: number;
  size?: number;
}

export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

export type RobotRunStatus = 'RUNNING' | 'SUCCESS' | 'FAILED' | 'PARTIAL' | 'ROLLED_BACK';

export interface RobotRun {
  id: number;
  startedAt: string;
  finishedAt?: string;
  status: RobotRunStatus;
  sourceFile?: string;
  processedCount: number;
  errorCount: number;
  generatedCount: number;
  errorLog?: string;
  summary?: string;
  triggeredBy?: string;
  rolledBackAt?: string;
  rolledBackByName?: string;
}

export type PublicationType =
  | 'SCOPUS_JOURNAL'
  | 'SCOPUS_CONFERENCE'
  | 'WOS_ARTICLE'
  | 'KOKSON_ARTICLE'
  | 'LOCAL_JOURNAL'
  | 'CONFERENCE_PAPER'
  | 'PATENT'
  | 'CERTIFICATE'
  | 'OTHER';

export type DatabaseType = 'SCOPUS' | 'WEB_OF_SCIENCE' | 'KOKSON' | 'OTHER';

export type Quartile = 'Q1' | 'Q2' | 'Q3' | 'Q4' | 'NONE';

export type PublicationStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'VERIFIED'
  | 'REJECTED'
  | 'NEEDS_CORRECTION';

export type PubFileType =
  | 'PDF_ARTICLE'
  | 'OTTISK'
  | 'CERTIFICATE'
  | 'JOURNAL_PAGE_SCAN'
  | 'DOI_CONFIRMATION'
  | 'OTHER';

export interface PublicationFile {
  id: number;
  filePath: string;
  originalName: string;
  fileSize?: number;
  fileType: PubFileType;
  uploadedAt?: string;
}

export interface Publication {
  id: number;
  title: string;
  authors: string;
  publicationYear?: number;
  journalName?: string;
  publicationType: PublicationType;
  databaseType: DatabaseType;
  doi?: string;
  url?: string;
  quartile: Quartile;
  percentile?: number;
  indexingStatus?: string;
  status: PublicationStatus;
  reviewerComment?: string;
  author: User;
  reviewedBy?: User;
  reviewedAt?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface PublicationDto {
  title: string;
  authors: string;
  publicationYear?: number;
  journalName?: string;
  publicationType: PublicationType;
  databaseType: DatabaseType;
  doi?: string;
  url?: string;
  quartile?: Quartile;
  percentile?: number;
  indexingStatus?: string;
}

export interface PublicationAdminFilters {
  databaseType?: DatabaseType;
  status?: PublicationStatus;
  year?: number;
  quartile?: Quartile;
  authorId?: number;
  page?: number;
  size?: number;
}

export interface DepartmentSettings {
  id?: number;
  departmentName?: string;
  deanery?: string;
  headOfDepartment?: string;
  postalAddress?: string;
  phoneNumbers?: string;
}

export interface LoginResponse {
  token: string;
  user: User;
}

export type EnglishLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2' | 'NATIVE' | 'NONE';

export type KkkStatus =
  | 'NOT_STARTED'
  | 'IN_PROGRESS'
  | 'SUBMITTED'
  | 'CHECKED'
  | 'RETURNED_FOR_CORRECTION'
  | 'READY';

export interface Education {
  id: number;
  degree?: string;
  institution?: string;
  specialty?: string;
  year?: number;
  createdAt?: string;
}

export interface WorkExperience {
  id: number;
  position?: string;
  organization?: string;
  startYear?: number;
  endYear?: number;
  current?: boolean;
  description?: string;
}

export interface QualificationCourse {
  id: number;
  name?: string;
  organization?: string;
  year?: number;
  hours?: number;
  certificateFilePath?: string;
  certificateOriginalName?: string;
}

export interface Award {
  id: number;
  name?: string;
  organization?: string;
  year?: number;
  description?: string;
}

export interface Patent {
  id: number;
  title?: string;
  patentNumber?: string;
  year?: number;
  country?: string;
  description?: string;
}

export interface KkkChecklist {
  profileCompleted: boolean;
  educationAdded: boolean;
  educationCount: number;
  workExperienceAdded: boolean;
  workExperienceCount: number;
  qualificationCoursesLast3Years: boolean;
  qualificationCoursesCount: number;
  publicationsLast5Years: boolean;
  publicationsCount: number;
  doiLinksAdded: boolean;
  missingDoiCount: number;
  confirmationFilesUploaded: boolean;
  missingFilesCount: number;
  awardsPatentsAdded: boolean;
  awardsPatentsCount: number;
  englishLevelAdded: boolean;
  completionPercentage: number;
  missingItems: string[];
  recommendations: string[];
}

export interface KkkProfile {
  id: number;
  teacherId: number;
  teacherUsername: string;
  teacherEmail?: string;
  status: KkkStatus;
  submittedAt?: string;
  checkedAt?: string;
  reviewerComment?: string;
  reviewedById?: number;
  reviewedByUsername?: string;
  createdAt?: string;
  updatedAt?: string;
  checklist: KkkChecklist;
  educations?: Education[];
  workExperiences?: WorkExperience[];
  qualificationCourses?: QualificationCourse[];
  awards?: Award[];
  patents?: Patent[];
}

export interface KkkAdminFilters {
  status?: KkkStatus;
  minCompletion?: number;
  maxCompletion?: number;
  page?: number;
  size?: number;
}

export type DeadlineCategory =
  | 'KKK'
  | 'SCOPUS'
  | 'QUARTERLY_REPORT'
  | 'SEMESTER_REPORT'
  | 'WORKLOAD_REPORT'
  | 'PRACTICE_REPORT'
  | 'ACCREDITATION'
  | 'OTHER';

export type TargetRole = 'ALL' | 'TEACHERS_ONLY' | 'ADMINS_ONLY' | 'SPECIFIC_USERS';

export type RepeatType = 'ONE_TIME' | 'MONTHLY' | 'QUARTERLY' | 'SEMESTER' | 'ANNUAL';

export interface Deadline {
  id: number;
  title: string;
  description?: string;
  deadlineDate: string;
  category: DeadlineCategory;
  targetRole: TargetRole;
  targetUsers?: User[];
  repeatType: RepeatType;
  active: boolean;
  createdBy?: User;
  createdAt?: string;
  updatedAt?: string;
  lastNotificationSent?: string;
}

export interface DeadlineDto {
  title: string;
  description?: string;
  deadlineDate: string;
  category: DeadlineCategory;
  targetRole: TargetRole;
  targetUserIds?: number[];
  repeatType: RepeatType;
  active: boolean;
}

export interface DeadlineAdminFilters {
  category?: DeadlineCategory;
  repeatType?: RepeatType;
  active?: boolean;
  page?: number;
  size?: number;
}

// Phase 8a — AI
export interface TemplateRecommendation {
  template: Template;
  score: number;
  matchedKeywords: string[];
}

export interface TeacherSearchResult {
  teacher: User;
  score: number;
  matchedFields: string[];
  relevantPublications: Publication[];
  matchReason?: string;
}

// Phase 8b — AI Publication Metadata Extraction
export interface PublicationMetadata {
  title?: string;
  authors?: string;
  year?: number;
  doi?: string;
  journalName?: string;
  publicationType?: PublicationType;
  databaseType?: DatabaseType;
  confidence: number;
}

// Phase 8c — AI Missing Data Assistant + Profile Summary
export type KkkGapPriority = 'critical' | 'important' | 'niceToHave';

export interface KkkGapMissingItem {
  key: string;
  priority: KkkGapPriority;
  recommendation: string;
}

export interface KkkGapAnalysis {
  completionPercentage: number;
  missingItems: KkkGapMissingItem[];
  topRecommendations: KkkGapMissingItem[];
}

// Phase D — AI Helpers
export interface PublicationFieldSuggestions {
  journalName?: string;
  issn?: string;
  publicationType?: string;
  databaseType?: string;
  quartile?: string;
  publisher?: string;
  indexedDatabases?: string[];
  confidence: number;
}

// Dashboard — Today's Focus
export interface TodayFocusPriorityAction {
  label: string;
  path: string;
  icon: string;
  urgency: 'high' | 'medium' | 'low';
}

export interface TodayFocus {
  greeting: string;
  aiMessage: string;
  deadlinesToday: number;
  deadlinesApproaching: number;
  unreadNotifications: number;
  returnedReports: number;
  kkkCompletion: number;
  kkkReturned: boolean;
  priorityActions: TodayFocusPriorityAction[];
}

// Pinned Items
export type PinnedItemType = 'TEMPLATE' | 'PUBLICATION' | 'RECORD' | 'PAGE';

export interface PinnedItem {
  id: number;
  type: PinnedItemType;
  itemId?: number;
  pagePath?: string;
  title: string;
  subtitle?: string;
  icon: string;
  navigateTo: string;
  customTitle?: string;
  sortOrder?: number;
  pinned: boolean;
}

export interface PinCheckResult {
  pinned: boolean;
  pinId: number;
}

export interface AssistantConversation {
  id: number;
  title: string;
  lastMessageAt: string;
}

export interface AssistantMessage {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
}

export interface AssistantChatResponse {
  messageId: number;
  conversationId: number;
  response: string;
  createdAt: string;
}

export type RequestStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'REJECTED' | 'CANCELLED';

export interface TemplateRequest {
  id: number;
  requestedBy: { id: number; username: string; email?: string };
  title: string;
  description?: string;
  suggestedCategory?: TemplateCategory;
  status: RequestStatus;
  adminResponse?: string;
  respondedBy?: { id: number; username: string };
  createdTemplate?: { id: number; name: string };
  createdAt: string;
  respondedAt?: string;
}

