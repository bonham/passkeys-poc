import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import type { Session } from 'express-session';
import pg from 'pg';
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
} from '@simplewebauthn/server';
import { AutenticatorDb } from './lib/authenticatorDb.js';


import type { Authenticator } from './server.d.ts';
import type { AuthenticatorTransportFuture, RegistrationResponseJSON } from '@simplewebauthn/typescript-types';
import type { VerifiedRegistrationResponse } from '@simplewebauthn/server';

// Human-readable title for your website
const rpName = 'SimpleWebAuthn Example';
// A unique identifier for your website
const rpID = 'localhost';
// The URL at which registrations and authentications should occur
const origin = `http://${rpID}:5173`;

import * as dotenv from 'dotenv';
const dotenvResult = dotenv.config();
if (dotenvResult.error) {
  console.error('Missing configuration: Please copy .env.sample to .env and modify config');
  process.exit(1);
}

const pgpool = new pg.Pool({
  host: process.env.PASSKEYPOC_PGHOST,
  port: Number(process.env.PASSKEYPOC_PGPORT),
  user: process.env.PASSKEYPOC_PGUSER,
  password: process.env.PASSKEYPOC_PGPASSWORD,
  database: process.env.PASSKEYPOC_PGDATABASE,
});

const authdb = new AutenticatorDb(pgpool);

const router = express.Router();

interface MySession extends Session {
  user?: string,
  challenge?: string
}

interface RequestWithSession extends Request {
  session: MySession
}

// middleware to test if authenticated
function isAuthenticated(req: Request, res: Response, next: NextFunction) {
  if ('user' in req.session) next();
  else next('route');
}

// currently logged in user ( for registration )
// this must come from an authentiation pin or invite link
// userid act as nickname and should be speaking
// as we do not store anything else about the user on server side
async function getCurrrentUserId(): Promise<string> {
  return 'usernickname1';
}


router.get('/regoptions', async (req: RequestWithSession, res) => {

  // (Pseudocode) Retrieve the user from the database
  // after they've logged in
  // const user: UserModel = getUserFromDB(loggedInUserId);
  const userid = await getCurrrentUserId();
  req.session.user = userid;

  // (Pseudocode) Retrieve any of the user's previously-
  // registered authenticators
  const userAuthenticators: Authenticator[] = await authdb.getUserAuthenticators(userid);

  const options = generateRegistrationOptions({
    rpName,
    rpID,
    userID: userid,
    userName: userid, // we do not want personal identifiable information

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
  req.session.challenge = options.challenge;
  res.json(options);

});

router.post('/register', async (req: RequestWithSession, res) => {
  //const user = await getUserFromDB('fake');
  const expectedChallenge = req.session.challenge;
  if (expectedChallenge === undefined) {
    console.log('Current user challenge is undefined');
    return res.sendStatus(401);
  }
  const userid = req.session.user;
  if (userid === undefined) {
    console.log('Current user is undefined');
    return res.sendStatus(401);
  }
  const body: RegistrationResponseJSON = req.body;
  const transports: AuthenticatorTransportFuture[] = body.response.transports ?? [];

  let verification: VerifiedRegistrationResponse;
  try {
    verification = await verifyRegistrationResponse({
      response: body,
      expectedChallenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
    });
  } catch (error) {
    console.error(error);
    let message: string;
    if (error instanceof Error) {
      message = error.name + ' / ' + error.message;
    } else {
      message = String(error);
    }
    return res.status(401).send({ error: message });
  }

  if (verification.verified) {

    const { registrationInfo } = verification;
    if (registrationInfo === undefined) {
      console.log('registrationInfo is undefined');
      return res.sendStatus(401);
    }
    const { credentialPublicKey, credentialID, counter, credentialDeviceType, credentialBackedUp } = registrationInfo;

    const newAuthenticator: Authenticator = {
      credentialPublicKey,
      credentialID,
      counter,
      credentialDeviceType,
      credentialBackedUp,
      transports,
    };

    const saveSuccess = await authdb.saveAuthenticator(newAuthenticator, userid);
    if (saveSuccess) {

      // Success !!
      return res.json(verification);

    } else {
      console.log('Authenticator could not be saved');
      return res.sendStatus(401);
    }

  } else {
    console.error('Unexpected: Verification not verified, but no exception thrown before');
    return res.sendStatus(401);
  }
});

// router.post('/login', async (req: RequestWithSession, res: Response) => {
//   const session = (req.session as MySession);
//   const authentication = req.body as AuthenticationEncoded;
//   const credId = authentication.credentialId;
//   if (credId === undefined) {
//     res.status(400).send('Could not find credential id in payload');
//   }

//   const credentialKey = await getCredentials(credId);
//   if (credentialKey === null) {
//     console.log('Credentialkey not found in db');
//     res.sendStatus(401);
//     return; // satisfy ts
//   }
//   const storedChallenge = session.challenge;


//   if (storedChallenge === undefined) {
//     console.log('Stored challenge not defined - why?');
//     res.sendStatus(401);

//   } else {

//     const expected = {
//       challenge: storedChallenge,
//       origin: 'http://localhost:5173',
//       userVerified: true,
//       counter: 0,
//     };

//     try {
//       const authenticationParsed = await server.verifyAuthentication(authentication, credentialKey, expected);
//       console.log('Auth parsed:', authenticationParsed);
//       session.user = authenticationParsed.credentialId;
//       res.sendStatus(200);
//     } catch (e) {
//       console.error('Authentication failed:', e);
//       res.sendStatus(401);
//     }
//   }

// });

router.get('/check', (req: (Request & { session: Session }), res) => {
  const user = (req.session as MySession).user;
  if (user === undefined) {
    res.send('Not logged on');
  } else {
    res.send(`Logged on. User: ${user}`);
  }
});

router.get('/protected', isAuthenticated, (req, res) => {
  res.send('ok');
});

export default router;
