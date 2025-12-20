const slideViewMapping = require("../../config/slide-view-mapping.json");
const path = require("path");
const logger = require("../../utils/logger.util");
const {
  CENTER_ALIGN,
  LAYOUT_WIDE,
  colors,
  getTextOptions,
  getShapeOptions,
  formatDataValue,
  convertCentimetersToInches,
  LEFT_ALIGN,
  FORMAT_TYPES,
  buildTableFromConfig,
  buildChartFromConfig,
} = require("../../utils/pptx-helpers.util");

class PoliticalSnapshotService {

  // View keys - use these as constants for type safety
  static VIEW_KEYS = {
    TRACKABLE_IMPRESSIONS: "TRACKABLE_IMPRESSIONS",
    REACH: "REACH",
    AVG_FREQUENCY: "AVG_FREQUENCY",
    VIDEO_PERFORMANCE: "VIDEO_PERFORMANCE",
    CLICK_PERFORMANCE: "CLICK_PERFORMANCE",
    TOP_CHANNEL: "TOP_CHANNEL",
    TOP_DEVICE: "TOP_DEVICE",
    TOP_APP: "TOP_APP",
    LAB_CAMPAIGN_DATA: "LAB_CAMPAIGN_DATA",
    INSERTION_ORDER_DATA: "INSERTION_ORDER_DATA",
    DSP_CREATIVE_DATA: "DSP_CREATIVE_DATA",
    CHANNEL_DATA: "CHANNEL_DATA",
    IMPRESSIONS_DATA: "IMPRESSIONS_DATA",
  };

  constructor() {
    logger.info("Political Snapshot Service initialized");
  }


  async getPptConfig(requestData) {
    const { useCase = "POLITICAL_SNAPSHOT", viewData = {} } = requestData;
    logger.info("Processing Political Snapshot export", { 
      useCase,
      hasViewData: Object.keys(viewData).length > 0
    });

    try {
      const slideMapping = slideViewMapping[useCase];
      if (!slideMapping || !slideMapping.slides) {
        throw new Error(`Slide mapping not found for usecase: ${useCase}`);
      }

      const totalSlides = slideMapping.slides.length;
      logger.info("Total slides to process", { totalSlides });
      
      // Require viewData - no static fallback in production
      if (!viewData || Object.keys(viewData).length === 0) {
        throw new Error('viewData is required for PPT generation');
      }
      
      // Merge viewData with any defaults (currently just uses viewData as-is)
      const dataToUse = this._mergeViewDataWithDefaults(viewData);
      
      logger.info("Using data for PPT generation", { 
        viewKeys: Object.keys(dataToUse)
      });
      
      const slides = [];

      for (const slideConfig of slideMapping.slides) {
        // Process all slides
        if (slideConfig.slideNumber <= totalSlides) {
          logger.info("Creating slide", { slideConfig });
          const slide = await this._createSlide(slideConfig, dataToUse);
          logger.info("Slide created", { slideNumber: slideConfig.slideNumber });
          slides.push(slide);
        }
      }

      logger.info("Slides created", { slideCount: slides.length });

      return {
        TITLE: "Political Snapshot Report",
        LAYOUT: LAYOUT_WIDE,
        SLIDES: slides,
      };
    } catch (error) {
      logger.error("Political Snapshot processing failed", error);
      throw error;
    }
  }

  /**
   * Merge real view data with defaults
   * Currently just returns the viewData as-is, but can be extended for defaults
   * @param {object} viewData - Transformed view data from DataTransformerService
   * @returns {object} Merged data object in expected format
   */
  _mergeViewDataWithDefaults(viewData) {
    // For now, just use the provided viewData
    // Can be extended to merge with defaults if needed
    return { ...viewData };
  }

  async _createSlide(slideConfig, viewData) {
    switch (slideConfig.slideNumber) {
      case 1:
        return this._createSlide1(slideConfig);
      case 2:
        return this._createSlide2(slideConfig);
      case 3:
        return this._createSlide3(slideConfig, viewData);
      case 4:
        return this._createSlide4(slideConfig, viewData);
      case 5:
        return this._createSlide5(slideConfig, viewData);
      default:
        logger.warn('Unknown slide number', { slideNumber: slideConfig.slideNumber });
        return {};
    }
  }

  /**
   * Get view data by key with null safety
   * @param {object} viewData - View data object
   * @param {string} viewKey - View key
   * @returns {object|null} View data or null if not found
   */
  _getViewData(viewData, viewKey) {
    const data = viewData[viewKey];
    if (!data) {
      logger.warn('View data not found', { viewKey });
      return null;
    }
    return data;
  }

  /**
   * Create a flag card text element (value + label)
   * @param {object} viewData - View data object
   * @param {string} viewKey - View key
   * @param {string} label - Label text
   * @param {object} position - Position {x, y, w, h}
   * @returns {object} Text element configuration
   */
  _createFlagCardText(viewData, viewKey, label, position) {
    const data = this._getViewData(viewData, viewKey);
    if (!data) {
      return null;
    }

    return {
      text: [
        {
          text: formatDataValue(data.value, data.format),
          options: {
            fontSize: 24,
            bold: true,
            breakLine: true,
          },
        },
        {
          text: label,
          options: {
            fontSize: 9.3,
            italic: true,
          },
        },
      ],
      option: getTextOptions({
        ...position,
        color: colors.primaryBlack,
        align: CENTER_ALIGN,
      }),
    };
  }

  /**
   * Create a simple label text element
   * @param {string} text - Label text
   * @param {object} position - Position {x, y, w, h}
   * @param {object} options - Additional options
   * @returns {object} Text element configuration
   */
  _createLabelText(text, position, options = {}) {
    return {
      text,
      option: getTextOptions({
        ...position,
        fontSize: 12,
        color: colors.primaryWhite,
        bold: true,
        align: LEFT_ALIGN,
        ...options,
      }),
    };
  }

  _createSlide1(slideConfig) {
    const slide = {
      BACKGROUND: { url: this._getBackgroundImagePath("Bg_Slide1.png") },
      IMAGE: [],
      SHAPE: [],
      TEXT: [],
    };

    slide.IMAGE.push({
      path: this._getBackgroundImagePath("MiQ_Logo.png"),
      x: convertCentimetersToInches(7.12),
      y: convertCentimetersToInches(7.85),
      w: convertCentimetersToInches(7.96),
      h: convertCentimetersToInches(3.34),
    });

    slide.SHAPE.push({
      type: "LINE",
      option: getShapeOptions({
        x: convertCentimetersToInches(16.93),
        y: convertCentimetersToInches(7.13),
        w: convertCentimetersToInches(0),
        h: convertCentimetersToInches(4.78),
        line: { color: colors.primaryWhite, width: 1 },
      }),
    });

    slide.TEXT.push({
      text: "",
      option: getTextOptions({
        x: convertCentimetersToInches(19.03),
        y: convertCentimetersToInches(7.44),
        w: convertCentimetersToInches(7.82),
        h: convertCentimetersToInches(4.17),
        fontSize: 18,
        color: colors.primaryWhite,
        align: CENTER_ALIGN,
        line: { color: colors.primaryPink, width: "2" },
      }),
    });

    slide.TEXT.push({
      text: "Client Logo",
      option: getTextOptions({
        x: convertCentimetersToInches(19.03),
        y: convertCentimetersToInches(9.05),
        w: convertCentimetersToInches(7.82),
        h: convertCentimetersToInches(1.02),
        fontSize: 18,
        color: colors.primaryWhite,
        align: CENTER_ALIGN,
      }),
    });

    slide.TEXT.push({
      text: [
        {
          text: "ADVERTISER NAME : ",
          options: {
            fontSize: 24,
            bold: true,
          },
        },
        {
          text: "MiQ Digital",
          options: {
            fontSize: 20,
            italic: true,
          },
        },
      ],
      option: getTextOptions({
        x: 0,
        y: convertCentimetersToInches(12.93),
        w: convertCentimetersToInches(33.86),
        h: convertCentimetersToInches(1.28),
        color: colors.primaryWhite,
        align: CENTER_ALIGN,
      }),
    });

    slide.TEXT.push({
      text: [
        {
          text: "CAMPAIGN LABEL : ",
          options: {
            fontSize: 24,
            bold: true,
          },
        },
        {
          text: "Test Campaign Entry <--> 9sjwto",
          options: {
            fontSize: 20,
            italic: true,
          },
        },
      ],
      option: getTextOptions({
        x: 0,
        y: convertCentimetersToInches(14.22),
        w: convertCentimetersToInches(33.86),
        h: convertCentimetersToInches(1.28),
        color: colors.primaryWhite,
        align: CENTER_ALIGN,
      }),
    });

    return slide;
  }

  _createSlide2(slideConfig) {
    const slide = {
      BACKGROUND: { url: this._getBackgroundImagePath("Bg_Slide2.png") },
      TEXT: [],
    };

    slide.TEXT.push({
      text: "Performance Display",
      option: getTextOptions({
        x: convertCentimetersToInches(11.68),
        y: convertCentimetersToInches(8.32),
        w: convertCentimetersToInches(21.54),
        h: convertCentimetersToInches(2.06),
        fontSize: 44,
        color: colors.primaryWhite,
        align: CENTER_ALIGN,
        bold: true,
      }),
    });

    return slide;
  }

  _createSlide3(slideConfig, viewData) {
    const slide = {
      BACKGROUND: { url: this._getBackgroundImagePath("Bg_Slide3.png") },
      TEXT: [],
    };

    // Title
    slide.TEXT.push({
      text: "Campaign Performance Overview",
      option: getTextOptions({
        x: convertCentimetersToInches(1),
        y: convertCentimetersToInches(1),
        w: convertCentimetersToInches(25.02),
        h: convertCentimetersToInches(1.03),
        fontSize: 20,
        color: colors.primaryGold,
        bold: true,
      }),
    });

    // Labels - Row 1
    slide.TEXT.push(this._createLabelText("Total Spend", {
      x: convertCentimetersToInches(3.4),
      y: convertCentimetersToInches(3.67),
      w: convertCentimetersToInches(8.07),
      h: convertCentimetersToInches(0.88),
    }));

    slide.TEXT.push(this._createLabelText("Total Impressions", {
      x: convertCentimetersToInches(12.22),
      y: convertCentimetersToInches(3.67),
      w: convertCentimetersToInches(8.07),
      h: convertCentimetersToInches(0.88),
    }));

    slide.TEXT.push(this._createLabelText("Inventory", {
      x: convertCentimetersToInches(21),
      y: convertCentimetersToInches(3.67),
      w: convertCentimetersToInches(9.99),
      h: convertCentimetersToInches(0.88),
    }));

    // Labels - Row 2
    slide.TEXT.push(this._createLabelText("Reach", {
      x: convertCentimetersToInches(3.4),
      y: convertCentimetersToInches(7.9),
      w: convertCentimetersToInches(8.07),
      h: convertCentimetersToInches(0.88),
    }));

    slide.TEXT.push(this._createLabelText("Avg Frequency", {
      x: convertCentimetersToInches(12.22),
      y: convertCentimetersToInches(7.86),
      w: convertCentimetersToInches(8.07),
      h: convertCentimetersToInches(0.88),
    }));

    // Labels - Row 3
    slide.TEXT.push(this._createLabelText("Video Performance", {
      x: convertCentimetersToInches(3.4),
      y: convertCentimetersToInches(12.11),
      w: convertCentimetersToInches(8.07),
      h: convertCentimetersToInches(0.88),
    }));

    slide.TEXT.push(this._createLabelText("Click Performance", {
      x: convertCentimetersToInches(12.22),
      y: convertCentimetersToInches(12.11),
      w: convertCentimetersToInches(8.07),
      h: convertCentimetersToInches(0.88),
    }));

    // Spend (hardcoded to 0 for now)
    slide.TEXT.push({
      text: [
        {
          text: formatDataValue(0, FORMAT_TYPES.CURRENCY),
          options: { fontSize: 24, bold: true, breakLine: true },
        },
        {
          text: "Spend",
          options: { fontSize: 9.3, italic: true },
        },
      ],
      option: getTextOptions({
        x: convertCentimetersToInches(3.83),
        y: convertCentimetersToInches(5.02),
        w: convertCentimetersToInches(6.65),
        h: convertCentimetersToInches(1.6),
        color: colors.primaryBlack,
        align: CENTER_ALIGN,
      }),
    });

    // Flag Cards - Row 1
    const impressionsCard = this._createFlagCardText(
      viewData,
      PoliticalSnapshotService.VIEW_KEYS.TRACKABLE_IMPRESSIONS,
      "Impressions",
      {
        x: convertCentimetersToInches(12.57),
        y: convertCentimetersToInches(5.02),
        w: convertCentimetersToInches(6.65),
        h: convertCentimetersToInches(1.6),
      }
    );
    if (impressionsCard) slide.TEXT.push(impressionsCard);

    // Inventory section (Top Channel, Device, App)
    const topChannelData = this._getViewData(viewData, PoliticalSnapshotService.VIEW_KEYS.TOP_CHANNEL);
    const topDeviceData = this._getViewData(viewData, PoliticalSnapshotService.VIEW_KEYS.TOP_DEVICE);
    const topAppData = this._getViewData(viewData, PoliticalSnapshotService.VIEW_KEYS.TOP_APP);

    const inventoryTextParts = [];
    
    if (topChannelData) {
      inventoryTextParts.push(
        { text: formatDataValue(topChannelData.value, topChannelData.format), options: { fontSize: 24, bold: true, breakLine: true } },
        { text: "Top Channel", options: { fontSize: 9.3, italic: true, breakLine: true } },
        { text: " ", options: { fontSize: 15, breakLine: true } }
      );
    }
    
    if (topDeviceData) {
      inventoryTextParts.push(
        { text: formatDataValue(topDeviceData.value, topDeviceData.format), options: { fontSize: 24, bold: true, breakLine: true } },
        { text: "Top Device", options: { fontSize: 9.3, italic: true, breakLine: true } },
        { text: " ", options: { fontSize: 15, breakLine: true } }
      );
    }
    
    if (topAppData) {
      inventoryTextParts.push(
        { text: formatDataValue(topAppData.value, topAppData.format), options: { fontSize: 24, bold: true, breakLine: true } },
        { text: "Top App", options: { fontSize: 9.3, italic: true } }
      );
    }

    if (inventoryTextParts.length > 0) {
      slide.TEXT.push({
        text: inventoryTextParts,
        option: getTextOptions({
          x: convertCentimetersToInches(21.71),
          y: convertCentimetersToInches(4.46),
          w: convertCentimetersToInches(8.76),
          h: convertCentimetersToInches(6.33),
          color: colors.primaryBlack,
          align: CENTER_ALIGN,
        }),
      });
    }

    // Flag Cards - Row 2
    const reachCard = this._createFlagCardText(
      viewData,
      PoliticalSnapshotService.VIEW_KEYS.REACH,
      "Reach",
      {
        x: convertCentimetersToInches(3.83),
        y: convertCentimetersToInches(9.31),
        w: convertCentimetersToInches(6.65),
        h: convertCentimetersToInches(1.6),
      }
    );
    if (reachCard) slide.TEXT.push(reachCard);

    const avgFreqCard = this._createFlagCardText(
      viewData,
      PoliticalSnapshotService.VIEW_KEYS.AVG_FREQUENCY,
      "Avg Frequency",
      {
        x: convertCentimetersToInches(12.57),
        y: convertCentimetersToInches(9.31),
        w: convertCentimetersToInches(6.65),
        h: convertCentimetersToInches(1.6),
      }
    );
    if (avgFreqCard) slide.TEXT.push(avgFreqCard);

    // Flag Cards - Row 3
    const videoPerfCard = this._createFlagCardText(
      viewData,
      PoliticalSnapshotService.VIEW_KEYS.VIDEO_PERFORMANCE,
      "VCR",
      {
        x: convertCentimetersToInches(3.83),
        y: convertCentimetersToInches(13.46),
        w: convertCentimetersToInches(6.65),
        h: convertCentimetersToInches(1.6),
      }
    );
    if (videoPerfCard) slide.TEXT.push(videoPerfCard);

    const clickPerfCard = this._createFlagCardText(
      viewData,
      PoliticalSnapshotService.VIEW_KEYS.CLICK_PERFORMANCE,
      "CTR",
      {
        x: convertCentimetersToInches(12.57),
        y: convertCentimetersToInches(13.46),
        w: convertCentimetersToInches(6.65),
        h: convertCentimetersToInches(1.6),
      }
    );
    if (clickPerfCard) slide.TEXT.push(clickPerfCard);

    slide.TEXT.push({
      text: "",
      option: getTextOptions({
        x: convertCentimetersToInches(21),
        y: convertCentimetersToInches(11.36),
        w: convertCentimetersToInches(9.99),
        h: convertCentimetersToInches(4.17),
        fontSize: 18,
        color: colors.primaryWhite,
        align: CENTER_ALIGN,
        line: { color: colors.primaryPink, width: "2" },
      }),
    });

    slide.TEXT.push({
      text: "Client Logo",
      option: getTextOptions({
        x: convertCentimetersToInches(21),
        y: convertCentimetersToInches(12.75),
        w: convertCentimetersToInches(9.99),
        h: convertCentimetersToInches(1.02),
        fontSize: 18,
        color: colors.primaryWhite,
        align: CENTER_ALIGN,
      }),
    });

    return slide;
  }

  _createSlide4(slideConfig, viewData) {
    const slide = {
      BACKGROUND: { url: this._getBackgroundImagePath("Bg_Slide4.png") },
      TEXT: [],
      TABLE: [],
    };

    const channelData = this._getViewData(viewData, PoliticalSnapshotService.VIEW_KEYS.CHANNEL_DATA);
    if (!channelData || !channelData.headers || !channelData.rows) {
      logger.warn('Channel data not available for slide 4', { viewData: Object.keys(viewData) });
      return slide;
    }

    const tableData = {
      headers: channelData.headers,
      rows: channelData.rows,
    };

    const tableConfig = {
      position: {
        x: convertCentimetersToInches(0.69),
        y: convertCentimetersToInches(5.23),
      },
      size: {
        w: convertCentimetersToInches(32.48),
        h: convertCentimetersToInches(4.7),
      },
      fill: { color: colors.primaryWhite, transparency: 100 },
      globalCellOptions: {
        fontSize: 12,
        color: colors.primaryWhite,
        height: convertCentimetersToInches(0.94),
      },
      headerOptions: {
        bold: true,
        align: CENTER_ALIGN,
        valign: "middle",
      },
      dataCellOptions: {
        align: CENTER_ALIGN,
        valign: "middle",
      },
      columnOptions: [
        { width: convertCentimetersToInches(13.59) },
        { width: convertCentimetersToInches(7.21) },
        { width: convertCentimetersToInches(5.85) },
        { width: convertCentimetersToInches(5.83) },
      ],
      rowHeightConfig: {
        headerHeight: convertCentimetersToInches(1.4),
        dataRowHeight: convertCentimetersToInches(0.94),
      },
      borderConfig: {
        outerBorders: false,
        headerSeparator: { color: colors.primaryPink, width: 1 },
        firstColumnSeparator: { color: colors.primaryPink, width: 1 },
        internalBorders: true,
      },
    };

    const table = buildTableFromConfig(tableData, tableConfig);
    slide.TABLE.push(table);

    return slide;
  }

  _createSlide5(slideConfig, viewData) {
    const slide = {
      BACKGROUND: { url: this._getBackgroundImagePath("Bg_Slide5.png") },
      TEXT: [],
      CHART: [],
    };

    slide.TEXT.push({
      text: "Reach & Frequency by Channel",
      option: getTextOptions({
        x: convertCentimetersToInches(1),
        y: convertCentimetersToInches(1),
        w: convertCentimetersToInches(25.02),
        h: convertCentimetersToInches(1.03),
        fontSize: 20,
        color: colors.primaryWhite,
        bold: true,
      }),
    });

    const channelData = this._getViewData(viewData, PoliticalSnapshotService.VIEW_KEYS.CHANNEL_DATA);
    if (!channelData || !channelData.rows || channelData.rows.length === 0) {
      logger.warn('Channel data not available for slide 5', { viewData: Object.keys(viewData) });
      return slide;
    }
    
    // Map channel data to chart format
    // Chart builder's extractStringValue/extractNumericValue can handle {value, format} objects
    const chartData = {
      // Standard row format: array of cell objects [{field,value,format}, ...]
      rows: channelData.rows.map((row) => {
        const getCell = (fieldName) =>
          row.find((cell) => cell && cell.field === fieldName) || {
            value: "",
            format: FORMAT_TYPES.STRING,
          };

        return {
          category: getCell("channel"),
          impressions: getCell("impressions"),
          reach: getCell("reach"),
          frequency: getCell("frequency"),
        };
      }),
    };

    const chartConfig = {
      type: "BAR_LINE",
      position: {
        x: convertCentimetersToInches(0.69),
        y: convertCentimetersToInches(5.46),
      },
      size: {
        w: convertCentimetersToInches(32.48),
        h: convertCentimetersToInches(10.55),
      },
      seriesConfig: {
        categoryField: "category",
      },
      chartOptions: {
        showLegend: true,
        legendPos: "b",
        showValue: true,
        showLabel: true,
        legendFontSize: 10.5,
        legendColor: colors.primaryWhite,
      },
      barConfig: {
        seriesField: "impressions",
        seriesName: "Impressions",
        chartColors: [colors.primaryPink],
        barGapWidthPct: 312,
        showValue: true,
        dataLabelPosition: "outEnd",
        dataLabelFontSize: 10.5,
        dataLabelColor: colors.primaryWhite,
      },
      lineConfig: {
        seriesField: "reach",
        seriesName: "Reach",
        chartColors: [colors.primaryGold],
        lineSize: 3,
        lineSmooth: true,
        lineDataSymbol: "none",
        showValue: false,
        showLabel: false,
        secondaryValAxis: true,
        secondaryCatAxis: true,
      },
      axisConfig: {
        valAxes: [
          {
            showValAxisTitle: true,
            valAxisTitle: "Impressions",
            valAxisTitleFontSize: 10.5,
            valAxisTitleColor: colors.primaryWhite,
            valAxisLabelFontSize: 10.5,
            valAxisLabelColor: colors.primaryWhite,
            valAxisDisplayUnit: "thousands",
            valAxisDisplayUnitLabel: false,
            valAxisLabelFormatCode: "#,##0\"K\"",
            valGridLine: { style: "none" },
            valAxisLineShow: false,
          },
          {
            showValAxisTitle: true,
            valAxisTitle: "Reach",
            valAxisTitleFontSize: 10.5,
            valAxisTitleColor: colors.primaryWhite,
            valAxisLabelFontSize: 10.5,
            valAxisLabelColor: colors.primaryWhite,
            valAxisDisplayUnit: "thousands",
            valAxisDisplayUnitLabel: false,
            valAxisLabelFormatCode: "#,##0\"K\"",
            valGridLine: { style: "none" },
            valAxisLineShow: false,
          },
        ],
        catAxes: [
          {
            catAxisTitle: "Channel",
            catAxisLabelFontSize: 10.5,
            catAxisLabelColor: colors.primaryWhite,
            catAxisLineColor: colors.primaryWhite,
          },
          {
            catAxisHidden: true,
          },
        ],
        catAxisLabelFontSize: 10.5,
        catAxisLabelColor: colors.primaryWhite,
        catGridLine: { style: "none" },
        catAxisLineColor: colors.primaryWhite,
      },
    };

    const chart = buildChartFromConfig(chartData, chartConfig);
    if (chart) {
      slide.CHART.push(chart);
    } else {
      logger.warn("Chart data is empty, skipping chart creation");
    }

    return slide;
  }

  _getBackgroundImagePath(imagePath) {
    return path.join(__dirname, "../../../assets/images", imagePath);
  }
}

module.exports = new PoliticalSnapshotService();
