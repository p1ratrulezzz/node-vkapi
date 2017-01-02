'use strict';

/**
 * Module dependencies.
 * @private
 */
const cheerio     = require('cheerio');
const VKAuthError = require('../errors/auth-error');

module.exports = {
  parseGrantAccessLink (responseBody) {
    return new Promise((resolve, reject) => {
      let $ = cheerio.load(responseBody);
      let form = $('form[method="post"]');

      if (form.length === 0)
        return reject(new VKAuthError('Failed to parse the form.'));

      return resolve(form.attr('action'));
    });
  }, 

  parseAuthFields (responseBody) {
    return new Promise(resolve => {
      let $ = cheerio.load(responseBody);
      let form = $('form[method="post"]');
      let fields = {};

      form.serializeArray().forEach(v => {
        fields[v.name] = v.value;
      });

      return resolve({
        url: form.attr('action'), 
        fields
      });
    });
  }, 

  checkForHtmlErrors (response) {
    return new Promise((resolve, reject) => {
      let $ = cheerio.load(response.body);
      let error = $('.service_msg_warning');

      if (error.length !== 0)
        return reject(new VKAuthError(error.text()));

      return resolve(response);
    });
  }, 

  checkForUriErros (response) {
    return new Promise((resolve, reject) => {
      let uriHash  = response.request.uri.hash;

      if (/error=/.test(uriHash)) {
        let matching = uriHash.match(/error_description=(.*)/);
        let err_desc = matching && matching[1] || 'Unknown error.';

        return reject(new VKAuthError(err_desc));
      }

      return resolve(response);
    });
  }, 

  securityCheck (response, phone) {
    return new Promise((resolve, reject) => {
      if (!phone)
        return reject(new VKAuthError('Can\'t pass security check, because "auth.phone" is undefined.'));

      let $ = cheerio.load(response.body);
      let form = $('form[method="post"]');
      let postUrl = form.attr('action');

      if (postUrl[0] === '/' && postUrl[1] !== '/')
        postUrl = 'https://' + response.request.uri.host + postUrl;

      let code = $('input[name="code"]');
      let prefixLength  = code.prev('.field_prefix').text().trim().length;
      let postfixLength = code.next('.field_prefix').text().trim().length;

      let codef = phone.slice(prefixLength, phone.length - postfixLength);

      return resolve({
        url: postUrl, 
        fields: {
          code: codef
        }
      });
    });
  }
}