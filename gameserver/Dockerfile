# ── Build stage ──────────────────────────────────────────────────────────────
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# Copy all source first
COPY gameserver/src/ ./
COPY proto/ ../proto/

# Restore and Publish
RUN dotnet publish RavennaServer/RavennaServer.csproj \
    -c Release -o /app/publish

# ── Runtime stage ─────────────────────────────────────────────────────────────
FROM mcr.microsoft.com/dotnet/runtime:8.0 AS runtime
WORKDIR /app

COPY --from=build /app/publish .

# JWT public key is mounted at runtime (not baked into image)
RUN mkdir -p /app/keys

RUN apt-get update && apt-get install -y --no-install-recommends wget \
    && rm -rf /var/lib/apt/lists/*

ENV DOTNET_SYSTEM_GLOBALIZATION_INVARIANT=1

EXPOSE 7777/udp
EXPOSE 7778/tcp

ENTRYPOINT ["dotnet", "RavennaServer.dll"]
