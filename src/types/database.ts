export type UserRole = 'super_admin' | 'school_admin' | 'teacher' | 'student';
export type SchoolStatus = 'active' | 'suspended';
export type SubscriptionPlanName = 'basic' | 'pro' | 'enterprise';
export type TeacherStatus = 'active' | 'inactive';
export type StudentStatus = 'active' | 'completed' | 'dropped';
export type ClassStatus = 'scheduled' | 'ongoing' | 'completed';
export type ExamStatus = 'draft' | 'published' | 'archived';
export type QuestionType = 'multiple_choice' | 'true_false' | 'short_answer';
export type LiveClassStatus = 'scheduled' | 'live' | 'ended' | 'cancelled';
export type SubscriptionStatus = 'active' | 'past_due' | 'cancelled' | 'expired';
export type BillingCycle = 'monthly' | 'annual';
export type PaymentMethod = 'momo' | 'card' | 'bank_transfer';
export type PaymentStatus = 'pending' | 'completed' | 'failed';
export type CertificateStatus = 'issued' | 'revoked';
export type NotificationType = 'info' | 'success' | 'warning' | 'error';

export interface School {
  id: string;
  school_code: string | null;
  name: string;
  email: string;
  phone: string | null;
  location: string | null;
  logo_url: string | null;
  status: SchoolStatus;
  subscription_plan: SubscriptionPlanName;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  public_id: string | null;
  school_id: string | null;
  full_name: string;
  phone: string | null;
  role: UserRole;
  avatar_url: string | null;
  is_active: boolean;
  must_change_password: boolean;
  created_at: string;
}

export interface Teacher {
  id: string;
  school_id: string;
  profile_id: string | null;
  full_name: string;
  email: string;
  phone: string | null;
  specialization: string | null;
  status: TeacherStatus;
  created_at: string;
}

export interface Student {
  id: string;
  school_id: string;
  profile_id: string | null;
  full_name: string;
  email: string | null;
  phone: string | null;
  license_category: string | null;
  enrollment_date: string;
  status: StudentStatus;
  created_at: string;
}

export interface Class {
  id: string;
  school_id: string;
  teacher_id: string;
  name: string;
  description: string | null;
  license_category: string | null;
  start_date: string;
  end_date: string | null;
  status: ClassStatus;
  created_at: string;
}

export interface ClassEnrollment {
  id: string;
  class_id: string;
  student_id: string;
  enrolled_at: string;
}

export interface Exam {
  id: string;
  school_id: string;
  class_id: string | null;
  teacher_id: string;
  title: string;
  description: string | null;
  duration_minutes: number;
  passing_score: number;
  status: ExamStatus;
  scheduled_at: string | null;
  created_at: string;
}

export interface Question {
  id: string;
  exam_id: string;
  question_text: string;
  question_type: QuestionType;
  options: string[] | null;
  correct_answer: string;
  points: number;
  created_at: string;
}

export interface ExamResult {
  id: string;
  exam_id: string;
  student_id: string;
  score: number;
  total_points: number;
  earned_points: number;
  passed: boolean;
  answers: Record<string, string> | null;
  started_at: string;
  completed_at: string | null;
}

export interface Certificate {
  id: string;
  school_id: string;
  student_id: string;
  exam_id: string | null;
  certificate_number: string;
  license_category: string;
  issued_at: string;
  status: CertificateStatus;
}

export interface LiveClass {
  id: string;
  school_id: string;
  class_id: string | null;
  teacher_id: string;
  title: string;
  description: string | null;
  scheduled_at: string;
  duration_minutes: number;
  status: LiveClassStatus;
  meeting_url: string | null;
  created_at: string;
}

export interface SubscriptionPlan {
  id: string;
  name: SubscriptionPlanName;
  display_name: string;
  price_rwf: number;
  max_students: number;
  max_teachers: number;
  features: string[];
  is_active: boolean;
  created_at: string;
}

export interface Subscription {
  id: string;
  school_id: string;
  plan_id: string;
  status: SubscriptionStatus;
  billing_cycle: BillingCycle;
  current_period_start: string;
  current_period_end: string | null;
  amount_rwf: number;
  created_at: string;
}

export interface Payment {
  id: string;
  school_id: string;
  subscription_id: string;
  amount_rwf: number;
  payment_method: PaymentMethod;
  status: PaymentStatus;
  transaction_ref: string | null;
  paid_at: string | null;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: NotificationType;
  is_read: boolean;
  created_at: string;
}
