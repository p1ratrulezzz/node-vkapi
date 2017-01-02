'use strict';

/**
 * Authorization using user login and password. 
 * User will be authorized in the official VK application for Android. 
 *
 * https://vk.com/dev/auth_direct
 */

/**
 * Local constants.
 * @private
 */
const CLIENT_ID     = 2274003;
const CLIENT_SECRET = 'hHbZxrka2uZ6jB1inYsH';

/**
 * Authorizes user via official Android application
 * @param  {String/Array} scope
 * @return {Promise}
 * @public
 *
 * this = ./vkapi.js#VKApi instance
 */
function authorize (scope) {
  return this._request('https://oauth.vk.com/token', {
    client_id:     CLIENT_ID, 
    client_secret: CLIENT_SECRET, 
    grant_type:    'password', 
    username:      this.options.auth.login, 
    password:      this.options.auth.pass, 
    scope:         Array.isArray(scope) ? scope.join(',') : (scope || ''), 
    v:             this.options.version
  })
  .then(response => {
    this.options.token = response.access_token;

    return response;
  });
}

module.exports = authorize;