# CineClub 🎬

Vota con tu grupo qué película ver esta noche. Construido con Next.js 15, Supabase y Vercel.

## Setup

### 1. Instalar dependencias

```bash
npm install
```

### 2. Variables de entorno

Copia el archivo de ejemplo y rellena tus claves:

```bash
cp .env.local.example .env.local
```

- `NEXT_PUBLIC_SUPABASE_URL` → Supabase > Project Settings > Data API > Project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` → Supabase > Project Settings > Data API > anon public
- `TMDB_API_KEY` → https://www.themoviedb.org/settings/api (gratuita)

### 3. Ejecutar en desarrollo

```bash
npm run dev
```

Abre http://localhost:3000

## Despliegue en Vercel

1. Sube el proyecto a GitHub
2. Importa el repo en vercel.com
3. Añade las variables de entorno en Vercel > Settings > Environment Variables
4. Deploy automático en cada push a `main`

## Stack

- **Next.js 15** App Router + TypeScript
- **Supabase** Auth · PostgreSQL · Realtime · Storage
- **TMDB API** búsqueda de películas
- **Tailwind CSS** estilos
- **Vercel** despliegue
