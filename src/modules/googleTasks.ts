import { google } from 'googleapis';
import { createHash } from 'node:crypto';
import { PronoteStudentSession } from 'pronote-api-maintained';
import { Account } from '../utils/config';
import { getUser, setUser } from '../utils/database';
import { SubjectNames } from '../utils/locale';
import { getHomeworks } from '../utils/pronote';

export async function googleTasks(
  account: Account,
  session: PronoteStudentSession
) {
  const homeworks = await getHomeworks(account.username, session);

  const dbUser = getUser(account.username);

  const oAuth2Client = new google.auth.OAuth2({
    clientId: process.env.GOOGLE_API_CLIENT_ID,
    clientSecret: process.env.GOOGLE_API_CLIENT_SECRET,
  });
  oAuth2Client.setCredentials({
    refresh_token: account.modules.googleTasks.refreshToken,
  });

  const tasks = google.tasks({ version: 'v1', auth: oAuth2Client });

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
