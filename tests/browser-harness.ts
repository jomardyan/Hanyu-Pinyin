import { PageController, frameHost } from '../src/content/page-controller';
import { SelectionTool } from '../src/content/selection-tool';
import * as annotations from '../src/content/annotation-engine';
import * as scanner from '../src/content/dom-scanner';
import * as settings from '../src/shared/settings';
import { LruCache } from '../src/pinyin/cache';
// Test-only entry point. Never included in the extension manifest or release directory.
Object.assign(globalThis, { __hpTest: { PageController, SelectionTool, annotations, scanner, settings, LruCache, frameHost } });
