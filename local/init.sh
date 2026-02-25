#!/usr/bin/env bash

set -e

echo -e "1. Set up local environment:"

./init-env.sh
source .env

echo -e "2. Start local stack:"

docker-compose build --build-arg DATABASE_URL=${DATABASE_URL}

docker-compose up -d

echo "Containers: done"

echo -e "3. Initialize database:"

docker-compose exec postgres docker-entrypoint-initdb.d/init-db.sh

echo -e "4. Run migrations:"

docker-compose run --rm backend npm run db:migrate

echo -e "5. Seed local database:"

docker-compose run --rm backend npm run db:seed
