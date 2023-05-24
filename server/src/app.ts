import express from 'express';
import morgan from 'morgan';
import helmet from 'helmet';
import cors from 'cors';
import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
// eslint-disable-next-line import/no-extraneous-dependencies
import pg from 'pg';

import * as middlewares from './middlewares.js';
import api from './api/index.js';

import * as dotenv from 'dotenv';
const dotenvResult = dotenv.config();
if (dotenvResult.error) {
  console.error('Missing configuration: Please copy .env.sample to .env and modify config');
  process.exit(1);
}

const app = express();

app.use(morgan('dev'));
app.use(helmet());
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());

const salt = process.env.PASSKEYPOC_COOKIESALT;
if (!salt) throw new Error('no cookiesalt in env');

const PGSession = connectPgSimple(session);
const pgpool = new pg.Pool({
  host: process.env.PASSKEYPOC_PGHOST,
  port: Number(process.env.PASSKEYPOC_PGPORT),
  user: process.env.PASSKEYPOC_PGUSER,
  password: process.env.PASSKEYPOC_PGPASSWORD,
  database: process.env.PASSKEYPOC_PGDATABASE,
});

app.use(session(
  {
    secret: salt,
    cookie: { maxAge: 60000 },
    resave: false,
    saveUninitialized: true,
    store: new PGSession({
      pool: pgpool,
      createTableIfMissing: true,
    }),
  }));

app.use('/api/v1', api);

app.use(middlewares.notFound);
app.use(middlewares.errorHandler);

export default app;
