const PptxGenJS = require('pptxgenjs');
const logger = require('./logger.util');

/**
 * PPT Builder Utility - Creates PowerPoint presentations from config
 * Renamed from buildPPT.js
 */

/**
 * Create slides from configuration
 * @param {object} config - PPT configuration with LAYOUT, TITLE, and SLIDES
 * @returns {Promise<string>} Base64 encoded PPT file
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

    config.SLIDES.forEach((slides, slideIndex) => {
      const slide = pptx.addSlide();
      
      logger.debug('Processing slide', { slideIndex });

      for (const itemKey in slides) {
        if (slides.hasOwnProperty(itemKey)) {
          switch (itemKey) {
            case "BACKGROUND": {
              const backgroundConfig = slides[itemKey];
              slide.background = { path: backgroundConfig.url };
              logger.debug('Added background to slide', { slideIndex });
              break;
            }
            case "BACKGROUND_COLOR": {
              const backgroundConfig = slides[itemKey];
              slide.background = { path: backgroundConfig.color };
              logger.debug('Added background color to slide', { slideIndex });
              break;
            }
            case "TEXT": {
              const textConfigs = slides[itemKey];
              textConfigs.forEach((textConfig) => {
                slide.addText(textConfig.text, textConfig.option);
              });
              logger.debug('Added text elements to slide', {
                slideIndex,
                textCount: textConfigs.length
              });
              break;
            }
            case "IMAGE": {
              const imageConfigs = slides[itemKey];
              imageConfigs.forEach((imageConfig) => {
                slide.addImage(imageConfig);
              });
              logger.debug('Added images to slide', {
                slideIndex,
                imageCount: imageConfigs.length
              });
              break;
            }
            case "TABLE": {
              const tableConfigs = slides[itemKey];
              tableConfigs.forEach((tableConfig) => {
                slide.addTable(tableConfig.data, tableConfig.option);
              });
              logger.debug('Added tables to slide', {
                slideIndex,
                tableCount: tableConfigs.length
              });
              break;
            }
            case "CHART": {
              const chartConfigs = slides[itemKey];
              chartConfigs.forEach((chartConfig) => {
                switch (chartConfig.type) {
                  case "BAR": {
                    slide.addChart(
                      pptx.ChartType.bar,
                      chartConfig.data || { labels: [], values: [] },
                      chartConfig.option
                    );
                    break;
                  }
                  case "PIE": {
                    slide.addChart(
                      pptx.ChartType.pie,
                      chartConfig.data || [{ labels: [], values: [] }],
                      chartConfig.option
                    );
                    break;
                  }
                  case "LINE": {
                    slide.addChart(
                      pptx.ChartType.line,
                      chartConfig.data || [],
                      chartConfig.option
                    );
                    break;
                  }
                  case "BAR_LINE": {
                    slide.addChart(
                      [
                        {
                          type: pptx.ChartType.bar,
                          data: chartConfig.bar.data || [],
                          options: chartConfig.bar.option
                        },
                        {
                          type: pptx.ChartType.line,
                          data: chartConfig.line.data || [],
                          options: chartConfig.line.option
                        }
                      ],
                      chartConfig.option
                    );
                    break;
                  }
                }
              });
              logger.debug('Added charts to slide', {
                slideIndex,
                chartCount: chartConfigs.length
              });
              break;
            }
          }
        }
      }
    });

    const data = await pptx.write("base64");
    
    logger.info('PowerPoint presentation created successfully', {
      title: config.TITLE,
      slideCount: config.SLIDES.length,
      dataSize: data.length
    });

    return data; // Return the base64 string to the caller
  } catch (error) {
    logger.error('Error generating PPT', error, {
      title: config.TITLE,
      slideCount: config.SLIDES?.length
    });
    throw error;
  }
}

/**
 * Create slides and return as Buffer
 * @param {object} config - PPT configuration
 * @returns {Promise<Buffer>} PPT file as Buffer
 */
async function createSlidesAsBuffer(config) {
  const base64Data = await createSlides(config);
  return Buffer.from(base64Data, 'base64');
}

module.exports = {
  createSlides,
  createSlidesAsBuffer
};
