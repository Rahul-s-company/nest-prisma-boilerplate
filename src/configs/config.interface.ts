export interface Config {
  nest: NestConfig;
  cors: CorsConfig;
  swagger: SwaggerConfig;
  security: SecurityConfig;
  app: AppConfig;
}

export interface NestConfig {
  port: number;
}

export interface CorsConfig {
  enabled: boolean;
}

export interface SwaggerConfig {
  enabled: boolean;
  title: string;
  description: string;
  version: string;
  path: string;
}

export interface GraphqlConfig {
  playgroundEnabled: boolean;
  debug: boolean;
  schemaDestination: string;
  sortSchema: boolean;
}

export interface SecurityConfig {
  expiresIn: number;
  refreshExpiresIn: number;
  bcryptSaltOrRound: string | number;
}

export type AppConfig = {
  awsRegion: string;
  awsBucket: string;
  awsLinkExp: string;
  awsSourceEmail: string;
  redisHost: string;
  redisPort: string;
  awsAccessKey: string;
  awsSecretKey: string;
  awsSessionToken: string;
  awsChimeAccountId: string;
  awsChimeAdminId: string;
};
