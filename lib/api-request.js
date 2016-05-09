'use strict';

const prequest    = require('request-promise');
const VKAuthError = require('./errors/auth-error');
const VKApiError  = require('./errors/api-error');

function apiRequest (url, params = {}) {
  return prequest({
      url, 
      qs: params, 
      json: true, 
      timeout: 5000
    })
    .then(response => {
      let error = response.error;

      if (error) {
        if (typeof error === 'string') {
          throw new VKAuthError({
            error: error, 
            description: error.error_description
          });
        }

        let errorObject = {
          error: 'VK API Error', 
          description: error.error_msg, 
          code: error.error_code, 
          ext: {}
        };

        // Captcha needed
        if (error.error_code === 14) {
          errorObject.ext.captcha_sid = error.captcha_sid;
          errorObject.ext.captcha_img = error.captcha_img;
        }

        // Validation required
        if (error.error_code === 17) {
          errorObject.ext.redirect_uri = error.redirect_uri;
        }

        throw new VKApiError(errorObject);
      }

      return (typeof response.response === 'undefined' ? response : response.response);
    })
    .catch(error => {
      // Connection was lost, trying to resend data
      if (error.error && ~['ETIMEDOUT', 'ESOCKETTIMEDOUT', 'ECONNRESET', 'ECONNREFUSED'].indexOf(error.error.code)) 
        return apiRequest.call(this, url, params);

      // Captcha needed
      if (error.code === 14) {
        if (this.captchaRecognizer) {
          return this.captchaRecognizer.recognize(error.ext.captcha_img)
            .then(res => {
              params['captcha_sid'] = error.ext.captcha_sid;
              params['captcha_key'] = res;

              return apiRequest.call(this, url, params);
            });
        } else {
          // Captcha Recognizer is null, so wait some time..
          return new Promise(resolve => setTimeout(() => resolve(), this.options.captcha.delay))
            .then(() => apiRequest.call(this, url, params));
        }
      }

      // Probably auth error
      if (error.error && error.error.error && error.error.error_description) {
        throw new VKAuthError({
          error: 'VK Auth Error - ' + error.error.error, 
          description: error.error.error_description
        });
      }

      throw error;
    });
}

module.exports = apiRequest;