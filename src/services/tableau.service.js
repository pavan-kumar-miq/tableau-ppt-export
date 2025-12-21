const axios = require("axios");
const https = require("https");
const axiosRetry = require("axios-retry").default;
const logger = require("../utils/logger.util");

const TOKEN_BUFFER_TIME_MS = 10 * 60 * 1000;
const TOKEN_LIFETIME_MS = 2 * 60 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 60000;
const DEFAULT_RETRY_COUNT = 3;

/**
 * Service for interacting with Tableau Server REST API.
 * Handles authentication, token caching, and data/image export operations.
 * Supports multi-site deployments with dynamic credential resolution.
 */
class TableauService {
  constructor() {
    this.baseUrl = process.env.TABLEAU_BASE_URL;
    this.patName = process.env.TABLEAU_PAT_NAME;
    this.patSecret = process.env.TABLEAU_PAT_SECRET;

    this.authCache = new Map();
    this.authPromises = new Map();
    this.client = this._createClient();

    logger.info("Tableau Service initialized", {
      baseUrl: this.baseUrl,
    });
  }

  /**
   * Resolves PAT credentials based on site name for multi-site deployments.
   * Looks for site-specific credentials (e.g., MIQDIGITAL_US_PAT_NAME) first,
   * then falls back to default TABLEAU_PAT_NAME and TABLEAU_PAT_SECRET.
   *
   * @param {string} siteName - Site identifier (e.g., 'miqdigital-us')
   * @returns {{patName: string, patSecret: string}} PAT credentials
   * @private
   */
  _getCredentialsForSite(siteName) {
    if (!siteName) {
      return {
        patName: this.patName,
        patSecret: this.patSecret,
      };
    }

    // Convert siteName to uppercase and replace hyphens with underscores
    const siteKey = siteName.toUpperCase().replace(/-/g, "_");
    const patNameKey = `${siteKey}_PAT_NAME`;
    const patSecretKey = `${siteKey}_PAT_SECRET`;

    const patName = process.env[patNameKey] || this.patName;
    const patSecret = process.env[patSecretKey] || this.patSecret;

    logger.debug("Retrieved credentials for site", {
      siteName,
      siteKey,
      hasCustomPatName: !!process.env[patNameKey],
      hasCustomPatSecret: !!process.env[patSecretKey],
    });

    return { patName, patSecret };
  }

  /**
   * Creates configured axios client with retry logic and timeout settings.
   *
   * @returns {import('axios').AxiosInstance} Configured axios instance
   * @private
   */
  _createClient() {
    const client = axios.create({
      baseURL: this.baseUrl,
      timeout: REQUEST_TIMEOUT_MS,
      httpsAgent: new https.Agent({
        rejectUnauthorized: process.env.NODE_ENV === "production",
      }),
    });

    axiosRetry(client, {
      retries: DEFAULT_RETRY_COUNT,
      retryDelay: axiosRetry.exponentialDelay,
      retryCondition: (error) => {
        return (
          axiosRetry.isNetworkOrIdempotentRequestError(error) ||
          error.response?.status >= 500
        );
      },
    });

    logger.debug("Tableau axios client configured");
    return client;
  }

  /**
   * Retrieves valid authentication token with automatic refresh if expired.
   * Implements token caching and concurrent request deduplication.
   *
   * @param {string} siteName - Site identifier for authentication
   * @returns {Promise<{token: string, siteId: string}>} Authentication credentials
   * @throws {Error} If siteName not provided or authentication fails
   */
  async getValidToken(siteName) {
    if (!siteName) {
      throw new Error("siteName is required for authentication");
    }

    const now = Date.now();
    const cache = this.authCache.get(siteName) || {
      token: null,
      siteId: null,
      expiresAt: 0,
    };

    if (cache.token && now < cache.expiresAt - TOKEN_BUFFER_TIME_MS) {
      logger.debug("Using cached Tableau token", {
        siteName,
        expiresIn: Math.round((cache.expiresAt - now) / 1000 / 60) + " minutes",
      });
      return {
        token: cache.token,
        siteId: cache.siteId,
      };
    }

    const existingPromise = this.authPromises.get(siteName);
    if (existingPromise) {
      logger.debug("Authentication already in progress, waiting...", {
        siteName,
      });
      return await existingPromise;
    }

    logger.info("Token expired or missing, authenticating with Tableau...", {
      siteName,
    });

    const authPromise = this.authenticate(siteName).finally(() => {
      this.authPromises.delete(siteName);
    });

    this.authPromises.set(siteName, authPromise);
    return await authPromise;
  }

  async authenticate(siteName) {
    if (!siteName) {
      throw new Error("siteName is required for authentication");
    }

    try {
      // Get dynamic credentials for this site
      const { patName, patSecret } = this._getCredentialsForSite();

      logger.info("Authenticating with Tableau via PAT...", {
        patName,
        siteContentUrl: siteName,
      });

      const payload = {
        credentials: {
          personalAccessTokenName: patName,
          personalAccessTokenSecret: patSecret,
          site: { contentUrl: siteName },
        },
      };

      const response = await this.client.post("/api/3.20/auth/signin", payload);

      const token = response.data.credentials.token;
      const siteId = response.data.credentials.site.id;
      const userId = response.data.credentials.user.id;

      logger.info("Tableau authentication successful", {
        siteId,
        userId,
        siteName: response.data.credentials.site.contentUrl,
      });

      this.authCache.set(siteName, {
        token,
        siteId,
        expiresAt: Date.now() + TOKEN_LIFETIME_MS,
      });

      return { token, siteId };
    } catch (error) {
      const { patName } = this._getCredentialsForSite();
      logger.error("Tableau authentication failed", error, {
        patName,
        siteName,
        errorDetails: error.response?.data,
      });
      throw new Error(
        `Tableau authentication failed for site ${siteName}: ${error.message}`
      );
    }
  }

  async exportImage(viewId, filters = {}, resolution = "high", siteName) {
    if (!siteName) {
      throw new Error("siteName is required for exportImage");
    }

    try {
      const { token, siteId } = await this.getValidToken(siteName);

      logger.info("Exporting image from Tableau view", {
        viewId,
        filters,
        resolution,
        siteName,
      });

      const params = {
        maxAge: 1,
        resolution,
      };

      Object.keys(filters).forEach((key) => {
        params[`vf_${key}`] = filters[key];
      });

      const response = await this.client.get(
        `/api/3.20/sites/${siteId}/views/${viewId}/image`,
        {
          headers: { "X-Tableau-Auth": token },
          params,
          responseType: "arraybuffer",
        }
      );

      const base64Image = Buffer.from(response.data, "binary").toString(
        "base64"
      );

      logger.info("Image exported successfully", {
        viewId,
        imageSize: base64Image.length,
        filters: Object.keys(filters).length,
      });

      return base64Image;
    } catch (error) {
      logger.error("Failed to export image from Tableau", error, {
        viewId,
        filters,
        errorDetails: error.response?.data,
      });
      throw new Error(
        `Failed to export image for view ${viewId}: ${error.message}`
      );
    }
  }

  async exportData(viewId, filters = {}, siteName) {
    if (!siteName) {
      throw new Error("siteName is required for exportData");
    }

    try {
      const { token, siteId } = await this.getValidToken(siteName);

      logger.info("Exporting data from Tableau view", {
        viewId,
        filters,
        siteName,
      });

      const params = { maxAge: 1 };

      Object.keys(filters).forEach((key) => {
        params[key] = filters[key];
      });

      const response = await this.client.get(
        `/api/3.20/sites/${siteId}/views/${viewId}/data`,
        {
          headers: { "X-Tableau-Auth": token },
          params,
        }
      );

      logger.info("Data exported successfully", {
        viewId,
        dataSize: JSON.stringify(response.data).length,
        filters: Object.keys(filters).length,
      });
      console.log(response.data);
      return response.data;
    } catch (error) {
      logger.error("Failed to export data from Tableau", error, {
        viewId,
        filters,
        errorDetails: error.response?.data,
      });
      throw new Error(
        `Failed to export data for view ${viewId}: ${error.message}`
      );
    }
  }

  async exportMultipleImages(viewConfigs, siteName) {
    if (!siteName) {
      throw new Error("siteName is required for exportMultipleImages");
    }

    logger.info("Starting batch image export", {
      totalViews: viewConfigs.length,
      siteName,
    });

    const results = [];

    for (const config of viewConfigs) {
      try {
        const image = await this.exportImage(
          config.viewId,
          config.filters || {},
          "high",
          siteName
        );
        results.push({
          viewId: config.viewId,
          success: true,
          image,
        });
      } catch (error) {
        logger.warn("Failed to export image in batch", null, {
          viewId: config.viewId,
          siteName,
          error: error.message,
        });
        results.push({
          viewId: config.viewId,
          success: false,
          error: error.message,
        });
      }
    }

    const successCount = results.filter((r) => r.success).length;
    logger.info("Batch image export completed", {
      total: viewConfigs.length,
      successful: successCount,
      failed: viewConfigs.length - successCount,
    });

    return results;
  }

  /**
   * Get workbook by name/contentUrl
   * @param {string} workbookName - Workbook contentUrl/name
   * @param {string} siteName - Site contentUrl
   * @returns {Promise<object>} Workbook information
   */
  async getWorkbookByName(workbookName, siteName) {
    if (!siteName) {
      throw new Error("siteName is required for getWorkbookByName");
    }

    if (!workbookName) {
      throw new Error("workbookName is required");
    }

    try {
      const { token, siteId } = await this.getValidToken(siteName);

      logger.info("Fetching workbook by name", {
        workbookName,
        siteName,
      });

      const response = await this.client.get(
        `/api/3.20/sites/${siteId}/workbooks`,
        {
          headers: { "X-Tableau-Auth": token },
          params: {
            filter: `contentUrl:eq:${workbookName}`,
          },
        }
      );

      const workbooks = response.data?.workbooks?.workbook || [];

      if (workbooks.length === 0) {
        throw new Error(`Workbook "${workbookName}" not found`);
      }

      const workbook = workbooks[0];

      logger.info("Workbook found successfully", {
        workbookId: workbook.id,
        workbookName: workbook.name,
        contentUrl: workbook.contentUrl,
      });

      return workbook;
    } catch (error) {
      logger.error("Failed to fetch workbook by name", error, {
        workbookName,
        siteName,
        errorDetails: error.response?.data,
      });
      throw new Error(
        `Failed to fetch workbook "${workbookName}": ${error.message}`
      );
    }
  }

  /**
   * Get views from a workbook
   * @param {string} workbookId - Workbook ID
   * @param {string} siteName - Site contentUrl
   * @returns {Promise<Array>} Array of view information
   */
  async getWorkbookViews(workbookId, siteName) {
    if (!siteName) {
      throw new Error("siteName is required for getWorkbookViews");
    }

    if (!workbookId) {
      throw new Error("workbookId is required");
    }

    try {
      const { token, siteId } = await this.getValidToken(siteName);

      logger.info("Fetching views from workbook", {
        workbookId,
        siteName,
      });

      const response = await this.client.get(
        `/api/3.20/sites/${siteId}/workbooks/${workbookId}/views`,
        {
          headers: { "X-Tableau-Auth": token },
        }
      );

      const views = response.data?.views?.view || [];

      logger.info("Views fetched successfully", {
        workbookId,
        viewCount: views.length,
      });

      return views;
    } catch (error) {
      logger.error("Failed to fetch workbook views", error, {
        workbookId,
        siteName,
        errorDetails: error.response?.data,
      });
      throw new Error(
        `Failed to fetch views for workbook ${workbookId}: ${error.message}`
      );
    }
  }

  /**
   * Fetch multiple view data in parallel
   * @param {Array<object>} viewConfigs - Array of view configs: [{ viewName, viewKey, filters }]
   * @param {string} workbookName - Workbook name/contentUrl
   * @param {string} siteName - Site contentUrl
   * @param {number} concurrency - Maximum concurrent requests (default: 5)
   * @returns {Promise<Map<string, object>>} Map of viewKey -> view data
   */
  async fetchViewsDataInParallel(
    viewConfigs,
    workbookName,
    siteName,
    concurrency = 5
  ) {
    if (!siteName) {
      throw new Error("siteName is required for fetchViewsDataInParallel");
    }

    if (!workbookName) {
      throw new Error("workbookName is required for fetchViewsDataInParallel");
    }

    if (!Array.isArray(viewConfigs) || viewConfigs.length === 0) {
      throw new Error("viewConfigs array is required and must not be empty");
    }

    logger.info("Starting parallel view data fetch", {
      viewCount: viewConfigs.length,
      workbookName,
      siteName,
      concurrency,
    });

    try {
      // Get workbook and find view IDs
      const workbook = await this.getWorkbookByName(workbookName, siteName);
      const views = await this.getWorkbookViews(workbook.id, siteName);

      // Create a map of view name -> view ID
      const viewNameToIdMap = new Map();
      views.forEach((view) => {
        viewNameToIdMap.set(view.viewUrlName, view.id);
      });

      // Process views with concurrency control
      const results = new Map();

      for (let i = 0; i < viewConfigs.length; i += concurrency) {
        const batch = viewConfigs.slice(i, i + concurrency);

        const batchPromises = batch.map(async (viewConfig) => {
          const { viewName, viewKey, filters = {} } = viewConfig;

          try {
            const viewId = viewNameToIdMap.get(viewName);

            if (!viewId) {
              logger.warn("View not found in workbook", {
                viewName,
                workbookName,
                availableViews: Array.from(viewNameToIdMap.keys()),
              });
              return {
                viewKey,
                success: false,
                error: `View "${viewName}" not found`,
              };
            }

            logger.debug("Fetching view data", {
              viewName,
              viewKey,
              viewId,
              filterCount: Object.keys(filters).length,
            });

            const data = await this.exportData(viewId, filters, siteName);

            return {
              viewKey,
              viewName,
              success: true,
              data,
            };
          } catch (error) {
            logger.error("Failed to fetch view data", error, {
              viewName,
              viewKey,
              filters,
            });
            return {
              viewKey,
              viewName,
              success: false,
              error: error.message,
            };
          }
        });

        const batchResults = await Promise.all(batchPromises);

        batchResults.forEach((result) => {
          if (result.success) {
            results.set(result.viewKey, result.data);
          } else {
            logger.warn("View fetch failed, will be skipped", {
              viewKey: result.viewKey,
              viewName: result.viewName,
              error: result.error,
            });
          }
        });
      }

      logger.info("Parallel view data fetch completed", {
        totalViews: viewConfigs.length,
        successful: results.size,
        failed: viewConfigs.length - results.size,
      });

      return results;
    } catch (error) {
      logger.error("Failed to fetch views data in parallel", error, {
        workbookName,
        siteName,
        viewCount: viewConfigs.length,
      });
      throw new Error(`Failed to fetch views data: ${error.message}`);
    }
  }
}

module.exports = new TableauService();
