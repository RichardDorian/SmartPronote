import { login, PronoteStudentSession } from 'pronote-api-maintained';
import { Grades, Homeworks, Timetable } from '../types';
import { Account, config } from './config';
import { SubjectNames } from './locale';

const caches = {
  sessions: new Map<string, PronoteStudentSession>(),
  grades: new Map<string, Grades>(),
  timetable: new Map<string, Timetable>(),
  homeworks: new Map<string, Homeworks>(),
};

// Deleting cache entry 30 seconds before refresh
const cacheTtl = config.refreshEvery - 30 * 1000;

function getCurrentMonday() {
  const currentMonday = new Date();
  currentMonday.setDate(currentMonday.getDate() - currentMonday.getDay() + 1);
  currentMonday.setHours(1, 0, 0, 0);

  return currentMonday;
}

export async function getSession(
  account: Account
): Promise<PronoteStudentSession> {
  const cached = caches.sessions.get(account.username);
  if (cached) return cached;

  const session = await login(
    account.url,
    account.username,
    account.password,
    account.cas
  );
  session.setKeepAlive(true);

  setTimeout(async () => {
    session.setKeepAlive(false);
    await session.logout();
  }, config.accountTimeout);

  caches.sessions.set(account.username, session);
  setTimeout(
    () => caches.sessions.delete(account.username),
    // Deleting cache 2 minutes before account keepalive expiration
    config.accountTimeout - 2 * 60 * 1000
  );

  return session;
}

export async function getGrades(
  username: string,
  session: PronoteStudentSession
): Promise<Grades> {
  const cached = caches.grades.get(username);
  if (cached) return cached;

  const raw = await session.marks();
  const grades: Grades = [];

  for (const subject of raw.subjects) {
    for (const mark of subject.marks) {
      grades.push({
        subject: SubjectNames[subject.name] ?? subject.name,
        average: mark.average,
        coefficient: mark.coefficient,
        comment: mark.title,
        date: mark.date,
        best: mark.max,
        worst: mark.min,
        scale: mark.scale,
        value: mark.value,
        id: mark.id,
      });
    }
  }

  caches.grades.set(username, grades);
  setTimeout(() => caches.grades.delete(username), cacheTtl);

  return grades;
}

export async function getTimetable(
  username: string,
  session: PronoteStudentSession
): Promise<Timetable> {
  const cached = caches.timetable.get(username);
  if (cached) return cached;

  const currentMonday = getCurrentMonday();

  const currentFriday = new Date(
    // We add 5 days so people that have lessons on saturday can see it
    currentMonday.getTime() + 5 * 24 * 3600 * 1000
  );

  const raw = await session.timetable(currentMonday, currentFriday);
  const timetable: Timetable = raw.map((v) => ({
    from: v.from,
    room: v.room,
    subject: SubjectNames[v.subject] ?? v.subject,
    teacher: v.teacher,
    to: v.to,
    absent: v.isAway,
    cancelled: v.isCancelled,
  }));

  caches.timetable.set(username, timetable);
  setTimeout(() => caches.timetable.delete(username), cacheTtl);

  return timetable;
}

export async function getHomeworks(
  username: string,
  session: PronoteStudentSession
): Promise<Homeworks> {
  const cached = caches.homeworks.get(username);
  if (cached) return cached;

  const currentMonday = getCurrentMonday();
  const farAwayInTime = new Date(
    // 150 days in the future
    currentMonday.getTime() + 150 * 24 * 3600 * 1000
  );
  const raw = await session.homeworks(currentMonday, farAwayInTime);

  const homeworks: Homeworks = raw.map((v) => ({
    content: v.description,
    due: v.for,
    files: v.files.map((f) => ({ name: f.name, url: f.url })),
    givenAt: v.givenAt,
    subject: SubjectNames[v.subject] ?? v.subject,
    id: v.id,
  }));

  caches.homeworks.set(username, homeworks);
  setTimeout(() => caches.homeworks.delete(username), cacheTtl);

  return homeworks;
}
