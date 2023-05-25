import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import type { Session } from 'express-session';
import { server } from '@passwordless-id/webauthn';
import { RegistrationParsed } from '@passwordless-id/webauthn/dist/esm/types.js';
import pg from 'pg';

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

// import type { RegistrationParsed } from '@passwordless-id/webauthn/dist/esm/types';

const router = express.Router();

type RequestWithSession = Request & { session: Session };
type MySession = Session & { user: string | undefined, challenge: string | undefined };

// middleware to test if authenticated
function isAuthenticated(req: Request, res: Response, next: NextFunction) {
  if ('user' in req.session) next();
  else next('route');
}

async function processRegistration(regParsed: RegistrationParsed) {
  const credential = regParsed.credential;
  console.log(`User ${regParsed.username} was registered`);
  console.log(credential);

  const id = credential.id;
  const credJson = JSON.stringify(credential);
  const sql = `INSERT INTO public.credentialkey(id, data) VALUES ('${id}', '${credJson}');`;
  const dbresult = await pgpool.query(sql);
  return dbresult;
}

router.post('/register', async (req: RequestWithSession, res) => {
  const registration = req.body;
  const session = (req.session as MySession);

  // read and save challenge
  const storedChallenge = session.challenge;

  // invalidate challenge to avoid it is used twice
  session.challenge = undefined;

  if (storedChallenge === undefined) {
    console.log('Stored challenge not defined - why?');
    res.sendStatus(403);
    res.end();
  } else {

    // verify registration
    const expected = {
      challenge: storedChallenge,
      origin: 'http://localhost:5173',
    };
    let registrationParsed: RegistrationParsed;
    try {
      registrationParsed = await server.verifyRegistration(registration, expected);
      await processRegistration(registrationParsed);
    } catch (e) {
      console.error('Registration failed:', e);
      res.sendStatus(400);
    }
  }
  res.send();    // echo the result back
});


router.get('/login', (req: RequestWithSession, res: Response) => {
  (req.session as MySession).user = 'Joe';
  res.send('ok');
});

router.get('/challenge', (req: RequestWithSession, res) => {

  const session = (req.session as MySession);

  // store challenge to session before returning
  const challenge = crypto.randomUUID();
  session.challenge = challenge;

  res.setHeader('Content-Type', 'application/json');
  res.send(JSON.stringify({ challenge }));
});

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
