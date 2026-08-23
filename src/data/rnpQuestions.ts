import type { ExerciseQuestion } from '@/types/live-class';

export type { ExerciseQuestion } from '@/types/live-class';

export interface TheoryAccessCodeSession {
  code: string;
  title: string;
  durationMinutes: number; // default 20
  totalQuestions: number; // default 20
  createdAt: number;
  expiresAt: number;
  isExpired: boolean;
  questions: ExerciseQuestion[];
}

export type RNPAccessCodeSession = TheoryAccessCodeSession;

export const defaultTheoryQuestionBank: ExerciseQuestion[] = [
  {
    id: 'q-1',
    text: 'What is the maximum allowed speed limit inside urban areas (city boundaries) in Rwanda?',
    type: 'multiple_choice',
    options: ['40 km/h', '50 km/h', '60 km/h', '80 km/h'],
    correctAnswer: '40 km/h',
    points: 1,
    explanation: 'According to Article 45 of the Rwandan Road Code, the speed limit within built-up urban zones is capped at 40 km/h.'
  },
  {
    id: 'q-2',
    text: 'When entering a traffic roundabout, who has the mandatory right of way?',
    type: 'multiple_choice',
    options: ['Vehicles entering from the right', 'Vehicles already inside the roundabout', 'The fastest approaching vehicle', 'Heavy commercial trucks'],
    correctAnswer: 'Vehicles already inside the roundabout',
    points: 1,
    explanation: 'Traffic circulating inside the roundabout always has priority. Entering vehicles must yield before merging.'
  },
  {
    id: 'q-3',
    text: 'What does a solid single white line marked down the center of the road signify?',
    type: 'multiple_choice',
    options: ['Overtaking is permitted if clear', 'Do not cross or straddle the line under any circumstances', 'Speed limit is 80 km/h', 'Parking is strictly allowed'],
    correctAnswer: 'Do not cross or straddle the line under any circumstances',
    points: 1,
    explanation: 'A solid white line strictly prohibits crossing, straddling, or executing U-turns/overtaking over the line.'
  },
  {
    id: 'q-4',
    text: 'What is the legal blood alcohol level limit for public transport drivers in Rwanda?',
    type: 'multiple_choice',
    options: ['0.00 g/l (Zero tolerance)', '0.50 g/l', '0.80 g/l', '1.00 g/l'],
    correctAnswer: '0.00 g/l (Zero tolerance)',
    points: 1,
    explanation: 'Rwanda applies strict zero-tolerance (0.00 g/l) for professional and passenger transport drivers.'
  },
  {
    id: 'q-5',
    text: 'When involved in an accident causing personal injury, what is your first legal duty?',
    type: 'multiple_choice',
    options: ['Drive to the nearest garage', 'Stop immediately, render aid, and call Emergency/Medical (112/113)', 'Negotiate payment with the victim', 'Move vehicles to clear the road before traffic police arrive'],
    correctAnswer: 'Stop immediately, render aid, and call Emergency/Medical (112/113)',
    points: 1,
    explanation: 'Article 110 mandates stopping, providing emergency aid, securing the scene, and contacting emergency responders immediately.'
  },
  {
    id: 'q-6',
    text: 'What does an inverted triangular road sign with a red border mean?',
    type: 'multiple_choice',
    options: ['Stop completely', 'Yield / Give Way to traffic on the main road', 'Danger ahead', 'No Entry'],
    correctAnswer: 'Yield / Give Way to traffic on the main road',
    points: 1,
    explanation: 'The inverted triangle is the universal Yield/Give Way sign requiring drivers to slow down and prioritize main road traffic.'
  },
  {
    id: 'q-7',
    text: 'Is it legal to use a mobile telephone while driving if using a handheld device?',
    type: 'true_false',
    options: ['True', 'False'],
    correctAnswer: 'False',
    points: 1,
    explanation: 'Holding or operating a mobile phone while driving is strictly prohibited by traffic regulations.'
  },
  {
    id: 'q-8',
    text: 'What is the maximum allowed speed limit on open highways outside urban areas in Rwanda for Category B passenger cars?',
    type: 'multiple_choice',
    options: ['60 km/h', '70 km/h', '80 km/h', '100 km/h'],
    correctAnswer: '80 km/h',
    points: 1,
    explanation: 'Unless otherwise posted, the maximum national highway speed limit in Rwanda is 80 km/h.'
  },
  {
    id: 'q-9',
    text: 'When driving downhill on steep mountain slopes, what gear technique should be used?',
    type: 'multiple_choice',
    options: ['Shift to neutral (N) to save fuel', 'Use a low gear engine braking to assist wheel brakes', 'Turn off ignition', 'Press clutch pedal continuously'],
    correctAnswer: 'Use a low gear engine braking to assist wheel brakes',
    points: 1,
    explanation: 'Coasting in neutral or with clutch depressed is hazardous as it overheats wheel brakes and causes loss of control.'
  },
  {
    id: 'q-10',
    text: 'At an uncontrolled 4-way intersection without signs, who has priority of movement?',
    type: 'multiple_choice',
    options: ['Vehicle coming from the left', 'Vehicle coming from the right', 'Vehicle traveling straight', 'Vehicle turning left'],
    correctAnswer: 'Vehicle coming from the right',
    points: 1,
    explanation: 'The standard priority rule is priority to the right at all uncontrolled intersections.'
  },
  {
    id: 'q-11',
    text: 'What does a circular sign with a red border and number "50" indicate?',
    type: 'multiple_choice',
    options: ['Minimum speed limit 50 km/h', 'Maximum speed limit 50 km/h', 'Distance to next town 50 km', 'Recommended speed 50 km/h'],
    correctAnswer: 'Maximum speed limit 50 km/h',
    points: 1,
    explanation: 'Red circular signs indicate prohibitions or limits; a number inside specifies the absolute maximum speed allowed.'
  },
  {
    id: 'q-12',
    text: 'True or False: Seat belts must be worn by all occupants in front and rear seats.',
    type: 'true_false',
    options: ['True', 'False'],
    correctAnswer: 'True',
    points: 1,
    explanation: 'Seatbelt compliance is compulsory for all seats fitted with seatbelts.'
  },
  {
    id: 'q-13',
    text: 'What distance should be maintained between your car and the vehicle ahead when driving behind it in good weather?',
    type: 'multiple_choice',
    options: ['At least 2 seconds (safe stopping distance)', '1 meter', '5 meters', '10 meters regardless of speed'],
    correctAnswer: 'At least 2 seconds (safe stopping distance)',
    points: 1,
    explanation: 'The 2-second rule provides sufficient distance to stop safely in emergency situations.'
  },
  {
    id: 'q-14',
    text: 'What light must be illuminated on a vehicle when driving in heavy fog or torrential rain during daylight?',
    type: 'multiple_choice',
    options: ['High beam headlights', 'Dipped (low beam) headlights or fog lights', 'Hazard lights only', 'Interior dome lights'],
    correctAnswer: 'Dipped (low beam) headlights or fog lights',
    points: 1,
    explanation: 'Low beams prevent glare back into the driver\'s eyes while making the vehicle visible to others in low visibility.'
  },
  {
    id: 'q-15',
    text: 'When is overtaking prohibited on a two-lane two-way road?',
    type: 'multiple_choice',
    options: ['Near pedestrian crossings, sharp bends, and crests of hills', 'On straight open highways', 'During sunny weather', 'When following a motorcycle'],
    correctAnswer: 'Near pedestrian crossings, sharp bends, and crests of hills',
    points: 1,
    explanation: 'Overtaking is forbidden anywhere forward line of sight is restricted or near vulnerable road users.'
  },
  {
    id: 'q-16',
    text: 'What does a continuous yellow line along the edge of the curb indicate?',
    type: 'multiple_choice',
    options: ['No parking or stopping permitted', 'Taxi passenger pickup zone', 'Reserved for emergency vehicles', 'Loading bay'],
    correctAnswer: 'No parking or stopping permitted',
    points: 1,
    explanation: 'A solid yellow curb line designates an absolute no-stopping and no-parking prohibition area.'
  },
  {
    id: 'q-17',
    text: 'What action should you take when an emergency vehicle (Ambulance / Fire / Police) approaches with sirens on?',
    type: 'multiple_choice',
    options: ['Speed up to stay ahead', 'Pull over safely to the right shoulder and yield clear passage immediately', 'Maintain speed in current lane', 'Stop in the middle of the road'],
    correctAnswer: 'Pull over safely to the right shoulder and yield clear passage immediately',
    points: 1,
    explanation: 'Drivers must immediately yield right of way and create a clear lane for emergency services.'
  },
  {
    id: 'q-18',
    text: 'What is the required minimum tread depth for automobile tires in safety inspections?',
    type: 'multiple_choice',
    options: ['1.6 mm', '3.0 mm', '0.5 mm', '5.0 mm'],
    correctAnswer: '1.6 mm',
    points: 1,
    explanation: 'Tires must maintain a minimum tread depth of 1.6mm across the central three-quarters of the tread.'
  },
  {
    id: 'q-19',
    text: 'What is the minimum passing score required to pass the Provisional Theory License Exam?',
    type: 'multiple_choice',
    options: ['12 marks out of 20 (60%)', '15 marks out of 20 (75%)', '10 marks out of 20 (50%)', '18 marks out of 20 (90%)'],
    correctAnswer: '12 marks out of 20 (60%)',
    points: 1,
    explanation: 'The official passing mark for the provisional computer-based theory test is 12 out of 20 (60%).'
  },
  {
    id: 'q-20',
    text: 'True or False: It is legal to pass a school bus when its yellow hazard indicator lights are flashing and children are disembarking.',
    type: 'true_false',
    options: ['True', 'False'],
    correctAnswer: 'False',
    points: 1,
    explanation: 'Drivers must stop and wait until all children have safely crossed and flashing lights are turned off.'
  },
  {
    id: 'q-21',
    text: 'What does an octagonal red sign bearing white text "YEBA" or "STOP" mean?',
    type: 'multiple_choice',
    options: ['Stop completely before line, check traffic, yield to all, then proceed', 'Slow down to 20 km/h', 'Priority road starts here', 'No U-Turn'],
    correctAnswer: 'Stop completely before line, check traffic, yield to all, then proceed',
    points: 1,
    explanation: 'A STOP sign requires a full, complete halt of vehicle wheels before proceeding safely.'
  },
  {
    id: 'q-22',
    text: 'When driving at night, when must high-beam headlights be switched to dipped low-beams?',
    type: 'multiple_choice',
    options: ['When approaching oncoming vehicles within 200m or following another car', 'Only in city centers', 'Never', 'When driving faster than 60 km/h'],
    correctAnswer: 'When approaching oncoming vehicles within 200m or following another car',
    points: 1,
    explanation: 'High beams blind oncoming drivers and obscure rearview mirrors of vehicles ahead.'
  },
  {
    id: 'q-23',
    text: 'What document must a driver always carry while operating a motor vehicle on public roads?',
    type: 'multiple_choice',
    options: ['Valid Driving License, Vehicle Inspection Certificate (Contrôle Technique), & Insurance', 'School diploma', 'Birth certificate', 'Bank receipt only'],
    correctAnswer: 'Valid Driving License, Vehicle Inspection Certificate (Contrôle Technique), & Insurance',
    points: 1,
    explanation: 'Drivers must carry original license, valid technical control, insurance card, and vehicle registration (carte jaune).'
  },
  {
    id: 'q-24',
    text: 'What is the function of ABS (Anti-lock Braking System) during sudden emergency braking?',
    type: 'multiple_choice',
    options: ['Prevents wheels from locking up so the driver can maintain steering control', 'Increases engine power', 'Makes brakes completely silent', 'Automatically turns off headlights'],
    correctAnswer: 'Prevents wheels from locking up so the driver can maintain steering control',
    points: 1,
    explanation: 'ABS rapidly pumps brakes under emergency force, preventing skidding and allowing directional steering.'
  },
  {
    id: 'q-25',
    text: 'Which arm signal extended horizontally out the driver side window indicates an intention to turn right?',
    type: 'multiple_choice',
    options: ['Arm bent upwards at 90 degrees or pointing across roof to the right', 'Arm pointing downward', 'Arm waving back and forth', 'Horn honking twice'],
    correctAnswer: 'Arm bent upwards at 90 degrees or pointing across roof to the right',
    points: 1,
    explanation: 'Standard hand signal for right turn is arm bent upward at right angle (or pointing right).'
  }
];

export const defaultRNPQuestionBank = defaultTheoryQuestionBank;

/**
 * Helper to generate 20 random questions for a student exam
 */
export function generateRandom20TheoryExam(): ExerciseQuestion[] {
  const shuffled = [...defaultTheoryQuestionBank].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, 20);
}

export const generateRandom20RNPExam = generateRandom20TheoryExam;
