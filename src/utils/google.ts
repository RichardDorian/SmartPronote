import { OAuth2Client } from 'google-auth-library';
import { google, oauth2_v2 } from 'googleapis';
import { Account } from './config';
import { getUser, setUser } from './database';
import sendNotification from './ifttt';

const oAuth2Client = new google.auth.OAuth2({
  clientId: process.env.GOOGLE_API_CLIENT_ID,
  clientSecret: process.env.GOOGLE_API_CLIENT_SECRET,
  redirectUri: 'http://localhost:5566/google',
});

const SCOPES = [
  'https://www.googleapis.com/auth/tasks',
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/userinfo.email',
];

export async function getTokens(code: string) {
  return (await oAuth2Client.getToken(code)).tokens;
}

export async function askForLogin(account: Account) {
  const url = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    redirect_uri: process.env.GOOGLE_REDIRECT_URI,
    prompt: 'select_account',
  });

  const dbUser = getUser(account.username);
  dbUser.google.pending = true;
  await setUser(account.username, dbUser);

  // After one hour we reset the pending state
  // if the user still didn't login it'll
  // send another notification
  setTimeout(async () => {
    const dbUser = getUser(account.username);
    dbUser.google.pending = false;
    await setUser(account.username, dbUser);
  }, 60 * 60 * 1000);

  if (account.modules.iftttGrades) {
    await sendNotification(
      account.modules.iftttGrades.key,
      'Google login is required. Please click on this notification to open the login page',
      url
    );
  } else {
    console.warn(`Google login is required for ${account.username}`, url);
  }
}

export async function getEmail(
  refreshToken?: string,
  oAuth2Client?: OAuth2Client
): Promise<oauth2_v2.Schema$Userinfo | null> {
  if (!oAuth2Client) {
    oAuth2Client = new google.auth.OAuth2({
      clientId: process.env.GOOGLE_API_CLIENT_ID,
      clientSecret: process.env.GOOGLE_API_CLIENT_SECRET,
    });

    oAuth2Client.setCredentials({
      refresh_token: refreshToken,
    });
  }

  const oauth2 = google.oauth2({ version: 'v2', auth: oAuth2Client });
  return await oauth2.userinfo.get({}).catch((e) => null);
}

export async function getGoogleAPI<T extends keyof typeof google>(
  account: Account,
  api: T,
  // @ts-ignore
  options: Parameters<typeof google[T]>[0]
): // @ts-ignore
Promise<ReturnType<typeof google[T]>> {
  const oAuth2Client = new google.auth.OAuth2({
    clientId: process.env.GOOGLE_API_CLIENT_ID,
    clientSecret: process.env.GOOGLE_API_CLIENT_SECRET,
  });

  const dbUser = getUser(account.username);
  if (dbUser.google.pending || !dbUser.google.refreshToken) {
    if (!dbUser.google.pending) askForLogin(account);
    return null;
  }

  oAuth2Client.setCredentials({
    refresh_token: dbUser.google.refreshToken,
  });

  const email = await getEmail('', oAuth2Client);
  if (!email) {
    askForLogin(account);
    return null;
  }

  // @ts-ignore
  return google[api]({ ...options, auth: oAuth2Client });
}
