#!/bin/sh
set -eu

prepare_volume() {
  directory="$1"
  marker="$directory/.procal-owned-by-node"

  mkdir -p "$directory"
  if [ ! -f "$marker" ]; then
    chown -R node:node "$directory"
    touch "$marker"
    chown node:node "$marker"
  else
    chown node:node "$directory"
  fi
}

if [ "$(id -u)" = "0" ]; then
  prepare_volume /app/config
  prepare_volume /app/backups
  exec setpriv --reuid=node --regid=node --init-groups "$@"
fi

exec "$@"
