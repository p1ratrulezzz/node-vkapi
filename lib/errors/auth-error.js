'use strict';

class VKAuthError extends Error {
  constructor (message) {
    super(message);
  }
}

VKAuthError.prototype.name = 'VKAuthError';

module.exports = VKAuthError;