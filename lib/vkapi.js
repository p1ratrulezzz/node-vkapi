'use strict';

const apiRequest        = require('./api-request');
const authUser          = require('./auth/user/by-login');
const authUserAndroid   = require('./auth/user/by-login-android');
const CaptchaRecognizer = require('./captcha/recognizer');
const extendOptions     = require('./helpers/options-extend');
const filesUpload       = require('./files-upload');
const VKAuthError       = require('./errors/auth-error');

const MAX_SCOPE = 'notify,friends,photos,audio,video,docs,notes,pages,status,offers,questions,wall,groups,messages,email,notifications,stats,ads,market,offline';

class VKApi {
  constructor (options = {}) {
    let defaultOptions = {
      app: {
        secret: null, // String
        id:     null  // Number
      }, 

      auth: {
        login: null, // String
        pass:  null, // String
        phone: null  // String
      }, 

      captcha: {
        delay:   100 * 1000,     // Number (milliseconds)
        service: 'anti-captcha', // String (one of these services: rucaptcha, antigate, anti-captcha)
        key:     null            // String (service API-key)
      }, 

      delays:  true,  // Boolean
      token:   null,  // String
      version: '5.53' // String
    };

    this.options           = extendOptions(defaultOptions, options);
    this.captchaRecognizer = (options.captcha && options.captcha.key) ? new CaptchaRecognizer(this.options.captcha) : null;

    this._delays = [
      0, // the latest request time
      0  // the latest delayed request time
    ];
  }

  /**
   * Gets delay time
   */
  get _delay () {
    if (this.options.delays === false) 
      return 0;

    let dateNow = Date.now();
    let delay = 0;

    if ((dateNow - this._delays[0]) < 334) {
      delay = 334 - (dateNow - this._delays[0]);

      if ((dateNow - this._delays[1]) <= 0) 
        delay = this._delays[1] - dateNow + 334;

      this._delays[1] = delay + dateNow;
    }

    return delay;
  }

  /**
   * VK API request wrapper
   */
  get _request () {
    return (url, params = {}) => {
      this._delays[0] = Date.now();

      return new Promise(resolve => setTimeout(() => resolve(), this._delay))
        .then(() => apiRequest.call(this, url, params));
    }
  }

  /**
   * Authorizes the user and gets an access token
   */
  get auth () {
    return {
      user: ({ type, scope = '' } = {}) => {
        if (!this.options.auth.login || !this.options.auth.pass) 
          return Promise.reject(new VKAuthError({
            error: 'User auth error', 
            description: '"auth.login" or "auth.pass" in undefined'
          }));

        // Set the maximum permissions
        if (scope === 'all') 
          scope = MAX_SCOPE;

        return (type === 'android' ? authUserAndroid : authUser).call(this, scope);
      }, 

      server: () => {
        if (!this.options.app.id || !this.options.app.secret) 
          return Promise.reject(new VKAuthError({
            error: 'Server auth error', 
            description: '"app.id" or "app.secret" is undefined'
          }));

        return this._request('https://oauth.vk.com/access_token', {
          client_id:     this.options.app.id, 
          client_secret: this.options.app.secret, 
          grant_type:    'client_credentials', 
          v:             this.options.version
        });
      }
    }
  }

  /**
   * Calls VK API methods
   *
   * @param {String} method
   * @param {Object} params
   */
  call (method, params = {}) {
    if (typeof method !== 'string') 
      return Promise.reject(new TypeError('"method" must be a string'));

    return this._request(`https://api.vk.com/method/${method}`, Object.assign({
      v: this.options.version, 
      access_token: this.options.token || ''
    }, params));
  }

  /**
   * Uploads files to vk.com
   */
  get upload () {
    return filesUpload.bind(this);
  }

  /**
   * Updates options
   *
   * @param {Object} options
   */
  setOptions (options) {
    this.options = extendOptions(this.options, options);

    return this;
  }
}

module.exports = VKApi;