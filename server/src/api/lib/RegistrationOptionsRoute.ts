import { Router } from 'express';
import { getRegistrationUserId } from './getRegistrationUserid.js';
import { AutenticatorDb } from './AuthenticatorDb.js';

import type { Authenticator } from '../server.js';

import { generateRegistrationOptions } from '@simplewebauthn/server';

const router = Router();

export function makeRegistrationOptionsRoute(rpName: string, rpID: string, authdb: AutenticatorDb) {

  router.get('/regoptions', async (req, res) => {

    let myreq: any;

    if ('session' in req) {
      myreq = req as (typeof req & {});
    } else {
      console.error('Request does not contain session');
      res.sendStatus(500);
      return;
    }


    // (Pseudocode) Retrieve the user from the database
    // after they've logged in
    // const user: UserModel = getUserFromDB(loggedInUserId);
    const registrationuser = await getRegistrationUserId();
    myreq.session.reguser = registrationuser;

    // (Pseudocode) Retrieve any of the user's previously-
    // registered authenticators
    const userAuthenticators: Authenticator[] = await authdb.getUserAuthenticators(registrationuser);

    try {
      const options = generateRegistrationOptions({
        rpName,
        rpID,
        userID: registrationuser,
        userName: registrationuser, // we do not want personal identifiable information

        // Don't prompt users for additional information about the authenticator
        // (Recommended for smoother UX)
        attestationType: 'none',
        // Prevent users from re-registering existing authenticators
        excludeCredentials: userAuthenticators.map(authenticator => ({
          id: authenticator.credentialID,
          type: 'public-key',
          // Optional
          transports: authenticator.transports,
        })),
      });

      // (Pseudocode) Remember the challenge for this user
      myreq.session.challenge = options.challenge;
      res.json(options);

    } catch (error) {
      console.error('Error in generating authentication options', error);
      res.sendStatus(500);
      return;

    }
  });


  return router;
}