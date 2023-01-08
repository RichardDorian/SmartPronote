import fetch from 'node-fetch';

export default async function sendNotification(
  key: string,
  message: string,
  url?: string
) {
  await fetch(`https://maker.ifttt.com/trigger/SmartPronote/with/key/${key}`, {
    method: 'POST',
    body: JSON.stringify({
      value1: message,
      value2: url,
    }),
    headers: {
      'Content-Type': 'application/json',
    },
  });
}
