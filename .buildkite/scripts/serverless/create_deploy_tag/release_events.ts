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
  DEPLOY_TAG_META_KEY,
  SELECTED_COMMIT_META_KEY,
  sendSlackMessage,
} from './shared';

/**
 * We'd like to define the release steps, and define the pre-post actions for transitions.
 * For this we can create a basic state machine, and define the transitions.
 */

const WIZARD_CTX_INSTRUCTION = 'wizard-instruction';
const WIZARD_CTX_DEFAULT = 'wizard-main';

type StateNames =
  | 'start'
  | 'initialize'
  | 'collect_commits'
  | 'wait_for_selection'
  | 'collect_commit_info'
  | 'wait_for_confirmation'
  | 'create_deploy_tag'
  | 'tag_created'
  | 'end'
  | 'error_generic'
  | string;

interface StateShape {
  name: string;
  description: string;
  instruction?: string;
  instructionStyle?: 'success' | 'warning' | 'error' | 'info';
  display: boolean;
  pre?: (state: StateShape) => Promise<void | boolean>;
  post?: (state: StateShape) => Promise<void | boolean>;
}

const states: Record<StateNames, StateShape> = {
  start: {
    name: 'Starting state',
    description: 'No description',
    display: false,
    post: async () => {
      buildkite.setAnnotation(COMMIT_INFO_CTX, 'info', `<h4>:kibana: Release candidates</h4>`);
    },
  },
  initialize: {
    name: 'Initializing',
    description: 'The job is starting up.',
    instruction: 'Wait while we bootstrap. Follow the instructions displayed in this block.',
    instructionStyle: 'info',
    display: true,
  },
  collect_commits: {
    name: 'Collecting commits',
    description: 'Collecting potential commits for the release.',
    instruction: `Please wait, while we're collecting the list of available commits.`,
    instructionStyle: 'info',
    display: true,
  },
  wait_for_selection: {
    name: 'Waiting for selection',
    description: 'Waiting for the Release Manager to select a release candidate commit.',
    instruction: `Please find, copy and enter a commit SHA to the buildkite input box to proceed.`,
    instructionStyle: 'warning',
    display: true,
  },
  collect_commit_info: {
    name: 'Collecting commit info',
    description: 'Collecting supplementary info about the selected commit.',
    instruction: `Please wait, while we're collecting data about the commit, and the release candidate.`,
    instructionStyle: 'info',
    display: true,
    pre: async () => {
      buildkite.setAnnotation(
        COMMIT_INFO_CTX,
        'info',
        `<h4>:kibana: Selected release candidate info:</h4>`
      );
    },
  },
  wait_for_confirmation: {
    name: 'Waiting for confirmation',
    description: 'Waiting for the Release Manager to confirm the release.',
    instruction: `Please review the collected information above and unblock the release on Buildkite, if you're satisfied.`,
    instructionStyle: 'warning',
    display: true,
  },
  create_deploy_tag: {
    name: 'Creating deploy tag',
    description: 'Creating the deploy tag, this will be picked up by another pipeline.',
    instruction: `Please wait, while we're creating the deploy@timestamp tag.`,
    instructionStyle: 'info',
    display: true,
  },
  tag_created: {
    name: 'Release tag created',
    description: 'The initial step release is completed, follow up jobs will be triggered soon.',
    instruction: `<h3>Deploy tag successfully created!</h3>`,
    post: async () => {
      const deployTag = buildkite.getMetadata(DEPLOY_TAG_META_KEY);
      const selectedCommit = buildkite.getMetadata(SELECTED_COMMIT_META_KEY);
      buildkite.setAnnotation(
        WIZARD_CTX_INSTRUCTION,
        'success',
        `<h3>Deploy tag successfully created!</h3><br/>
Your deployment will appear <a href='https://buildkite.com/elastic/kibana-serverless-release/builds?branch=${deployTag}'>here on buildkite.</a>`
      );

      sendSlackAnnouncement(selectedCommit, deployTag);
    },
    instructionStyle: 'success',
    display: true,
  },
  end: {
    name: 'End of the release process',
    description: 'The release process has ended.',
    display: false,
  },
  error_generic: {
    name: 'Encountered an error',
    description: 'An error occurred during the release process.',
    instruction: `<h4>Please check the build logs for more information.</h4>`,
    instructionStyle: 'error',
    display: false,
  },
};

/**
 * Entrypoint for the CLI
 */
export async function main(args: string[]) {
  if (!args.includes('--state')) {
    throw new Error('Missing --state argument');
  }
  const targetState = args.slice(args.indexOf('--state') + 1)[0];

  let data: any;
  if (args.includes('--data')) {
    data = args.slice(args.indexOf('--data') + 1)[0];
  }

  const resultingTargetState = await transition(targetState, data);
  if (resultingTargetState === 'tag_created') {
    return await transition('end');
  } else {
    return resultingTargetState;
  }
}

export async function transition(targetStateName: StateNames, data?: any) {
  // use the buildkite agent to find what state we are in:
  const currentStateName = buildkite.getMetadata('release_state') || 'start';
  const stateData = JSON.parse(buildkite.getMetadata('state_data') || '{}');

  if (!currentStateName) {
    throw new Error('Could not find current state in buildkite meta-data');
  }

  // find the index of the current state in the core flow
  const currentStateIndex = Object.keys(states).indexOf(currentStateName);
  const targetStateIndex = Object.keys(states).indexOf(targetStateName);

  if (currentStateIndex === -1) {
    throw new Error(`Could not find current state '${currentStateName}' in core flow`);
  }
  const currentState = states[currentStateName];

  if (targetStateIndex === -1) {
    throw new Error(`Could not find target state '${targetStateName}' in core flow`);
  }
  const targetState = states[targetStateName];

  if (currentStateIndex + 1 !== targetStateIndex) {
    await tryCall(currentState.post, stateData);
    stateData[currentStateName] = 'nok';
  } else {
    const result = await tryCall(currentState.post, stateData);
    stateData[currentStateName] = result ? 'ok' : 'nok';
  }
  stateData[targetStateName] = 'pending';

  await tryCall(targetState.pre, stateData);

  buildkite.setMetadata('release_state', targetStateName);
  buildkite.setMetadata('state_data', JSON.stringify(stateData));

  updateWizardState(stateData);
  updateWizardInstruction(targetStateName, stateData);

  return targetStateName;
}

function updateWizardState(stateData: Record<string, 'ok' | 'nok' | 'pending' | undefined>) {
  const wizardHeader = `<h3>:kibana: Kibana Serverless deployment wizard :mage:</h3>`;

  const wizardSteps = Object.keys(states)
    .filter((stateName) => states[stateName].display)
    .map((stateName) => {
      const stateInfo = states[stateName];
      const stateStatus = stateData[stateName];
      const stateEmoji = {
        ok: ':white_check_mark:',
        nok: ':x:',
        pending: ':hourglass_flowing_sand:',
        missing: ':white_circle:',
      }[stateStatus || 'missing'];

      if (stateStatus === 'pending') {
        return `<div>[${stateEmoji}] ${stateInfo.name}<br />&nbsp; - ${stateInfo.description}</div>`;
      } else {
        return `<div>[${stateEmoji}] ${stateInfo.name}</div>`;
      }
    });

  const wizardHtml = `<section>
${wizardHeader}
${wizardSteps.join('\n')}
</section>`;

  buildkite.setAnnotation(WIZARD_CTX_DEFAULT, 'info', wizardHtml);
}

function updateWizardInstruction(targetState: string, stateData: any) {
  const { instructionStyle, instruction } = states[targetState];

  if (instruction) {
    buildkite.setAnnotation(
      WIZARD_CTX_INSTRUCTION,
      instructionStyle || 'info',
      `<strong>${instruction}</strong>`
    );
  }
}

async function tryCall(fn: any, ...args: any[]) {
  if (typeof fn === 'function') {
    try {
      const result = await fn(...args);
      return result !== false;
    } catch (error) {
      console.error(error);
      return false;
    }
  } else {
    return true;
  }
}

function sendSlackAnnouncement(selectedCommit: string | null, deployTag: string | null) {
  const isDryRun = process.env.DRY_RUN?.match('(1|true)');
  const textBlock = (...str: string[]) => ({ type: 'mrkdwn', text: str.join('\n') });
  const buildShortname = `kibana-serverless-release #${process.env.BUILDKITE_BUILD_NUMBER}`;
  sendSlackMessage({
    blocks: [
      {
        type: 'section',
        text: textBlock(
          `:ship: Promotion of a new <https://github.com/elastic/kibana/commit/${selectedCommit}|commit> to QA has been initiated!`,
          `:mag: The details of the candidate selection can be found here: <${process.env.BUILDKITE_BUILD_URL}|${buildShortname}>`,
          `:test_tube: Once promotion is complete, please begin any required manual testing.`,
          `*Remember:* Promotion to Staging is currently a manual process and will proceed once the build is signed off in QA.`,
          `${isDryRun ? '*:white_check_mark:This is a dry run, no action will be taken.*' : ''}`
        ),
      },
      {
        type: 'section',
        fields: [
          textBlock(
            `*More detail on the candidate selection:*`,
            `<${process.env.BUILDKITE_BUILD_URL || 'about://blank'}|${buildShortname}>`
          ),
          textBlock(`*Initiated by:*`, `${process.env.BUILDKITE_BUILD_CREATOR || 'unknown'}`),
          textBlock(
            `*Git tag:*`,
            `<https://github.com/elastic/kibana/releases/tag/${deployTag}|${deployTag}>`
          ),
          textBlock(
            `*QA Deploy job:*`,
            `<https://buildkite.com/elastic/kibana-serverless-release/builds?branch=${deployTag}|Link>`
          ),
          textBlock(
            `*Commit:*`,
            `<https://github.com/elastic/kibana/commit/${selectedCommit}|${selectedCommit.slice(
              0,
              12
            )}>`
          ),
        ],
      },
    ],
  }).catch((error) => {
    console.error("Couldn't send slack message.", error);
  });
}

main(process.argv.slice(2)).then(
  (targetState) => {
    console.log('Transition completed to: ' + targetState);
  },
  (error) => {
    console.error(error);
    process.exit(1);
  }
);
