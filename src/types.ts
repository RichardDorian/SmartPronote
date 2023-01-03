export interface Homework {
  subject: string;
  givenAt: Date;
  due: Date;
  content: string;
  files: { name?: string; url: string }[];
  done: boolean;
  id: string;
}

export interface Grade {
  subject: string;
  value: number;
  scale: number;
  average: number;
  coefficient: number;
  worst: number;
  best: number;
  date: Date;
  comment: string;
  id: string;
}

export interface Lesson {
  from: Date;
  to: Date;
  subject: string;
  teacher: string;
  room: string;
  absent?: boolean;
  cancelled?: boolean;
}

export interface Averages {
  value: number;
  everyone: number;
}

export type Homeworks = Homework[];
export type Grades = Grade[];
export type Timetable = Lesson[];
