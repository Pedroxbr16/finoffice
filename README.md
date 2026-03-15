# FinOffice

Painel financeiro com frontend estatico e backend serverless preparado para Vercel, usando `dotenv` e MongoDB Atlas.

## O que foi adicionado

- API em `api/` pronta para deploy na Vercel
- Conexao com MongoDB Atlas via `dotenv`
- CRUD de usuarios
- CRUD de lancamentos financeiros
- Categorias personalizadas por usuario
- Frontend conectado ao backend, sem `localStorage` como base principal
- Servidor local em `server.js` para desenvolver sem depender do CLI da Vercel

## Estrutura principal

- `index.html`: frontend do painel
- `api/users`: rotas de usuarios
- `api/transactions`: rotas de lancamentos
- `lib/`: conexao com banco, validacao e helpers
- `server.js`: servidor local

## Variaveis de ambiente

Copie `.env.example` para `.env` e preencha:

```env
MONGODB_URI=seu_mongo_atlas_uri
MONGODB_DB=finoffice
PORT=3000
```

## Como rodar localmente

1. Instale as dependencias:

```bash
npm install
```

2. Inicie o projeto:

```bash
npm run dev
```

3. Abra:

```text
http://localhost:3000
```

## Deploy na Vercel

1. Suba este projeto para um repositorio Git.
2. Importe o repositorio na Vercel.
3. Configure as variaveis `MONGODB_URI` e `MONGODB_DB` no painel da Vercel.
4. Faça o deploy.

A pasta `api/` sera usada como funcoes serverless automaticamente.

## Endpoints principais

### Usuarios

- `GET /api/users`
- `POST /api/users`
- `GET /api/users/:id`
- `PATCH /api/users/:id`
- `DELETE /api/users/:id`

### Lancamentos

- `GET /api/transactions?userId=...`
- `POST /api/transactions`
- `GET /api/transactions/:id`
- `PATCH /api/transactions/:id`
- `DELETE /api/transactions/:id`

### Healthcheck

- `GET /api/health`
