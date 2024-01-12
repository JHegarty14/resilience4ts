.PHONY: ci help test package build

ci:
ifdef NPM_REGISTRY
	npm install -g pnpm
	pnpm config set @forts:registry ${NPM_REGISTRY}/
endif
	if [ ! -d ./node_modules ]; then pnpm i --frozen-lockfile; fi

test: ci
	pnpm test

package: ci
	npm install -g npm-cli-login
	npm-cli-login
	pnpm build
	pnpm --filter "./packages/**" publish

prerelease: ci
	npm install -g npm-cli-login
	npm-cli-login
	pnpm build
	pnpm --filter "./packages/**" publish --tag next

prerelease_ci: 
	pipenv sync --dev
	pipenv run build_package -repo resilience4ts -code-dir $(CURDIR) --prerelease

coverage:
	npm i -g pnpm
	pnpm i --frozen-lockfile
	pnpx jest --coverage
