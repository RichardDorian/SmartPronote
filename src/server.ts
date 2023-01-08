import express, { NextFunction, Request, Response } from 'express';
import { join } from 'path';
import { Account, config } from './utils/config';
import { getUser, setUser } from './utils/database';
import { getEmail, getTokens } from './utils/google';
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

app.get(
  '/google',
  async (request: Request<{}, {}, {}, { code: string }>, response) => {
    const tokens = await getTokens(request.query.code);

    // @ts-ignore
    const email: string = (await getEmail(tokens.refresh_token)).data.email;

    const account = config.accounts.find((a) => a.google?.email === email);

    if (account) {
      const dbUser = getUser(account.username);
      dbUser.google.refreshToken = tokens.refresh_token;
      dbUser.google.pending = false;
      await setUser(account.username, dbUser);
    }

    response.sendFile(
      join(__dirname, '..', 'public', 'googleLoginSucess.html')
    );
  }
);

const port = parseInt(process.env.PORT ?? '5566');
app.listen(port, () => console.log(`Server running on port ${port}`));
