'use strict';

class VKApiError extends Error {
  constructor (errorObject = {}) {
    super(errorObject.description);

    this.code = errorObject.code;
    this.ext  = errorObject.ext;
  }
}

VKApiError.prototype.name = 'VKApiError';

module.exports = VKApiError;