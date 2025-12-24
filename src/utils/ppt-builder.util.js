const PptxGenJS = require('pptxgenjs');
const logger = require('./logger.util');

/**
 * Creates PowerPoint presentations from configuration objects.
 * Supports backgrounds, text, images, shapes, tables, and charts.
 */

/**
 * Generates PowerPoint presentation from configuration and returns as base64.
 * Iterates through slide configuration and adds all elements sequentially.
 *
 * @param {object} config - PowerPoint configuration
 * @param {string} config.TITLE - Presentation title
 * @param {string} config.LAYOUT - Layout type (e.g., LAYOUT_WIDE)
 * @param {Array<object>} config.SLIDES - Array of slide configurations
 * @returns {Promise<string>} Base64 encoded PowerPoint file
 * @throws {Error} If presentation generation fails
 */
async function createSlides(config) {
  try {
    logger.info('Creating PowerPoint presentation', {
      title: config.TITLE,
      layout: config.LAYOUT,
      slideCount: config.SLIDES?.length || 0
    });

    const pptx = new PptxGenJS();
    pptx.layout = config.LAYOUT;
    pptx.title = config.TITLE;

    config.SLIDES.forEach((slideData, slideIndex) => {
      const slide = pptx.addSlide();

      for (const itemKey in slideData) {
        if (!slideData.hasOwnProperty(itemKey)) continue;

        switch (itemKey) {
          case 'BACKGROUND':
            slide.background = { path: slideData[itemKey].url };
            break;
          case 'BACKGROUND_COLOR':
            slide.background = { color: slideData[itemKey].color };
            break;
          case 'TEXT':
            slideData[itemKey].forEach(textConfig => {
              slide.addText(textConfig.text, textConfig.option);
            });
            break;
          case 'IMAGE':
            slideData[itemKey].forEach(imageConfig => {
              slide.addImage(imageConfig);
            });
            break;
          case 'SHAPE':
            slideData[itemKey].forEach((shapeConfig) => {
              _addShape(pptx, slide, shapeConfig);
            });
            break;
          case 'TABLE':
            slideData[itemKey].forEach(tableConfig => {
              slide.addTable(tableConfig.data, tableConfig.option);
            });
            break;
          case 'CHART':
            slideData[itemKey].forEach((chartConfig) => {
              _addChart(pptx, slide, chartConfig, slideIndex);
            });
            break;
        }
      }
    });

    const data = await pptx.write('base64');
    
    logger.info('PowerPoint presentation created successfully', {
      title: config.TITLE,
      slideCount: config.SLIDES.length,
      dataSize: data.length
    });

    return data;
  } catch (error) {
    logger.error('Error generating PPT', error, {
      title: config.TITLE,
      slideCount: config.SLIDES?.length
    });
    throw error;
  }
}

/**
 * Adds a shape to the slide based on configuration.
 * 
 * @param {PptxGenJS} pptx - PptxGenJS instance
 * @param {object} slide - Slide object
 * @param {object} shapeConfig - Shape configuration
 * @private
 */
function _addShape(pptx, slide, shapeConfig) {
  const shapeTypes = {
    LINE: pptx.ShapeType.line,
    RECTANGLE: pptx.ShapeType.rect,
    CIRCLE: pptx.ShapeType.circle
  };

  const shapeType = shapeTypes[shapeConfig.type];
  if (shapeType) {
    slide.addShape(shapeType, shapeConfig.option || {});
  } else {
    logger.warn('Unknown shape type', { type: shapeConfig.type });
  }
}

/**
 * Adds a chart to the slide based on configuration.
 * 
 * @param {PptxGenJS} pptx - PptxGenJS instance
 * @param {object} slide - Slide object
 * @param {object} chartConfig - Chart configuration
 * @param {number} slideIndex - Slide index for logging
 * @private
 */
function _addChart(pptx, slide, chartConfig, slideIndex) {
  try {
    const chartTypes = {
      BAR: pptx.ChartType.bar,
      PIE: pptx.ChartType.pie,
      LINE: pptx.ChartType.line
    };

    if (chartConfig.type === 'BAR_LINE') {
      const barData = chartConfig.bar?.data || [];
      const lineData = chartConfig.line?.data || [];
      
      slide.addChart(
        [
          {
            type: pptx.ChartType.bar,
            data: barData,
            options: chartConfig.bar?.option || {}
          },
          {
            type: pptx.ChartType.line,
            data: lineData,
            options: chartConfig.line?.option || {}
          }
        ],
        chartConfig.option || {}
      );
    } else {
      const chartType = chartTypes[chartConfig.type];
      if (chartType) {
        const chartData = Array.isArray(chartConfig.data) ? chartConfig.data : [];
        const chartOptions = chartConfig.option || {};
        
        slide.addChart(chartType, chartData, chartOptions);
      } else {
        logger.warn('Unknown chart type', { type: chartConfig.type });
      }
    }
  } catch (error) {
    logger.error('Failed to add chart to slide', error, {
      slideIndex,
      chartType: chartConfig.type
    });
  }
}

/**
 * Generates PowerPoint presentation from configuration and returns as Buffer.
 * Convenience wrapper around createSlides for Buffer output.
 * 
 * @param {object} config - PowerPoint configuration
 * @param {string} config.TITLE - Presentation title
 * @param {string} config.LAYOUT - Layout type
 * @param {Array<object>} config.SLIDES - Array of slide configurations
 * @returns {Promise<Buffer>} PowerPoint file as Buffer
 * @throws {Error} If presentation generation fails
 */
async function createSlidesAsBuffer(config) {
  const base64Data = await createSlides(config);
  return Buffer.from(base64Data, 'base64');
}

module.exports = {
  createSlides,
  createSlidesAsBuffer
};
