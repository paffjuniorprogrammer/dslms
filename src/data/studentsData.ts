export interface Student {
  id: string;
  name: string;
  nin: string;
  email: string;
  phone: string;
  category: 'Cat A (Motorcycle)' | 'Cat B (Car)' | 'Cat C (Truck)' | 'Cat D (Bus)' | 'Cat E (Trailer)';
  registrationDate: string;
  schoolName: string;
  status: 'Active' | 'Completed' | 'Suspended';
  avatar: string;
  gender: 'Male' | 'Female';
  address: string;
  enrollmentDate?: string;
  theoryProgressPercent?: number;
  practicalProgressPercent?: number;
  examStatus?: 'Not Started' | 'In Progress' | 'Passed' | 'Failed';
  paymentStatus?: 'Paid' | 'Pending' | 'Overdue';
  certificateStatus?: 'Not Issued' | 'Issued' | 'Pending';
}

export interface ExerciseRecord {
  id: string;
  title: string;
  date: string;
  score: number; // out of 20
  total: number;
  type: 'Live Class Quiz' | 'Physical Classroom Exam' | 'Homework Practice';
}

export interface StudentReport {
  studentId: string;
  studentName: string;
  nin: string;
  category: string;
  exercisesCompleted: number;
  averageScorePercentage: number;
  highestScore: number;
  lowestScore: number;
  lastActive: string;
  status: 'Pass (Mastered)' | 'Average' | 'Needs Practice';
  exerciseHistory: ExerciseRecord[];
}

export interface SchoolCertificateConfig {
  schoolName: string;
  schoolTagline: string;
  schoolLogo: string;
  address: string;
  phone: string;
  email: string;
  directorName: string;
  directorTitle: string;
  accreditationNo: string;
  stampColor: string;
}

export const defaultSchoolConfig: SchoolCertificateConfig = {
  schoolName: 'Kigali International Driving Academy',
  schoolTagline: 'Certified Road Safety & National Driving Academy',
  schoolLogo: 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?auto=format&fit=crop&w=150&q=80',
  address: 'KN 5 Rd, Nyarugenge District, Kigali, Rwanda',
  phone: '+250 788 123 456 / +250 722 987 654',
  email: 'info@kigalidriving.rw',
  directorName: 'Jean-Claude NSHIMIYIMANA',
  directorTitle: 'Director General & Chief Examiner',
  accreditationNo: 'NLA/RDA-CERT/2024/0942',
  stampColor: '#1e3a8a', // Deep royal navy blue stamp
};

export const defaultStudents: Student[] = [
  {
    id: 'STU-1001',
    name: 'Uwase Aline',
    nin: '1 1999 8 0045123 1 88',
    email: 'aline.uwase@gmail.com',
    phone: '+250 788 412 901',
    category: 'Cat B (Car)',
    registrationDate: '2025-01-10',
    schoolName: 'Kigali International Driving Academy',
    status: 'Active',
    avatar: 'UA',
    gender: 'Female',
    address: 'Kicukiro, Kigali',
  },
  {
    id: 'STU-1002',
    name: 'Nshimyumuremyi Eric',
    nin: '1 1997 8 0033121 1 45',
    email: 'eric.nshimye@yahoo.com',
    phone: '+250 783 109 233',
    category: 'Cat B (Car)',
    registrationDate: '2025-01-15',
    schoolName: 'Kigali International Driving Academy',
    status: 'Active',
    avatar: 'NE',
    gender: 'Male',
    address: 'Gasabo, Remera',
  },
  {
    id: 'STU-1003',
    name: 'Mukamana Grace',
    nin: '1 2001 7 0098124 1 12',
    email: 'grace.muka@gmail.com',
    phone: '+250 789 004 511',
    category: 'Cat A (Motorcycle)',
    registrationDate: '2025-02-01',
    schoolName: 'Kigali International Driving Academy',
    status: 'Active',
    avatar: 'MG',
    gender: 'Female',
    address: 'Nyarugenge, Nyamirambo',
  },
  {
    id: 'STU-1004',
    name: 'Habimana Jean-Paul',
    nin: '1 1995 8 0077881 1 90',
    email: 'jp.habimana@outlook.com',
    phone: '+250 788 991 122',
    category: 'Cat C (Truck)',
    registrationDate: '2024-11-20',
    schoolName: 'Kigali International Driving Academy',
    status: 'Completed',
    avatar: 'HJ',
    gender: 'Male',
    address: 'Musanze District',
  },
  {
    id: 'STU-1005',
    name: 'Keza Diane',
    nin: '1 2000 7 0066223 1 34',
    email: 'diane.keza@gmail.com',
    phone: '+250 785 334 112',
    category: 'Cat B (Car)',
    registrationDate: '2025-02-12',
    schoolName: 'Kigali International Driving Academy',
    status: 'Active',
    avatar: 'KD',
    gender: 'Female',
    address: 'Kicukiro, Sonatube',
  },
  {
    id: 'STU-1006',
    name: 'Bizimana Patrick',
    nin: '1 1996 8 0022334 1 56',
    email: 'patrick.bizi@gmail.com',
    phone: '+250 781 223 900',
    category: 'Cat D (Bus)',
    registrationDate: '2024-12-05',
    schoolName: 'Kigali International Driving Academy',
    status: 'Completed',
    avatar: 'BP',
    gender: 'Male',
    address: 'Huye District',
  },
];

export const defaultStudentReports: StudentReport[] = [
  {
    studentId: 'STU-1001',
    studentName: 'Uwase Aline',
    nin: '1 1999 8 0045123 1 88',
    category: 'Cat B (Car)',
    exercisesCompleted: 8,
    averageScorePercentage: 92.5,
    highestScore: 20,
    lowestScore: 16,
    lastActive: 'Today at 10:15 AM',
    status: 'Pass (Mastered)',
    exerciseHistory: [
      { id: 'EX-1', title: 'Priority Signs & Speed Limits Quiz', date: '2025-02-28', score: 19, total: 20, type: 'Physical Classroom Exam' },
      { id: 'EX-2', title: 'Traffic Signals & Roundabout Right of Way', date: '2025-02-25', score: 18, total: 20, type: 'Live Class Quiz' },
      { id: 'EX-3', title: 'Road Markings & Overtaking Law (Article 42)', date: '2025-02-20', score: 20, total: 20, type: 'Physical Classroom Exam' },
      { id: 'EX-4', title: 'Alcohol Limits & Heavy Fines Regulations', date: '2025-02-15', score: 17, total: 20, type: 'Homework Practice' },
      { id: 'EX-5', title: 'Night Driving & Headlight Usage Rules', date: '2025-02-10', score: 19, total: 20, type: 'Live Class Quiz' },
      { id: 'EX-6', title: 'Emergency Vehicle Priority & Sirens', date: '2025-02-05', score: 18, total: 20, type: 'Homework Practice' },
      { id: 'EX-7', title: 'Pedestrian Crossings & School Zone Restrictions', date: '2025-01-30', score: 20, total: 20, type: 'Live Class Quiz' },
      { id: 'EX-8', title: 'General Traffic Code Comprehensive Mock', date: '2025-01-25', score: 17, total: 20, type: 'Physical Classroom Exam' },
    ],
  },
  {
    studentId: 'STU-1004',
    studentName: 'Habimana Jean-Paul',
    nin: '1 1995 8 0077881 1 90',
    category: 'Cat C (Truck)',
    exercisesCompleted: 10,
    averageScorePercentage: 95.0,
    highestScore: 20,
    lowestScore: 18,
    lastActive: '2 days ago',
    status: 'Pass (Mastered)',
    exerciseHistory: [
      { id: 'EX-101', title: 'Heavy Vehicle Brake Safety & Load Limits', date: '2025-02-27', score: 20, total: 20, type: 'Physical Classroom Exam' },
      { id: 'EX-102', title: 'Highway Overtaking & Distance Rules', date: '2025-02-24', score: 19, total: 20, type: 'Live Class Quiz' },
      { id: 'EX-103', title: 'Mountain Road Incline Signals & Exhaust Brakes', date: '2025-02-18', score: 19, total: 20, type: 'Physical Classroom Exam' },
    ],
  },
  {
    studentId: 'STU-1002',
    studentName: 'Nshimyumuremyi Eric',
    nin: '1 1997 8 0033121 1 45',
    category: 'Cat B (Car)',
    exercisesCompleted: 6,
    averageScorePercentage: 84.0,
    highestScore: 18,
    lowestScore: 14,
    lastActive: 'Yesterday',
    status: 'Pass (Mastered)',
    exerciseHistory: [
      { id: 'EX-201', title: 'Speed Limit Violations & Penalty Points', date: '2025-02-26', score: 17, total: 20, type: 'Live Class Quiz' },
      { id: 'EX-202', title: 'Right of Way in Junctions & Intersections', date: '2025-02-22', score: 18, total: 20, type: 'Physical Classroom Exam' },
      { id: 'EX-203', title: 'Vehicle Mechanical Inspection Standards', date: '2025-02-17', score: 15, total: 20, type: 'Homework Practice' },
    ],
  },
  {
    studentId: 'STU-1006',
    studentName: 'Bizimana Patrick',
    nin: '1 1996 8 0022334 1 56',
    category: 'Cat D (Bus)',
    exercisesCompleted: 9,
    averageScorePercentage: 88.0,
    highestScore: 19,
    lowestScore: 15,
    lastActive: '3 days ago',
    status: 'Pass (Mastered)',
    exerciseHistory: [
      { id: 'EX-301', title: 'Passenger Transport Safety & Capacity Laws', date: '2025-02-21', score: 18, total: 20, type: 'Physical Classroom Exam' },
      { id: 'EX-302', title: 'Tire Tread Depth & Rain Hazard Handling', date: '2025-02-14', score: 17, total: 20, type: 'Live Class Quiz' },
    ],
  },
  {
    studentId: 'STU-1003',
    studentName: 'Mukamana Grace',
    nin: '1 2001 7 0098124 1 12',
    category: 'Cat A (Motorcycle)',
    exercisesCompleted: 7,
    averageScorePercentage: 77.5,
    highestScore: 17,
    lowestScore: 13,
    lastActive: '4 days ago',
    status: 'Average',
    exerciseHistory: [
      { id: 'EX-401', title: 'Motorcycle Helmet Regulations & Lane Splitting', date: '2025-02-23', score: 16, total: 20, type: 'Live Class Quiz' },
      { id: 'EX-402', title: 'Two-Wheeler Braking Distance on Wet Roads', date: '2025-02-19', score: 15, total: 20, type: 'Physical Classroom Exam' },
    ],
  },
  {
    studentId: 'STU-1005',
    studentName: 'Keza Diane',
    nin: '1 2000 7 0066223 1 34',
    category: 'Cat B (Car)',
    exercisesCompleted: 4,
    averageScorePercentage: 62.5,
    highestScore: 14,
    lowestScore: 10,
    lastActive: '1 week ago',
    status: 'Needs Practice',
    exerciseHistory: [
      { id: 'EX-501', title: 'Basic Traffic Signs & Warning Signals', date: '2025-02-16', score: 13, total: 20, type: 'Homework Practice' },
      { id: 'EX-502', title: 'Parking Regulations & Towing Laws', date: '2025-02-11', score: 12, total: 20, type: 'Live Class Quiz' },
    ],
  },
];
