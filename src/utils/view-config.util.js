const tableauViews = require("../config/tableau-views.json");
const slideViewMapping = require("../config/slide-view-mapping.json");

/**
 * Retrieves the Tableau view name from a view key.
 *
 * @param {string} useCase - Use case identifier
 * @param {string} viewKey - View key identifier
 * @returns {string|null} Tableau view name or null if not found
 */
function getViewName(useCase, viewKey) {
  const useCaseConfig = tableauViews[useCase];
  if (!useCaseConfig?.VIEWS) {
    return null;
  }
  const viewConfig = useCaseConfig.VIEWS[viewKey];
  return viewConfig?.name || null;
}

/**
 * Retrieves complete view configuration for a view key.
 *
 * @param {string} useCase - Use case identifier
 * @param {string} viewKey - View key identifier
 * @returns {object|null} View configuration or null if not found
 */
function getViewConfig(useCase, viewKey) {
  const useCaseConfig = tableauViews[useCase];
  if (!useCaseConfig?.VIEWS) {
    return null;
  }
  return useCaseConfig.VIEWS[viewKey] || null;
}

/**
 * Retrieves all view configurations for a use case.
 *
 * @param {string} useCase - Use case identifier
 * @returns {object} Object mapping view keys to view configs
 */
function getViewsForUseCase(useCase) {
  const useCaseConfig = tableauViews[useCase];
  if (!useCaseConfig?.VIEWS) {
    return {};
  }
  return useCaseConfig.VIEWS || {};
}

/**
 * Retrieves Tableau filter parameter name from filter key.
 *
 * @param {string} useCase - Use case identifier
 * @param {string} filterKey - Filter key (e.g., 'POLITICAL_ADVERTISER_NAME')
 * @returns {string|null} Tableau filter parameter name or null if not found
 */
function getFilterName(useCase, filterKey) {
  const useCaseConfig = tableauViews[useCase];
  if (!useCaseConfig || !useCaseConfig.FILTERS) {
    return null;
  }
  return useCaseConfig.FILTERS[filterKey] || null;
}

/**
 * Get all filters for a use case
 * @param {string} useCase - Use case identifier
 * @returns {Object} Object with filter keys as keys and filter parameter names as values
 */
function getFiltersForUseCase(useCase) {
  const useCaseConfig = tableauViews[useCase];
  if (!useCaseConfig || !useCaseConfig.FILTERS) {
    return {};
  }
  return useCaseConfig.FILTERS || {};
}

/**
 * Get filter keys for a specific view
 * @param {string} useCase - Use case identifier
 * @param {string} viewKey - View key
 * @returns {Array<string>} Array of filter keys for the view
 */
function getViewFilters(useCase, viewKey) {
  const viewConfig = getViewConfig(useCase, viewKey);
  if (!viewConfig || !viewConfig.filters) {
    return [];
  }
  return viewConfig.filters || [];
}

/**
 * Build Tableau filter parameters object from filter values
 * @param {string} useCase - Use case identifier
 * @param {string} viewKey - View key
 * @param {Object} filterValues - Object with filter keys as keys and values as values
 * @returns {Object} Object with Tableau filter parameter names as keys and values as values
 */
function buildFilterParams(useCase, viewKey, filterValues) {
  const viewFilters = getViewFilters(useCase, viewKey);
  const filterParams = {};

  viewFilters.forEach((filterKey) => {
    const filterParamName = getFilterName(useCase, filterKey);
    if (filterParamName && filterValues[filterKey] !== undefined) {
      filterParams[filterParamName] = filterValues[filterKey];
    }
  });

  return filterParams;
}

/**
 * Get view name from key, falling back to direct lookup if key not found
 * This is useful for backward compatibility
 * @param {string} useCase - Use case identifier
 * @param {string} identifier - View key or direct view name
 * @returns {string} The actual Tableau view name
 */
function resolveViewName(useCase, identifier) {
  // First try to resolve as a key
  const viewName = getViewName(useCase, identifier);
  if (viewName) {
    return viewName;
  }
  // If not found, assume it's already a view name
  return identifier;
}

/**
 * Get all view keys required for a use case from slide mapping
 * @param {string} useCase - Use case identifier
 * @returns {Array<string>} Array of unique view keys
 */
function getRequiredViewKeys(useCase) {
  const useCaseMapping = slideViewMapping[useCase];
  if (!useCaseMapping || !useCaseMapping.slides) {
    return [];
  }

  const viewKeys = new Set();
  useCaseMapping.slides.forEach((slide) => {
    if (slide.views && Array.isArray(slide.views)) {
      slide.views.forEach((viewKey) => {
        viewKeys.add(viewKey);
      });
    }
  });

  return Array.from(viewKeys);
}

/**
 * Get all view names required for a use case
 * @param {string} useCase - Use case identifier
 * @returns {Array<string>} Array of actual Tableau view names
 */
function getRequiredViewNames(useCase) {
  const viewKeys = getRequiredViewKeys(useCase);
  return viewKeys
    .map((key) => getViewName(useCase, key))
    .filter((name) => name !== null);
}

module.exports = {
  getViewName,
  getViewConfig,
  getViewsForUseCase,
  resolveViewName,
  getRequiredViewKeys,
  getRequiredViewNames,
  getFilterName,
  getFiltersForUseCase,
  getViewFilters,
  buildFilterParams,
};
