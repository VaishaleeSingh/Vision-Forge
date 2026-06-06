FROM node:20-bookworm-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 python3-pip \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

RUN npm install -g npm@11

COPY . .

# Install all deps (including devDependencies for the Next.js build).
ENV NODE_ENV=development
ENV NPM_CONFIG_PRODUCTION=false
RUN npm install --no-audit --no-fund

RUN pip3 install --break-system-packages --no-cache-dir -r requirements-ml.txt

# next build must run with NODE_ENV=production (development breaks client prerender).
ENV NODE_ENV=production
ENV NPM_CONFIG_PRODUCTION=true
RUN npm run build

ENV PYTHON_PATH=python3
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

EXPOSE 3000

CMD ["sh", "-c", "node node_modules/.bin/next start -H 0.0.0.0 -p ${PORT:-3000}"]
