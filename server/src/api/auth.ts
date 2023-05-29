import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import type { Session } from 'express-session';
import pg from 'pg';
import { AutenticatorDb } from './lib/AuthenticatorDb.js';
import { makeRegisterRoute } from './lib/RegisterRoute.js';
import { makeRegistrationOptionsRoute } from './lib/RegistrationOptionsRoute.js';
import { makeAuthenticationOptionsRoute } from './lib/AuthenticationOptionsRoute.js';
import { makeAuthenticationRoute } from './lib/AuthenticationRoute.js';

import { MySession } from './authInterfaces.js';


// Human-readable title for your website
const rpName = 'elfu SimpleWebAuthn Example';
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
const registerRoute = makeRegisterRoute(origin, rpID, authdb);
router.use(registerRoute);
const registrationOptionsRoute = makeRegistrationOptionsRoute(rpName, rpID, authdb);
router.use(registrationOptionsRoute);
const authentiationOptionsRoute = makeAuthenticationOptionsRoute(authdb);
router.use(authentiationOptionsRoute);
const authenticationRoute = makeAuthenticationRoute(origin, rpID, authdb);
router.use(authenticationRoute);

// middleware to test if authenticated
function isAuthenticated(req: Request, res: Response, next: NextFunction) {
  if ('user' in req.session) next();
  else next('route');
}

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
