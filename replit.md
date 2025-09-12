# FastSign Pro - Document Management & Digital Signature System

## Overview

This is a professional document management and digital signature system built for Brazilian users. The application allows users to create document templates with dynamic variables, generate documents in batch from various data sources (manual entry, CSV, Excel), and apply digital signatures using Brazilian ICP certificates. The system features a comprehensive workflow from template creation to document generation, signing, and download management.

The application follows a utility-focused design approach prioritizing functionality and workflow efficiency over visual marketing appeal, implementing Material Design principles for a clean, professional interface.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework & Technology Stack:**
- React 18 with TypeScript for type safety and modern component patterns
- Vite as the build tool for fast development and optimized production builds
- Wouter for lightweight client-side routing instead of React Router
- TanStack Query for server state management and caching

**UI Component System:**
- Shadcn/ui component library built on Radix UI primitives
- Tailwind CSS for utility-first styling with custom design tokens
- Custom theme system supporting light/dark modes with CSS variables
- Material Design principles with Brazilian Portuguese localization

**State Management:**
- React hooks for local component state
- TanStack Query for server state and API cache management
- Context API for global application state (user authentication, theme)

**Key Design Decisions:**
- Component-based architecture with reusable UI primitives
- Custom sidebar navigation with fixed width (20rem) for document management workflow
- Responsive design with mobile-first approach using Tailwind breakpoints
- Form handling with controlled components and validation

### Backend Architecture

**Server Framework:**
- Express.js with TypeScript for type-safe API development
- RESTful API design with `/api` prefix for all endpoints
- HTTP server setup with middleware for logging, error handling, and CORS

**Development Setup:**
- Vite integration for development with HMR and middleware mode
- Custom logging system with timestamp formatting
- Error handling middleware with status code management
- Development vs production environment configuration

**API Structure:**
- Routes defined in `/server/routes.ts` with Express router
- Storage interface pattern for data access abstraction
- Memory storage implementation as development baseline
- Extensible design for database integration

### Data Storage Solutions

**Database Technology:**
- PostgreSQL as the primary database (Neon serverless)
- Drizzle ORM for type-safe database operations and migrations
- Connection pooling with @neondatabase/serverless

**Schema Design:**
- User authentication with username/password (basic implementation)
- Extensible schema design for document templates, signatures, and certificates
- UUID primary keys with PostgreSQL's gen_random_uuid()
- Zod integration for runtime type validation

**Storage Interface:**
- Abstract IStorage interface for CRUD operations
- Memory storage implementation for development/testing
- Database storage implementation ready for production
- Repository pattern for data access abstraction

### Authentication and Authorization

**Current Implementation:**
- Basic username/password authentication
- Session-based authentication prepared (connect-pg-simple for session storage)
- User roles (admin/user) with role-based access control foundation

**Security Considerations:**
- Password hashing ready for implementation
- Session management with PostgreSQL session store
- Role-based access control for admin functions
- CSRF protection and secure cookie configuration

### External Dependencies

**Core UI Libraries:**
- @radix-ui/* components for accessible, unstyled UI primitives
- Tailwind CSS for utility-first styling
- Lucide React for consistent iconography
- date-fns for Brazilian Portuguese date formatting

**Database & ORM:**
- @neondatabase/serverless for PostgreSQL connection
- drizzle-orm for type-safe database operations
- drizzle-kit for database migrations and schema management

**Development Tools:**
- TypeScript for type safety across frontend and backend
- Vite for fast development builds and HMR
- ESBuild for production backend bundling
- @replit/vite-plugin-runtime-error-modal for development error handling

**Form & Validation:**
- @hookform/resolvers for form validation integration
- react-hook-form for form state management
- zod for runtime type validation and schema definition

**State Management & API:**
- @tanstack/react-query for server state management
- Fetch API for HTTP requests with credential support
- Custom query client configuration with error handling

**Brazilian Localization:**
- date-fns with ptBR locale for Portuguese date formatting
- Brazilian Portuguese interface text and labels
- ICP-Brasil certificate support for digital signatures

**File Processing (Planned):**
- Document template processing with variable substitution
- PDF generation and manipulation
- Excel/CSV file parsing for batch data input
- Digital signature integration with Brazilian certificates

**Design System:**
- Inter font family for primary typography
- JetBrains Mono for code/technical content
- Custom CSS variables for theming
- Class Variance Authority for component variant management