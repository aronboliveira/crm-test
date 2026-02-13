#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROWS="${1:-800}"

mkdir -p "$ROOT_DIR"

csv_file="$ROOT_DIR/import-large.csv"
json_file="$ROOT_DIR/import-large.json"
xml_file="$ROOT_DIR/import-large.xml"
md_file="$ROOT_DIR/import-large.md"

echo "type,name,description,status,priority,dueAt,tags,projectId" >"$csv_file"
for ((i = 1; i <= ROWS; i++)); do
  if ((i % 5 == 0)); then
    printf "project,Projeto %04d,Projeto importado em lote,active,3,2026-12-%02d,import;bulk,\n" \
      "$i" $(((i % 28) + 1)) >>"$csv_file"
  else
    printf "task,Tarefa %04d,Tarefa importada em lote,todo,%d,2026-11-%02d,import;task,PRJ-%03d\n" \
      "$i" $(((i % 5) + 1)) $(((i % 28) + 1)) $(((i % 120) + 1)) >>"$csv_file"
  fi
done

{
  echo "["
  for ((i = 1; i <= ROWS; i++)); do
    if ((i % 6 == 0)); then
      printf '{"type":"project","name":"Projeto JSON %04d","description":"Projeto json em massa","status":"planned","priority":3,"dueAt":"2026-10-%02d","tags":"json,bulk"}' \
        "$i" $(((i % 28) + 1))
    else
      printf '{"type":"task","title":"Tarefa JSON %04d","description":"Tarefa json em massa","status":"doing","priority":%d,"dueAt":"2026-09-%02d","projectId":"PRJ-%03d","tags":"json,task"}' \
        "$i" $(((i % 5) + 1)) $(((i % 28) + 1)) $(((i % 120) + 1))
    fi
    if ((i < ROWS)); then
      echo ","
    else
      echo
    fi
  done
  echo "]"
} >"$json_file"

{
  echo "<items>"
  for ((i = 1; i <= ROWS; i++)); do
    if ((i % 7 == 0)); then
      printf '  <item type="project"><name>Projeto XML %04d</name><description>Projeto xml em massa</description><status>active</status><priority>3</priority><dueAt>2026-08-%02d</dueAt><tags>xml,bulk</tags></item>\n' \
        "$i" $(((i % 28) + 1))
    else
      printf '  <item type="task"><title>Tarefa XML %04d</title><description>Tarefa xml em massa</description><status>todo</status><priority>%d</priority><dueAt>2026-07-%02d</dueAt><projectId>PRJ-%03d</projectId><tags>xml,task</tags></item>\n' \
        "$i" $(((i % 5) + 1)) $(((i % 28) + 1)) $(((i % 120) + 1))
    fi
  done
  echo "</items>"
} >"$xml_file"

{
  echo "| type | name | title | description | status | priority | dueAt | tags | projectId |"
  echo "| --- | --- | --- | --- | --- | --- | --- | --- | --- |"
  for ((i = 1; i <= ROWS; i++)); do
    if ((i % 8 == 0)); then
      printf "| project | Projeto MD %04d |  | Projeto markdown em massa | active | 3 | 2026-06-%02d | md,bulk |  |\n" \
        "$i" $(((i % 28) + 1))
    else
      printf "| task |  | Tarefa MD %04d | Tarefa markdown em massa | doing | %d | 2026-05-%02d | md,task | PRJ-%03d |\n" \
        "$i" $(((i % 5) + 1)) $(((i % 28) + 1)) $(((i % 120) + 1))
    fi
  done
} >"$md_file"

printf "Generated fixtures (%s rows each):\n- %s\n- %s\n- %s\n- %s\n" \
  "$ROWS" "$csv_file" "$json_file" "$xml_file" "$md_file"
