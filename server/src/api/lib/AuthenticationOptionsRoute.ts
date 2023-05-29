import { Router } from 'express';
import type { Request } from 'express-serve-static-core';
import { AutenticatorDb } from './AuthenticatorDb.js';
import type { Authenticator } from '../server.js';

import { generateAuthenticationOptions } from '@simplewebauthn/server';

const router = Router();

export function makeAuthenticationOptionsRoute(authdb: AutenticatorDb) {

  // call this route with /authoptions?authuser=myuserid
  router.get('/authoptions', async (req: Request, res) => {

    const authuser = req.params.authuser as string;
    const userAuthenticators: Authenticator[] = await authdb.getUserAuthenticators(authuser);

    try {
      const options = generateAuthenticationOptions({
        // Require users to use a previously-registered authenticator
        allowCredentials: userAuthenticators.map(authenticator => ({
          id: authenticator.credentialID,
          type: 'public-key',
          // Optional
          transports: authenticator.transports,
        })),
        userVerification: 'preferred',
      });

      (req.session as any).challenge = options.challenge;
      (req.session as any).authuser = authuser;

      res.json(options);

    } catch (error) {
      console.error('Error in generating authentication options', error);
      res.sendStatus(500);
      return;
    }

  });
  return router;
}