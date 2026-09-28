
### 1. Backend

```bash
cd backend
cp .env.example .env          # JWT_SECRET (mínimo 32 caracteres)
npm install
npx prisma migrate dev --name init
npm run db:seed               
npm run dev                   
```

### 2. Frontend

```bash
cd frontend
npm install
npm run dev                 
```

### Usuários criados pelo seed

| Perfil  | E-mail                   | Senha        |
|---------|--------------------------|--------------|
| ADMIN   | `admin@fintechflow.com`  | `Admin@12345`|
| USER    | `demo@fintechflow.com`   | `Demo@12345` |

> Troque a senha do admin (`ADMIN_PASSWORD` no `.env`) antes de qualquer uso fora de estudo.
