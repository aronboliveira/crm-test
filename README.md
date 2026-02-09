<<<<<<< HEAD
# CRM Application

> **📝 Portfolio Project Notice:** This is a portfolio demonstration project showcasing full-stack development skills. It is not intended for production use.

<details open>
<summary>🇺🇸 English (en-US)</summary>

## Overview

A full-stack Customer Relationship Management (CRM) application built with modern technologies. This monorepo contains a NestJS backend API, a Vue 3 web frontend, and shared packages for type contracts and utilities.

**Note:** This is a portfolio project created to demonstrate proficiency in modern web development technologies and architectural patterns.

## Tech Stack

### Backend (`apps/api`)

- **Framework:** NestJS 10 with TypeScript
- **Database:** MongoDB with TypeORM
- **Authentication:** JWT with bcrypt password hashing
- **Architecture:** Modular design with Hexagonal/Ports & Adapters patterns
- **Caching:** Redis (optional)

### Frontend (`apps/web`)

- **Framework:** Vue 3 with Composition API
- **Build Tool:** Vite 5
- **State Management:** Pinia
- **Styling:** CSS with custom design system
- **HTTP Client:** Axios

### Shared Packages

- **`@crm/contracts`:** TypeScript type definitions shared between frontend and backend
- **`@crm/foundations`:** Utility functions for DOM manipulation, date handling, and browser compatibility

## Features

- **Project Management:** Create, track, and manage projects with statuses, deadlines, and tags
- **Task Tracking:** Kanban-style task management with priorities, assignees, and subtasks
- **Client Management:** Store and manage client information and contacts
- **Lead Pipeline:** Sales funnel with lead stages, CTA suggestions, and campaign tracking
- **User Authentication:** Secure login with JWT tokens and role-based access control (RBAC)
- **Admin Panel:** User management, audit logs, and mail outbox monitoring
- **File Attachments:** Upload and manage files attached to tasks and projects

## Getting Started

### Prerequisites

- Node.js 18+
- Docker & Docker Compose
- pnpm (recommended) or npm

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd crm

# Install dependencies
pnpm install

# Start infrastructure (MongoDB, Redis)
docker-compose up -d

# Run the API
cd apps/api && pnpm start:dev

# Run the Web App (in another terminal)
cd apps/web && pnpm dev
```

### Environment Variables

Create `.env` files in `apps/api` and `apps/web`:

```env
# apps/api/.env
MONGODB_URI=mongodb://localhost:27017/crm
JWT_SECRET=your-secret-key
REDIS_URL=redis://localhost:6379

# apps/web/.env
VITE_API_BASE_URL=http://localhost:3000
```

## Project Structure

```
crm/
├── apps/
│   ├── api/          # NestJS backend
│   │   ├── src/
│   │   │   ├── entities/      # Database entities
│   │   │   ├── modules/       # Feature modules
│   │   │   └── infrastructure/ # Database & cache config
│   │   └── test/
│   └── web/          # Vue 3 frontend
│       └── src/
│           ├── components/    # Vue components
│           ├── pages/         # Page views
│           ├── services/      # API clients
│           └── pinia/         # State management
└── packages/
    ├── contracts/    # Shared TypeScript types
    └── foundations/  # Shared utilities
```

## License

MIT

</details>

---

<details>
<summary>🇧🇷 Português (pt-BR)</summary>

## Visão Geral

Uma aplicação completa de Gestão de Relacionamento com o Cliente (CRM) construída com tecnologias modernas. Este monorepo contém uma API backend em NestJS, um frontend web em Vue 3 e pacotes compartilhados para contratos de tipos e utilitários.

**Nota:** Este é um projeto de portfólio criado para demonstrar proficiência em tecnologias modernas de desenvolvimento web e padrões arquiteturais.

## Stack Tecnológica

### Backend (`apps/api`)

- **Framework:** NestJS 10 com TypeScript
- **Banco de Dados:** MongoDB com TypeORM
- **Autenticação:** JWT com hash de senha bcrypt
- **Arquitetura:** Design modular com padrões Hexagonal/Ports & Adapters
- **Cache:** Redis (opcional)

### Frontend (`apps/web`)

- **Framework:** Vue 3 com Composition API
- **Ferramenta de Build:** Vite 5
- **Gerenciamento de Estado:** Pinia
- **Estilização:** CSS com design system customizado
- **Cliente HTTP:** Axios

### Pacotes Compartilhados

- **`@crm/contracts`:** Definições de tipos TypeScript compartilhadas entre frontend e backend
- **`@crm/foundations`:** Funções utilitárias para manipulação de DOM, tratamento de datas e compatibilidade de navegadores

## Funcionalidades

- **Gestão de Projetos:** Crie, acompanhe e gerencie projetos com status, prazos e tags
- **Rastreamento de Tarefas:** Gestão de tarefas estilo Kanban com prioridades, responsáveis e subtarefas
- **Gestão de Clientes:** Armazene e gerencie informações e contatos de clientes
- **Pipeline de Leads:** Funil de vendas com estágios de leads, sugestões de CTA e rastreamento de campanhas
- **Autenticação de Usuários:** Login seguro com tokens JWT e controle de acesso baseado em funções (RBAC)
- **Painel Administrativo:** Gestão de usuários, logs de auditoria e monitoramento de caixa de saída de e-mails
- **Anexos de Arquivos:** Upload e gestão de arquivos anexados a tarefas e projetos

## Começando

### Pré-requisitos

- Node.js 18+
- Docker & Docker Compose
- pnpm (recomendado) ou npm

### Instalação

```bash
# Clone o repositório
git clone <url-do-repositorio>
cd crm

# Instale as dependências
pnpm install

# Inicie a infraestrutura (MongoDB, Redis)
docker-compose up -d

# Execute a API
cd apps/api && pnpm start:dev

# Execute o Web App (em outro terminal)
cd apps/web && pnpm dev
```

## Estrutura do Projeto

```
crm/
├── apps/
│   ├── api/          # Backend NestJS
│   └── web/          # Frontend Vue 3
└── packages/
    ├── contracts/    # Tipos TypeScript compartilhados
    └── foundations/  # Utilitários compartilhados
```

## Licença

MIT

</details>

---

<details>
<summary>🇪🇸 Español (es-ES)</summary>

## Descripción General

Una aplicación completa de Gestión de Relaciones con el Cliente (CRM) construida con tecnologías modernas. Este monorepo contiene una API backend en NestJS, un frontend web en Vue 3 y paquetes compartidos para contratos de tipos y utilidades.

**Nota:** Este es un proyecto de portafolio creado para demostrar competencia en tecnologías modernas de desarrollo web y patrones arquitectónicos.

## Stack Tecnológico

### Backend (`apps/api`)

- **Framework:** NestJS 10 con TypeScript
- **Base de Datos:** MongoDB con TypeORM
- **Autenticación:** JWT con hash de contraseña bcrypt
- **Arquitectura:** Diseño modular con patrones Hexagonal/Ports & Adapters
- **Caché:** Redis (opcional)

### Frontend (`apps/web`)

- **Framework:** Vue 3 con Composition API
- **Herramienta de Build:** Vite 5
- **Gestión de Estado:** Pinia
- **Estilos:** CSS con sistema de diseño personalizado
- **Cliente HTTP:** Axios

### Paquetes Compartidos

- **`@crm/contracts`:** Definiciones de tipos TypeScript compartidas entre frontend y backend
- **`@crm/foundations`:** Funciones utilitarias para manipulación de DOM, manejo de fechas y compatibilidad de navegadores

## Características

- **Gestión de Proyectos:** Crea, rastrea y gestiona proyectos con estados, plazos y etiquetas
- **Seguimiento de Tareas:** Gestión de tareas estilo Kanban con prioridades, asignados y subtareas
- **Gestión de Clientes:** Almacena y gestiona información y contactos de clientes
- **Pipeline de Leads:** Embudo de ventas con etapas de leads, sugerencias de CTA y seguimiento de campañas
- **Autenticación de Usuarios:** Inicio de sesión seguro con tokens JWT y control de acceso basado en roles (RBAC)
- **Panel de Administración:** Gestión de usuarios, registros de auditoría y monitoreo de bandeja de salida de correos
- **Archivos Adjuntos:** Carga y gestión de archivos adjuntos a tareas y proyectos

## Primeros Pasos

### Requisitos Previos

- Node.js 18+
- Docker & Docker Compose
- pnpm (recomendado) o npm

### Instalación

```bash
# Clona el repositorio
git clone <url-del-repositorio>
cd crm

# Instala las dependencias
pnpm install

# Inicia la infraestructura (MongoDB, Redis)
docker-compose up -d

# Ejecuta la API
cd apps/api && pnpm start:dev

# Ejecuta la Web App (en otra terminal)
cd apps/web && pnpm dev
```

## Estructura del Proyecto

```
crm/
├── apps/
│   ├── api/          # Backend NestJS
│   └── web/          # Frontend Vue 3
└── packages/
    ├── contracts/    # Tipos TypeScript compartidos
    └── foundations/  # Utilidades compartidas
```

## Licencia

MIT

</details>

---

<details>
<summary>🇮🇹 Italiano (it)</summary>

## Panoramica

**Nota:** Questo è un progetto portfolio creato per dimostrare competenza nelle tecnologie moderne di sviluppo web e nei pattern architetturali.

Un'applicazione completa di Customer Relationship Management (CRM) costruita con tecnologie moderne. Questo monorepo contiene un'API backend in NestJS, un frontend web in Vue 3 e pacchetti condivisi per contratti di tipi e utilità.

## Stack Tecnologico

### Backend (`apps/api`)

- **Framework:** NestJS 10 con TypeScript
- **Database:** MongoDB con TypeORM
- **Autenticazione:** JWT con hash password bcrypt
- **Architettura:** Design modulare con pattern Hexagonal/Ports & Adapters
- **Cache:** Redis (opzionale)

### Frontend (`apps/web`)

- **Framework:** Vue 3 con Composition API
- **Strumento di Build:** Vite 5
- **Gestione dello Stato:** Pinia
- **Stile:** CSS con design system personalizzato
- **Client HTTP:** Axios

### Pacchetti Condivisi

- **`@crm/contracts`:** Definizioni di tipi TypeScript condivise tra frontend e backend
- **`@crm/foundations`:** Funzioni utilitarie per manipolazione DOM, gestione date e compatibilità browser

## Funzionalità

- **Gestione Progetti:** Crea, monitora e gestisci progetti con stati, scadenze e tag
- **Tracciamento Attività:** Gestione attività stile Kanban con priorità, assegnatari e sotto-attività
- **Gestione Clienti:** Archivia e gestisci informazioni e contatti dei clienti
- **Pipeline Lead:** Funnel di vendita con fasi lead, suggerimenti CTA e tracciamento campagne
- **Autenticazione Utenti:** Login sicuro con token JWT e controllo accessi basato su ruoli (RBAC)
- **Pannello Admin:** Gestione utenti, log di audit e monitoraggio casella posta in uscita
- **Allegati File:** Carica e gestisci file allegati ad attività e progetti

## Per Iniziare

### Prerequisiti

- Node.js 18+
- Docker & Docker Compose
- pnpm (consigliato) o npm

### Installazione

```bash
# Clona il repository
git clone <url-repository>
cd crm

# Installa le dipendenze
pnpm install

# Avvia l'infrastruttura (MongoDB, Redis)
docker-compose up -d

# Esegui l'API
cd apps/api && pnpm start:dev

# Esegui la Web App (in un altro terminale)
cd apps/web && pnpm dev
```

## Struttura del Progetto

```
crm/
├── apps/
│   ├── api/          # Backend NestJS
│   └── web/          # Frontend Vue 3
└── packages/
    ├── contracts/    # Tipi TypeScript condivisi
    └── foundations/  # Utilità condivise
```

## Licenza

MIT

</details>

---

<details>
<summary>🇫🇷 Français (fr)</summary>

## Aperçu

**Note:** Ceci est un projet portfolio créé pour démontrer la maîtrise des technologies modernes de développement web et des patterns architecturaux.

Une application complète de Gestion de la Relation Client (CRM) construite avec des technologies modernes. Ce monorepo contient une API backend en NestJS, un frontend web en Vue 3 et des packages partagés pour les contrats de types et les utilitaires.

## Stack Technologique

### Backend (`apps/api`)

- **Framework:** NestJS 10 avec TypeScript
- **Base de Données:** MongoDB avec TypeORM
- **Authentification:** JWT avec hachage de mot de passe bcrypt
- **Architecture:** Conception modulaire avec patterns Hexagonal/Ports & Adapters
- **Cache:** Redis (optionnel)

### Frontend (`apps/web`)

- **Framework:** Vue 3 avec Composition API
- **Outil de Build:** Vite 5
- **Gestion d'État:** Pinia
- **Style:** CSS avec système de design personnalisé
- **Client HTTP:** Axios

### Packages Partagés

- **`@crm/contracts`:** Définitions de types TypeScript partagées entre frontend et backend
- **`@crm/foundations`:** Fonctions utilitaires pour manipulation DOM, gestion des dates et compatibilité navigateur

## Fonctionnalités

- **Gestion de Projets:** Créez, suivez et gérez des projets avec statuts, échéances et tags
- **Suivi des Tâches:** Gestion des tâches style Kanban avec priorités, assignés et sous-tâches
- **Gestion des Clients:** Stockez et gérez les informations et contacts des clients
- **Pipeline de Leads:** Entonnoir de vente avec étapes de leads, suggestions CTA et suivi de campagnes
- **Authentification Utilisateurs:** Connexion sécurisée avec tokens JWT et contrôle d'accès basé sur les rôles (RBAC)
- **Panneau d'Administration:** Gestion des utilisateurs, journaux d'audit et surveillance de la boîte d'envoi
- **Pièces Jointes:** Téléchargement et gestion de fichiers attachés aux tâches et projets

## Démarrage

### Prérequis

- Node.js 18+
- Docker & Docker Compose
- pnpm (recommandé) ou npm

### Installation

```bash
# Clonez le dépôt
git clone <url-du-depot>
cd crm

# Installez les dépendances
pnpm install

# Démarrez l'infrastructure (MongoDB, Redis)
docker-compose up -d

# Lancez l'API
cd apps/api && pnpm start:dev

# Lancez l'App Web (dans un autre terminal)
cd apps/web && pnpm dev
```

## Structure du Projet

```
crm/
├── apps/
│   ├── api/          # Backend NestJS
│   └── web/          # Frontend Vue 3
└── packages/
    ├── contracts/    # Types TypeScript partagés
    └── foundations/  # Utilitaires partagés
```

## Licence

MIT

</details>

---

<details>
<summary>🇨🇳 中文 (zh)</summary>

## 概述

**注意：** 这是一个作品集项目，旨在展示现代 Web 开发技术和架构模式的熟练程度。

一个使用现代技术构建的全栈客户关系管理（CRM）应用程序。此 monorepo 包含 NestJS 后端 API、Vue 3 Web 前端以及用于类型契约和实用工具的共享包。

## 技术栈

### 后端 (`apps/api`)

- **框架:** NestJS 10 + TypeScript
- **数据库:** MongoDB + TypeORM
- **认证:** JWT + bcrypt 密码哈希
- **架构:** 模块化设计，采用六边形/端口与适配器模式
- **缓存:** Redis（可选）

### 前端 (`apps/web`)

- **框架:** Vue 3 + Composition API
- **构建工具:** Vite 5
- **状态管理:** Pinia
- **样式:** CSS 自定义设计系统
- **HTTP 客户端:** Axios

### 共享包

- **`@crm/contracts`:** 前后端共享的 TypeScript 类型定义
- **`@crm/foundations`:** DOM 操作、日期处理和浏览器兼容性的实用函数

## 功能特性

- **项目管理:** 创建、跟踪和管理带有状态、截止日期和标签的项目
- **任务跟踪:** 看板式任务管理，支持优先级、负责人和子任务
- **客户管理:** 存储和管理客户信息和联系方式
- **销售线索管道:** 带有线索阶段、CTA 建议和活动跟踪的销售漏斗
- **用户认证:** 使用 JWT 令牌的安全登录和基于角色的访问控制（RBAC）
- **管理面板:** 用户管理、审计日志和邮件发件箱监控
- **文件附件:** 上传和管理附加到任务和项目的文件

## 快速开始

### 前置条件

- Node.js 18+
- Docker & Docker Compose
- pnpm（推荐）或 npm

### 安装

```bash
# 克隆仓库
git clone <仓库地址>
cd crm

# 安装依赖
pnpm install

# 启动基础设施（MongoDB、Redis）
docker-compose up -d

# 运行 API
cd apps/api && pnpm start:dev

# 运行 Web 应用（在另一个终端）
cd apps/web && pnpm dev
```

## 项目结构

```
crm/
├── apps/
│   ├── api/          # NestJS 后端
│   └── web/          # Vue 3 前端
└── packages/
    ├── contracts/    # 共享 TypeScript 类型
    └── foundations/  # 共享实用工具
```

## 许可证

MIT

</details>
=======
# crm-test
Test project for project management features
>>>>>>> bbe086a40757cb0e6909ad33a74e1f71098acaa4
