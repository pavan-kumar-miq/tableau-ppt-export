const slideViewMapping = require("../config/slide-view-mapping.json");
const path = require("path");
const logger = require("../utils/logger.util");
const {
  CENTER_ALIGN,
  LEFT_ALIGN,
  LAYOUT_WIDE,
  colors,
  getTextOptions,
  getShapeOptions,
  formatDataValue,
  convertCentimetersToInches,
  FORMAT_TYPES,
  buildTableFromConfig,
  buildChartFromConfig,
} = require("../utils/pptx-helpers.util");

class PptConfigService {
  constructor() {
    logger.info("PPT Config Service initialized (Generic Engine)");
  }

  /**
   * Main Entry Point
   * Generates slide configuration for ANY use-case defined in the JSON mapping.
   */
  async getPptConfig(requestData) {
    const { useCase, viewData = {} } = requestData;

    logger.info("Generating PPT Config", { useCase, hasViewData: !!viewData });

    if (!useCase) {
      throw new Error("Use case key is required");
    }

    // 1. Fetch Configuration from JSON
    const slideMapping = slideViewMapping[useCase];
    if (!slideMapping || !slideMapping.slides) {
      throw new Error(`No JSON configuration found for useCase: ${useCase}`);
    }

    try {
      const slides = [];

      // 2. Generic Loop: Build slides based purely on JSON instructions
      for (const slideConfig of slideMapping.slides) {
        const slide = await this._buildSlide(slideConfig, viewData);
        slides.push(slide);
      }

      return {
        TITLE: `${this._formatTitle(useCase)} Report`, // Auto-generate title or fetch from JSON
        LAYOUT: LAYOUT_WIDE,
        SLIDES: slides,
      };
    } catch (error) {
      logger.error("PPT Generation failed", { useCase, error });
      throw error;
    }
  }

  // ===========================================================================
  // CORE RENDERING ENGINE (Private)
  // ===========================================================================

  async _buildSlide(slideConfig, viewData) {
    const slide = {
      BACKGROUND: this._renderBackground(slideConfig.background),
      IMAGE: [],
      SHAPE: [],
      TEXT: [],
      TABLE: [],
      CHART: [],
    };

    if (!slideConfig.elements) return slide;

    for (const element of slideConfig.elements) {
      try {
        switch (element.type) {
          case "IMAGE":
            slide.IMAGE.push(this._renderImage(element));
            break;
          case "SHAPE":
            slide.SHAPE.push(this._renderShape(element));
            break;
          case "TEXT":
            const textEl = this._renderText(element, viewData);
            if (textEl) slide.TEXT.push(textEl);
            break;
          case "TABLE":
            const tableEl = this._renderTable(element, viewData);
            if (tableEl) slide.TABLE.push(tableEl);
            break;
          case "CHART":
            const chartEl = this._renderChart(element, viewData);
            if (chartEl) slide.CHART.push(chartEl);
            break;
          default:
            logger.warn(`Skipping unknown element type: ${element.type}`);
        }
      } catch (err) {
        logger.error(`Error rendering element ${element.type}`, err);
      }
    }

    return slide;
  }

  // ===========================================================================
  // COMPONENT RENDERERS
  // ===========================================================================

  _renderBackground(bgConfig) {
    if (!bgConfig) return {};
    if (bgConfig.path)
      return { url: this._getBackgroundImagePath(bgConfig.path) };
    if (bgConfig.color)
      return { color: colors[bgConfig.color] || bgConfig.color };
    return {};
  }

  _renderImage(element) {
    return {
      path: this._getBackgroundImagePath(element.path),
      ...this._normalizeRect(element.rect),
    };
  }

  _renderShape(element) {
    const options = this._resolveStyleOptions(element.options);
    return {
      type: element.shapeType,
      option: getShapeOptions({
        ...this._normalizeRect(element.rect),
        ...options,
      }),
    };
  }

  _renderText(element, viewData) {
    const textParts = [];

    // Handle Content Array (Static Text + Dynamic Data)
    if (element.content && Array.isArray(element.content)) {
      for (const part of element.content) {
        // Dynamic Data
        if (part.valueKey) {
          const data = viewData[part.valueKey];
          let val =
            data && data.value != null ? data.value : part.fallback || "";

          if (val !== "") {
            const fmt =
              part.format || (data ? data.format : FORMAT_TYPES.STRING);
            textParts.push({
              text: formatDataValue(val, fmt),
              options: this._resolveStyleOptions(part.options || {}),
            });
          }
        }
        // Static Text
        else if (part.text) {
          textParts.push({
            text: part.text,
            options: this._resolveStyleOptions(part.options || {}),
          });
        }
      }
    }

    if (textParts.length === 0 && !element.content) return null;
    if (element.content && element.content.length === 0)
      textParts.push({ text: "" }); // Empty box placeholder

    return {
      text: textParts,
      option: getTextOptions({
        ...this._normalizeRect(element.rect),
        ...this._resolveStyleOptions(element.options || {}),
      }),
    };
  }

  _renderTable(element, viewData) {
    const data = viewData[element.dataKey];
    if (!data || !data.headers || !data.rows) return null;

    const columnOptions = (element.columnWidths || []).map((w) => ({
      width: convertCentimetersToInches(w),
    }));

    // Clone config to avoid mutation and resolve styles
    const tableConfig = {
      position: this._normalizeRect(element.rect),
      size: {
        w: convertCentimetersToInches(element.rect.w),
        h: convertCentimetersToInches(element.rect.h),
      },
      columnOptions,
      ...this._resolveDeepStyleOptions(element.tableConfig || {}),
    };

    // Normalize heights inside config
    this._normalizeTableHeights(tableConfig);

    return buildTableFromConfig(
      { headers: data.headers, rows: data.rows },
      tableConfig
    );
  }

  _renderChart(element, viewData) {
    const data = viewData[element.dataKey];
    if (!data || !data.rows || data.rows.length === 0) return null;

    // Convert Row Array to Key-Value Object for Chart Builder
    const chartRows = data.rows.map((row) => {
      const rowObj = {};
      row.forEach((cell) => {
        if (cell && cell.field) rowObj[cell.field] = cell;
      });
      return rowObj;
    });

    const config = {
      ...this._resolveDeepStyleOptions(element.chartConfig),
      position: this._normalizeRect(element.rect),
      size: {
        w: convertCentimetersToInches(element.rect.w),
        h: convertCentimetersToInches(element.rect.h),
      },
    };

    return buildChartFromConfig({ rows: chartRows }, config);
  }

  // ===========================================================================
  // HELPERS
  // ===========================================================================

  _normalizeRect(rect) {
    if (!rect) return { x: 0, y: 0, w: 0, h: 0 };
    return {
      x: convertCentimetersToInches(rect.x),
      y: convertCentimetersToInches(rect.y),
      w: convertCentimetersToInches(rect.w),
      h: convertCentimetersToInches(rect.h),
    };
  }

  _normalizeTableHeights(config) {
    if (config.globalCellOptions?.height)
      config.globalCellOptions.height = convertCentimetersToInches(
        config.globalCellOptions.height
      );
    if (config.rowHeightConfig?.headerHeight)
      config.rowHeightConfig.headerHeight = convertCentimetersToInches(
        config.rowHeightConfig.headerHeight
      );
    if (config.rowHeightConfig?.dataRowHeight)
      config.rowHeightConfig.dataRowHeight = convertCentimetersToInches(
        config.rowHeightConfig.dataRowHeight
      );
  }

  _getBackgroundImagePath(imageName) {
    return path.join(__dirname, "../../assets/images", imageName);
  }

  _formatTitle(useCase) {
    return useCase
      .toLowerCase()
      .split("_")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  }

  /**
   * Recursively resolves style values:
   * - Color names (e.g., 'primaryPink' -> 'FF007F')
   * - Align constants (e.g., 'CENTER' -> CENTER_ALIGN)
   * Handles strings, arrays, and nested objects uniformly.
   */
  _resolveDeepStyleOptions(options) {
    // Handle null/undefined
    if (options == null) return options;

    // Handle arrays - recursively process each item
    if (Array.isArray(options)) {
      return options.map((item) => this._resolveDeepStyleOptions(item));
    }

    // Handle non-object primitives (strings, numbers, booleans)
    if (typeof options !== "object") {
      return options;
    }

    // Handle objects - process each key-value pair
    const resolved = {};
    for (const [key, value] of Object.entries(options)) {
      // Special case: align values
      if (key === "align" && typeof value === "string") {
        resolved[key] =
          value === "CENTER"
            ? CENTER_ALIGN
            : value === "LEFT"
            ? LEFT_ALIGN
            : value;
      }
      // Special case: color-related keys (color, chartColors, dataLabelColor, etc.)
      else if (key.toLowerCase().includes("color")) {
        resolved[key] = this._resolveColorValue(value);
      }
      // Default: recursively process the value
      else {
        resolved[key] = this._resolveDeepStyleOptions(value);
      }
    }
    return resolved;
  }

  /**
   * Resolve color values - handles both strings and arrays
   */
  _resolveColorValue(value) {
    if (typeof value === "string") {
      return colors[value] || value;
    }
    if (Array.isArray(value)) {
      return value.map((v) => (typeof v === "string" ? colors[v] || v : v));
    }
    return this._resolveDeepStyleOptions(value);
  }

  _resolveStyleOptions(options) {
    return this._resolveDeepStyleOptions(options);
  }
}

module.exports = new PptConfigService();
