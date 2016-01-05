'use strict';

class VKError extends Error {
  constructor (errorObject) {
    super(errorObject.error_code + ' ' + errorObject.error_msg);

    this.name = 'VKError';
    this.vk_error = errorObject;
  }
}

class VKAuthError extends Error {
  constructor (errorObject) {
    super(errorObject.error);

    this.name = 'VKAuthError';
    this.vk_error = errorObject;
  }
}

module.exports = { VKError, VKAuthError }