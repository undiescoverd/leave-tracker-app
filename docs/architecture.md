# TDH Agency Leave Tracker Fullstack Architecture Document

## Introduction
This document outlines the complete full-stack architecture for the TDH Agency leave tracker, including backend systems, frontend implementation, and their integration. It serves as the single source of truth for AI-driven development, ensuring consistency across the entire technology stack.

---

## High Level Architecture

### Technical Summary
The application will use a modern full-stack monorepo architecture built on the Next.js framework. This approach allows for a unified codebase for both the frontend (React) and the backend (Next.js API routes/server actions). All data will be managed through a PostgreSQL database via the Prisma ORM. This architecture is designed for a smooth AI-assisted development workflow, focusing on predictability and convention over configuration.

### Platform and Infrastructure Choice
**Platform**: Vercel/Next.js
**Key Services**: Vercel Hosting, Vercel Postgres
**Deployment Host and Regions**: United Kingdom (London)

### Repository Structure
**Structure**: Monorepo
**Monorepo Tool**: None (using native Next.js features)
**Package Organization**: The application will use a flat directory structure for clarity.

### High Level Architecture Diagram
```mermaid
graph TD
    User -->|Requests| Vercel(Vercel Hosting)
    Vercel --> FE(Next.js Frontend)
    FE -->|API Calls| BE(Next.js API Routes/Server Actions)
    BE --> Prisma[Prisma ORM]
    Prisma --> DB(Vercel Postgres Database)
    User <--> DB(Vercel Postgres Database)