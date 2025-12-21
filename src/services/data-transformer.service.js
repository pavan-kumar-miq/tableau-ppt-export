const tableauViews = require("../config/tableau-views.json");
const { buildFilterParams } = require("../utils/view-config.util");
const { FORMAT_TYPES } = require("../utils/pptx-helpers.util");
const logger = require("../utils/logger.util");

/**
 * Transforms Tableau CSV view data into a shape that is easy to consume when
 * building PowerPoint content.
 *
 * The service is intentionally small and focused:
 * - `buildViewConfigsForFetching` → prepares what Tableau should return
 * - `transformViewDataMap`       → converts raw Tableau CSV responses into
 *                                  simple flag‑card and table structures
 */
class DataTransformerService {
  constructor() {
    logger.info("Data Transformer Service initialized");
  }

  /**
   * Builds view configurations for fetching from Tableau based on a use case.
   *
   * @param {string} useCase - Use case identifier (for example, "POLITICAL_SNAPSHOT").
   * @param {object} jobFilters - Filters provided on the job request.
   * @returns {Array<{viewName: string, viewKey: string, filters: object}>}
   */
  buildViewConfigsForFetching(useCase, jobFilters = {}) {
    const useCaseConfig = tableauViews[useCase];
    if (!useCaseConfig?.VIEWS) {
      throw new Error(`Use case "${useCase}" not found in tableau-views.json`);
    }

    const viewConfigs = Object.entries(useCaseConfig.VIEWS).map(
      ([viewKey, viewConfig]) => ({
        viewName: viewConfig.name,
        viewKey,
        filters: buildFilterParams(useCase, viewKey, jobFilters),
      })
    );

    logger.info("Built view configs for fetching", {
      useCase,
      viewCount: viewConfigs.length,
      filterCount: Object.keys(jobFilters).length,
    });

    return viewConfigs;
  }

  /**
   * Transforms a Map of raw Tableau CSV responses into PPT‑friendly structures.
   * Individual view failures are logged and skipped; successful ones are returned.
   *
   * @param {string} useCase - Use case identifier.
   * @param {Map<string, string>} viewDataMap - Map of viewKey → raw CSV payload.
   * @returns {object} Object mapping viewKey → transformed view data.
   */
  transformViewDataMap(useCase, viewDataMap) {
    const transformedData = {};

    viewDataMap.forEach((rawData, viewKey) => {
      try {
        const transformed = this.transformTableauData(useCase, viewKey, rawData);
        if (transformed) {
          transformedData[viewKey] = transformed;
        }
      } catch (error) {
        logger.error("Failed to transform view data", error, {
          useCase,
          viewKey,
        });
      }
    });

    logger.info("View data transformation completed", {
      useCase,
      transformedViews: Object.keys(transformedData).length,
      totalViews: viewDataMap.size,
    });

    return transformedData;
  }

  /**
   * Transforms the raw Tableau CSV payload for a single view into either:
   * - a flag‑card object `{ field, value, format }`, or
   * - a table object `{ headers, rows }`.
   *
   * @param {string} useCase - Use case identifier.
   * @param {string} viewKey - View key as defined in `tableau-views.json`.
   * @param {string} rawData - Raw Tableau payload (CSV string).
   * @returns {object|null} Transformed view data or null when it cannot be used.
   */
  transformTableauData(useCase, viewKey, rawData) {
    try {
      const viewConfig = this._getViewConfig(useCase, viewKey);
      if (!viewConfig) return null;

      const { viewType } = viewConfig;
      if (!viewType) {
        logger.warn("View type not defined, skipping transformation", {
          useCase,
          viewKey,
        });
        return null;
      }

      if (typeof rawData !== "string") {
        logger.warn("Invalid data type for Tableau view data, expected CSV string", {
          useCase,
          viewKey,
          dataType: typeof rawData,
        });
        return null;
      }

      const rowMaps = this._parseCsvToRowMaps(
        useCase,
        viewKey,
        viewConfig,
        rawData
      );
      if (!rowMaps.length) {
        logger.warn("No usable rows after parsing Tableau CSV data", {
          useCase,
          viewKey,
        });
        return null;
      }

      const context = { useCase, viewKey, viewName: viewConfig.name };

      if (viewType === "FLAG_CARD") {
        return this._transformFlagCardFromRowMaps(viewConfig, rowMaps, context);
      }

      if (viewType === "TABLE") {
        return this._transformTableFromRowMaps(viewConfig, rowMaps, context);
      }

      logger.warn("Unsupported view type, skipping transformation", {
        useCase,
        viewKey,
        viewType,
      });
      return null;
    } catch (error) {
      logger.error("Failed to transform Tableau data", error, {
        useCase,
        viewKey,
      });
      return null;
    }
  }

  /**
   * Looks up the view configuration for a use case + view key pair.
   *
   * @param {string} useCase - Use case identifier.
   * @param {string} viewKey - View key identifier.
   * @returns {object|null} View configuration or null if not found.
   * @private
   */
  _getViewConfig(useCase, viewKey) {
    const useCaseConfig = tableauViews[useCase];
    if (!useCaseConfig) {
      logger.warn("Use case not found", { useCase, viewKey });
      return null;
    }

    const viewConfig = useCaseConfig.VIEWS?.[viewKey];
    if (!viewConfig) {
      logger.warn("View config not found", { useCase, viewKey });
      return null;
    }

    return viewConfig;
  }

  /**
   * Transforms flag‑card data (single value) from row maps.
   *
   * @param {object} viewConfig - View configuration.
   * @param {Array<object>} rowMaps - Parsed row data.
   * @param {object} context - Context for logging.
   * @returns {{field: string, value: string, format: string}|null}
   * @private
   */
  _transformFlagCardFromRowMaps(viewConfig, rowMaps, context) {
    const { useCase, viewKey, viewName } = context;

    if (!rowMaps?.length) {
      logger.warn("No row data for flag card", { useCase, viewKey, viewName });
      return null;
    }

    const firstRow = rowMaps[0];
    const columnsConfig = viewConfig.columns || {};

    const primaryFieldKey = Object.keys(firstRow)[0];

    if (!primaryFieldKey) {
      logger.warn("No primary field found for flag card", {
        useCase,
        viewKey,
        viewName,
      });
      return null;
    }

    const cfg = columnsConfig[primaryFieldKey] || {};
    const rawValue = firstRow[primaryFieldKey] ?? "";
    const format = this._mapFormatType(cfg.format);

    return {
      field: primaryFieldKey,
      value: this._normalizeCellValue(rawValue, format),
      format,
    };
  }

  /**
   * Transforms table view data from row maps into `{ headers, rows }`.
   *
   * @param {object} viewConfig - View configuration.
   * @param {Array<object>} rowMaps - Parsed row data.
   * @param {object} context - Context for logging.
   * @returns {{headers: Array, rows: Array}|null}
   * @private
   */
  _transformTableFromRowMaps(viewConfig, rowMaps, context) {
    const { useCase, viewKey, viewName } = context;
    const columnsConfig = viewConfig.columns || {};

    if (!rowMaps?.length) {
      logger.warn("No row data for table", { useCase, viewKey, viewName });
      return null;
    }

    const headers = Object.entries(columnsConfig)
      .filter(([fieldKey, cfg]) => cfg && cfg.isNeededForView !== false)
      .map(([fieldKey, cfg]) => ({
        field: fieldKey,
        value: cfg.displayName || cfg.columnName || fieldKey,
        format: this._mapFormatType(cfg.format),
      }));

    if (!headers.length) {
      logger.warn("No active columns configured for table", {
        useCase,
        viewKey,
        viewName,
      });
      return null;
    }

    const transformedRows = rowMaps.map((row) =>
      headers.map((header) => {
        const rawValue = row[header.field] ?? "";
        return {
          field: header.field,
          value: this._normalizeCellValue(rawValue, header.format),
          format: header.format,
        };
      })
    );

    return { headers, rows: transformedRows };
  }

  /**
   * Parses CSV text to row maps aligned with the view configuration.
   *
   * @param {string} useCase - Use case identifier.
   * @param {string} viewKey - View key identifier.
   * @param {object} viewConfig - View configuration.
   * @param {string} csvText - Raw CSV payload.
   * @returns {Array<object>}
   * @private
   */
  _parseCsvToRowMaps(useCase, viewKey, viewConfig, csvText) {
    if (!csvText || typeof csvText !== "string") {
      return [];
    }

    const allRows = this._parseCsvToRows(csvText);
    if (!allRows.length) {
      return [];
    }

    const headerRow = allRows[0].map((h) => (h || "").trim());
    const dataRows = allRows.slice(1);

    const headerIndexByName = new Map();
    headerRow.forEach((name, idx) => {
      if (name) headerIndexByName.set(name, idx);
    });

    const columnsConfig = viewConfig.columns || {};
    const activeFields = [];

    Object.entries(columnsConfig).forEach(([fieldKey, cfg]) => {
      if (!cfg || cfg.isNeededForView === false) {
        return;
      }

      const columnName = cfg.columnName;
      if (!columnName) {
        logger.warn("Column config missing columnName", {
          useCase,
          viewKey,
          fieldKey,
        });
        return;
      }

      const csvIndex = headerIndexByName.get(columnName);
      if (csvIndex === undefined) {
        logger.warn("CSV header not found for configured column", {
          useCase,
          viewKey,
          fieldKey,
          columnName,
          availableHeaders: headerRow,
        });
        return;
      }

      activeFields.push({ fieldKey, csvIndex });
    });

    if (!activeFields.length) {
      logger.warn("No CSV columns matched configured columns", {
        useCase,
        viewKey,
        headers: headerRow,
      });
      return [];
    }

    return dataRows
      .filter((row) => row.some((value) => value !== "" && value != null))
      .map((row) => {
        const rowMap = {};
        activeFields.forEach(({ fieldKey, csvIndex }) => {
          rowMap[fieldKey] = row[csvIndex] !== undefined ? row[csvIndex] : "";
        });
        return rowMap;
      });
  }

  /**
   * Parses CSV text into a 2D array of cells.
   *
   * @param {string} csvText - Raw CSV text.
   * @returns {Array<Array<string>>}
   * @private
   */
  _parseCsvToRows(csvText) {
    const rows = [];
    let currentRow = [];
    let currentCell = "";
    let inQuotes = false;

    for (let i = 0; i < csvText.length; i++) {
      const ch = csvText[i];

      if (inQuotes) {
        if (ch === '"') {
          if (csvText[i + 1] === '"') {
            currentCell += '"';
            i++;
          } else {
            inQuotes = false;
          }
        } else {
          currentCell += ch;
        }
      } else {
        if (ch === '"') {
          inQuotes = true;
        } else if (ch === ",") {
          currentRow.push(currentCell);
          currentCell = "";
        } else if (ch === "\r") {
          continue;
        } else if (ch === "\n") {
          currentRow.push(currentCell);
          if (currentRow.some((c) => c !== "")) {
            rows.push(currentRow);
          }
          currentRow = [];
          currentCell = "";
        } else {
          currentCell += ch;
        }
      }
    }

    if (currentCell !== "" || currentRow.length) {
      currentRow.push(currentCell);
      if (currentRow.some((c) => c !== "")) {
        rows.push(currentRow);
      }
    }

    return rows;
  }

  /**
   * Maps configuration `format` strings to normalized `FORMAT_TYPES`.
   *
   * @param {string} format - Format value from configuration.
   * @returns {string} Normalized format type.
   * @private
   */
  _mapFormatType(format) {
    const formatMap = {
      currency: FORMAT_TYPES.CURRENCY,
      percentage: FORMAT_TYPES.PERCENTAGE,
      decimal: FORMAT_TYPES.DECIMAL,
      number: FORMAT_TYPES.NUMBER,
      string: FORMAT_TYPES.STRING,
    };
    return formatMap[(format || "").toLowerCase()] || FORMAT_TYPES.STRING;
  }

  /**
   * Normalizes a raw cell value based on the expected format.
   * - For numeric formats we strip thousands separators (commas) so that
   *   downstream numeric parsing (for charts/formatting) works correctly.
   * - For string formats we return the value as-is (stringified).
   *
   * @param {*} rawValue - Raw value from CSV
   * @param {string} format - Normalized format type from FORMAT_TYPES
   * @returns {string} Normalized value
   * @private
   */
  _normalizeCellValue(rawValue, format) {
    if (rawValue === null || rawValue === undefined) {
      return "";
    }

    const stringValue = String(rawValue).trim();

    if (
      format === FORMAT_TYPES.NUMBER ||
      format === FORMAT_TYPES.DECIMAL ||
      format === FORMAT_TYPES.CURRENCY ||
      format === FORMAT_TYPES.PERCENTAGE
    ) {
      // Remove thousands separators like "1,234,567.89" → "1234567.89"
      return stringValue.replace(/,/g, "");
    }

    return stringValue;
  }
}

module.exports = new DataTransformerService();
