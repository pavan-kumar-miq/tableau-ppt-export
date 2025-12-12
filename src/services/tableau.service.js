const axios = require('axios');
const https = require('https');
const axiosRetry = require('axios-retry').default;
const logger = require('../utils/logger.util');

class TableauService {
  constructor() {
    this.baseUrl = process.env.TABLEAU_BASE_URL;
    this.patName = process.env.TABLEAU_PAT_NAME;
    this.patSecret = process.env.TABLEAU_PAT_SECRET;
    
    this.authCache = new Map();
    this.authPromises = new Map();
    this.client = this._createClient();
    
    logger.info('Tableau Service initialized', {
      baseUrl: this.baseUrl
    });
  }

  _createClient() {
    const client = axios.create({
      baseURL: this.baseUrl,
      timeout: 60000,
      httpsAgent: new https.Agent({
        rejectUnauthorized: process.env.NODE_ENV === 'production'
      })
    });

    axiosRetry(client, {
      retries: 3,
      retryDelay: axiosRetry.exponentialDelay,
      retryCondition: (error) => {
        return axiosRetry.isNetworkOrIdempotentRequestError(error) ||
               (error.response && error.response.status >= 500);
      }
    });

    logger.debug('Tableau axios client configured with retry logic');
    return client;
  }

  async getValidToken(siteName) {
    if (!siteName) {
      throw new Error('siteName is required for authentication');
    }
    
    const now = Date.now();
    
    const cache = this.authCache.get(siteName) || {
      token: null,
      siteId: null,
      expiresAt: 0
    };
    
    if (cache.token && now < cache.expiresAt - 10 * 60 * 1000) {
      logger.debug('Using cached Tableau token', {
        siteName,
        expiresIn: Math.round((cache.expiresAt - now) / 1000 / 60) + ' minutes'
      });
      return {
        token: cache.token,
        siteId: cache.siteId
      };
    }

    const existingPromise = this.authPromises.get(siteName);
    if (existingPromise) {
      logger.debug('Authentication already in progress, waiting...', { siteName });
      return await existingPromise;
    }

    logger.info('Token expired or missing, authenticating with Tableau...', { siteName });
    
    const authPromise = this.authenticate(siteName)
      .finally(() => {
        this.authPromises.delete(siteName);
      });
    
    this.authPromises.set(siteName, authPromise);
    return await authPromise;
  }

  async authenticate(siteName) {
    if (!siteName) {
      throw new Error('siteName is required for authentication');
    }
    
    try {
      logger.info('Authenticating with Tableau via PAT...', {
        patName: this.patName,
        siteContentUrl: siteName
      });

      const payload = {
        credentials: {
          personalAccessTokenName: this.patName,
          personalAccessTokenSecret: this.patSecret,
          site: { contentUrl: siteName }
        }
      };

      const response = await this.client.post('/api/3.20/auth/signin', payload);
      
      const token = response.data.credentials.token;
      const siteId = response.data.credentials.site.id;
      const userId = response.data.credentials.user.id;

      logger.info('Tableau authentication successful', {
        siteId,
        userId,
        siteName: response.data.credentials.site.contentUrl
      });

      this.authCache.set(siteName, {
        token,
        siteId,
        expiresAt: Date.now() + 2 * 60 * 60 * 1000
      });

      return { token, siteId };
    } catch (error) {
      logger.error('Tableau authentication failed', error, {
        patName: this.patName,
        siteName,
        errorDetails: error.response?.data
      });
      throw new Error(`Tableau authentication failed for site ${siteName}: ${error.message}`);
    }
  }

  async exportImage(viewId, filters = {}, resolution = 'high', siteName) {
    if (!siteName) {
      throw new Error('siteName is required for exportImage');
    }
    
    try {
      const { token, siteId } = await this.getValidToken(siteName);
      
      logger.info('Exporting image from Tableau view', {
        viewId,
        filters,
        resolution,
        siteName
      });

      const params = {
        maxAge: 1,
        resolution
      };

      Object.keys(filters).forEach(key => {
        params[`vf_${key}`] = filters[key];
      });

      const response = await this.client.get(
        `/api/3.20/sites/${siteId}/views/${viewId}/image`,
        {
          headers: { 'X-Tableau-Auth': token },
          params,
          responseType: 'arraybuffer'
        }
      );

      const base64Image = Buffer.from(response.data, 'binary').toString('base64');
      
      logger.info('Image exported successfully', {
        viewId,
        imageSize: base64Image.length,
        filters: Object.keys(filters).length
      });

      return base64Image;
    } catch (error) {
      logger.error('Failed to export image from Tableau', error, {
        viewId,
        filters,
        errorDetails: error.response?.data
      });
      throw new Error(`Failed to export image for view ${viewId}: ${error.message}`);
    }
  }

  async exportData(viewId, filters = {}, siteName) {
    if (!siteName) {
      throw new Error('siteName is required for exportData');
    }
    
    try {
      const { token, siteId } = await this.getValidToken(siteName);
      
      logger.info('Exporting data from Tableau view', {
        viewId,
        filters,
        siteName
      });

      const params = { maxAge: 1 };
      
      Object.keys(filters).forEach(key => {
        params[`vf_${key}`] = filters[key];
      });

      const response = await this.client.get(
        `/api/3.20/sites/${siteId}/views/${viewId}/data`,
        {
          headers: { 'X-Tableau-Auth': token },
          params
        }
      );

      logger.info('Data exported successfully', {
        viewId,
        dataSize: JSON.stringify(response.data).length,
        filters: Object.keys(filters).length
      });

      return response.data;
    } catch (error) {
      logger.error('Failed to export data from Tableau', error, {
        viewId,
        filters,
        errorDetails: error.response?.data
      });
      throw new Error(`Failed to export data for view ${viewId}: ${error.message}`);
    }
  }

  async exportMultipleImages(viewConfigs, siteName) {
    if (!siteName) {
      throw new Error('siteName is required for exportMultipleImages');
    }
    
    logger.info('Starting batch image export', {
      totalViews: viewConfigs.length,
      siteName
    });

    const results = [];
    
    for (const config of viewConfigs) {
      try {
        const image = await this.exportImage(config.viewId, config.filters || {}, 'high', siteName);
        results.push({
          viewId: config.viewId,
          success: true,
          image
        });
      } catch (error) {
        logger.warn('Failed to export image in batch', null, {
          viewId: config.viewId,
          siteName,
          error: error.message
        });
        results.push({
          viewId: config.viewId,
          success: false,
          error: error.message
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    logger.info('Batch image export completed', {
      total: viewConfigs.length,
      successful: successCount,
      failed: viewConfigs.length - successCount
    });

    return results;
  }
}

module.exports = new TableauService();
