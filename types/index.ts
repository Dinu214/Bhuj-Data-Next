// ─── Database Entity Types ────────────────────────────────────────────────────
export interface Category {
  category_id: number;
  category_name: string;
}

export interface Group {
  group_id: number;
  group_name: string;
}

export interface Person {
  person_id: number;
  full_name: string;
  mobile_number?: string;
  dob?: string;
  category_id?: number;
  // Extended fields
  photo_url?: string;
  address?: string;
  mobile_number_2?: string;
  email?: string;
  blood_group?: string;
  is_ambrish?: boolean;
  dixa_date?: string;
  avd_code?: string;
  aadhar_card_no?: string;
  marital_status?: 'single' | 'married' | 'widowed';
  anniversary_date?: string;
  attended_mahotsav?: string;
  education_qualification?: string;
  running_education?: string;
  occupation?: 'job' | 'business' | 'student' | 'other';
  job_business_details?: string;
  reference_person?: string;
  attending_sabha_since?: string;
  hobby?: string;
}

export interface PersonGroup {
  person_id: number;
  group_id: number;
}

// ─── Auth & User Types ────────────────────────────────────────────────────────
export type UserRole = 'admin' | 'viewer_admin' | 'user';

export interface AppUser {
  id: number;
  username: string;
  displayName: string;
  role: UserRole;
  groupAccess: number[];      // group_ids the user can manage
  permissions: string[];      // feature permission keys, e.g. 'attendance:manage'
}

export interface AppUserWithGroups extends AppUser {
  groups: { group_id: number; group_name: string }[];
}

// ─── Attendance Types ─────────────────────────────────────────────────────────
export type AttendanceStatus = 'present' | 'absent' | 'leave';

export interface AttendanceOccasion {
  id: number;
  name: string;
  description?: string;
  created_by?: number;
  created_by_name?: string;
  created_at: string;
}

export interface AttendanceRecord {
  id: number;
  person_id: number;
  full_name: string;
  occasion_id: number;
  occasion_name: string;
  attendance_date: string;
  status: AttendanceStatus;
  marked_by_user_id?: number;
  marked_by_name?: string;
  group_id?: number;
  group_name?: string;
}

export interface AttendanceStats {
  totalRecords: number;
  todayPresent: number;
  todayTotal: number;
  todayRate: number;
  byGroup: { group_id: number; group_name: string; present: number; total: number; rate: number }[];
  history?: { attendance_date: string; present: number; total: number; rate: number }[];
}

// ─── Extended UI Types ────────────────────────────────────────────────────────
export interface PersonWithDetails extends Person {
  category?: Category;
  groups?: Group[];
}

export interface CategoryWithCount extends Category {
  person_count: number;
}

export interface GroupWithCount extends Group {
  person_count: number;
}

// ─── View & App State Types ───────────────────────────────────────────────────
export type ViewType =
  | 'dashboard'
  | 'people'
  | 'categories'
  | 'groups'
  | 'person-detail'
  | 'category-detail'
  | 'group-detail'
  | 'attendance'
  | 'occasions'
  | 'attendance-report'
  | 'users'
  | 'settings'
  | 'guide';

export interface AppState {
  currentView: ViewType;
  selectedId?: number;
  searchTerm: string;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  filterCategory?: number;
  filterGroup?: number;
}

