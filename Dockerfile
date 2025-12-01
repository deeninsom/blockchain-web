# Stage 1: Dependency Installation & Build (Base Image)
# Menggunakan node:20-slim sebagai base image
FROM node:20-slim AS builder

# Atur working directory di dalam container
WORKDIR /app

# Salin package.json dan pnpm-lock.yaml (semua file yang diperlukan untuk instalasi dependensi)
COPY package.json pnpm-lock.yaml ./

# 💡 PERBAIKAN 1: Instalasi pnpm secara eksplisit di dalam container
RUN corepack enable && corepack prepare pnpm@latest --activate

# 💡 PERBAIKAN 2: Instalasi OpenSSL
# OpenSSL diperlukan oleh Prisma untuk menghindari warning dan potensi error runtime.
RUN apt-get update -y && apt-get install -y openssl

# Instal semua dependensi menggunakan pnpm (Initial install)
RUN pnpm install

# Salin sisa file proyek Anda (termasuk kode sumber dan schema.prisma)
COPY . .

# 🚀 PERBAIKAN UTAMA: Set ENV CI=true
# Ini mengatasi error 'ERR_PNPM_ABORTED_REMOVE_MODULES_DIR_NO_TTY'
ENV CI=true

# 💡 PERBAIKAN 3: Jalankan pnpm install lagi
# Ini langkah KRUSIAL untuk pnpm dan Prisma di Docker.
# Ini memastikan pnpm memverifikasi dan membangun kembali symlink node_modules 
# dengan semua file proyek (termasuk schema.prisma) yang kini ada di WORKDIR,
# sehingga mengatasi error umum 'Cannot find module @prisma/engines'.
RUN pnpm install

# Pastikan Prisma Client dibuat sebelum build
# Perintah ini menggunakan binary Prisma versi terinstal (v6.x)
RUN pnpm prisma:generate
RUN pnpm migrate:dev

# Lakukan proses build Next.js
RUN pnpm run build

# Stage 2: Production Runtime Image (Final Image)
FROM node:20-slim AS runner

# Atur working directory
WORKDIR /app

# Atur variabel environment Next.js untuk produksi
ENV NODE_ENV production
ENV HOST 0.0.0.0
ENV PORT 3000

# 💡 OPTIMASI: Meningkatkan keamanan dengan menjalankan sebagai user non-root
USER node

# Salin hanya yang diperlukan dari stage 'builder'
# Gunakan --chown agar file dimiliki oleh user 'node'

# 1. next.config.js dan public
COPY --from=builder --chown=node:node /app/public ./public
COPY --from=builder --chown=node:node /app/next.config.js ./

# 2. Folder .next (hasil build)
COPY --from=builder --chown=node:node /app/.next ./.next

# 3. node_modules (hanya dependensi produksi yang idealnya disalin, 
# namun untuk kesederhanaan, kita salin yang sudah ada)
COPY --from=builder --chown=node:node /app/node_modules ./node_modules

# 4. Prisma Client runtime files
COPY --from=builder --chown=node:node /app/node_modules/.prisma ./node_modules/.prisma


# Expose port yang digunakan oleh Next.js
EXPOSE 3000

# Perintah utama untuk menjalankan aplikasi Next.js
CMD ["pnpm", "start"]