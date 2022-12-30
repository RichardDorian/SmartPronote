import 'dotenv/config';

import * as _modules from './modules';
import { config } from './utils/config';
import { loadDb } from './utils/database';
import { getSession } from './utils/pronote';

if (process.env.PROD === 'true') {
  console.log('Production mode enabled');
}

import './server';

(async () => {
  await loadDb();

  const refreshAccounts = async () => {
    for (const account of config.accounts) {
      const session = await getSession(account);

      const modules = Object.keys(account.modules);

      for (const module of modules) {
        const fn = _modules[module];
        if (!fn) continue;

        try {
          await fn(account, session);
        } catch (error) {
          console.log(error);
        }
      }
    }
  };

  await refreshAccounts();

  setInterval(refreshAccounts, config.refreshEvery);
})();
