'use strict';

/**
 * Module dependencies.
 * @private
 */
const apiRequest        = require('./api-request');
const authUser          = require('./auth/user/by-login');
const authUserAndroid   = require('./auth/user/by-login-android');
const CaptchaRecognizer = require('./captcha-recognizer');
const extendOptions     = require('./helpers/options-extend');
const filesUpload       = require('./files-upload');

/**
 * Local constants.
 * @private
 */
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
        service: 'anti-captcha', // String (one of these services: rucaptcha, antigate, anti-captcha)
        key:     null            // String (service API-key)
      }, 

      delays:  true,  // Boolean
      token:   null,  // String
      version: '5.60' // String
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
   * @return {Number} Delay value
   * @private
   */
  get _delay () {
    if (this.options.delays === false) 
      return 0;

    let dateNow = Date.now();
    let delay   = 0;

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
   * @param  {String} url
   * @param  {Object} params
   * @return {Promise}
   * @private
   */
  _request (url = '', params = {}) {
    this._delays[0] = Date.now();

    return new Promise(resolve => setTimeout(() => resolve(), this._delay))
      .then(() => apiRequest.call(this, url, params));
  }

  /**
   * Authorizes the user and gets an access token
   * @return {Object}
   * @public
   */
  get auth () {
    return {
      /**
       * User authorization
       * @param {Object}
       *   @property {String}       type  'android' or undefined/null
       *   @property {String/Array} scope
       * @return {Promise}
       */
      user: ({ type, scope } = {}) => {
        if (!this.options.auth.login || !this.options.auth.pass) 
          return Promise.reject(new Error('"auth.login" or "auth.pass" is undefined'));

        // Set the maximum permissions
        if (scope === 'all') 
          scope = MAX_SCOPE;

        return (type === 'android' ? authUserAndroid : authUser).call(this, scope);
      }, 

      /**
       * Server authorization
       * @return {Promise}
       */
      server: () => {
        if (!this.options.app.id || !this.options.app.secret) 
          return Promise.reject(new Error('"app.id" or "app.secret" is undefined'));

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
   * @param  {String} method
   * @param  {Object} params
   * @return {Promise}
   * @public
   */
  call (method = '', params = {}) {
    if (typeof method !== 'string') 
      return Promise.reject(new TypeError('"method" must be a string.'));

    return this._request(`https://api.vk.com/method/${method}`, Object.assign({
      v: this.options.version, 
      access_token: this.options.token || ''
    }, params));
  }

  /**
   * Uploads files to vk.com
   * @return {Function}
   * @public
   */
  get upload () {
    return filesUpload.bind(this);
  }

  /**
   * Updates options
   * @param {Object} options
   * @public
   */
  setOptions (options = {}) {
    this.options = extendOptions(this.options, options);

    return this;
  }
}

module.exports = VKApi;