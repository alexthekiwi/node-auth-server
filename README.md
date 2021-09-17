# Node Auth Server

## Description
An Express server with Typescript and Prisma (ORM) that uses JWT to authenticate users and issue/manage tokens.

## Installation
```
cp .env.example .env
```

```
npm install
```

Create your database, then run..
```
npx prisma db push
```

Lastly, for a dev environment:
```
npm run dev
```

## Production
```
npm run build
```

```
npm run serve
```
TODO: Need some info here about db migrations in production.
