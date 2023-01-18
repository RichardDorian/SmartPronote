export default function findLessonEndDate(school: string, endDate: Date): Date {
  const possibles = PossibleLessonEndDate[school];
  if (!possibles) return endDate;

  const lessonDay = new Date(endDate.getTime()); // Copy input date
  let closestDate = endDate;
  let differenceHolder = Number.MAX_SAFE_INTEGER;
  for (const possible of possibles) {
    const [hours, minutes] = possible.split(':').map((v) => parseInt(v));
    lessonDay.setHours(hours, minutes);

    const difference = Math.abs(endDate.getTime() - lessonDay.getTime());
    if (difference < differenceHolder) {
      differenceHolder = difference;
      closestDate = new Date(lessonDay.getTime());
    }
  }

  return closestDate;
}

export const PossibleLessonEndDate: {
  [school: string]: string[];
} = {
  'https://0370038r.index-education.net/pronote/': [
    '09:00',
    '10:00',
    '11:10',
    '12:05',
    '13:00',
    '13:50',
    '14:50',
    '15:50',
    '17:00',
    '17:55',
  ],
};
