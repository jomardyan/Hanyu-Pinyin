SHELL := /bin/sh

NPM ?= npm
NODE ?= node
BROWSER ?= chrome
DIST_DIR ?= dist
RELEASE_DIR ?= release
PROFILE_ROOT ?= .browser-profile

VERSION := $(shell $(NODE) -p "require('./package.json').version" 2>/dev/null || echo unknown)

.DEFAULT_GOAL := help

.PHONY: help doctor setup install clean clean-all build dev run run-chrome run-edge test test-watch typecheck assets assets-validate check package release ci fixture release-files

help:
	@printf '%s\n' \
	  'Hanyu Pinyin Reader build commands' \
	  '' \
	  '  make setup           Check tools and install dependencies' \
	  '  make install         Install npm dependencies' \
	  '  make doctor          Print required tool versions' \
	  '  make build           Build the production extension into dist/' \
	  '  make dev             Watch source files and rebuild during development' \
	  '  make run             Build and launch BROWSER=chrome or edge with the extension loaded' \
	  '  make run-chrome      Build and launch Chrome with the unpacked extension' \
	  '  make run-edge        Build and launch Microsoft Edge with the unpacked extension' \
	  '  make test            Run automated tests' \
	  '  make test-watch      Run tests in watch mode' \
	  '  make typecheck       Run TypeScript validation only' \
	  '  make assets          Generate extension icons and Chrome Web Store graphics' \
	  '  make assets-validate Validate Chrome Web Store graphics and metadata assets' \
	  '  make check           Typecheck, test, build, and validate store assets' \
	  '  make package         Build and create release ZIP files without repeating tests' \
	  '  make release         Full validated Chrome Web Store release' \
	  '  make ci              Clean install plus the same full release flow' \
	  '  make fixture         Serve fixtures at http://127.0.0.1:8080' \
	  '  make release-files   List generated release files' \
	  '  make clean           Remove generated build and release output' \
	  '  make clean-all       Also remove node_modules and browser test profiles' \
	  '' \
	  'Examples' \
	  '  make run' \
	  '  make run BROWSER=edge' \
	  '  make release'

doctor:
	@command -v $(NODE) >/dev/null 2>&1 || { echo 'Node.js is required'; exit 1; }
	@command -v $(NPM) >/dev/null 2>&1 || { echo 'npm is required'; exit 1; }
	@printf 'Node '; $(NODE) --version
	@printf 'npm '; $(NPM) --version
	@$(NODE) -e "const major=Number(process.versions.node.split('.')[0]); if(major<20){console.error('Node.js 20 or newer is required'); process.exit(1)}"

setup: doctor install

install:
	$(NPM) install

clean:
	$(NPM) run clean
	@$(NODE) -e "const fs=require('fs'); for(const p of ['$(RELEASE_DIR)']) fs.rmSync(p,{recursive:true,force:true})"

clean-all: clean
	@$(NODE) -e "const fs=require('fs'); for(const p of ['node_modules','$(PROFILE_ROOT)']) fs.rmSync(p,{recursive:true,force:true})"

build:
	$(NPM) run build

dev:
	$(NPM) run dev

run: build
	$(NODE) scripts/run-extension.mjs --browser $(BROWSER) --dist $(DIST_DIR) --profile $(PROFILE_ROOT)/$(BROWSER)

run-chrome:
	$(MAKE) run BROWSER=chrome

run-edge:
	$(MAKE) run BROWSER=edge

test:
	$(NPM) test

test-watch:
	$(NPM) run test:watch

typecheck:
	$(NPM) exec tsc -- --noEmit

assets:
	$(NPM) run store:generate

assets-validate:
	$(NPM) run store:validate

check:
	$(NPM) run check

package: build assets-validate
	$(NODE) scripts/package-release.mjs

release:
	$(NPM) run store:release

ci: doctor
	$(NPM) install
	$(MAKE) release

fixture:
	$(NODE) scripts/serve-fixture.mjs

release-files:
	@$(NODE) -e "const fs=require('fs'),p='$(RELEASE_DIR)'; if(!fs.existsSync(p)){console.log('No release directory. Run make release first.'); process.exit(0)} for(const f of fs.readdirSync(p).sort()) console.log(p+'/'+f)"
