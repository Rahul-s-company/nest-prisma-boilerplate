import * as jsforce from 'jsforce';

export function createOAuth2Instance() {
  const oauth2 = new jsforce.OAuth2({
    clientId: process.env.SF_CONSUMER_KEY,
    clientSecret: process.env.SF_CONSUMER_SECRET,
    redirectUri: process.env.REDIRECT_URI,
  });

  return oauth2;
}
