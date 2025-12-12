const notificationService = require('./notification.service');
const pptConfigService = require('./ppt-config.service');
const pptBuilder = require('../utils/ppt-builder.util');
const logger = require('../utils/logger.util');

/**
 * Export Service - Orchestrates the export process
 * Handles Tableau data fetching, PPT generation, and email notification
 */
class ExportPptService {
  constructor() {
    logger.info('Export Service initialized');
  }

  /**
   * Process export job
   * @param {object} jobData - Job data containing viewIds, email, filters, config, useCase, siteName
   */
  async processExport(jobData) {
    const { 
      viewIds, 
      email, 
      filters = {}, 
      config = {},
      useCase,
      siteName
    } = jobData;

    // Extract useCase from config if not provided at top level
    const resolvedUseCase = useCase || config.useCase;

    logger.info('Processing export job', {
      viewIds,
      email,
      filterCount: Object.keys(filters).length,
      useCase: resolvedUseCase || 'generic',
      siteName
    });

    try {
      let pptConfig;

      logger.info('Routing to use-case specific processing', { useCase: resolvedUseCase });
      
      pptConfig = await pptConfigService.getPptConfig({
        useCase: resolvedUseCase,
        viewIds,
        filters,
        siteName,
        config
      });

      logger.info('Creating PowerPoint presentation');
      
      const pptBuffer = await pptBuilder.createSlidesAsBuffer(pptConfig);

      logger.info('PowerPoint created successfully', {
        bufferSize: pptBuffer.length
      });

      logger.info('Sending email notification', { email });
      
      const fileName = `tableau-export-${Date.now()}.pptx`;
      const subject = config.emailSubject || 'Your Tableau Export Report';
      const body = config.emailBody || '<p>Please find the attached <b>Tableau presentation report</b>.</p>';

      await notificationService.sendEmail(
        email,
        subject,
        body,
        pptBuffer,
        fileName
      );

      logger.info('Export job completed successfully', {
        email,
        viewsProcessed: viewIds.length
      });

      return {
        success: true,
        fileName,
        email,
        viewsProcessed: viewIds.length
      };
    } catch (error) {
      logger.error('Export job failed', error, {
        viewIds,
        email
      });
      throw error;
    }
  }
}

module.exports = new ExportPptService();
