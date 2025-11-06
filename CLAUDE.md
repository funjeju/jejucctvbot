# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a React-based web application for managing and curating location data for Jeju Island tourism spots. The app integrates with Google's Gemini AI, Firebase Firestore, and Firebase Storage to provide a collaborative content management system.

## Development Commands

- **Start development server**: `npm run dev`
- **Build for production**: `vite build`
- **Preview production build**: `npm run preview`
- **Install dependencies**: `npm install`

## Environment Setup

The application requires:
- Node.js
- Set `GEMINI_API_KEY` in `.env.local` for AI functionality
- Firebase project configured with Firestore database named "databuilder" in asia-northeast3 region

## Architecture Overview

### Core Application Flow
The app follows a step-based workflow controlled by the `AppStep` type in `App.tsx`:
1. **library**: Content library view showing existing spots
2. **initial**: Initial form for creating new spots with AI assistance
3. **loading**: AI generation phase using Gemini API
4. **review**: Review and edit AI-generated content
5. **view**: Detailed view of individual spots

### Key Components Structure
- **App.tsx**: Main application orchestrator with state management and Firebase integration
- **InitialForm**: Captures basic spot information and categories
- **ReviewDashboard**: AI-generated content review and editing interface
- **ContentLibrary**: Browse and manage existing spots
- **SpotDetailView**: Detailed view with collaboration features
- **Chatbot**: AI-powered assistance for content refinement

### Data Architecture
- **Place interface (types.ts)**: Core data structure for tourism spots
- **Firebase Firestore**: Primary data persistence with real-time synchronization
- **Firebase Storage**: Image and media file storage
- **Collaborative features**: Suggestion system with edit history tracking

### Firebase Integration
- **Database**: Firestore with "databuilder" database
- **Security**: Open read/write rules (development configuration)
- **Storage**: File uploads for images with Firebase Storage
- **Real-time**: Live data synchronization using onSnapshot listeners

### AI Integration
- **Gemini API**: Content generation through `services/geminiService.ts`
- **Environment variables**: API key configured in Vite build process
- **Chat functionality**: Integrated AI assistance for content improvement

### Services Layer
- **geminiService.ts**: Google Gemini AI integration for content generation
- **firebase.ts**: Firebase configuration and initialization
- **placeFirestore.ts**: Firestore data serialization and deserialization utilities

### Key Data Transformations
- Places are sanitized before Firestore storage (removing File objects, converting timestamps)
- Real-time listeners parse Firestore data back to application format
- Image handling includes both file uploads and URL references

## Firebase Deployment

The project is configured for Firebase Hosting:
- Build output: `dist` directory
- SPA routing: All routes redirect to `/index.html`
- Firestore rules: Currently open for development (should be secured for production)

## Development Notes

- Uses TypeScript with React 19 and Vite
- Path aliases: `@/*` maps to project root
- Component structure follows React functional components with hooks
- State management through React Context and useState hooks
- Real-time data synchronization with Firestore listeners