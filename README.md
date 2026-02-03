# Cividussi

A modern résumé generator built with React, TypeScript, and TailwindCSS. Create beautiful, print-ready résumés from JSON data with real-time customization.

![Résumé Preview](https://github.com/user-attachments/assets/46d82f57-c383-44f2-a55b-9340e2108e39)

## Features

- **Multiple Templates** – Modern, Classic, Creative, Skills Sidebar, and Modern Split layouts
- **Two-Column Layouts** – Sidebar-based templates with flexible section placement
- **Photo Support** – Add a professional headshot with shape/position options
- **Color Schemes** – 5 color palettes (Blue, Green, Purple, Orange, Gray)
- **Font Selection** – Inter, Roboto, Open Sans, Lato, Montserrat
- **Section Management** – Reorder, add custom sections, place in main or sidebar
- **AI Tailoring** – Analyze job descriptions and get suggestions to optimize your CV
- **Print-Optimized** – A4 layout with overflow detection and auto-fit
- **Real-time Preview** – See changes instantly
- **Profiles** – Save multiple resume configurations

## Quick Start

```bash
# Clone and install
git clone https://github.com/twiatrak/Cividussi.git
cd Cividussi
npm install

# Start dev server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

## Usage

### Customize via UI

1. Click **Customize** in the bottom-right corner
2. Choose template, colors, fonts
3. Upload a photo, add custom sections
4. Reorder sections with up/down arrows

### Edit Resume Data

Edit `public/resume.json`:

```json
{
  "header": {
    "name": "Your Name",
    "title": "Job Title",
    "email": "email@example.com",
    "phone": "+1 555-123-4567",
    "location": "City, State"
  },
  "profile": "Professional summary...",
  "experience": [...],
  "education": [...],
  "skills": {
    "technical": ["JavaScript", "React"],
    "tools": ["Git", "Docker"]
  },
  "customSections": [
    {
      "id": "projects",
      "title": "Projects",
      "content": "<ul><li>Project description</li></ul>"
    }
  ]
}
```

### AI Tailoring

1. Click **Tailor CV**
2. Paste a job description
3. Click **Analyze** to see keyword coverage
4. Select suggestions and click **Apply Selected**

### Print / Export

- Press `Ctrl+P` / `Cmd+P` or click **Print / Save as PDF**
- Use **Export Resume** to download as JSON

## Build

```bash
npm run build    # Production build → dist/
npm run preview  # Preview production build
```

## Project Structure

```
├── public/resume.json    # Your resume data
├── src/
│   ├── components/       # React components
│   ├── config/           # Templates, colors, fonts
│   ├── hooks/            # Custom React hooks
│   ├── services/         # AI client
│   ├── types/            # TypeScript types
│   ├── utils/            # Storage, profiles, etc.
│   ├── App.tsx
│   └── index.css
├── api/                  # Serverless functions (Vercel)
└── vite.config.ts
```

## Tech Stack

- React 19 + TypeScript
- Vite
- TailwindCSS v4
- Vercel Serverless Functions

## License

ISC
