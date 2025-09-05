#!/usr/bin/env bash
set -u
shopt -s globstar nullglob

out=IMAGE_DISTRIBUTION.md
repo=${repo:-MAI_DS_2}
now=$(date +'%Y-%m-%d %H:%M:%S')

# Collect image files (relative paths)
mapfile -t images < <(find . -type f \( -iname '*.png' -o -iname '*.jpg' -o -iname '*.jpeg' -o -iname '*.webp' -o -iname '*.svg' -o -iname '*.ico' \) \
  -not -path './node_modules/*' | sed 's#^\./##' | sort -u)

# Collect references: src/srcset/url()
rg -n --no-heading -S -g '!node_modules/**' \
  -e 'srcset=|src=|href=' \
  -e 'url\(' \
  -e 'content:.*url\(' \
  > .img_refs_raw.txt || true

# Parse references and resolve relative to file dir
> .img_refs.txt
while IFS= read -r line; do
  file=${line%%:*}
  rest=${line#*:}
  # Extract candidates ending with common image extensions
  while read -r ref; do
    # Strip wrapping quotes and whitespace
    ref=${ref#\'}; ref=${ref#\"}; ref=${ref%\' }; ref=${ref%\"}
    ref=${ref%\"}; ref=${ref%\')}; ref=${ref%)}
    # Drop query/hash
    ref=${ref%%\?*}; ref=${ref%%#*}
    # Skip data URIs and absolute URLs
    if [[ $ref == data:* || $ref == http:* || $ref == https:* ]]; then continue; fi
    # Keep only plausible image refs
    if [[ $ref =~ \.(png|jpg|jpeg|webp|svg|ico)$ ]]; then
      # Normalize ./
      ref=${ref#./}
      # Resolve relative to file dir
      dir=$(dirname "$file")
      dir=${dir#./}
      full=$(python - "$dir" "$ref" <<'PY'
import os,sys
print(os.path.normpath(os.path.join(sys.argv[1], sys.argv[2])).replace('\\','/'))
PY
)
      echo "$full => $file" >> .img_refs.txt
    fi
  done < <(printf '%s\n' "$rest" | \
            rg -o "(srcset|src|href)=(\\\"|\\')?[^>\\\"']+" -N -a | rg -o "[A-Za-z0-9_./-]+\\.(png|jpg|jpeg|webp|svg|ico)" -N -a; \
          printf '%s\n' "$rest" | rg -o "url\\(([^)]+)\\)" -N -a | rg -o "[A-Za-z0-9_./-]+\\.(png|jpg|jpeg|webp|svg|ico)" -N -a )
done < .img_refs_raw.txt

sort -u .img_refs.txt > .img_refs_uniq.txt || true
mapfile -t referenced < <(cut -d' ' -f1 .img_refs_uniq.txt | sort -u)

# Add dynamic slideshow references from JS imageData
if [[ -f assets/js/script.js ]]; then
  mapfile -t jsfiles < <(rg -n --no-heading -o "filename:\s*'([^']+)'" assets/js/script.js | sed -E "s/.*'([^']+)'.*/\1/" | sort -u)
  for f in "${jsfiles[@]:-}"; do
    referenced+=("images/slide/$f")
  done
  # de-duplicate
  mapfile -t referenced < <(printf '%s\n' "${referenced[@]}" | sort -u)
fi

# Orphans and broken refs
mapfile -t orphans < <(comm -23 <(printf '%s\n' "${images[@]}" | sort -u) <(printf '%s\n' "${referenced[@]}" | sort -u))
mapfile -t broken < <(comm -13 <(printf '%s\n' "${images[@]}" | sort -u) <(printf '%s\n' "${referenced[@]}" | sort -u))

{
  echo $'\ufeff# Image Distribution Report'
  echo
  echo "Generated on: $now"
  echo "Repository: $repo"
  echo
  echo '## Summary'
  echo "- Total images: ${#images[@]}"
  echo "- Referenced images: ${#referenced[@]}"
  echo "- Unreferenced images: ${#orphans[@]}"
  echo "- Broken reference paths: ${#broken[@]}"
  echo
  if ((${#orphans[@]})); then
    echo '## Unreferenced (Orphaned) Images'
    for f in "${orphans[@]}"; do
      echo "- \`$f\`"
    done
    echo
  fi
  if ((${#broken[@]})); then
    echo '## Broken Image References'
    while IFS= read -r miss; do
      echo "- \`$miss\`"
      rg -n --no-heading -S --fixed-strings "$miss" -g '!node_modules/**' | sed 's/^/    in: /'
    done < <(printf '%s\n' "${broken[@]}")
    echo
  fi
  echo '## Referenced Image Map (sample)'
  printf '%s\n' "${referenced[@]}" | head -n 30 | sed 's/^/- `&`/'
} > "$out"

echo "Wrote $out"
