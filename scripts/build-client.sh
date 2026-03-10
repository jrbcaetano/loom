#!/usr/bin/env bash
set -euo pipefail

# Stable wrapper to avoid shell-quoting differences across environments.
npm run build:client
