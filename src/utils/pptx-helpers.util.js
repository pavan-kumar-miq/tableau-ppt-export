/**
 * PptxGenJS Helper Utilities
 * Provides helper functions for creating props/options for slide components
 * Based on PptxGenJS documentation: https://gitbrent.github.io/PptxGenJS/docs/quick-start/
 */

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_FONT = "Century Gothic";
const CENTER_ALIGN = "center";
const LEFT_ALIGN = "left";
const RIGHT_ALIGN = "right";
const LAYOUT_WIDE = "LAYOUT_WIDE";

const FORMAT_TYPES = {
  CURRENCY: "currency",
  NUMBER: "number",
  DECIMAL: "decimal",
  PERCENTAGE: "percentage",
  STRING: "string",
};

const colors = {
  primaryWhite: "FFFFFF",
  primaryBlack: "000000",
  primaryGold: "FFC000",
  primaryPink: "FF007F",
  primaryOrange: "FF5F00",
  neutralGrey: "666666",
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Converts centimeters to inches using the standard conversion factor.
 *
 * @param {number} cm - Value in centimeters
 * @returns {number} Value in inches (cm / 2.54)
 */
const convertCentimetersToInches = (cm) => {
  return cm / 2.54;
};

/**
 * Format value based on format type
 * @param {*} value - Value to format (can be string or number)
 * @param {string} format - Format type: 'currency', 'percentage', 'decimal', 'number', 'string'
 * @returns {string} Formatted value
 */
/**
 * Formats a value based on the specified format type.
 * Handles currency, percentage, decimal, number, and string formats.
 * Automatically converts string values to numbers when appropriate.
 *
 * @param {*} value - Value to format (can be string or number)
 * @param {string} format - Format type from FORMAT_TYPES enum
 * @returns {string} Formatted value string
 */
const formatDataValue = (value, format) => {
  if (value === null || value === undefined) return "";

  if (format === FORMAT_TYPES.STRING) {
    return value.toString();
  }

  const numValue = typeof value === "string" ? parseFloat(value) : value;

  if (isNaN(numValue)) {
    return value.toString();
  }

  switch (format) {
    case FORMAT_TYPES.CURRENCY:
      return `$${numValue.toLocaleString()}`;
    case FORMAT_TYPES.PERCENTAGE:
      return `${numValue.toFixed(2)}%`;
    case FORMAT_TYPES.DECIMAL:
      return `${numValue.toFixed(2)}`;
    case FORMAT_TYPES.NUMBER:
      return `${numValue.toLocaleString()}`;
    default:
      return value.toString();
  }
};

// ============================================================================
// TEXT OPTIONS
// ============================================================================

/**
 * Gets text options for slide.addText().
 * Creates a configuration object for adding text elements to PowerPoint slides.
 * All positioning values can be in inches or percentage strings.
 *
 * @param {object} params - Text configuration parameters
 * @param {number|string} params.x - Horizontal position (inches or percentage)
 * @param {number|string} params.y - Vertical position (inches or percentage)
 * @param {number|string} params.w - Width (inches or percentage)
 * @param {number|string} params.h - Height (inches or percentage)
 * @param {number} params.fontSize - Font size in points
 * @param {string} params.color - Text color (hex code without #)
 * @param {string} [params.fontFace] - Font face name (defaults to DEFAULT_FONT)
 * @param {string} [params.align] - Text alignment: 'left', 'center', 'right' (defaults to 'left')
 * @param {boolean} [params.bold] - Bold text (defaults to false)
 * @param {boolean} [params.italic] - Italic text (defaults to false)
 * @param {string} [params.valign] - Vertical alignment: 'top', 'middle', 'bottom' (defaults to 'middle')
 * @param {object} [params.fill] - Fill options: { color, transparency, type }
 * @param {object} [params.line] - Line/border options: { color, width, style }
 * @param {object} [params.shadow] - Shadow options: { type, angle, blur, color, offset, opacity }
 * @param {number} [params.indent] - Text indent
 * @returns {object} Text options object compatible with PptxGenJS
 */
const getTextOptions = ({
  x,
  y,
  w,
  h,
  fontSize,
  color,
  fontFace = DEFAULT_FONT,
  align = "left",
  bold = false,
  italic = false,
  valign = "middle",
  fill = null,
  line = null,
  shadow = null,
  indent = null,
}) => {
  const options = {
    x,
    y,
    w,
    h,
    fontSize,
    color,
    fontFace,
    align,
    bold,
    italic,
    valign,
  };
  if (fill) options.fill = fill;
  if (line) options.line = line;
  if (shadow) options.shadow = shadow;
  if (indent) options.indent = indent;
  return options;
};

// ============================================================================
// CHART OPTIONS
// ============================================================================

/**
 * Gets chart options for slide.addChart().
 * Creates a configuration object for adding charts to PowerPoint slides.
 * Supports all common chart display options including legends, labels, and styling.
 *
 * @param {object} params - Chart configuration parameters
 * @param {number|string} params.x - Horizontal position (inches or percentage)
 * @param {number|string} params.y - Vertical position (inches or percentage)
 * @param {number|string} params.w - Width (inches or percentage)
 * @param {number|string} params.h - Height (inches or percentage)
 * @param {string} [params.title] - Chart title text
 * @param {boolean} [params.showTitle] - Show chart title (defaults to false)
 * @param {boolean} [params.showLegend] - Show legend (defaults to false)
 * @param {string} [params.legendPos] - Legend position: 'b' (bottom), 'tr' (top-right), 'l' (left), 'r' (right), 't' (top) (defaults to 'r')
 * @param {boolean} [params.showDataTable] - Show data table below chart (defaults to false)
 * @param {boolean} [params.showLabel] - Show data labels on chart (defaults to false)
 * @param {boolean} [params.showValue] - Show data values on chart (defaults to false)
 * @param {boolean} [params.showPercent] - Show data percentages on chart (defaults to false)
 * @param {array} [params.chartColors] - Array of hex color codes (without #) for chart series
 * @param {object} [params.chartArea] - Chart area fill/border options
 * @param {object} [params.plotArea] - Plot area fill/border options
 * @returns {object} Chart options object compatible with PptxGenJS
 */
const getChartOptions = ({
  x,
  y,
  w,
  h,
  title = null,
  showTitle = false,
  showLegend = false,
  legendPos = "r",
  legendFontSize = null,
  legendColor = null,
  showDataTable = false,
  showLabel = false,
  showValue = false,
  showPercent = false,
  chartColors = null,
  chartArea = null,
  plotArea = null,
}) => {
  const options = {
    x,
    y,
    w,
    h,
    showTitle,
    showLegend,
    legendPos,
    showDataTable,
    showLabel,
    showValue,
    showPercent,
  };
  if (title) options.title = title;
  if (legendFontSize) options.legendFontSize = legendFontSize;
  if (legendColor) options.legendColor = legendColor;
  if (chartColors) options.chartColors = chartColors;
  if (chartArea) options.chartArea = chartArea;
  if (plotArea) options.plotArea = plotArea;
  return options;
};

/**
 * Gets bar chart specific options.
 * Creates configuration for bar chart styling including direction, grouping, and spacing.
 *
 * @param {object} params - Bar chart configuration
 * @param {string} [params.barDir] - Bar direction: 'bar' (horizontal) or 'col' (vertical) (defaults to 'col')
 * @param {string} [params.barGrouping] - Bar grouping: 'clustered', 'stacked', 'percentStacked' (defaults to 'clustered')
 * @param {number} [params.barGapWidthPct] - Gap width between bar groups as percentage (0-500, defaults to 150)
 * @param {number} [params.barOverlapPct] - Overlap percentage between bars in same group (-100 to 100, defaults to 0)
 * @returns {object} Bar chart options object compatible with PptxGenJS
 */
const getBarChartOptions = ({
  barDir = "col",
  barGrouping = "clustered",
  barGapWidthPct = 150,
  barOverlapPct = 0,
}) => {
  return {
    barDir,
    barGrouping,
    barGapWidthPct,
    barOverlapPct,
  };
};

/**
 * Gets line chart specific options.
 * Creates configuration for line chart styling including line thickness, smoothing, and data point symbols.
 *
 * @param {object} params - Line chart configuration
 * @param {number} [params.lineSize] - Line thickness in points (0-256, defaults to 2)
 * @param {boolean} [params.lineSmooth] - Enable smooth/curved lines (defaults to false)
 * @param {string} [params.lineDataSymbol] - Symbol type for data points: 'circle', 'dash', 'diamond', 'dot', 'none', 'square', 'triangle' (defaults to 'circle')
 * @param {number} [params.lineDataSymbolSize] - Symbol size in points (1-256, defaults to 6)
 * @param {string} [params.displayBlanksAs] - How to display blank values: 'span' (connect) or 'gap' (break) (defaults to 'span')
 * @returns {object} Line chart options object compatible with PptxGenJS
 */
const getLineChartOptions = ({
  lineSize = 2,
  lineSmooth = false,
  lineDataSymbol = "circle",
  lineDataSymbolSize = 6,
  displayBlanksAs = "span",
}) => {
  return {
    lineSize,
    lineSmooth,
    lineDataSymbol,
    lineDataSymbolSize,
    displayBlanksAs,
  };
};

/**
 * Builds a chart configuration from data and styling configuration.
 *
 * Architecture:
 * - Data is separated from styling/config for reusability (can be used for tables and charts)
 * - Config contains all styling, positioning, and formatting options
 * - Supports BAR, LINE, PIE, and BAR_LINE combo charts
 *
 * Data Structure (for single chart):
 * {
 *   rows: [
 *     {
 *       category: { value: "CTV", format: FORMAT_TYPES.STRING },
 *       series1: { value: "4843174", format: FORMAT_TYPES.NUMBER },
 *       series2: { value: "367751", format: FORMAT_TYPES.NUMBER },
 *       ...
 *     },
 *     ...
 *   ]
 * }
 *
 * Data Structure (for BAR_LINE combo):
 * {
 *   rows: [
 *     {
 *       category: { value: "CTV", format: FORMAT_TYPES.STRING },
 *       barSeries: { value: "4843174", format: FORMAT_TYPES.NUMBER },
 *       lineSeries: { value: "367751", format: FORMAT_TYPES.NUMBER },
 *       ...
 *     },
 *     ...
 *   ]
 * }
 *
 * Config Structure:
 * {
 *   type: "BAR" | "LINE" | "PIE" | "BAR_LINE",
 *   position: { x, y },
 *   size: { w, h },
 *   seriesConfig: {
 *     categoryField: "category",
 *     seriesFields: ["series1", "series2"], // For single chart type
 *     seriesNames: ["Series 1", "Series 2"], // Optional, defaults to field names
 *   },
 *   chartOptions: {
 *     showLegend, legendPos, showValue, showLabel, ...
 *   },
 *   barConfig: { // For BAR or BAR_LINE
 *     seriesField: "barSeries",
 *     seriesName: "Impressions",
 *     chartColors: [...],
 *     barGapWidthPct: 312,
 *     ...
 *   },
 *   lineConfig: { // For LINE or BAR_LINE
 *     seriesField: "lineSeries",
 *     seriesName: "Reach",
 *     chartColors: [...],
 *     lineSize: 3,
 *     ...
 *   },
 *   axisConfig: { // Optional axis configuration
 *     valAxes: [...],
 *     catAxes: [...],
 *     ...
 *   }
 * }
 *
 * @param {object} chartData - Chart data with rows
 * @param {object} chartConfig - Chart configuration
 * @returns {object} Chart object ready for slide.CHART.push()
 */
const buildChartFromConfig = (chartData, chartConfig) => {
  const {
    type,
    position = { x: 0, y: 0 },
    size = { w: 0, h: 0 },
    seriesConfig = {},
    chartOptions = {},
    barConfig = {},
    lineConfig = {},
    axisConfig = {},
  } = chartConfig;

  const { rows = [] } = chartData;
  const {
    categoryField = "category",
    seriesFields = [],
    seriesNames = [],
  } = seriesConfig;

  if (rows.length === 0) {
    return null;
  }

  const extractNumericValue = (cellData) => {
    if (!cellData) return 0;
    const val =
      typeof cellData === "object"
        ? parseFloat(cellData.value)
        : parseFloat(cellData);
    return isNaN(val) ? 0 : val;
  };

  const extractStringValue = (cellData) => {
    if (!cellData) return "";
    return typeof cellData === "object"
      ? cellData.value || ""
      : String(cellData);
  };

  if (type === "BAR_LINE") {
    const {
      seriesField: barField = "barSeries",
      seriesName: barName = "Bar Series",
    } = barConfig;
    const {
      seriesField: lineField = "lineSeries",
      seriesName: lineName = "Line Series",
    } = lineConfig;

    const labels = rows.map((row) => extractStringValue(row[categoryField]));
    const barValues = rows.map((row) => extractNumericValue(row[barField]));
    const lineValues = rows.map((row) => extractNumericValue(row[lineField]));

    if (
      labels.length === 0 ||
      barValues.length === 0 ||
      lineValues.length === 0
    ) {
      return null;
    }

    const baseOptions = getChartOptions({
      x: position.x,
      y: position.y,
      w: size.w,
      h: size.h,
      ...chartOptions,
    });

    const barDataArray = [
      {
        name: barName,
        labels: labels,
        values: barValues,
      },
    ];

    const lineDataArray = [
      {
        name: lineName,
        labels: labels,
        values: lineValues,
      },
    ];

    return {
      type: "BAR_LINE",
      bar: {
        data: barDataArray,
        option: {
          title: barName,
          ...barConfig,
        },
      },
      line: {
        data: lineDataArray,
        option: {
          title: lineName,
          ...lineConfig,
        },
      },
      option: {
        ...baseOptions,
        ...axisConfig,
      },
    };
  }

  const labels = rows.map((row) => extractStringValue(row[categoryField]));

  if (labels.length === 0) {
    return null;
  }

  let chartDataArray = [];
  let seriesOptions = [];

  if (seriesFields.length > 0) {
    seriesFields.forEach((field, index) => {
      const values = rows.map((row) => extractNumericValue(row[field]));
      const seriesName = seriesNames[index] || field;

      chartDataArray.push({
        name: seriesName,
        labels: labels,
        values: values,
      });
    });
  } else {
    const firstDataField = Object.keys(rows[0] || {}).find(
      (key) => key !== categoryField
    );
    if (firstDataField) {
      const values = rows.map((row) =>
        extractNumericValue(row[firstDataField])
      );
      chartDataArray.push({
        name: seriesNames[0] || firstDataField,
        labels: labels,
        values: values,
      });
    }
  }

  if (chartDataArray.length === 0) {
    return null;
  }

  const baseOptions = getChartOptions({
    x: position.x,
    y: position.y,
    w: size.w,
    h: size.h,
    ...chartOptions,
  });

  let typeSpecificOptions = {};

  if (type === "BAR") {
    typeSpecificOptions = getBarChartOptions(barConfig);
  } else if (type === "LINE") {
    typeSpecificOptions = getLineChartOptions(lineConfig);
  }

  return {
    type: type,
    data: chartDataArray,
    option: {
      ...baseOptions,
      ...typeSpecificOptions,
      ...axisConfig,
      ...(barConfig.chartColors && { chartColors: barConfig.chartColors }),
      ...(lineConfig.chartColors && { chartColors: lineConfig.chartColors }),
    },
  };
};

// ============================================================================
// IMAGE OPTIONS
// ============================================================================

/**
 * Gets image options for slide.addImage().
 * Creates a configuration object for adding images to PowerPoint slides.
 *
 * @param {object} params - Image configuration parameters
 * @param {string} params.path - Image file path or URL
 * @param {number|string} params.x - Horizontal position (inches or percentage)
 * @param {number|string} params.y - Vertical position (inches or percentage)
 * @param {number|string} [params.w] - Width (inches or percentage)
 * @param {number|string} [params.h] - Height (inches or percentage)
 * @param {string} [params.sizing] - Image sizing: 'contain', 'cover', 'crop'
 * @param {string|object} [params.hyperlink] - Hyperlink URL or options object: { url, tooltip }
 * @param {string} [params.altText] - Alt text for accessibility
 * @returns {object} Image options object compatible with PptxGenJS
 */
const getImageOptions = ({
  path,
  x,
  y,
  w = null,
  h = null,
  sizing = null,
  hyperlink = null,
  altText = null,
}) => {
  const options = {
    path,
    x,
    y,
  };
  if (w) options.w = w;
  if (h) options.h = h;
  if (sizing) options.sizing = sizing;
  if (hyperlink) options.hyperlink = hyperlink;
  if (altText) options.altText = altText;
  return options;
};

// ============================================================================
// TABLE OPTIONS
// ============================================================================

/**
 * Gets table options for slide.addTable().
 * Creates a configuration object for adding tables to PowerPoint slides.
 * Supports column widths, row heights, borders, fills, and text styling.
 *
 * @param {object} params - Table configuration parameters
 * @param {number|string} params.x - Horizontal position (inches or percentage)
 * @param {number|string} params.y - Vertical position (inches or percentage)
 * @param {number|string} [params.w] - Width (inches or percentage)
 * @param {number|string} [params.h] - Height (inches or percentage)
 * @param {array} [params.colW] - Column widths array (in inches)
 * @param {array} [params.rowH] - Row heights array (in inches)
 * @param {object} [params.border] - Border options: { type, pt, color }
 * @param {object} [params.fill] - Fill options: { color, transparency }
 * @param {string} [params.align] - Text alignment: 'left', 'center', 'right' (defaults to 'left')
 * @param {string} [params.valign] - Vertical alignment: 'top', 'middle', 'bottom' (defaults to 'middle')
 * @param {number} [params.fontSize] - Font size in points
 * @param {string} [params.fontFace] - Font face name
 * @param {string} [params.color] - Text color (hex code without #)
 * @param {boolean} [params.bold] - Bold text (defaults to false)
 * @param {boolean} [params.autoPage] - Enable auto pagination for long tables (defaults to false)
 * @returns {object} Table options object compatible with PptxGenJS
 */
const getTableOptions = ({
  x,
  y,
  w = null,
  h = null,
  colW = null,
  rowH = null,
  border = null,
  fill = null,
  align = "left",
  valign = "middle",
  fontSize = null,
  fontFace = null,
  color = null,
  bold = false,
  autoPage = false,
}) => {
  const options = {
    x,
    y,
    align,
    valign,
    bold,
    autoPage,
  };
  if (w) options.w = w;
  if (h) options.h = h;
  if (colW) options.colW = colW;
  if (rowH) options.rowH = rowH;
  if (border) options.border = border;
  if (fill) options.fill = fill;
  if (fontSize) options.fontSize = fontSize;
  if (fontFace) options.fontFace = fontFace;
  if (color) options.color = color;
  return options;
};

/**
 * Builds a table configuration from data and styling configuration.
 *
 * Architecture:
 * - Data is separated from styling/config for reusability (can be used for tables and charts)
 * - Config contains all styling, positioning, and formatting options
 * - Options cascade: global -> column -> cell-specific (cell overrides column, column overrides global)
 *
 * Data Structure:
 * {
 *   headers: [
 *     { field: "channel", value: "Channel Name", format: FORMAT_TYPES.STRING },
 *     { field: "impressions", value: "Impressions", format: FORMAT_TYPES.NUMBER },
 *     ...
 *   ],
 *   rows: [
 *     [
 *       { field: "channel", value: "CTV", format: FORMAT_TYPES.STRING },
 *       { field: "impressions", value: "4843174", format: FORMAT_TYPES.NUMBER },
 *       ...
 *     ],
 *     ...
 *   ]
 * }
 *
 * Config Structure:
 * {
 *   position: { x, y },                    // Table position
 *   size: { w, h },                        // Table dimensions
 *   fill: { color, transparency },          // Table background
 *   globalCellOptions: {                   // Applied to all cells
 *     fontSize, color, height, bold, ...
 *   },
 *   headerOptions: {                       // Header cell options (applied to all headers)
 *     bold, align, valign, fontSize, color, ...
 *   },
 *   dataCellOptions: {                      // Data cell options (applied to all data cells)
 *     align, valign, fontSize, color, ...
 *   },
 *   columnOptions: [                       // Column-specific options (by index)
 *     { width, align, ... },
 *     ...
 *   ],
 *   rowHeightConfig: {                     // Row height configuration
 *     headerHeight: number,                // Header row height (optional, defaults to globalCellOptions.height)
 *     dataRowHeight: number,               // Data row height (optional, defaults to globalCellOptions.height)
 *   },
 *   borderConfig: {                        // Border styling rules
 *     outerBorders: boolean,               // Show outer borders (default: false)
 *     headerSeparator: { color, width },   // Border below header row (optional)
 *     firstColumnSeparator: { color, width }, // Border after first column (optional)
 *     internalBorders: boolean,            // Show default borders for internal cells (default: false)
 *   },
 *   tableOptions: { ... }                  // Additional table-level options
 * }
 *
 * @param {object} tableData - Table data with headers and rows
 * @param {object} tableConfig - Table configuration object
 * @returns {object} Table object with data and option properties ready for slide.TABLE.push()
 */
const buildTableFromConfig = (tableData, tableConfig) => {
  const {
    // Table-level options
    position = { x: 0, y: 0 },
    size = { w: 0, h: 0 },
    fill = null,
    // Global cell options (applied to all cells unless overridden)
    globalCellOptions = {},
    // Header-specific options
    headerOptions = {},
    // Data cell-specific options
    dataCellOptions = {},
    // Column-specific options (indexed by column index)
    columnOptions = [],
    // Row height configuration
    rowHeightConfig = {
      headerHeight: null, // If null, uses globalCellOptions.height
      dataRowHeight: null, // If null, uses globalCellOptions.height
    },
    // Border configuration
    borderConfig = {},
  } = tableConfig;

  const { headers = [], rows = [] } = tableData;
  const numCols = headers.length;
  const numRows = rows.length;

  /**
   * Creates a table cell with appropriate borders and styling.
   * Applies border rules based on cell position and border configuration.
   * Merges options in order: global -> column -> cell-specific.
   *
   * @param {object} cellData - Cell data with value, format, and optional options
   * @param {boolean} isHeader - Whether this is a header cell
   * @param {number} colIndex - Column index (0-based)
   * @param {number} rowIndex - Row index (0-based, -1 for header)
   * @param {boolean} isFirstCol - Whether this is the first column
   * @param {boolean} isLastCol - Whether this is the last column
   * @param {boolean} isFirstRow - Whether this is the first row
   * @param {boolean} isLastRow - Whether this is the last row
   * @returns {object} Cell object with text and options
   */
  const createCell = (
    cellData,
    isHeader,
    colIndex,
    rowIndex,
    isFirstCol,
    isLastCol,
    isFirstRow,
    isLastRow
  ) => {
    const borders = [];

    if (isFirstRow) {
      borders[0] = borderConfig.outerBorders
        ? { type: "solid" }
        : { type: "none", color: "FFFFFF" };
    } else {
      borders[0] = borderConfig.internalBorders
        ? { type: "solid" }
        : { type: "none", color: "FFFFFF" };
    }

    if (isLastCol) {
      borders[1] = borderConfig.outerBorders
        ? { type: "solid" }
        : { type: "none", color: "FFFFFF" };
    } else if (isFirstCol && borderConfig.firstColumnSeparator) {
      borders[1] = {
        type: "solid",
        color: borderConfig.firstColumnSeparator.color,
        pt: borderConfig.firstColumnSeparator.width,
      };
    } else {
      borders[1] = borderConfig.internalBorders
        ? { type: "solid" }
        : { type: "none", color: "FFFFFF" };
    }

    if (isLastRow) {
      borders[2] = borderConfig.outerBorders
        ? { type: "solid" }
        : { type: "none", color: "FFFFFF" };
    } else if (isHeader && borderConfig.headerSeparator) {
      borders[2] = {
        type: "solid",
        color: borderConfig.headerSeparator.color,
        pt: borderConfig.headerSeparator.width,
      };
    } else {
      borders[2] = borderConfig.internalBorders
        ? { type: "solid" }
        : { type: "none", color: "FFFFFF" };
    }

    if (isFirstCol) {
      borders[3] = borderConfig.outerBorders
        ? { type: "solid" }
        : { type: "none", color: "FFFFFF" };
    } else {
      borders[3] = borderConfig.internalBorders
        ? { type: "solid" }
        : { type: "none", color: "FFFFFF" };
    }

    const columnOpts = columnOptions[colIndex] || {};
    const cellOpts = cellData.options || {};

    const cellOptions = {
      ...globalCellOptions,
      ...columnOpts,
      ...cellOpts,
      border: borders,
    };

    const formattedValue = formatDataValue(cellData.value, cellData.format);

    return {
      text: formattedValue,
      options: cellOptions,
    };
  };

  const headerRow = headers.map((header, colIndex) => {
    const isFirstCol = colIndex === 0;
    const isLastCol = colIndex === numCols - 1;
    return createCell(
      {
        value: header.value || header,
        format: header.format || FORMAT_TYPES.STRING,
        options: {
          ...headerOptions,
          ...header.options,
        },
      },
      true,
      colIndex,
      -1,
      isFirstCol,
      isLastCol,
      true,
      false
    );
  });

  const dataRows = rows.map((row, rowIndex) => {
    return headers.map((header, colIndex) => {
      // Standard row format: array of cell objects in header order
      const cellData = row[colIndex] || {
        value: "",
        format: FORMAT_TYPES.STRING,
      };

      const isFirstCol = colIndex === 0;
      const isLastCol = colIndex === numCols - 1;
      const isLastRow = rowIndex === numRows - 1;

      return createCell(
        {
          value: cellData.value || cellData,
          format: cellData.format || header.format || FORMAT_TYPES.STRING,
          options: {
            ...dataCellOptions,
            ...cellData.options,
          },
        },
        false,
        colIndex,
        rowIndex,
        isFirstCol,
        isLastCol,
        false,
        isLastRow
      );
    });
  });

  const tableDataArray = [headerRow, ...dataRows];

  const colW = columnOptions.map((colOpt) => colOpt.width).filter(Boolean);
  if (colW.length !== numCols) {
    const totalWidth = size.w || 0;
    if (totalWidth > 0) {
      const defaultWidth = totalWidth / numCols;
      for (let i = colW.length; i < numCols; i++) {
        colW.push(defaultWidth);
      }
    }
  }

  const rowH = [];
  const headerHeight = rowHeightConfig.headerHeight || globalCellOptions.height;
  const dataRowHeight =
    rowHeightConfig.dataRowHeight || globalCellOptions.height;

  if (headerHeight) {
    rowH.push(headerHeight);
  }

  for (let i = 0; i < numRows; i++) {
    if (dataRowHeight) {
      rowH.push(dataRowHeight);
    }
  }

  const tableOptions = getTableOptions({
    x: position.x,
    y: position.y,
    w: size.w,
    h: size.h,
    colW: colW,
    rowH: rowH,
    fill: fill,
    fontSize: globalCellOptions.fontSize,
    color: globalCellOptions.color,
    ...tableConfig.tableOptions,
  });

  return {
    data: tableDataArray,
    option: tableOptions,
  };
};

// ============================================================================
// BACKGROUND OPTIONS
// ============================================================================

/**
 * Gets background options for slide.background.
 * Creates a configuration object for slide backgrounds supporting images, colors, and gradients.
 *
 * @param {object} params - Background configuration parameters
 * @param {string} [params.path] - Background image file path
 * @param {string} [params.color] - Background color (hex code without #)
 * @param {string} [params.fill] - Fill type: 'solid', 'linear', 'radial'
 * @param {object} [params.fillOptions] - Additional fill options for gradients
 * @returns {object} Background options object compatible with PptxGenJS
 */
const getBackgroundOptions = ({
  path = null,
  color = null,
  fill = null,
  fillOptions = null,
}) => {
  const options = {};
  if (path) options.path = path;
  if (color) options.color = color;
  if (fill) {
    options.fill = fill;
    if (fillOptions) {
      Object.assign(options, fillOptions);
    }
  }
  return options;
};

/**
 * Gets background image options.
 * Convenience function to create background configuration with an image path.
 *
 * @param {string} imagePath - Path to background image file
 * @returns {object} Background options object with path property
 */
const getBackgroundImage = (imagePath) => {
  return { path: imagePath };
};

/**
 * Gets background color options.
 * Convenience function to create background configuration with a solid color.
 *
 * @param {string} color - Background color (hex code without #)
 * @returns {object} Background options object with color property
 */
const getBackgroundColor = (color) => {
  return { color };
};

// ============================================================================
// SHAPE OPTIONS
// ============================================================================

/**
 * Gets shape options for slide.addShape().
 * Creates a configuration object for adding shapes to PowerPoint slides.
 * Note: Shape type is passed separately to addShape(), not in these options.
 *
 * @param {object} params - Shape configuration parameters
 * @param {number|string} params.x - Horizontal position (inches or percentage)
 * @param {number|string} params.y - Vertical position (inches or percentage)
 * @param {number|string} params.w - Width (inches or percentage)
 * @param {number|string} params.h - Height (inches or percentage)
 * @param {object} [params.fill] - Fill options: { color, transparency, type }
 * @param {object} [params.line] - Line/border options: { color, width, style }
 * @param {object} [params.shadow] - Shadow options: { type, angle, blur, color, offset, opacity }
 * @returns {object} Shape options object compatible with PptxGenJS
 */
const getShapeOptions = ({
  x,
  y,
  w,
  h,
  fill = null,
  line = null,
  shadow = null,
}) => {
  const options = {
    x,
    y,
    w,
    h,
  };
  if (fill) options.fill = fill;
  if (line) options.line = line;
  if (shadow) options.shadow = shadow;
  return options;
};

// ============================================================================
// FILL OPTIONS
// ============================================================================

/**
 * Gets fill options for shapes, text, and other elements.
 * Creates fill configuration supporting solid colors and gradients.
 *
 * @param {object} params - Fill configuration parameters
 * @param {string} params.color - Fill color (hex code without #)
 * @param {number} [params.transparency] - Transparency percentage (0-100, where 0 is opaque)
 * @param {string} [params.type] - Fill type: 'solid', 'linear', 'radial' (defaults to 'solid')
 * @param {string} [params.color2] - Second color for gradient fills (hex code without #)
 * @param {number} [params.angle] - Gradient angle in degrees (for linear gradients)
 * @returns {object} Fill options object compatible with PptxGenJS
 */
const getFillOptions = ({
  color,
  transparency = null,
  type = "solid",
  color2 = null,
  angle = null,
}) => {
  const options = { color };
  if (transparency !== null) options.transparency = transparency;
  if (type !== "solid") {
    options.type = type;
    if (color2) options.color2 = color2;
    if (angle !== null) options.angle = angle;
  }
  return options;
};

// ============================================================================
// LINE/BORDER OPTIONS
// ============================================================================

/**
 * Gets line/border options.
 * Creates configuration for lines and borders on shapes and text elements.
 *
 * @param {object} params - Line configuration parameters
 * @param {string} params.color - Line color (hex code without #)
 * @param {number|string} [params.width] - Line width in points or as string
 * @param {string} [params.style] - Line style: 'solid', 'dash', 'dot' (defaults to 'solid')
 * @returns {object} Line options object compatible with PptxGenJS
 */
const getLineOptions = ({ color, width = null, style = "solid" }) => {
  const options = { color, style };
  if (width !== null) options.width = width;
  return options;
};

// ============================================================================
// SHADOW OPTIONS
// ============================================================================

/**
 * Gets shadow options.
 * Creates configuration for shadows on shapes and text elements.
 * Provides realistic shadow effects with customizable angle, blur, and opacity.
 *
 * @param {object} params - Shadow configuration parameters
 * @param {string} [params.type] - Shadow type: 'outer' or 'inner' (defaults to 'outer')
 * @param {number} [params.angle] - Shadow angle in degrees (0-359, defaults to 90)
 * @param {number} [params.blur] - Blur size in points (1-256, defaults to 3)
 * @param {string} [params.color] - Shadow color (hex code without #, defaults to '000000')
 * @param {number} [params.offset] - Offset size in points (1-256, defaults to 1.8)
 * @param {number} [params.opacity] - Opacity value (0-1, defaults to 0.35)
 * @returns {object} Shadow options object compatible with PptxGenJS
 */
const getShadowOptions = ({
  type = "outer",
  angle = 90,
  blur = 3,
  color = "000000",
  offset = 1.8,
  opacity = 0.35,
}) => {
  return {
    type,
    angle,
    blur,
    color,
    offset,
    opacity,
  };
};

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  // Constants
  DEFAULT_FONT,
  CENTER_ALIGN,
  LEFT_ALIGN,
  RIGHT_ALIGN,
  LAYOUT_WIDE,
  FORMAT_TYPES,
  colors,

  // Utility functions
  convertCentimetersToInches,
  formatDataValue,

  // Text
  getTextOptions,

  // Charts
  getChartOptions,
  getBarChartOptions,
  getLineChartOptions,
  buildChartFromConfig,

  // Images
  getImageOptions,

  // Tables
  getTableOptions,
  buildTableFromConfig,

  // Background
  getBackgroundOptions,
  getBackgroundImage,
  getBackgroundColor,

  // Shapes
  getShapeOptions,

  // Styling
  getFillOptions,
  getLineOptions,
  getShadowOptions,
};
