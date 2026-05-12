#!/usr/bin/env bash
set -euo pipefail

branch="${AUTOSAVE_BRANCH:-autosave}"
remote="${AUTOSAVE_REMOTE:-origin}"
timestamp="$(date -u +"%Y-%m-%d %H:%M:%S UTC")"

repo_root="$(git rev-parse --show-toplevel)"
cd "$repo_root"

lock_file="/tmp/$(basename "$repo_root")-git-autosave.lock"
exec 9>"$lock_file"
if ! flock -n 9; then
  exit 0
fi

if git diff --quiet --ignore-submodules -- &&
  git diff --cached --quiet --ignore-submodules -- &&
  [ -z "$(git ls-files --others --exclude-standard)" ]; then
  exit 0
fi

tmp_index="$(mktemp)"
cleanup() {
  rm -f "$tmp_index"
}
trap cleanup EXIT

export GIT_INDEX_FILE="$tmp_index"
git read-tree HEAD
git add -A

if git diff-index --quiet --cached HEAD --; then
  exit 0
fi

tree="$(git write-tree)"
parent_args=()

if git show-ref --verify --quiet "refs/heads/$branch"; then
  parent_args=(-p "$(git rev-parse "refs/heads/$branch")")
else
  parent_args=(-p HEAD)
fi

commit_message="autosave: $timestamp"
commit_id="$(printf '%s\n' "$commit_message" | git commit-tree "$tree" "${parent_args[@]}")"
git update-ref "refs/heads/$branch" "$commit_id"

if git remote get-url "$remote" >/dev/null 2>&1; then
  if ! git push "$remote" "refs/heads/$branch:refs/heads/$branch"; then
    echo "Autosave snapshot created locally on '$branch' as $commit_id, but push failed." >&2
  fi
fi
