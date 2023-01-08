import { createHash } from 'node:crypto';
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
    const hash = createHash('md5')
      .update(homework.content + homework.subject + homework.due.toString())
      .digest('hex');
    if (dbUser.homework.includes(hash)) continue;
    dbUser.homework.push(hash);

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
