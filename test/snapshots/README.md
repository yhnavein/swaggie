# Snapshots

This directory contains snapshots of all supported templates. This is a very simple
mechanism for detecting (wanted or not) changes in the output of the templates.

The files are rendered as-is without Prettier formatting.

Do not make any manual changes in this directory.

## Updating snapshots

To update the snapshots, run `UPDATE_SNAPSHOTS=1 bun test`
