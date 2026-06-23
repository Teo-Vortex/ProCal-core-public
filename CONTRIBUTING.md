# Contributing

Thanks for taking the time to improve ProCal Core.

## Scope

This repository is for the self-hosted Core application only.

The hosted SaaS platform, Control plane, Public portal, billing, provisioning, and managed hosting tooling are not part of this repository.

## Development

Run the self-hosted stack:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\start.ps1
```

Core server build:

```powershell
cd server
npm ci
npm run build
```

## Pull Requests

- Keep changes focused.
- Include tests or a clear manual verification note for behavior changes.
- Do not commit generated secrets, `.env`, local backups, Firebase credentials, or customer data.

## AI-Assisted Contributions

You may use AI tools while contributing, but you are responsible for the submitted code. Do not submit code copied from proprietary projects, private repositories, leaked material, or sources whose license is incompatible with AGPL-3.0-only.

## Certificate of Origin

By contributing, you certify that you have the right to submit the contribution under the repository license.
