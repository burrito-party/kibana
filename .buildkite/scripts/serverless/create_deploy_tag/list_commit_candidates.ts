/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  buildkite,
  COMMIT_INFO_CTX,
  CommitWithStatuses,
  exec,
  SELECTED_COMMIT_META_KEY,
} from './shared';
import {
  getArtifactBuildJob,
  getOnMergePRBuild,
  getQAFBuildContainingCommit,
  getQAFTestBuilds,
  toCommitInfoWithBuildResults,
} from './info_sections/build_info';
import { getRecentCommits, GitCommitExtract } from './info_sections/commit_info';
import { BuildkiteInputStep } from '#pipeline-utils';

async function main(commitCountArg: string) {
  console.log('--- Listing commits');
  const commitCount = parseInt(commitCountArg, 10);
  const commitData = await collectAvailableCommits(commitCount);
  const commitsWithStatuses = await enrichWithStatuses(commitData);

  console.log('--- Updating buildkite context with listed commits');
  const commitListWithBuildResultsHtml = toCommitInfoWithBuildResults(commitsWithStatuses);
  exec(`buildkite-agent annotate --style 'info' --context '${COMMIT_INFO_CTX}'`, {
    input: commitListWithBuildResultsHtml,
  });

  console.log('--- Generating buildkite input step');
  addBuildkiteInputStep();
}

async function collectAvailableCommits(commitCount: number): Promise<GitCommitExtract[]> {
  console.log('--- Collecting recent kibana commits');

  const recentCommits = await getRecentCommits(commitCount);

  if (!recentCommits) {
    throw new Error('Could not find any, while listing recent commits');
  }

  return recentCommits;
}

async function enrichWithStatuses(commits: GitCommitExtract[]): Promise<CommitWithStatuses[]> {
  console.log('--- Enriching with build statuses');

  const commitsWithStatuses: CommitWithStatuses[] = await Promise.all(
    commits.map(async (commit) => {
      const onMergeBuild = await getOnMergePRBuild(commit.sha);

      if (!commit.date) {
        return {
          ...commit,
          checks: {
            onMergeBuild,
            ftrBuild: null,
            artifactBuild: null,
          },
        };
      }

      const nextFTRBuilds = await getQAFTestBuilds(commit.date);
      const nextFTRBuild = await getQAFBuildContainingCommit(commit.sha, nextFTRBuilds, commits);
      const artifactBuild = await getArtifactBuildJob(commit.sha);

      return {
        ...commit,
        checks: {
          onMergeBuild,
          ftrBuild: nextFTRBuild,
          artifactBuild,
        },
      };
    })
  );

  return commitsWithStatuses;
}

function addBuildkiteInputStep() {
  const inputStep: BuildkiteInputStep = {
    input: 'Select commit to deploy',
    prompt: 'Select commit to deploy.',
    key: 'select-commit',
    fields: [
      {
        text: 'Enter the release candidate commit SHA',
        key: SELECTED_COMMIT_META_KEY,
      },
    ],
  };

  buildkite.uploadSteps([inputStep]);
}

main(process.argv[2])
  .then(() => {
    console.log('Commit selector generated, added as a buildkite input step.');
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
