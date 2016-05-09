'use strict';

class VKApiError extends Error {
  constructor (errorObject = {}) {
    super(errorObject.error);

    this.name = 'VKApiError';
    this.code = errorObject.code;
    this.ext  = errorObject.ext;
    this.description = errorObject.description;
  }
}

module.exports = VKApiError;