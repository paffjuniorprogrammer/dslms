export type ParticipantRole = 'host' | 'teacher' | 'school_admin' | 'super_admin' | 'student';
export type MediaState = 'on' | 'off';
export type StreamKind = 'camera' | 'screen';

export interface Participant {
  id: string;
  name: string;
  role: ParticipantRole;
  mic: MediaState;
  camera: MediaState;
  handRaised: boolean;
  isSpeaking?: boolean;
  isHost?: boolean;
  avatarColor?: string;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: ParticipantRole;
  text: string;
  timestamp: number;
  pinned?: boolean;
}

export interface ExerciseQuestion {
  id: string;
  text: string;
  type: 'multiple_choice' | 'true_false';
  options: string[];
  correctAnswer: string;
  points: number;
  explanation?: string;
  mediaUrl?: string;
}

export interface StudentAnswer {
  questionId: string;
  answer: string;
  correct: boolean;
}

export interface ExerciseResult {
  studentId: string;
  studentName: string;
  answers: StudentAnswer[];
  score: number;
  totalPoints: number;
  earnedPoints: number;
  submittedAt: number;
  timeSpentSeconds?: number;
}

export interface SharedBroadcastState {
  isSharing: boolean;
  sharedStudentId?: string | null;
  sharedQuestionId?: string | null;
  message?: string;
}
