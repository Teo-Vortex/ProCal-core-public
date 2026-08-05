# ProCal Core

ProCal Core is the self-hosted edition of ProCal: a LAN/offline-ready calendar, task, file, leave, chat, notification, and admin workspace.

This repository contains only the self-hosted Core application. It does not include the hosted SaaS platform, Control plane, Public portal, billing, or managed hosting automation.

## Release Source

Official public releases are exported only from the stable ProCal Platform source (`main`/`stable` branch or a release tag). Each generated public package includes `SOURCE_BUILD.md` with the source commit, branch/tag, export time, and release version.

Use Docker tags such as `latest` or `stable` only when `SOURCE_BUILD.md` says the export came from stable source and a clean worktree.

## License

ProCal Core is released under the GNU Affero General Public License v3.0 only (`AGPL-3.0-only`).

The ProCal name, logos, and brand assets are not licensed for unrestricted use. See `TRADEMARKS.md`.

## What Runs

- ProCal Core web app and API
- MariaDB
- Internal update manager for prebuilt-image installations
- Local Docker volumes for database, runtime config, and backups

## Install

Prerequisites:

- Docker
- Docker Compose

The official prebuilt image currently targets `linux/amd64` (x86-64). ARM64 and Raspberry Pi images are not published or tested yet.

### Guided Installer

On Windows:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\install-ui.ps1
```

Command-line installer:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\install.ps1
```

The installer creates `.env` with generated local database passwords, asks for port/network settings, and starts ProCal Core with Docker Compose.

### Build From Source

Use this when you cloned the repository and want Docker to build the local source tree.

On Windows:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\start.ps1
```

Manual start:

```powershell
Copy-Item .\.env.example .\.env
docker compose --env-file .\.env -f .\docker-compose.yml up -d --build
```

### Install From Prebuilt Image

Use this when the project publishes a Docker image to GitHub Container Registry.

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\install.ps1 -Mode image -Image ghcr.io/teo-vortex/procal-core-public:latest
```

Manual image start:

```powershell
Copy-Item .\.env.example .\.env
# Edit .env and set PROCAL_CORE_IMAGE=ghcr.io/teo-vortex/procal-core-public:latest
docker compose --env-file .\.env -f .\docker-compose.image.yml up -d
```

Open:

```text
http://localhost:8080/setup
```

Enter the `PROCAL_SELF_SETUP_TOKEN` value from the local `.env` file when creating the first administrator. The guided installers generate and print this one-time setup token automatically.

For another computer on the same LAN:

```text
http://<server-ip>:8080/setup
```

## First Setup

Open `/setup` and create the first admin account. After install, `/setup` is locked and the normal entry point is `/login`.

New users can register locally from `/register`; accounts remain pending until an admin approves them.

## Backups

Use `Admin -> Backups` and export an encrypted `full` backup before updates or risky changes. Store both the backup file and key outside the server.

## Updates

Prebuilt-image installations run a third internal container named `updater`. A `system_admin` can open `Admin -> Updates`, check the published GHCR image, and start an update. The updater pulls only the configured ProCal image repository, replaces only the application container, waits for its health check, and restores the previous container automatically if startup fails. The database and persistent volumes are not replaced.

The updater has no host port and does not receive database, file-storage, backup, or Firebase credentials. It does mount `/var/run/docker.sock`, which is a privileged host capability. Keep the updater image and `PROCAL_UPDATER_TOKEN` private to the installation, and do not expose the updater service outside the Compose network.

After a successful update, one previous application container is retained for manual rollback. Export a full encrypted backup first because application rollback cannot reverse database migrations. Source-build installations continue to update by pulling source and rebuilding with Docker Compose.

## Optional Mobile Push

Firebase push is disabled by default. This package does not include Firebase credentials, service accounts, or `google-services.json`.

The installation owner can upload credentials for their own Firebase project from `Admin -> Notifications`. ProCal encrypts the server credential in the persistent local config volume. Generic payload mode is the default: Firebase receives generic notification text and routing metadata, while the real content stays in ProCal Core. Detailed mode is optional and sends notification titles and bodies through Firebase.

## Third-Party Notices

Runtime dependency notices are included in `THIRD_PARTY_NOTICES.md` and `docs/compliance/`.

## AI Assistance

This project was developed with AI assistance and human review. Maintainers remain responsible for review, testing, licensing, and release decisions.

## Security

Please do not open a public issue with a vulnerability report. See `SECURITY.md`.
