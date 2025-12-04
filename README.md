# Route Visualizer

A modern React application for visualizing trekking routes across Nepal using OpenStreetMap and PostGIS spatial data.

## Features

- 🗺️ Interactive map visualization with Leaflet
- 🔍 Search and filter routes by region, difficulty, and altitude
- ✏️ Create and edit routes (admin functionality)
- 📊 Route statistics and details panel
- 🔐 Authentication for admin operations

## Tech Stack

- **Frontend**: React + TypeScript + Vite
- **UI Components**: shadcn/ui + Tailwind CSS
- **Maps**: Leaflet + OpenStreetMap
- **State Management**: React Query
- **API**: REST API with PostGIS backend

## Getting Started

### Prerequisites

- Node.js 18+ & npm
- Git

### Installation

```sh
# Clone the repository
git clone <YOUR_GIT_URL>

# Navigate to project directory
cd route-visualizer

# Install dependencies
npm install

# Create environment file
cp .env.example .env

# Start development server
npm run dev
```

### Environment Variables

Create a `.env` file with:

```sh
VITE_API_BASE_URL=
```

## Development

```sh
# Start dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Lint code
npm run lint
```

## Project Structure

```txt
src/
├── components/     # React components
├── contexts/       # React contexts (Auth)
├── hooks/          # Custom hooks
├── lib/            # Utilities and API
├── pages/          # Page components
├── types/          # TypeScript types
└── App.tsx         # Main app component
```

## License

MIT
