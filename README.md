# API de Processamento de Vídeos - FIAP 11SOAT

API REST para upload, processamento e extração de frames de vídeos utilizando arquitetura limpa e microserviços.

## 🎯 Visão Geral

Sistema de processamento de vídeos com extração de frames, composto por 4 serviços:
- **Auth Service** - Autenticação JWT
- **Worker Service** - Processamento de vídeos com FFmpeg
- **API Service** - **ESTE PROJETO** - Orquestração e gerenciamento
- **Infra** - Kubernetes e infraestrutura

## 🛠️ Stack Tecnológica

- **Runtime:** Node.js >= 18
- **Framework:** Express 5.2.1
- **Linguagem:** TypeScript 5.9.3
- **Banco de Dados:** PostgreSQL (via Prisma)
- **Cache:** Redis
- **Fila:** RabbitMQ
- **Storage:** AWS S3
- **DI Container:** TSyringe
- **Validação:** class-validator

## 📁 Estrutura do Projeto

```
src/
├── domain/              # Camada de domínio (entidades, DTOs, interfaces)
│   ├── entities/        # Entidades de negócio
│   ├── dtos/            # Data Transfer Objects
│   ├── models/          # Models do Prisma
│   ├── factories/       # Factory patterns
│   └── repositories/    # Interfaces de repositórios
│
├── application/         # Camada de aplicação (use cases, serviços)
│   ├── use-cases/       # Casos de uso
│   └── services/        # Serviços de lógica de negócio
│
├── infrastructure/      # Camada de infraestrutura (implementações)
│   ├── config/          # Configurações (env, DI, app)
│   ├── controllers/     # Controllers HTTP
│   ├── database/        # Prisma e repositories
│   ├── storage/         # Cliente S3
│   ├── queue/           # RabbitMQ
│   ├── cache/           # Redis
│   ├── middlewares/     # Auth, validation, error handling
│   └── routes/          # Rotas Express
│
└── server.ts            # Arquivo de entrada
```

## 🚀 Como Executar

### 1. Clonar o repositório

```bash
git clone <repo-url>
cd api_fiapX_11soat
```

### 2. Instalar dependências

```bash
npm install
```

### 3. Configurar variáveis de ambiente

```bash
cp .env.example .env
# Edite o arquivo .env com suas configurações
```

### 4. Executar em desenvolvimento

```bash
npm run dev
```

### 5. Compilar para produção

```bash
npm run build
npm start
```

## 📝 Scripts Disponíveis

```bash
npm run dev          # Executa em modo desenvolvimento (hot reload)
npm run build        # Compila TypeScript para JavaScript
npm start            # Executa versão compilada
npm run lint         # Verifica código com ESLint
npm run lint:fix     # Corrige automaticamente problemas do ESLint
npm run format       # Formata código com Prettier
```

## 🔌 Endpoints da API

### Health Check
```
GET /health
```

### Base
```
GET /
```

> **Nota:** Endpoints de vídeos serão implementados nas próximas etapas.

## 🏗️ Próximos Passos

- [ ] Configurar Prisma e PostgreSQL
- [ ] Implementar domínio (entidades e DTOs)
- [ ] Criar use cases principais
- [ ] Implementar integrações (S3, RabbitMQ, Redis)
- [ ] Criar endpoints de vídeos
- [ ] Implementar middleware de autenticação
- [ ] Adicionar testes

## 📚 Repositórios Relacionados

- **Auth:** https://github.com/Vineco77/auth_fiapX_11soat
- **Worker:** https://github.com/Luckmenez/worker_fiapX_11soat

## 📄 Licença

ISC

---

**🚀 FIAP 11SOAT - Hackathon 2026**
