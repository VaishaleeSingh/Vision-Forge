FROM node:20-bookworm-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 python3-pip \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Render sets NODE_ENV=production during build; Next.js build needs devDependencies.
ENV NPM_CONFIG_PRODUCTION=false

COPY package.json package-lock.json ./

RUN node --version && npm --version \
  && ls -la package.json package-lock.json \
  && npm ci --include=dev --no-audit --no-fund

COPY requirements-ml.txt ./
RUN pip3 install --break-system-packages --no-cache-dir -r requirements-ml.txt

COPY . .

RUN npm run build

ENV NODE_ENV=production
ENV NPM_CONFIG_PRODUCTION=true
ENV PYTHON_PATH=python3
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

EXPOSE 3000

CMD ["sh", "-c", "node node_modules/.bin/next start -H 0.0.0.0 -p ${PORT:-3000}"]
