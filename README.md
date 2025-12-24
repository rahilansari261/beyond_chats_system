# AI Article Enhancement System

A full-stack web application that scrapes articles from BeyondChats, enhances them using AI (Groq/Gemini) with real-time web search context (SerpApi), and displays them in a modern interface.

## Project Structure

- **Backend**: Laravel API (Handles scraping, database storage, and CRUD operations).
- **Frontend**: Next.js (React) application (User interface).
- **AI Service**: Node.js/Express service (Handles AI generation, web searching, and article updates).

## Prerequisites

- Node.js (v18+)
- PHP (v8.2+) and Composer
- SQLite (default database)

## Setup Instructions

### 1. Backend (Laravel)

Navigate to the `backend` directory:
```bash
cd backend
```

Install PHP dependencies:
```bash
composer install
```

Setup environment file:
```bash
cp .env.example .env
# Ensure DB_CONNECTION=sqlite in .env
```

Create the SQLite database file:
```bash
touch database/database.sqlite
```

Run database migrations:
```bash
php artisan migrate
```

Start the backend server:
```bash
php artisan serve
```
The server will start at `http://127.0.0.1:8000`.

### 2. AI Service (Node.js)

Navigate to the `ai-service` directory:
```bash
cd ai-service
```

Install Node.js dependencies:
```bash
npm install
```

Create a `.env` file with your API keys:
```bash
touch .env
```
Add the following keys to `.env`:
```env
PORT=5001
GROQ_API_KEY=your_groq_key
SERPAPI_KEY=your_serpapi_key
```

Start the AI service:
```bash
npm run dev
```
The service will start at `http://localhost:5001`.

### 3. Frontend (Next.js)

Navigate to the `frontend` directory:
```bash
cd frontend
```

Install dependencies:
```bash
npm install
```

Start the development server:
```bash
npm run dev
```
The application will be accessible at `http://localhost:3000`.

## Usage

1. **Scrape New Articles**: Click the "Scrape New Articles" button on the frontend. This triggers the backend to fetch the latest 5 articles from BeyondChats.
2. **Enhance Articles**: Click "Enhance Latest Article" (this enhances ALL articles in parallel). The AI Service will:
   - Search Google via SerpApi for context.
   - Scrape the top 2 search results.
   - Use Groq (Llama-3) to rewrite the article with citations.
3. **View Content**: Toggle between "Original" and "Enhanced" views on the article cards. Click citations to view sources.
4. **Reset**: Use the "Reset DB" button to clear all articles and start fresh.
