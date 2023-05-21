import express from 'express';

const router = express.Router();

router.post('/register', (req, res) => {
  console.log(req.body);
  res.send();    // echo the result back
});

router.get('/challenge', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  const uuid = crypto.randomUUID();
  res.send(JSON.stringify({ uuid }));
});

export default router;
