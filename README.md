# CRM Application

> **Portfolio Project:** This is a portfolio demonstration showcasing full-stack development skills across web, mobile, and backend. Not intended for production use.

<details open>
<summary>🇺🇸 English (en-US)</summary>

## Overview

A full-stack Customer Relationship Management (CRM) application built as an npm workspaces monorepo with a NestJS backend API, Vue 3 web frontend, React Native mobile app, and shared TypeScript packages.

## Tech Stack

### Backend (`apps/api`)

- **Framework:** NestJS 11 with TypeScript
- **Database:** MongoDB 7.0 via TypeORM
- **Cache:** Redis 7 (ioredis)
- **Auth:** JWT + bcrypt + TOTP 2FA (otplib) + OAuth SSO (Google, GitHub, Microsoft)
- **Architecture:** Hexagonal / Ports & Adapters
- **Testing:** Jest 30 (44 suites, 526 tests)

### Frontend (`apps/web`)

- **Framework:** Vue 3.5 with Composition API
- **Build Tool:** Vite 7
- **State:** Pinia 3
- **Styling:** Tailwind CSS 4
- **Testing:** Vitest 4 (45 suites, 245 tests), Cypress 15 (E2E)

### Mobile (`apps/mobile`)

- **Framework:** React Native 0.83 + React 19
- **Navigation:** React Navigation 7
- **Storage:** MMKV
- **Testing:** Jest 29, Detox 20 (E2E)

### Shared Packages

- **`@corp/contracts`:** TypeScript interfaces shared across apps
- **`@corp/foundations`:** Utility library (DeepFreeze, DeepSeal, CompatibilityValidator)

## Features

- **Project Management:** Create, track, and manage projects with statuses, deadlines, milestones, and tags
- **Task Tracking:** Kanban-style task management with priorities, assignees, and subtasks
- **Client Management:** Client profiles, analytics, engagement scoring, CRM timeline
- **Lead Pipeline:** Sales funnel with lead stages, CTA suggestions, and campaign tracking
- **Bulk Import (CSV/JSON/XML/PDF):** Import clients, tasks, leads, and projects via drag-and-drop import wizard with field mapping and template profiles
- **Authentication:** JWT + bcrypt with TOTP 2FA, recovery codes, and OAuth SSO (Google/GitHub/Microsoft)
- **RBAC:** Fine-grained role-based access control with permissions catalog
- **Admin Panel:** User management, audit logs, mail outbox
- **Integrations:** GLPI, SAT ERP, Nextcloud, Zimbra, Outlook, WhatsApp, OpenAI
- **AI Assistant:** Chat widget with WebSocket + LLM integration
- **Dark Mode:** Full dark mode support across web and mobile
- **Reports:** Dashboard analytics with charts, export, and metric breakdowns

## Quick Start

### Prerequisites

- Node.js 20+
- Docker & Docker Compose

### One-Command Start (Docker)

```bash
chmod +x start.sh
./start.sh
```

This starts MongoDB, Redis, API, and Web containers with health-check polling.

### Manual Start

```bash
npm install

# Start infrastructure
docker-compose up -d mongodb redis

# API (terminal 1)
cd apps/api && npm run start:dev

# Web (terminal 2)
cd apps/web && npm run dev
```

### Access

- **Web:** http://localhost:5173
- **API:** http://localhost:3000
- **MongoDB:** mongodb://localhost:27017
- **Redis:** localhost:6379

## Project Structure

```
crm/
├── apps/
│   ├── api/          # NestJS 11 backend
│   ├── web/          # Vue 3 + Vite 7 frontend
│   └── mobile/       # React Native 0.83 mobile app
├── packages/
│   ├── contracts/    # Shared TypeScript interfaces
│   └── foundations/  # Shared utility library
├── docker-compose.yml
├── start.sh          # Docker orchestration script
└── netlify.toml      # Web deployment config
```

## Testing

```bash
# API tests
cd apps/api && npx jest

# Web tests
cd apps/web && npx vitest run

# Shared package tests (from root)
npx jest --config jest.config.js
```

## License

MIT

</details>

---

<details>
<summary>🇧🇷 Português (pt-BR)</summary>

## Visão Geral

Aplicação completa de Gestão de Relacionamento com o Cliente (CRM) construída como monorepo npm workspaces: API NestJS, frontend Vue 3, app mobile React Native e pacotes TypeScript compartilhados.

## Stack Tecnológica

### Backend (`apps/api`)

- **Framework:** NestJS 11 com TypeScript
- **Banco de Dados:** MongoDB 7.0 via TypeORM
- **Cache:** Redis 7 (ioredis)
- **Autenticação:** JWT + bcrypt + 2FA TOTP (otplib) + OAuth SSO (Google, GitHub, Microsoft)
- **Testes:** Jest 30 (44 suites, 526 testes)

### Frontend (`apps/web`)

- **Framework:** Vue 3.5 com Composition API
- **Build:** Vite 7
- **Estado:** Pinia 3
- **Estilização:** Tailwind CSS 4
- **Testes:** Vitest 4 (45 suites, 245 testes), Cypress 15 (E2E)

### Mobile (`apps/mobile`)

- **Framework:** React Native 0.83 + React 19
- **Navegação:** React Navigation 7
- **Armazenamento:** MMKV
- **Testes:** Jest 29, Detox 20 (E2E)

## Funcionalidades

- **Gestão de Projetos:** Projetos com status, prazos, marcos e tags
- **Rastreamento de Tarefas:** Kanban com prioridades, responsáveis e subtarefas
- **Gestão de Clientes:** Perfis, analytics, scoring de engajamento
- **Pipeline de Leads:** Funil com estágios, sugestões de CTA e rastreamento
- **Importação em Massa (CSV/JSON/XML/PDF):** Wizard com mapeamento de campos e templates
- **Autenticação:** JWT + 2FA TOTP + códigos de recuperação + OAuth SSO
- **RBAC:** Controle de acesso granular baseado em funções
- **Integrações:** GLPI, SAT ERP, Nextcloud, Zimbra, Outlook, WhatsApp, OpenAI
- **Assistente IA:** Chat com WebSocket + LLM
- **Modo Escuro:** Suporte completo em web e mobile

## Início Rápido

```bash
npm install
chmod +x start.sh && ./start.sh
```

## Licença

MIT

</details>

---

<details>
<summary>🇪🇸 Español (es-ES)</summary>

## Descripción General

Aplicación completa de CRM como monorepo npm workspaces: API NestJS 11, frontend Vue 3 + Vite 7, app móvil React Native 0.83 y paquetes TypeScript compartidos.

## Stack Tecnológico

- **Backend:** NestJS 11, MongoDB 7.0, Redis 7, JWT + 2FA + OAuth SSO
- **Frontend:** Vue 3.5, Vite 7, Pinia 3, Tailwind CSS 4
- **Mobile:** React Native 0.83, React 19, MMKV, React Navigation 7
- **Tests:** Jest 30 (526), Vitest 4 (245), Cypress 15, Detox 20

## Características

- Gestión de proyectos, tareas Kanban, clientes, pipeline de leads
- Importación masiva (CSV/JSON/XML/PDF) con mapeo de campos
- 2FA TOTP + OAuth SSO (Google/GitHub/Microsoft)
- RBAC, panel de administración, integraciones (GLPI, WhatsApp, OpenAI)
- Asistente IA con WebSocket + LLM, modo oscuro completo

## Inicio Rápido

```bash
npm install && chmod +x start.sh && ./start.sh
```

## Licencia

MIT

</details>

---

<details>
<summary>🇮🇹 Italiano (it)</summary>

## Panoramica

Applicazione CRM full-stack come monorepo npm workspaces: API NestJS 11, frontend Vue 3 + Vite 7, app mobile React Native 0.83.

## Stack Tecnologico

- **Backend:** NestJS 11, MongoDB 7.0, Redis 7, JWT + 2FA + OAuth SSO
- **Frontend:** Vue 3.5, Vite 7, Pinia 3, Tailwind CSS 4
- **Mobile:** React Native 0.83, React 19, MMKV
- **Test:** Jest 30 (526), Vitest 4 (245), Cypress 15, Detox 20

## Funzionalità

- Gestione progetti, task Kanban, clienti, pipeline lead
- Importazione massiva (CSV/JSON/XML/PDF) con mappatura campi
- 2FA TOTP + OAuth SSO (Google/GitHub/Microsoft)
- RBAC, pannello admin, integrazioni (GLPI, WhatsApp, OpenAI)
- Assistente IA con WebSocket + LLM, modalità scura

## Avvio Rapido

```bash
npm install && chmod +x start.sh && ./start.sh
```

## Licenza

MIT

</details>

---

<details>
<summary>🇫🇷 Français (fr)</summary>

## Aperçu

Application CRM full-stack en monorepo npm workspaces : API NestJS 11, frontend Vue 3 + Vite 7, application mobile React Native 0.83.

## Stack Technique

- **Backend :** NestJS 11, MongoDB 7.0, Redis 7, JWT + 2FA + OAuth SSO
- **Frontend :** Vue 3.5, Vite 7, Pinia 3, Tailwind CSS 4
- **Mobile :** React Native 0.83, React 19, MMKV
- **Tests :** Jest 30 (526), Vitest 4 (245), Cypress 15, Detox 20

## Fonctionnalités

- Gestion de projets, tâches Kanban, clients, pipeline de leads
- Importation en masse (CSV/JSON/XML/PDF) avec mappage de champs
- 2FA TOTP + OAuth SSO (Google/GitHub/Microsoft)
- RBAC, panneau d'administration, intégrations (GLPI, WhatsApp, OpenAI)
- Assistant IA avec WebSocket + LLM, mode sombre

## Démarrage Rapide

```bash
npm install && chmod +x start.sh && ./start.sh
```

## Licence

MIT

</details>

---

<details>
<summary>🇨🇳 中文 (zh)</summary>

## 概述

全栈 CRM 应用程序，npm workspaces monorepo 结构：NestJS 11 API、Vue 3 + Vite 7 前端、React Native 0.83 移动端。

## 技术栈

- **后端：** NestJS 11、MongoDB 7.0、Redis 7、JWT + 2FA + OAuth SSO
- **前端：** Vue 3.5、Vite 7、Pinia 3、Tailwind CSS 4
- **移动端：** React Native 0.83、React 19、MMKV
- **测试：** Jest 30 (526)、Vitest 4 (245)、Cypress 15、Detox 20

## 功能特性

- 项目管理、看板任务、客户管理、销售线索管道
- 批量导入（CSV/JSON/XML/PDF）带字段映射
- 2FA TOTP + OAuth SSO（Google/GitHub/Microsoft）
- RBAC、管理面板、集成（GLPI、WhatsApp、OpenAI）
- AI 助手（WebSocket + LLM）、暗黑模式

## 快速开始

```bash
npm install && chmod +x start.sh && ./start.sh
```

## 许可证

MIT

</details>
