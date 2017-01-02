'use strict';

/**
 * Unstable authorization using user login and password. 
 * User will be authorized in your own VK application through VK web-version, 
 * so you will be able to use your saved execute-methods. 
 */

/**
 * Module dependencies.
 * @private
 */
const prequest    = require('request-promise');
const parsers     = require('../parsers');
const VKAuthError = require('../../errors/auth-error');

/**
 * @param  {String/Array} scope
 * @return {Promise}
 * @public
 *
 * this = ./vkapi.js#VKApi instance
 */
function authorize (scope) {
  if (!this.options.app.id) 
    return Promise.reject(new Error('"app.id" is undefined'));

  let _prequest = prequest.defaults({
    jar: prequest.jar(), 
    followAllRedirects: true, 
    resolveWithFullResponse: true
  });

  return _prequest({
      url: 'https://oauth.vk.com/authorize', 
      qs: {
        client_id:     this.options.app.id, 
        display:       'mobile', 
        redirect_uri:  'https://oauth.vk.com/blank.html',
        response_type: 'token', 
        scope:         Array.isArray(scope) ? scope.join(',') : (scope || ''), 
        v:             this.options.version
      }
    })
    .then(response => parsers.parseAuthFields(response.body))
    .then(form => {
      // Adding pass & email fields to login form
      form.fields.pass  = this.options.auth.pass;
      form.fields.email = this.options.auth.login;

      return form;
    })
    .then(form => _prequest.post(form.url, { form: form.fields }))
    .then(response => parsers.checkForHtmlErrors(response))
    .then(response => {
      // Trying to bypass security check
      if (/act=security_check/.test(response.request.uri.query)) {
        let phone = !/@/.test(this.options.auth.login) ? this.options.auth.login : this.options.auth.phone;

        return parsers.securityCheck(response, phone)
          .then(form => _prequest.post(form.url, { form: form.fields }));
      }

      return response;
    })
    .then(response => {
      if (!/access_token=|error=/.test(response.request.uri.hash))
        return parsers.parseGrantAccessLink(response.body)
          .then(link => _prequest.post(link))
          .catch(error => {
            // Trying to catch rare "Security issue" error
            try {
              error = JSON.parse(error.error);
            } catch (e) {
              throw error;
            }

            throw new VKAuthError(error.error_description || '');
          });

      return response;
    })
    .then(response => parsers.checkForUriErros(response))
    .then(response => {
      if (response.request.uri.hash) {
        let tokenObject = response.request.uri.hash.slice(1).split('&').reduce((obj, value) => {
          let currentValue = value.split('=');

          obj[currentValue[0]] = currentValue[1];

          return obj;
        }, {});

        this.options.token = tokenObject.access_token;

        return tokenObject;
      } else {
        throw new VKAuthError('Unknown error. Probably login or password is incorrect.');
      }
    });
}

module.exports = authorize;