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
- **Monitoring:** Elasticsearch + Kibana
- **Logging:** Pino (performance optimized)
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
│   ├── monitoring/      # Elasticsearch, Pino logger, ILM
│   ├── middlewares/     # Auth, validation, error handling, logging
│   └── routes/          # Rotas Express
│
└── server.ts            # Arquivo de entrada
```

## 🚀 Como Executar:

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
npm run setup:ilm    # Configura ILM no Elasticsearch (retenção 7 dias)
```

## 📊 Monitoramento

### Elasticsearch + Kibana

Este projeto utiliza **Pino** (logger de alta performance) com Elasticsearch para monitoramento completo: 

**Características:**
- ⚡ **Performance:** ~2-5% overhead (Pino é 10x mais rápido que Winston)
- 📈 **Logs estruturados:** JSON nativo para fácil query
- 🔍 **Rastreamento:** TraceId único em cada request
- 🗑️ **Retenção automática:** Logs deletados após 7 dias (ILM)

**O que é logado:**
- ✅ HTTP requests/responses (método, URL, status, duração)
- ✅ Operações S3 (upload, delete, presigned URLs)
- ✅ Mensagens RabbitMQ (publish/consume)
- ✅ Queries PostgreSQL (Prisma middleware)
- ✅ Operações Redis (cache hit/miss)
- ✅ Erros completos (stack trace, context)

**Acessar Kibana:**
```
http://localhost:5601
```

**Setup inicial do ILM (Index Lifecycle Management):**
```bash
# Executar após subir Elasticsearch
npm run setup:ilm
```

**Queries úteis no Kibana:**

```
# Todos os requests HTTP
type: "http.request"

# Erros apenas
level: "error"

# Cache misses
type: "cache.redis" AND hit: false

# Requests lentos (> 1 segundo)
duration > 1000 AND type: "http.response"

# Requests de um cliente específico
clientId: "uuid-do-cliente"

# Rastrear request completo por traceId
traceId: "uuid-do-trace"
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
