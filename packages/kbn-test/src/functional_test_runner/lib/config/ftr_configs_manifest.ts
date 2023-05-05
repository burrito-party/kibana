/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import execa from 'execa';
import Path from 'path';
import Fs from 'fs';

import { REPO_ROOT } from '@kbn/repo-info';
import JsYaml from 'js-yaml';

export const FTR_CONFIGS_MANIFEST_REL = '.buildkite/ftr_configs.yml';

interface FtrConfigWithOptions {
  [configPath: string]: {
    queue: string;
  };
}

interface FtrConfigsManifest {
  defaultQueue: string;
  disabled: string[];
  enabled: Array<string | FtrConfigWithOptions>;
}

// eslint-disable-next-line no-console
console.log(`REPO_ROOT: ${REPO_ROOT}`);
// eslint-disable-next-line no-console
console.log(`cwd: ${process.cwd()}`);

ls('.');
ls(REPO_ROOT);
ls(`${REPO_ROOT}/.buildkite`);
ls(
  '/var/lib/buildkite-agent/builds/kb-n2-4-spot-8d94c28da2235528/elastic/kibana-pull-request/kibana-build-xpack/'
);
ls(
  '/var/lib/buildkite-agent/builds/kb-n2-4-spot-8d94c28da2235528/elastic/kibana-pull-request/kibana-build-xpack/.buildkite/'
);

async function ls(dir: string) {
  try {
    const { stdout } = await execa('ls', ['-la', dir]);
    // eslint-disable-next-line no-console
    console.log(`ls ${dir}:\n${stdout}\nls (end)`);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.log(`ls ${dir}: ERROR: ${e}`);
  }
}

const ftrConfigsManifest: FtrConfigsManifest = JsYaml.safeLoad(
  Fs.readFileSync(Path.resolve(REPO_ROOT, FTR_CONFIGS_MANIFEST_REL), 'utf8')
);

export const FTR_CONFIGS_MANIFEST_PATHS = [
  Object.values(ftrConfigsManifest.enabled),
  Object.values(ftrConfigsManifest.disabled),
]
  .flat()
  .map((config) => {
    const rel = typeof config === 'string' ? config : Object.keys(config)[0];
    return Path.resolve(REPO_ROOT, rel);
  });
