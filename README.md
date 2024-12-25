## Nest.js and prisma BoilerPlate

### Tech stack

[Nest](https://github.com/nestjs/nest) + [Prisma](https://github.com/prisma/prisma) + [TypeScript](https://github.com/microsoft/TypeScript)

### Api Docs (swagger)

api/v1/docs

## Installation

```bash
$ npm install
```

## Running the app

```bash
# development
$ npm run start

# watch mode
$ npm run dev

# production mode
$ npm run prod

```

## Test

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

## Prisma (ORM)

```bash
# IDE for your database
$ npx prisma studio

# run migrations (apply schema changes)
$ npx prisma migrate dev

# run migrations on CI/CD
$ npx prisma migrate deploy

# apply db schema changes to the prisma client
$ npx prisma generate

# run seeding (apply schema data changes)
$ npm run prisma:seed
```

## Auth

This implementation uses `httpOnly` (server-side) cookie-based authentication. [Read more](https://dev.to/guillerbr/authentication-cookies-http-http-only-jwt-reactjs-context-api-and-node-on-backend-industry-structure-3f8e)

That means that the `JWT Token` is never stored on the client.
Usually it was stored in `localStorage` / `sesionStorage` / `cookies` (browser), but this is not secure.

Storing the token on a server side cookie is more secure, but it requires a small adjustment on frontend HTTP requests in order to work.

Frontend adjustments

- If you're using `axios` then you need to set: `withCredentials: true`. [Read more](https://flaviocopes.com/axios-credentials/)
- If you're using `fetch` then you need to set: `credentials: 'include'`. [Read more](https://github.com/github/fetch#sending-cookies)

## Branches

Additional branches are provided for development teams to work independently without impacting one another, currently:

- `dev`, deploying to dev server. 
- `main`, deploying to uat server.

These should be treated as the development main branch by the respective teams and integrated back into `main` in readiness for release to UAT and in alignment with the release cycle.

## features

- Rate Limiter
- SES Mail Service
- Cron service
- Redis
- Auth Module
- AWS SDK (v3)
- RBAC (permission)
- EsLint
- husky

## TO-DO

- Add Social Media Auth
