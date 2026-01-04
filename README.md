# Story Plotter

A modern web application for writers to plan and organize their stories. Built with Next.js 14+, TypeScript, and Cloudflare R2 for storage.

## Features

- 📝 **Character Management** - Create detailed character profiles with images, relationships, and notes
- 🎬 **Scene Organization** - Plan scenes with POV tracking, locations, and status
- 📊 **Plotlines** - Organize narrative threads and track progress
- 🗺️ **Locations** - Document story settings with descriptions and images
- 📌 **Notes** - Keep research, world-building, and ideas organized
- 📅 **Timeline View** - Visualize your story chronologically
- 💾 **Auto-Save** - Never lose your work with automatic cloud sync
- 🔄 **Conflict Resolution** - Smart merging when editing on multiple devices
- 📤 **Export/Import** - Backup and restore your projects as JSON

## Tech Stack

- **Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **Data Fetching**: TanStack Query
- **Authentication**: NextAuth.js v5
- **Storage**: Cloudflare R2 (S3-compatible)
- **Cache/Sessions**: Vercel KV (Redis)
- **Forms**: React Hook Form + Zod
- **Rich Text**: Lexical Editor (planned)
- **Drag & Drop**: dnd-kit (planned)

## Getting Started

### Prerequisites

- Node.js 18+
- npm or pnpm
- Cloudflare R2 bucket
- Vercel KV database (or any Redis instance)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/story-plotter.git
   cd story-plotter
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env.local
   ```
   
   Fill in your environment variables in `.env.local`

4. Run the development server:
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000)

### Environment Variables

See [.env.example](.env.example) for all available configuration options.

Required variables:
- `NEXTAUTH_SECRET` - Secret for session encryption
- `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME` - Cloudflare R2 credentials
- `KV_URL`, `KV_REST_API_URL`, `KV_REST_API_TOKEN` - Vercel KV credentials

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── (auth)/            # Auth pages (login, signup)
│   ├── dashboard/         # User dashboard
│   ├── projects/          # Project editor pages
│   └── api/               # API routes
├── components/
│   ├── ui/                # Reusable UI components
│   └── layout/            # Layout components (sidebar, header)
├── hooks/                 # Custom React hooks
├── lib/                   # Utilities and configurations
│   ├── auth.ts           # NextAuth configuration
│   ├── r2.ts             # R2 storage client
│   └── validations.ts    # Zod schemas
├── stores/                # Zustand state stores
└── types/                 # TypeScript type definitions
```

## API Routes

| Route | Method | Description |
|-------|--------|-------------|
| `/api/auth/[...nextauth]` | * | NextAuth.js authentication |
| `/api/auth/signup` | POST | User registration |
| `/api/projects` | GET, POST | List/create projects |
| `/api/projects/[id]` | GET, PUT, DELETE | Project CRUD |
| `/api/upload/url` | POST | Get presigned upload URL |
| `/api/upload/confirm` | POST | Confirm file upload |
| `/api/versions` | GET | List version history |
| `/api/versions/[id]` | GET, POST | Get/restore version |

## Data Storage

All project data is stored in Cloudflare R2:

- `users/{userId}/profile.json` - User profile data
- `projects/{projectId}/data.json` - Project data
- `projects/{projectId}/versions/{timestamp}.json` - Version snapshots
- `projects/{projectId}/attachments/{filename}` - File attachments

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [Plottr](https://plottr.com/) - Inspiration for the feature set
- [Shadcn/ui](https://ui.shadcn.com/) - UI component patterns
- [Lucide Icons](https://lucide.dev/) - Beautiful icons
