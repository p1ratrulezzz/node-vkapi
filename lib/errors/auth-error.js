'use strict';

class VKAuthError extends Error {
  constructor (errorObject = {}) {
    super(errorObject.error);

    this.name = 'VKAuthError';
    this.description = errorObject.description;
  }
}

module.exports = VKAuthError;