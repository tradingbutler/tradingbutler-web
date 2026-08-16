# Docker image name
IMAGE_NAME=tradingbutler-web
CONTAINER_NAME=tradingbutler-web
PORT=8080

# Local development commands
run:
	RATES_JSON_PATH=public/rates.json \
	BROKERS_JSON_PATH=public/brokers.json \
		bun run start

dev: run

install:
	bun install

build:
	bun run build

test:
	bun run test

# Run the built SSR server the way the container does
start-prod:
	node dist/web/server/server.mjs

# Build the Docker image
docker-build:
	docker build -t $(IMAGE_NAME) \
		--progress=plain \
		.

# Same image, but on the distroless :debug base so `make shell` works
docker-build-debug:
	docker build -t $(IMAGE_NAME) \
		--build-arg RUNNER_IMAGE=gcr.io/distroless/nodejs26-debian13:debug-nonroot \
		--progress=plain \
		.

# Run the container
docker-run:
	docker run -it --rm --name $(CONTAINER_NAME) \
		-p $(PORT):8080 $(IMAGE_NAME)

docker-push:
	docker buildx build \
		-t dimitrmok/tradingbutler-web:latest \
		--platform linux/amd64,linux/arm64 \
		-f Dockerfile \
		--progress=plain \
		--push \
		.

# Stop the container
stop:
	docker stop $(CONTAINER_NAME) || true
	docker rm $(CONTAINER_NAME) || true

# Build and run
up: docker-build stop docker-run

# View logs
logs:
	docker logs -f $(CONTAINER_NAME)

# Shell into container (requires `make docker-build-debug` — the release image has no shell)
shell:
	docker exec -it $(CONTAINER_NAME) /busybox/sh

# Clean up
clean: stop
	docker rmi $(IMAGE_NAME) || true

.PHONY: run dev install build test start-prod docker-build docker-build-debug docker-run docker-push stop up logs shell clean
