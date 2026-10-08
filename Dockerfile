FROM node:24.12.0-bookworm-slim@sha256:7326fb2dbdce998edd72140946851be64ef4a643e8715e138ca467e8e9d92c99 AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

COPY package.json ./
RUN npm install --global "$(node -p 'require("./package.json").packageManager')" \
    && node --version \
    && npm --version \
    && npm cache clean --force

FROM base AS dependencies
COPY package-lock.json .npmrc ./
RUN npm ci

FROM dependencies AS build
COPY . .
ARG SITE_ORIGIN=https://brightfield-solar-three.vercel.app
ARG VERCEL_ENV=production
ENV SITE_ORIGIN=${SITE_ORIGIN} \
    VERCEL_ENV=${VERCEL_ENV}
RUN npm run build

FROM base AS runtime
ENV NODE_ENV=production \
    HOSTNAME=0.0.0.0 \
    PORT=3000
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/public ./public
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/licenses ./licenses
COPY --from=build /app/src/app/fonts/LICENSE.txt ./licenses/ibm-plex/LICENSE.txt
RUN mkdir -p .next/cache && chown node:node .next/cache
USER node
EXPOSE 3000
CMD ["node", "server.js"]
