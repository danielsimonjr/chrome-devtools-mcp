/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

// Fork-only: refresh plugin/ from the bundled build so a git-subdir plugin
// install copies only runtime files. Run after `npm run bundle`.
import {cpSync, rmSync} from 'node:fs';

const target = 'plugin/build/src';
rmSync(target, {recursive: true, force: true});
cpSync('build/src', target, {
  recursive: true,
  filter: src => !src.endsWith('.map') && !src.endsWith('.tsbuildinfo'),
});
rmSync('plugin/skills', {recursive: true, force: true});
cpSync('skills', 'plugin/skills', {recursive: true});
