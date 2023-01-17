import { createHash } from 'node:crypto';
import { Grade, Homework } from '../types';

export function hashHomework(homework: Omit<Homework, 'hash'>) {
  return createHash('md5')
    .update(homework.content + homework.subject + homework.due.toString())
    .digest('hex');
}

export function hashGrade(grade: Omit<Grade, 'hash'>) {
  return createHash('md5')
    .update(
      // Not including best, worst and average
      // because those can be changed after the grade
      // is published but it's the same grade. However
      // if the student's grade changes it'll be considered
      // as a brand new grade.
      grade.value.toString() +
        grade.scale.toString() +
        grade.subject +
        grade.coefficient.toString() +
        grade.comment
    )
    .digest('hex');
}
