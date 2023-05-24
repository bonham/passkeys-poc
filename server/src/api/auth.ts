import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import type { Session } from 'express-session';
import { server } from '@passwordless-id/webauthn';
// import type { RegistrationParsed } from '@passwordless-id/webauthn/dist/esm/types';

const router = express.Router();

type RequestWithSession = Request & { session: Session };
type MySession = Session & { user: string | undefined, challenge: string | undefined };

// middleware to test if authenticated
function isAuthenticated(req: Request, res: Response, next: NextFunction) {
  if ('user' in req.session) next();
  else next('route');
}

function processRegistration(regParsed: any) {
  const credential = regParsed.credential;
  console.log(`User ${regParsed.username} was registered`);
  console.log(credential);
}

router.post('/register', async (req: RequestWithSession, res) => {
  const registration = req.body;
  const session = (req.session as MySession);

  // read and save challenge
  const storedChallenge = session.challenge;

  // invalidate challenge to avoid it is used twice
  session.challenge = undefined;

  if (storedChallenge === undefined) {
    res.sendStatus(403);
    res.end();
  } else {

    // verify registration
    const expected = {
      challenge: storedChallenge,
      origin: 'http://localhost:5173',
    };
    try {
      const registrationParsed = await server.verifyRegistration(registration, expected);
      processRegistration(registrationParsed);
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
