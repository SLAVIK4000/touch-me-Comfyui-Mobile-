#!/usr/bin/env bash
# build_comfyui_web.sh — пересборка web/ из исходников Next.js.
#
# web/ — это статический экспорт приложения (output: "export",
# basePath: "/touchme"), который отдаёт корневая кастом-нода
# (__init__.py) прямо из ComfyUI. Каталог коммитится в репозиторий,
# поэтому запуск нужен только после правок src/.
#
# Как это работает: серверные маршруты Next.js (src/app/api) нельзя
# экспортировать статикой, поэтому на время сборки они выносятся во
# временную папку и возвращаются обратно; конфиг подменяется на
# экспортный и тоже возвращается. В статическом бандле списки моделей
# обслуживает встроенный демо-набор (demo_models.ts).
#
# После экспорта из бандла удаляются файлы, мёртвые для кастом-ноды
# (_not-found/, 404/, 404.html, robots.txt): неизвестные пути нода
# всё равно отдаёт как index.html. Это держит репозиторий ниже лимита
# 100 файлов веб-загрузки GitHub.
#
# Требования: bash, установленные зависимости (npm install / bun install).
set -euo pipefail
cd "$(dirname "$0")/.."

if [ ! -d node_modules ]; then
  echo "нет node_modules — сначала выполните npm install (или bun install)" >&2
  exit 1
fi

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

# 1. выносим серверный маршрут: статическому экспорту он запрещён
API_SRC=""
if [ -d src/app/api ]; then
  API_SRC="src/app/api"
  mv src/app/api "$TMP/api"
fi

# 2. подменяем конфиг на экспортный
cp next.config.ts "$TMP/next.config.ts.backup"
cat > next.config.ts <<'EOF'
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  basePath: "/touchme",
  trailingSlash: true,
  images: { unoptimized: true },
  reactStrictMode: false,
};

export default nextConfig;
EOF

restore() {
  mv "$TMP/next.config.ts.backup" next.config.ts
  if [ -n "$API_SRC" ] && [ -d "$TMP/api" ]; then
    mv "$TMP/api" "$API_SRC"
  fi
}
trap restore EXIT

# 3. сборка
rm -rf .next out
npx next build

# 4. публикуем бандл
rm -rf web
cp -r out web

# 5. чистим файлы, мёртвые для ноды (неизвестные пути отдаёт index.html)
rm -rf web/_not-found web/404 web/404.html web/robots.txt

echo "готово: web/ пересобран ($(find web -type f | wc -l) файлов)"
ls web | head
