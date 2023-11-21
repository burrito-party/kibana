/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CUSTOM_AGGREGATOR } from '@kbn/observability-plugin/common/custom_threshold_rule/constants';
import {
  Aggregators,
  Comparator,
} from '@kbn/observability-plugin/common/custom_threshold_rule/types';

export const scenario1 = {
  dataView: {
    indexPattern: 'high-cardinality-data-fake_hosts.fake_hosts-*',
    id: 'data-view-id',
    shouldCreate: true,
  },
  ruleParams: {
    consumer: 'logs',
    name: 'custom_threshold_log_count',
    params: {
      criteria: [
        {
          aggType: CUSTOM_AGGREGATOR,
          comparator: Comparator.LT,
          threshold: [100],
          timeSize: 1,
          timeUnit: 'm',
          metrics: [{ name: 'A', filter: '', aggType: Aggregators.COUNT }],
        },
      ],
      searchConfiguration: {
        query: {
          query: 'labels.scenario: custom_threshold_log_count',
        },
      },
    },
  },
};
