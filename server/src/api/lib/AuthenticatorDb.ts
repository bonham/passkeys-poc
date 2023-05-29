
import type { Pool, QueryConfig } from 'pg';
import type { Authenticator } from '../server.d.ts';

export class AutenticatorDb {

  pgpool: Pool;

  constructor(pgpool: Pool) {
    this.pgpool = pgpool;
  }

  authenticatorFromRows(rows: any[]): Authenticator[] {

    const authenticators: Authenticator[] = rows.map(row => {
      const credIDEncoded: string = row.credentialid;
      if ((credIDEncoded === undefined) || credIDEncoded.length == 0) throw new Error('Credential Id undefined');
      const credBuffer = Buffer.from(credIDEncoded, 'base64url');
      const transportsArray = JSON.parse(row.transports);

      let a: Authenticator;
      a = {
        credentialID: credBuffer,
        credentialPublicKey: row.credentialpublickey,
        counter: row.counter,
        credentialDeviceType: row.credentialdevicetype,
        credentialBackedUp: row.credentialbackedup,
        transports: transportsArray,
      };
      for (const [key, value] of Object.entries(a)) {
        let ok = true;

        if (value === undefined) {
          ok = false;
          console.error(`Prop ${key} is undefined`);
        }
        if (!ok) throw new Error('Authenticator has missing values. See error log');
      }
      return a;
    });
    return authenticators;
  }

  async getUserAuthenticators(user: string) {

    const query: QueryConfig = {
      text: 'SELECT credentialID, credentialPublicKey, counter, credentialDeviceType, credentialBackedUp, transports FROM public.cred_authenticators where userid = $1',
      values: [user],
    };
    const res = await this.pgpool.query(query);
    return this.authenticatorFromRows(res.rows);

  }

  async getAuthenticatorsById(authenticatorId: string) {
    const query: QueryConfig = {
      text: 'SELECT credentialID, credentialPublicKey, counter, credentialDeviceType, credentialBackedUp, transports FROM public.cred_authenticators where credentialID = $1',
      values: [authenticatorId],
    };
    const res = await this.pgpool.query(query);
    return this.authenticatorFromRows(res.rows);
  }

  async saveAuthenticator(auth: Authenticator, userid: string) {

    const credIdBuf = Buffer.from(auth.credentialID);
    const credIdEncoded = credIdBuf.toString('base64url');
    const transportsEncoded = JSON.stringify(auth.transports);

    const query: QueryConfig = {
      text: 'INSERT INTO public.cred_authenticators' +
        '(credentialid, credentialpublickey, counter, credentialdevicetype, credentialbackedup, transports, userid, creationdate) ' +
        'VALUES ($1, $2, $3, $4, $5, $6, $7, $8);',
      values: [
        credIdEncoded, auth.credentialPublicKey, auth.counter, auth.credentialDeviceType,
        auth.credentialBackedUp, transportsEncoded, userid, new Date().toUTCString(),
      ],
    };
    try {
      const r = await this.pgpool.query(query);
      if (r.rowCount != 1) {
        console.error(`Expected rowcount is not 1 but ${r.rowCount}`);
        return false;
      }

    } catch (error) {
      console.error('Could not save authenticator', error);
      return false;
    }
    return true;
  }
}