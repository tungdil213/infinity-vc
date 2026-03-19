import BaseException from '#exceptions/base_exception'

export default class ResourceNotFoundException extends BaseException {
  constructor(resourceType: string, identifier: string | number, context?: Record<string, any>) {
    super(
      `Resource ${resourceType} with identifier ${identifier} was not found`,
      'E_RESOURCE_NOT_FOUND',
      404,
      { resourceType, identifier, ...context }
    )
  }
}
