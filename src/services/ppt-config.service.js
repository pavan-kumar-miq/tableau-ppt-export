const logger = require('../utils/logger.util');
const politicalSnapshotService = require('./use-cases/political-snapshot.service');

class PptConfigService {
  constructor() {
    this.useCaseServices = {
      POLITICAL_SNAPSHOT: politicalSnapshotService
    };
    
    logger.info('PPT Config Service initialized');
  }

  async getPptConfig(requestData) {
    const { useCase, viewData, ...restData } = requestData;

    if (!useCase) {
      throw new Error('Use case key is required for use-case specific processing');
    }

    const useCaseService = this.useCaseServices[useCase];

    if (!useCaseService) {
      throw new Error(`Unknown use case: ${useCase}. Supported use cases: ${Object.keys(this.useCaseServices).join(', ')}`);
    }

    logger.info('Routing to use-case specific service', {
      useCase,
      service: useCaseService.constructor.name,
      hasViewData: !!viewData && Object.keys(viewData).length > 0
    });

    return await useCaseService.getPptConfig({
      useCase,
      viewData,
      ...restData
    });
  }
}

module.exports = new PptConfigService();
