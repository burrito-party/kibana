/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const FILTER_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.timeline.searchOrFilter.filterDescription',
  {
    defaultMessage: 'Events from the data providers above are filtered by the adjacent KQL',
  }
);

export const FILTER_KQL_TOOLTIP = i18n.translate(
  'xpack.securitySolution.timeline.searchOrFilter.filterKqlTooltip',
  {
    defaultMessage: 'Events from the data providers above are filtered by this KQL',
  }
);

export const FILTER_KQL_PLACEHOLDER = i18n.translate(
  'xpack.securitySolution.timeline.searchOrFilter.filterKqlPlaceholder',
  {
    defaultMessage: 'Filter events',
  }
);

export const FILTER_KQL_SELECTED_TEXT = i18n.translate(
  'xpack.securitySolution.timeline.searchOrFilter.filterKqlSelectedText',
  {
    defaultMessage: 'Filter',
  }
);

export const SEARCH_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.timeline.searchOrFilter.searchDescription',
  {
    defaultMessage:
      'Events from the data providers above are combined with results from the adjacent KQL',
  }
);

export const SEARCH_KQL_TOOLTIP = i18n.translate(
  'xpack.securitySolution.timeline.searchOrFilter.searchKqlTooltip',
  {
    defaultMessage: 'Events from the data providers above are combined with results from this KQL',
  }
);

export const SEARCH_KQL_PLACEHOLDER = i18n.translate(
  'xpack.securitySolution.timeline.searchOrFilter.searchKqlPlaceholder',
  {
    defaultMessage: 'Search events',
  }
);

export const SEARCH_KQL_SELECTED_TEXT = i18n.translate(
  'xpack.securitySolution.timeline.searchOrFilter.searchKqlSelectedText',
  {
    defaultMessage: 'Search',
  }
);

export const DATA_PROVIDER_HIDDEN_POPULATED = i18n.translate(
  'xpack.securitySolution.timeline.searchOrFilter.dataProviderToggle.hiddenAndPopulated',
  {
    defaultMessage: 'Query Builder is hidden. Click here to see the existing Queries',
  }
);

export const DATA_PROVIDER_VISIBLE = i18n.translate(
  'xpack.securitySolution.timeline.searchOrFilter.dataProviderToggle.visible',
  {
    defaultMessage: 'Click here to hide Query builder',
  }
);

export const DATA_PROVIDER_HIDDEN_EMPTY = i18n.translate(
  'xpack.securitySolution.timeline.searchOrFilter.dataProviderToggle.hiddenAndEmpty',
  {
    defaultMessage: 'Click here to show the empty Query builder',
  }
);

export const ERROR_PROCESSING_INDEX_PATTERNS = i18n.translate(
  'xpack.securitySolution.timeline.searchOrFilter.errorProcessingDataView',
  {
    defaultMessage: 'Error processing Index Patterns',
  }
);
