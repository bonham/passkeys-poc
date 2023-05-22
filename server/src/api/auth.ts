import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import type { Session } from 'express-session';
const router = express.Router();

type MySession = Session & { user: string | undefined };

// middleware to test if authenticated
function isAuthenticated(req: Request, res: Response, next: NextFunction) {
  if ('user' in req.session) next();
  else next('route');
}

router.post('/register', (req, res) => {
  console.log(req.body);
  res.send();    // echo the result back
});

router.get('/login', (req: Request & { session: Session }, res: Response) => {
  (req.session as MySession).user = 'Joe';
  res.send('ok');
});

router.get('/challenge', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  const uuid = crypto.randomUUID();
  res.send(JSON.stringify({ uuid }));
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
