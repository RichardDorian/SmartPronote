import { PronoteStudentSession } from 'pronote-api-maintained';
import { Account } from '../utils/config';
import { getUser, setUser } from '../utils/database';
import { getGoogleAPI } from '../utils/google';
import { SubjectNames } from '../utils/locale';
import { getHomeworks } from '../utils/pronote';

export async function googleTasks(
  account: Account,
  session: PronoteStudentSession
) {
  const homeworks = await getHomeworks(account.username, session);

  const dbUser = getUser(account.username);

  const tasks = await getGoogleAPI(account, 'tasks', { version: 'v1' });
  if (!tasks) return;

  for (const homework of homeworks) {
    if (dbUser.homework.includes(homework.hash)) continue;
    dbUser.homework.push(homework.hash);

    await tasks.tasks.insert({
      tasklist: account.modules.googleTasks.taskListId,
      requestBody: {
        due: homework.due.toISOString(),
        title: SubjectNames[homework.subject] ?? homework.subject,
        notes: homework.content,
      },
    });
  }

  await setUser(account.username, dbUser);
}
