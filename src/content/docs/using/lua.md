---
title: Using quid.lua
description: A guide to using QUID's simplest reference implementation.
---

This page is intended to describe how to make a simple script for creating new note pages can be built using [quid.lua](/implementations/lua/). Until this can be written out in more detail, here's the example (read [about how-to guides](https://diataxis.fr/how-to-guides/) in the Diátaxis framework):

```bash
#! /usr/bin/env bash

QUID_TYPE=${QUID_TYPE:-r}
SHIFTED_ARG=''
if [[ "$1" == -[rRT] ]]; then
  QUID_TYPE=${1##-}
  SHIFTED_ARG=" $1"
  shift
fi

LINK_NAME=${LINK_NAME:-$1}
if [[ -z "$LINK_NAME" ]]; then
  read LINK_NAME
fi

if [[ -z "$CONTENT_DIR" && -d content ]]; then
  CONTENT_DIR=content/
fi

if [[ -n "$CONTENT_DIR" && "${CONTENT_DIR: -1}" != "/" ]]; then
  CONTENT_DIR=$CONTENT_DIR/
fi

## here's the meat

quid=$(quid.lua -$QUID_TYPE)
cat >"$CONTENT_DIR$quid.md" <<EOF
---
created: $(date -Iseconds | sed s/+00:00/Z/)
author: Example Author <email@example.com> (https://example.com/)
# Add any other template frontmatter you want here
---
# $LINK_NAME
EOF
echo "[$LINK_NAME]($quid)"
```
