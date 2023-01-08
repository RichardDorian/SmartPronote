import { createHash } from 'node:crypto';
import { PronoteStudentSession } from 'pronote-api-maintained';
import { Account } from '../utils/config';
import { getUser, setUser } from '../utils/database';
import { getGoogleAPI } from '../utils/google';
import { GCalendarColors } from '../utils/locale';
import { getTimetable } from '../utils/pronote';

export async function googleCalendar(
  account: Account,
  session: PronoteStudentSession
) {
  const calendarId = account.modules.googleCalendar.calendarId ?? 'primary';

  const timetable = await getTimetable(account.username, session);
  const timetableHash = createHash('md5')
    .update(JSON.stringify(timetable))
    .digest('hex');

  const dbUser = getUser(account.username);
  if (timetableHash === dbUser.timetable) return;

  const calendar = await getGoogleAPI(account, 'calendar', {
    version: 'v3',
  });
  if (!calendar) return;

  // Clear last week + current week
  const weekMs = 7 * 24 * 3600 * 1000;
  const currentMonday = new Date();
  currentMonday.setDate(currentMonday.getDate() - currentMonday.getDay() + 1);
  currentMonday.setHours(7, 0, 0, 0);

  const listData = {
    calendarId,
    timeMin: new Date(currentMonday.getTime() - weekMs),
    timeMax: new Date(currentMonday.getTime() + weekMs),
  };

  // @ts-ignore
  let listResponse = (await calendar.events.list(listData)) as any;

  while (listResponse.data.nextPageToken) {
    // @ts-ignore
    const response = (await calendar.events.list({
      ...listData,
      pageToken: listResponse.data.nextPageToken,
    })) as any;

    listResponse.data.nextPageToken = response.data.nextPageToken;
    listResponse.data.items = [
      ...listResponse.data.items,
      ...response.data.items,
    ];
  }

  // @ts-ignore
  const existing: string[] = listResponse.data.items
    .filter(
      (v) =>
        v.description.endsWith('PronoteToGCalendar') || // Legacy purposes
        v.description.endsWith('SmartPronote')
    )
    .map((v) => v.id);

  for (const event of existing) {
    await calendar.events.delete({
      calendarId,
      eventId: event,
    });
  }

  for (const lesson of timetable) {
    if (lesson.absent || lesson.cancelled) continue;

    await calendar.events.insert({
      // @ts-ignore Library probably not typed correctly because this works
      calendarId,
      requestBody: {
        summary: lesson.subject,
        description: lesson.teacher + '\nSmartPronote',
        location: lesson.room,
        colorId: GCalendarColors[lesson.subject] ?? '1',
        start: {
          dateTime: lesson.from,
          timeZone: 'Europe/Paris',
        },
        end: {
          dateTime: lesson.to,
          timeZone: 'Europe/Paris',
        },
      },
    });
  }

  dbUser.timetable = timetableHash;
  await setUser(account.username, dbUser);
}
