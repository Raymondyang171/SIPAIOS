# demo_reset_after_gate.sh mapping

command -> file -> purpose

docker inspect "$DB_CONTAINER" -> scripts/demo_reset_after_gate.sh -> verify container exists
docker inspect -f '{{.State.Running}}' "$DB_CONTAINER" -> scripts/demo_reset_after_gate.sh -> verify container is running
docker exec -i "$DB_CONTAINER" psql -v ON_ERROR_STOP=1 -U "$DB_USER" -d "$DB_NAME" < "$file" -> scripts/demo_reset_after_gate.sh -> apply seed SQL inside container (avoid host psql / role root issues)
