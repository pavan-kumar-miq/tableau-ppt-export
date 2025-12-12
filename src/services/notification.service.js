const axios = require('axios');
const FormData = require('form-data');
const logger = require('../utils/logger.util');

class NotificationService {
  constructor() {
    this.apiUrl = process.env.NOTIFICATION_API_URL;
    this.apiGatewayToken = process.env.API_GATEWAY_TOKEN;
    this.emailFrom = process.env.EMAIL_FROM;
    this.teamTag = process.env.EMAIL_TEAM_TAG;
    this.productTag = process.env.EMAIL_PRODUCT_TAG;

    this.client = axios.create({
      baseURL: this.apiUrl,
      timeout: 30000,
      headers: {
        'api-gateway-token': this.apiGatewayToken
      }
    });

    logger.info('Notification Service initialized', {
      apiUrl: this.apiUrl,
      emailFrom: this.emailFrom
    });
  }

  async uploadAttachment(fileContent, fileName) {
    try {
      logger.info('Uploading attachment', {
        fileName,
        fileSize: fileContent.length
      });

      const form = new FormData();
      form.append('FileName', fileContent, { filename: fileName });

      const response = await this.client.post('/attachment/upload', form, {
        headers: { ...form.getHeaders() }
      });

      if (!response.data?.notificationBucketId) {
        throw new Error('Invalid response from upload API: missing notificationBucketId');
      }

      const bucketId = response.data.notificationBucketId;
      
      logger.info('Attachment uploaded successfully', {
        fileName,
        bucketId
      });

      return bucketId;
    } catch (error) {
      logger.error('Failed to upload attachment', error, {
        fileName,
        errorDetails: error.response?.data
      });
      throw new Error(`Failed to upload attachment: ${error.message}`);
    }
  }

  async sendEmail(recipientEmail, subject, body, fileContent = null, fileName = null) {
    try {
      logger.info('Preparing to send email', {
        recipientEmail,
        subject,
        hasAttachment: !!fileContent
      });

      let attachmentId = null;

      if (fileContent && fileName) {
        attachmentId = await this.uploadAttachment(fileContent, fileName);
      }

      const payload = {
        notifications: [
          {
            type: 'notify',
            notification: {
              channelType: 'EMAIL',
              contact: {
                from: this.emailFrom,
                to: [recipientEmail]
              },
              content: {
                subject,
                body,
                type: 'HTML'
              }
            }
          }
        ],
        resourceTags: {
          TEAM: this.teamTag,
          PRODUCT: this.productTag
        }
      };

      if (attachmentId) {
        payload.notifications[0].notification.content.attachmentInfo = {
          compression: false,
          attachments: [
            {
              platform: 'SELF',
              notificationBucketId: attachmentId
            }
          ]
        };
      }

      const response = await this.client.post('/notifications', payload);

      logger.info('Email sent successfully', {
        recipientEmail,
        subject,
        attachmentId,
        responseStatus: response.status
      });

      return {
        success: true,
        attachmentId,
        response: response.data
      };
    } catch (error) {
      logger.error('Failed to send email', error, {
        recipientEmail,
        subject,
        errorDetails: error.response?.data
      });
      throw new Error(`Failed to send email: ${error.message}`);
    }
  }

  async sendSimpleEmail(recipientEmail, subject, body) {
    return this.sendEmail(recipientEmail, subject, body, null, null);
  }
}

module.exports = new NotificationService();
