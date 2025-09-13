# Overview

This is an Employee Mission Management System built with React and Express. The application is designed to manage employee expense tracking for missions/assignments, with support for multiple banks and expense categories. The system allows users to look up employees, record mission details, track expenses across different banks, and visualize expense distributions. The interface is in Arabic, indicating it's designed for Arabic-speaking organizations.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture

The frontend uses React with TypeScript and is built with Vite for fast development. The application follows a component-based architecture with:

- **UI Framework**: Shadcn/ui components with Radix UI primitives for consistent design
- **Styling**: Tailwind CSS with custom CSS variables for theming
- **State Management**: React hooks with local storage persistence for mission data
- **Data Fetching**: TanStack Query (React Query) for server state management
- **Routing**: Wouter for lightweight client-side routing
- **Form Handling**: React Hook Form with Zod validation

The architecture separates concerns into distinct layers:
- UI components in `client/src/components/`
- Page components in `client/src/pages/`
- Custom hooks for reusable logic
- Type definitions shared between client and server

## Backend Architecture

The backend is built with Express.js and follows a RESTful API pattern:

- **API Layer**: Express routes handling HTTP requests
- **Storage Layer**: Currently using in-memory storage with an interface that can be extended to database implementations
- **Schema Validation**: Shared TypeScript types and Zod schemas between frontend and backend
- **Middleware**: Request logging and error handling

The storage interface abstracts data operations, making it easy to switch from in-memory storage to a persistent database solution.

## Data Model

The system manages three main entities:
- **Employees**: With unique codes, names, and branch assignments
- **Banks**: Available financial institutions for expense tracking
- **Missions**: Employee assignments with associated expenses and bank distributions

Expenses are structured as JSON objects containing expense items with types, amounts, and associated banks.

## Development Setup

The project uses:
- **Build System**: Vite for frontend bundling and development server
- **TypeScript**: Full type safety across the entire application
- **Code Quality**: ESBuild for production builds
- **Path Aliases**: Configured for clean imports across the application

# External Dependencies

## Database

- **Drizzle ORM**: Configured for PostgreSQL with schema definitions
- **Database Provider**: Neon Database (serverless PostgreSQL)
- **Migrations**: Drizzle Kit for schema management

## UI and Styling

- **Shadcn/ui**: Component library built on Radix UI primitives
- **Radix UI**: Headless UI components for accessibility
- **Tailwind CSS**: Utility-first CSS framework
- **Lucide React**: Icon library
- **Google Fonts**: Inter font family

## Development Tools

- **Replit Plugins**: Development banner and cartographer for Replit environment
- **PostCSS**: CSS processing with Autoprefixer
- **Date-fns**: Date manipulation utilities
- **Class Variance Authority**: Utility for conditional CSS classes

## Runtime Dependencies

- **Express.js**: Web server framework
- **TanStack Query**: Server state management
- **Wouter**: Lightweight routing
- **React Hook Form**: Form state management
- **Zod**: Schema validation

The application is configured to work seamlessly in the Replit environment with appropriate development tooling and can be deployed as a standard Node.js application.