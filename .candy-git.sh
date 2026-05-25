#!/bin/bash
GIT_DIR=/tmp/candy-git
WORK_TREE=/sessions/inspiring-eloquent-carson/mnt/candy-book
exec git --git-dir="$GIT_DIR" --work-tree="$WORK_TREE" "$@"
