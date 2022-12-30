import fetch from 'node-fetch';
import { PronoteStudentSession } from 'pronote-api-maintained';
import { Account } from '../utils/config';
import { getUser, setUser } from '../utils/database';
import { getGrades } from '../utils/pronote';

export async function iftttGrades(
  account: Account,
  session: PronoteStudentSession
) {
  const key = account.modules.iftttGrades.key;

  const grades = await getGrades(account.username, session);
  const dbUser = getUser(account.username);

  for (const grade of grades) {
    if (dbUser.grades.includes(grade.id)) continue;

    await fetch(
      `https://maker.ifttt.com/trigger/SmartPronote/with/key/${key}`,
      {
        method: 'POST',
        body: JSON.stringify({
          value1: `You got ${grade.value}/${grade.scale} in ${grade.subject}. The class average is ${grade.average}`,
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    dbUser.grades.push(grade.id);
  }

  await setUser(account.username, dbUser);
}
