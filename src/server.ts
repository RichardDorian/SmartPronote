import express, { NextFunction, Request, Response } from 'express';
import { Account, config } from './utils/config';
import {
  getAverages,
  getGrades,
  getHomeworks,
  getSession,
} from './utils/pronote';

const app = express();

function auth(request: Request, response: Response, next: NextFunction) {
  const username = request.header('X-Username');
  const password = request.header('X-Password');

  if (!username || !password) return response.sendStatus(401);

  const account = config.accounts.find((a) => a.username === username);
  if (!account || password !== account.password)
    return response.sendStatus(401);

  // @ts-ignore
  request.account = account;

  next();
}

app.get('/', (req, res) => res.sendStatus(200));

app.get('/pronote', auth, async (request, response) => {
  // @ts-ignore
  const account: Account = request.account;
  const session = await getSession(account);

  response.status(200).send({
    averages: await getAverages(account.username, session),
    grades: await getGrades(account.username, session),
    homeworks: await getHomeworks(account.username, session),
  });
});

const port = parseInt(process.env.PORT ?? '5566');
app.listen(port, () => console.log(`Server running on port ${port}`));
