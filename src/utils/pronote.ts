import { login, PronoteStudentSession } from 'pronote-api-maintained';
import { Averages, Grades, Homeworks, Timetable } from '../types';
import { Account, config } from './config';
import { hashGrade, hashHomework } from './hashing';
import { SubjectNames } from './locale';

const caches = {
  sessions: new Map<string, PronoteStudentSession>(),
  grades: new Map<string, Grades>(),
  timetable: new Map<string, Timetable>(),
  homeworks: new Map<string, Homeworks>(),
  averages: new Map<string, Averages>(),
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

  const raw = await session.marks().catch(() => null);
  const grades: Grades = [];

  for (const subject of raw?.subjects ?? []) {
    for (const mark of subject.marks) {
      const grade = {
        subject: SubjectNames[subject.name] ?? subject.name,
        average: mark.average,
        coefficient: mark.coefficient,
        comment: mark.title,
        date: mark.date,
        best: mark.max,
        worst: mark.min,
        scale: mark.scale,
        value: mark.value,
      };

      grades.push({ ...grade, hash: hashGrade(grade) });
    }
  }

  if (raw) {
    // Don't add to cache if request went wrong
    caches.grades.set(username, grades);
    setTimeout(() => caches.grades.delete(username), cacheTtl);
  }

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

  const raw = await session
    .timetable(currentMonday, currentFriday)
    .catch(() => null);
  const timetable: Timetable =
    raw?.map((v) => ({
      from: v.from,
      room: v.room,
      subject: SubjectNames[v.subject] ?? v.subject,
      teacher: v.teacher,
      to: v.to,
      absent: v.isAway,
      cancelled: v.isCancelled,
    })) ?? [];

  if (raw) {
    caches.timetable.set(username, timetable);
    setTimeout(() => caches.timetable.delete(username), cacheTtl);
  }

  return timetable;
}

export async function getHomeworks(
  username: string,
  session: PronoteStudentSession
): Promise<Homeworks> {
  const cached = caches.homeworks.get(username);
  if (cached) return cached;

  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
  yesterday.setHours(0, 0);
  const farAwayInTime = new Date(
    // 150 days in the future
    yesterday.getTime() + 151 * 24 * 3600 * 1000
  );
  const raw = await session
    .homeworks(yesterday, farAwayInTime)
    .catch(() => null);

  const homeworks: Homeworks =
    raw?.map((v) => {
      const homework = {
        content: v.description,
        due: new Date(v.for.getTime() + 3 * 60 * 60 * 1000), // We add 3 hours because a homework is always for the day before its due at 11PM
        files: v.files.map((f) => ({ name: f.name, url: f.url })),
        givenAt: v.givenAt,
        subject: SubjectNames[v.subject] ?? v.subject,
        done: v.done,
      };

      return { ...homework, hash: hashHomework(homework) };
    }) ?? [];

  if (raw) {
    caches.homeworks.set(username, homeworks);
    setTimeout(() => caches.homeworks.delete(username), cacheTtl);
  }

  return homeworks;
}

export async function getAverages(
  username: string,
  session: PronoteStudentSession
): Promise<Averages> {
  const cached = caches.averages.get(username);
  if (cached) return cached;

  const raw = await session.marks().catch(() => null);

  const averages: Averages = {
    value: raw?.averages?.student ?? 0,
    everyone: raw?.averages?.studentClass ?? 0,
  };

  if (raw) {
    caches.averages.set(username, averages);
    setTimeout(() => caches.averages.delete(username), cacheTtl);
  }

  return averages;
}
