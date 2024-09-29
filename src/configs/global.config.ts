import {
  API_PREFIX,
  JWT_EXPIRY_SECONDS,
  REFRESH_TOKEN_EXPIRY_SECONDS,
} from '../shared/constants/global.constants';

import { Config } from './config.interface';

export const GLOBAL_CONFIG: Config = {
  nest: {
    port: 3000,
  },
  cors: {
    enabled: true,
  },
  swagger: {
    enabled: true,
    title: 'Nest + Prisma',
    description: 'API Documents',
    version: 'v1',
    path: `${API_PREFIX}/docs`,
  },
  security: {
    expiresIn: JWT_EXPIRY_SECONDS, // 24h
    refreshExpiresIn: REFRESH_TOKEN_EXPIRY_SECONDS, // 7 days
    bcryptSaltOrRound: 10,
  },
  app: {
    awsRegion: process.env.AWS_REGION,
    awsSourceEmail: process.env.SOURCE_EMAIL,
    awsBucket: process.env.AWS_BUCKET,
    awsLinkExp: process.env.AWS_LINK_EXPIRES,
    redisHost: process.env.REDIS_HOST,
    redisPort: process.env.REDIS_PORT,
    awsAccessKey: process.env.AWS_ACCESS_KEY,
    awsSecretKey: process.env.AWS_SECRET_KEY,
    awsSessionToken: process.env.AWS_SESSION_TOKEN,
    awsChimeAccountId: process.env.AWS_CHIME_ACCOUNT_ID,
    awsChimeAdminId: process.env.AWS_CHIME_ADMIN_USER,
  },
};
