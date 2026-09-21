# GNU Make 4.3+ owns the dependency graph and command recipes.
NODE ?= node
NPM ?= npm
BROWSER ?= chromium
DIST ?= dist
PROFILE ?=
URL ?=
BINARY ?=
.DEFAULT_GOAL := help
.DELETE_ON_ERROR:
# Release gates and output writers must remain ordered, including under make -j.
.NOTPARALLEL:

export HP_BROWSER = $(BROWSER)
export HP_DIST = $(DIST)
export HP_PROFILE = $(PROFILE)
export HP_URL = $(URL)
export HP_BINARY = $(BINARY)

INSTALL_STAMP := node_modules/.make-install-stamp
ICON_FILES := $(addprefix assets/icons/icon,16.png 32.png 48.png 128.png) chrome-store/assets/store-icon-128.png
BUILD_INPUTS := $(wildcard src/*/*.ts src/*/*.html src/*/*.css public/_locales/*/*.json) public/manifest.json package.json scripts/build.mjs LICENSE THIRD-PARTY-NOTICES.txt
BUILD_OUTPUTS := $(addprefix dist/,content.js background.js popup.js options.js popup.html popup.css options.html options.css manifest.json LICENSE THIRD-PARTY-NOTICES.txt) $(patsubst public/%,dist/%,$(wildcard public/_locales/*/*.json)) $(addprefix dist/assets/icons/icon,16.png 32.png 48.png 128.png)
# Development source maps must never be reused as a production build.
BUILD_FORCE := $(if $(wildcard dist/*.map),FORCE)

.PHONY: help doctor setup install dependencies setup-browser build rebuild build-validate dev run run-chrome run-edge run-chromium test test-watch test-tooling test-backend test-browser test-ui typecheck check test-all icons promo screenshots assets store-generate assets-validate store-validate package release store-release release-full ci fixture release-files clean clean-all FORCE

help: ## Show commands defined in this Makefile
	@"$(NODE)" scripts/make-help.mjs

doctor: ## Check Node.js, npm, GNU Make, and optional Python tools
	@"$(NODE)" -e "if(Number(process.versions.node.split('.')[0])<20)process.exit(1); console.log('Node.js',process.version)"
	@$(NPM) --version
	@$(MAKE) --version
	@"$(NODE)" scripts/python.mjs --doctor

setup: doctor dependencies ## Verify tools and install locked dependencies

install: ## Reinstall npm dependencies from the lockfile
	$(NPM) ci --no-audit --no-fund
	@"$(NODE)" -e "require('node:fs').writeFileSync('$(INSTALL_STAMP)','installed')"

dependencies: $(INSTALL_STAMP) ## Install npm dependencies when manifests change

$(INSTALL_STAMP): package.json package-lock.json
	$(NPM) ci --no-audit --no-fund
	@"$(NODE)" -e "require('node:fs').writeFileSync('$(INSTALL_STAMP)','installed')"

setup-browser: ## Set up local Python Playwright and Chromium
	"$(NODE)" scripts/setup-browser.mjs

$(ICON_FILES) &: assets/icon-source.png scripts/store-assets/icons.mjs scripts/store-assets/shared.mjs $(INSTALL_STAMP)
	"$(NODE)" scripts/store-assets/icons.mjs

icons: $(ICON_FILES) ## Generate missing or changed extension icons

$(BUILD_OUTPUTS) &: $(BUILD_INPUTS) $(ICON_FILES) $(INSTALL_STAMP) $(BUILD_FORCE)
	"$(NODE)" scripts/build.mjs

build: $(BUILD_OUTPUTS) ## Build missing or changed production output

rebuild: ## Force a fresh production build
	"$(NODE)" scripts/clean.mjs --build-only
	$(MAKE) build

build-validate: build ## Validate current production output
	"$(NODE)" scripts/validate-build.mjs

dev: icons ## Watch extension source and static files
	"$(NODE)" scripts/build.mjs --watch

ifeq ($(DIST),dist)
run run-chrome run-edge run-chromium: build
endif
run: ## Launch an isolated browser profile
	"$(NODE)" scripts/run-extension.mjs
run-chrome: export HP_BROWSER = chrome
run-chrome: run ## Launch Chrome
run-edge: export HP_BROWSER = edge
run-edge: run ## Launch Edge
run-chromium: export HP_BROWSER = chromium
run-chromium: run ## Launch Chromium

typecheck: dependencies ## Check TypeScript
	"$(NODE)" node_modules/typescript/bin/tsc --noEmit

test: dependencies ## Run unit and regression tests
	"$(NODE)" node_modules/vitest/vitest.mjs run

test-watch: dependencies ## Watch unit tests
	"$(NODE)" node_modules/vitest/vitest.mjs

test-tooling: ## Test Make recipes and command launchers
	"$(NODE)" --test tests/tooling.test.mjs

test-backend: build ## Test the current compiled worker
	"$(NODE)" --test tests/backend.test.cjs

.test-build/harness.js: $(wildcard src/*/*.ts) tests/browser-harness.ts scripts/build-regression-harness.mjs $(INSTALL_STAMP)
	"$(NODE)" scripts/build-regression-harness.mjs

test-browser: .test-build/harness.js ## Run browser DOM regressions
	"$(NODE)" scripts/run-python-tests.mjs browser_regressions.py

test-ui: build ## Run popup and settings browser tests
	"$(NODE)" scripts/run-python-tests.mjs ui_regressions.py

check: typecheck test test-tooling build-validate test-backend ## Run code, tooling, build, and worker checks

test-all: check test-browser test-ui ## Run all automated checks

promo: dependencies ## Generate promotional artwork
	"$(NODE)" scripts/store-assets/promo.mjs

screenshots: dependencies ## Generate store screenshot illustrations
	"$(NODE)" scripts/store-assets/screenshots-a.mjs
	"$(NODE)" scripts/store-assets/screenshots-b.mjs

assets: icons screenshots promo ## Generate all store artwork
store-generate: assets ## Alias for assets

assets-validate: assets ## Generate and validate store artwork
	"$(NODE)" scripts/validate-store-assets.mjs
store-validate: assets-validate ## Alias for assets-validate

package: build-validate assets-validate ## Build, validate, and package without tests
	"$(NODE)" scripts/package-release.mjs

release: check package ## Require core checks before packaging
store-release: release ## Alias for release
release-full: test-all package ## Require all browser and core checks before packaging

ci: install release ## Clean dependency installation and validated release

fixture: ## Serve the local compatibility page
	"$(NODE)" scripts/serve-fixture.mjs

release-files: ## List generated release files
	@"$(NODE)" -e "const fs=require('node:fs'); console.log(fs.existsSync('release')?fs.readdirSync('release').sort().join('\n'):'No release output')"

clean: ## Remove generated builds, packages, and test reports
	"$(NODE)" scripts/clean.mjs

clean-all: ## Also remove npm dependencies and browser profiles
	"$(NODE)" scripts/clean.mjs --all

FORCE:
