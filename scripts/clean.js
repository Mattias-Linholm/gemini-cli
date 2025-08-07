/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import { rmSync, readFileSync, existsSync, readdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

const RMRF_OPTIONS = { recursive: true, force: true };

// remove npm install/build artifacts
rmSync(join(root, 'node_modules'), RMRF_OPTIONS);
rmSync(join(root, 'bundle'), RMRF_OPTIONS);
rmSync(join(root, 'packages/cli/src/generated/'), RMRF_OPTIONS);

// Dynamically clean dist directories in all workspaces
const rootPackageJson = JSON.parse(
  readFileSync(join(root, 'package.json'), 'utf-8'),
);

if (rootPackageJson.workspaces) {
  for (const workspace of rootPackageJson.workspaces) {
    // Assuming workspace is a glob pattern like "packages/*"
    const workspaceBase = workspace.replace('/*', ''); // "packages"
    const workspacePath = join(root, workspaceBase); // "/path/to/repo/packages"

    if (existsSync(workspacePath)) {
      const packageDirs = readdirSync(workspacePath, { withFileTypes: true })
        .filter((dirent) => dirent.isDirectory())
        .map((dirent) => join(workspacePath, dirent.name));

      for (const pkgDir of packageDirs) {
        rmSync(join(pkgDir, 'dist'), RMRF_OPTIONS);
      }
    }
  }
}

// Clean up vsix files in vscode-ide-companion
const vsixDir = join(root, 'packages/vscode-ide-companion');
if (existsSync(vsixDir)) {
  const vsixFiles = readdirSync(vsixDir)
    .filter((file) => file.endsWith('.vsix'))
    .map((file) => join(vsixDir, file));

  for (const vsixFile of vsixFiles) {
    rmSync(vsixFile, RMRF_OPTIONS);
  }
}
