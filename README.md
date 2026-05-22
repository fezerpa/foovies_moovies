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
- `GROQ_API_KEY` → https://console.groq.com/keys (gratuita)

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

## Funcionalidades

### Descubrir películas
- Búsqueda por título, rango de años, puntuación mínima y crew/director
- Filtro **En cartelera** — usa geolocalización del navegador para mostrar películas actualmente en cines en tu país
- Filtro por **plataforma de streaming** (Netflix, Disney+, Max, Prime Video, etc.) disponible en tu región
- Ordenación por puntuación o fecha de estreno
- **Scroll infinito** — carga 9 películas adicionales al llegar al final
- Botón flotante para limpiar filtros y volver arriba

### Recomendaciones IA
- Análisis de las películas vistas por el club y las valoraciones de cada miembro
- Genera recomendaciones personalizadas usando **Groq** (llama-3.3-70b-versatile)
- Muestra en qué plataformas está disponible cada recomendación en tu país
- Permite nominar directamente una recomendación a la sesión activa

## Stack

- **Next.js 15** App Router + TypeScript
- **Supabase** Auth · PostgreSQL · Realtime · Storage
- **TMDB API** búsqueda, cartelera y proveedores de streaming
- **Groq API** recomendaciones con IA (llama-3.3-70b-versatile)
- **Nominatim** reverse geocoding para detectar el país del usuario
- **Tailwind CSS** estilos
- **Vercel** despliegue
