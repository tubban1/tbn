# wish2

wish2 is a modern, theme-rich web platform for creating, editing, and sharing personalized blessing (wish) pages. Built with Next.js and React, it features dynamic page routing, multi-theme support, admin management, and AI-powered content generation.

---

## Features

- **Personalized Wish Pages**: Create and share unique blessing pages with custom content and styles.
- **Dynamic Routing**: Each wish page is accessible via a unique URL (e.g., `/w/[uid]` for viewing, `/e/[uid]` for editing).
- **Multi-theme Support**: Choose from a variety of visual themes (Dreamy Sky, Matrix, Paper Letter, etc.), each with its own CSS and optional special effects.
- **Admin Dashboard**: Batch create, manage, and monitor wish pages with authentication.
- **AI-Powered Content Generation**: Generate wish content using an integrated AI API (supports Qwen3-8B model via a secure proxy).
- **Comment System**: Users can leave comments on wish pages.
- **Page View Tracking**: Track and analyze page visits.
- **MySQL Database**: All data is stored and managed via a MySQL backend.

---

## Directory Structure

```
<code_block_to_apply_from>
```

---

## AI Generation

**Highlight:**  
wish2 integrates an AI-powered content generation feature. Users can request the system to generate creative blessing messages using a large language model (Qwen3-8B) via a secure backend proxy. This ensures API key safety and enables high-quality, context-aware wish content for every occasion.

- API endpoint: `/api/ai_generate`
- Model: Qwen3-8B (via Infini-AI cloud)
- Usage: Accessible from the wish edit page and admin dashboard for batch or single wish generation.

---

## Quick Start

1. **Install dependencies:**
   ```bash
   npm install
   ```
2. **Configure environment variables:**
   - Set your MySQL connection and AI API key in `.env.local`
3. **Run the development server:**
   ```bash
   npm run dev
   ```
4. **Access the app:**
   - Home: `http://localhost:3000/`
   - Admin: `http://localhost:3000/admin` (default password: `biel2025`)

---

## Main Scripts

- `npm run dev` – Start development server
- `npm run build` – Build for production
- `npm run start` – Start production server

---

## Documentation

- `doc/Product.md` – Product features and requirements
- `doc/DataStructure.md` – Database schema and data flow
- `doc/FileStructure.md` – File and directory overview

---

## License

MIT

---

**Note:**  
For best results, use the admin dashboard to batch-create wish pages and leverage the AI generation feature to quickly populate creative, personalized content for users. Each wish page can be customized with different themes and shared via unique links.
