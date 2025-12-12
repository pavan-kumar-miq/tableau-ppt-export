const tableauService = require('../tableau.service');
const logger = require('../../utils/logger.util');

class PoliticalSnapshotService {
  constructor() {
    logger.info('Political Snapshot Service initialized');
  }

  async getPptConfig(requestData) {
    const { 
      viewIds = [], 
      filters = {}, 
      siteName,   
      config = {} 
    } = requestData;

    if (!siteName) {
      throw new Error('siteName is required for Political Snapshot export');
    }

    if (!viewIds || viewIds.length === 0) {
      throw new Error('At least one viewId is required for Political Snapshot export');
    }

    logger.info('Processing Political Snapshot export', {
      viewCount: viewIds.length,
      siteName,
      filterCount: Object.keys(filters).length
    });

    try {
      const viewsToFetch = this._getRequiredTableauViews(viewIds, config, filters);

      logger.info('Fetching Tableau images for Political Snapshot', {
        viewsToFetch: viewsToFetch.length
      });

      // Fetch all images in parallel
      const imageResults = await tableauService.exportMultipleImages(viewsToFetch, siteName);

      // Filter successful results
      const successfulImages = imageResults.filter(r => r.success);
      
      if (successfulImages.length === 0) {
        throw new Error('Failed to fetch any images from Tableau');
      }

      logger.info('Images fetched successfully for Political Snapshot', {
        total: imageResults.length,
        successful: successfulImages.length,
        failed: imageResults.length - successfulImages.length
      });

      const pptConfig = this._generatePptConfig(successfulImages, {
        title: config.title || 'Political Snapshot Report',
        layout: config.layout || 'LAYOUT_16x9',
        siteName,
        viewIds: successfulImages.map(r => r.viewId)
      });

      return pptConfig;
    } catch (error) {
      logger.error('Political Snapshot processing failed', error, {
        viewIds,
        siteName
      });
      throw error;
    }
  }

  _getRequiredTableauViews(viewIds, config, filters = {}) {
    if (viewIds && viewIds.length > 0) {
      // Use filters from config if provided, otherwise use the filters parameter
      const viewFilters = config.filters || filters;
      return viewIds.map(viewId => ({
        viewId,
        filters: viewFilters
      }));
    }

    return [{
      viewId: config.defaultViewId || null,
      filters: config.filters || filters
    }];
  }

  _generatePptConfig(imageResults, options = {}) {
    const {
      title = 'Political Snapshot Report',
      layout = 'LAYOUT_16x9',
      siteName,
      viewIds = []
    } = options;

    logger.info('Generating Political Snapshot PPT config', {
      title,
      layout,
      siteName,
      imageCount: imageResults.length
    });

    // Create one slide per image
    const slides = [];

    // First slide: Title slide
    slides.push({
      TEXT: [
        {
          text: title,
          option: {
            x: 0.5,
            y: 2,
            w: 12,
            h: 1.5,
            fontSize: 44,
            bold: true,
            color: '363636',
            align: 'center',
            valign: 'middle'
          }
        },
        ...(siteName ? [{
          text: `Site: ${siteName}`,
          option: {
            x: 0.5,
            y: 3.5,
            w: 12,
            h: 0.5,
            fontSize: 18,
            color: '666666',
            align: 'center',
            valign: 'middle'
          }
        }] : []),
        {
          text: `Generated on ${new Date().toLocaleDateString()}`,
          option: {
            x: 0.5,
            y: 4,
            w: 12,
            h: 0.5,
            fontSize: 18,
            color: '666666',
            align: 'center',
            valign: 'middle'
          }
        },
        {
          text: `Total Views: ${imageResults.length}`,
          option: {
            x: 0.5,
            y: 4.5,
            w: 12,
            h: 0.5,
            fontSize: 16,
            color: '666666',
            align: 'center',
            valign: 'middle'
          }
        }
      ]
    });

    imageResults.forEach((result, index) => {
      slides.push({
        TEXT: [
          {
            text: `View ${index + 1} of ${imageResults.length}`,
            option: {
              x: 0.5,
              y: 0.2,
              w: 12,
              h: 0.4,
              fontSize: 20,
              bold: true,
              color: '363636',
              align: 'center',
              valign: 'middle'
            }
          },
          {
            text: `View ID: ${result.viewId}`,
            option: {
              x: 0.5,
              y: 0.6,
              w: 12,
              h: 0.3,
              fontSize: 14,
              color: '666666',
              align: 'center',
              valign: 'middle'
            }
          }
        ],
        IMAGE: [
          {
            data: `data:image/png;base64,${result.image}`,
            x: 0.5,
            y: 1.2,
            w: 12,
            h: 6,
            sizing: {
              type: 'contain',
              w: 12,
              h: 6
            }
          }
        ]
      });
    });

    return {
      TITLE: title,
      LAYOUT: layout,
      SLIDES: slides
    };
  }
}

module.exports = new PoliticalSnapshotService();
