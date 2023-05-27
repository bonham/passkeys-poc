import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import type { Session } from 'express-session';
import pg from 'pg';
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
} from '@simplewebauthn/server';
import type { UserModel, Authenticator } from './server.d.ts';

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


async function getUserAuthenticators(user: UserModel) {

  const query = {
    text: 'SELECT credentialID, credentialPublicKey, counter, credentialDeviceType, credentialBackedUp, transports FROM public.cred_authenticators where userid = $1',
    values: [user.id],
  };
  const res = await pgpool.query(query);
  const authenticators: Authenticator[] = res.rows;
  return authenticators;
}

// currently logged in user ( for registration )
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function getUserFromDB(userid: string) {
  const user: UserModel = {
    id: 'user1',
    username: 'Paul',
    currentChallenge: 'what',
  };
  return user;
}

router.get('/regoptions', async (req: RequestWithSession, res) => {

  // (Pseudocode) Retrieve the user from the database
  // after they've logged in
  // const user: UserModel = getUserFromDB(loggedInUserId);
  const user = await getUserFromDB('fake');

  // (Pseudocode) Retrieve any of the user's previously-
  // registered authenticators
  const userAuthenticators: Authenticator[] = await getUserAuthenticators(user);

  const options = generateRegistrationOptions({
    rpName,
    rpID,
    userID: user.id,
    userName: user.username,
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

// async function processRegistration(regParsed: RegistrationParsed) {
//   const credential = regParsed.credential;
//   console.log('Fullpayload:', regParsed);
//   console.log(`User ${regParsed.username} was registered`);
//   console.log(credential);

//   const id = credential.id;
//   const credJson = JSON.stringify(credential);
//   const sql = `INSERT INTO public.credentialkey(id, data) VALUES ('${id}', '${credJson}');`;
//   const dbresult = await pgpool.query(sql);
//   return dbresult;
// }

// async function getCredentials(credentialId: string) {
//   if (!credentialId) throw Error('credentialid is false');
//   const sql = `select data from public.credentialkey where id = '${credentialId}'`;
//   console.log('sql:', sql);
//   const res = await pgpool.query(sql);
//   if (res.rowCount > 1) throw Error('Row count is higher than 1');
//   if (res.rowCount === 0) return null;
//   const rawData = res.rows[0].data;
//   const credentials = JSON.parse(rawData) as {
//     id: string;
//     publicKey: string;
//     algorithm: 'RS256' | 'ES256';
//   };
//   return credentials;
// }

router.post('/register', async (req: RequestWithSession, res) => {
  //const user = await getUserFromDB('fake');
  const expectedChallenge = req.session.challenge;
  if (expectedChallenge === undefined) {
    console.log('Current user challenge is undefined');
    res.sendStatus(401);
    return;
  }

  const { body } = req;

  let verification;
  try {
    verification = await verifyRegistrationResponse({
      response: body,
      expectedChallenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
    });
  } catch (error) {
    console.error(error);
    return res.status(400).send({ error: (error as any).message }); // dirty
  }

  res.json(verification);
});

// router.post('/register', async (req: RequestWithSession, res) => {
//   const registration = req.body as RegistrationEncoded;
//   const session = (req.session as MySession);

//   // read and save challenge
//   const storedChallenge = session.challenge;

//   // invalidate challenge to avoid it is used twice
//   session.challenge = undefined;

//   if (storedChallenge === undefined) {
//     console.log('Stored challenge not defined - why?');
//     res.sendStatus(403);
//     res.end();
//   } else {

//     // verify registration
//     const expected = {
//       challenge: storedChallenge,
//       origin: 'http://localhost:5173',
//     };
//     let registrationParsed: RegistrationParsed;
//     try {
//       registrationParsed = await server.verifyRegistration(registration, expected);
//       await processRegistration(registrationParsed);
//     } catch (e) {
//       console.error('Registration failed:', e);
//       res.sendStatus(400);
//     }
//   }
//   res.send();    // echo the result back
// });


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

// router.get('/challenge', (req: RequestWithSession, res) => {

//   const session = (req.session as MySession);

//   // store challenge to session before returning
//   const challenge = crypto.randomUUID();
//   session.challenge = challenge;

//   res.setHeader('Content-Type', 'application/json');
//   res.send(JSON.stringify({ challenge }));
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
