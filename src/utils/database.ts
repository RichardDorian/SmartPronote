import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const dbPath = join(__dirname, '..', '..', 'db.json');

interface Database {
  [user: string]: {
    google: {
      refreshToken?: string;
      pending: boolean;
    };
    grades: string[];
    homework: string[];
    timetable: string;
  };
}

let db: Database = {};

export async function loadDb() {
  db = JSON.parse(await readFile(dbPath, 'utf8'));
}

export function getUser(username: string): Database[0] {
  const user = db[username];

  return (
    user ?? {
      google: {
        pending: false,
      },
      grades: [],
      homework: [],
      timetable: '',
    }
  );
}

export async function setUser(user: string, data: Database[0]) {
  db[user] = data;
  await writeFile(dbPath, JSON.stringify(db, null, 2));
}
