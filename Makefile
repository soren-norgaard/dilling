.PHONY: up dev down seed reset logs demo build clean

# Production mode
up:
	docker compose up -d

# Development mode with hot reload
dev:
	docker compose -f docker-compose.yml -f docker-compose.dev.yml up

# Stop all services
down:
	docker compose down

# Run data seeder
seed:
	npx tsx scripts/seed.ts

# Build production images
build:
	docker compose build

# Nuke everything and rebuild from scratch
reset:
	docker compose down -v
	docker compose up -d
	@echo "Waiting for services to be healthy..."
	@sleep 10
	npx tsx scripts/seed.ts
	@echo "✅ Reset complete. Visit http://localhost:4000"

# Follow app logs
logs:
	docker compose logs -f app

# One-command demo
demo:
	@echo "🧶 Dilling E-Commerce — Starting Demo..."
	docker compose down -v 2>/dev/null || true
	docker compose up -d --build
	@echo "⏳ Waiting for services..."
	@sleep 10
	npx tsx scripts/seed.ts
	@echo ""
	@echo "✅ Demo ready! Open http://localhost:4000"
	@echo "🔍 Meilisearch dashboard: http://localhost:7700"
	@open http://localhost:4000 2>/dev/null || true

# Clean all Docker artifacts
clean:
	docker compose down -v --rmi local
	rm -rf .next node_modules

# ── Testing ──

.PHONY: test test-watch test-coverage test-integration test-components test-all

# Run unit tests once
test:
	npm run test:unit

# Run unit tests in watch mode
test-watch:
	npm run test:unit:watch

# Run unit tests with coverage report
test-coverage:
	npm run test:unit:coverage

# Run API integration tests
test-integration:
	npm run test:integration

# Run component tests
test-components:
	npm run test:components

# Run all test suites
test-all:
	npm run test:all
