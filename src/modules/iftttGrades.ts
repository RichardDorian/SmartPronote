import { PronoteStudentSession } from 'pronote-api-maintained';
import { Account } from '../utils/config';
import { getUser, setUser } from '../utils/database';
import sendNotification from '../utils/ifttt';
import { getGrades } from '../utils/pronote';

export async function iftttGrades(
  account: Account,
  session: PronoteStudentSession
) {
  const key = account.modules.iftttGrades.key;

  const grades = await getGrades(account.username, session);
  const dbUser = getUser(account.username);

  for (const grade of grades) {
    if (dbUser.grades.includes(grade.hash)) continue;

    await sendNotification(
      key,
      `You got ${grade.value}/${grade.scale} in ${grade.subject}. The class average is ${grade.average}`,
      account.url
    );

    dbUser.grades.push(grade.hash);
  }

  await setUser(account.username, dbUser);
}
