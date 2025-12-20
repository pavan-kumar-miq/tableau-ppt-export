const notificationService = require("./notification.service");
const pptConfigService = require("./ppt-config.service");
const tableauService = require("./tableau.service");
const dataTransformerService = require("./data-transformer.service");
const pptBuilder = require("../utils/ppt-builder.util");
const usecaseMapping = require("../config/usecase-mapping.json");
const logger = require("../utils/logger.util");

const DEFAULT_CONCURRENCY = 5;

/**
 * Service responsible for orchestrating the complete export pipeline.
 * Coordinates between Tableau data fetching, transformation, PPT generation,
 * and email delivery with proper error handling and notifications.
 */
class ExportPptService {
  constructor() {
    logger.info("Export Service initialized");
  }

  /**
   * Executes the complete export workflow from data fetching to email delivery.
   * Steps: Config lookup → Build view configs → Fetch data → Transform → Generate PPT → Send email
   *
   * @param {object} jobData - Export job configuration
   * @param {string} jobData.useCase - Use case identifier
   * @param {string} jobData.email - Recipient email address
   * @param {object} [jobData.filters={}] - Optional filters for Tableau data
   * @returns {Promise<object>} Export result with status and metadata
   * @throws {Error} If use case not found or required fields missing
   */
  async processExport(jobData) {
    const { email, filters = {}, useCase } = jobData;

    if (!useCase) {
      throw new Error("useCase is required for export job");
    }

    logger.info("Processing export job", {
      email,
      filterCount: Object.keys(filters).length,
      useCase,
    });

    try {
      logger.info("Looking up use case configuration", { useCase });
      const useCaseConfig = usecaseMapping[useCase];
      if (!useCaseConfig) {
        throw new Error(
          `Use case "${useCase}" not found in usecase-mapping.json`
        );
      }

      const { workbookName, siteName } = useCaseConfig;
      logger.info("Use case configuration retrieved", {
        workbookName,
        siteName,
        useCase,
      });

      logger.info("Building view configs for fetching", { useCase });
      const viewConfigs = dataTransformerService.buildViewConfigsForFetching(
        useCase,
        filters
      );

      logger.info("Fetching view data in parallel", {
        workbookName,
        siteName,
        viewCount: viewConfigs.length,
      });

      const viewDataMap = await tableauService.fetchViewsDataInParallel(
        viewConfigs,
        workbookName,
        siteName,
        DEFAULT_CONCURRENCY
      );

      logger.info("View data fetched successfully", {
        successfulViews: viewDataMap.size,
        totalViews: viewConfigs.length,
      });

      if (viewDataMap.size === 0) {
        throw new Error("No view data was successfully fetched from Tableau");
      }

      logger.info("Transforming view data to PPT format", {
        viewCount: viewDataMap.size,
      });
      const transformedData = dataTransformerService.transformViewDataMap(
        useCase,
        viewDataMap
      );

      logger.info("Generating PowerPoint presentation", { useCase });
      const pptConfig = await pptConfigService.getPptConfig({
        useCase,
        filters,
        viewData: transformedData,
      });

      const pptBuffer = await pptBuilder.createSlidesAsBuffer(pptConfig);
      logger.info("PowerPoint created successfully", {
        bufferSize: pptBuffer.length,
      });

      logger.info("Sending email notification", { email });

      const fileName = `tableau-export-${Date.now()}.pptx`;
      const subject = "Your Tableau Export Report";
      const body =
        "<p>Please find the attached <b>Tableau presentation report</b>.</p>";

      await notificationService.sendEmail(
        email,
        subject,
        body,
        pptBuffer,
        fileName
      );

      logger.info("Export job completed successfully", {
        email,
        useCase,
        viewsProcessed: viewDataMap.size,
      });

      return {
        success: true,
        fileName,
        email,
        useCase,
        viewsProcessed: viewDataMap.size,
      };
    } catch (error) {
      logger.error("Export job failed", error, {
        useCase,
        email,
        errorMessage: error.message,
        errorStack: error.stack,
      });
      throw error;
    }
  }

  /**
   * Sends failure notification email to user when export job fails.
   * Swallows email errors to prevent masking original failure.
   *
   * @param {string} email - Recipient email address
   * @param {string} useCase - Use case identifier for context
   * @param {Error} error - Original error that caused failure
   */
  async sendFailureEmail(email, useCase, error) {
    try {
      logger.info("Sending failure notification email", { email, useCase });

      const subject = "Tableau Export Job Failed";
      const body = `
        <p>We regret to inform you that your Tableau export job has failed.</p>
        <p><strong>Use Case:</strong> ${useCase}</p>
        <p><strong>Error:</strong> ${error.message}</p>
        <p>Please contact support if you need assistance.</p>
        <p>Thank you.</p>
      `;

      await notificationService.sendSimpleEmail(email, subject, body);
      logger.info("Failure notification email sent", { email });
    } catch (emailError) {
      logger.error("Failed to send failure notification email", emailError, {
        email,
        originalError: error.message,
      });
    }
  }
}

module.exports = new ExportPptService();
