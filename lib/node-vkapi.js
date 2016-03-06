'use strict';

const prequest = require('request-promise');

const AntiCaptcha = require('./anti-captcha');
const helpers = require('./helpers');
const parsers = require('./parsers');
const VKError = require('./errors').VKError;
const VKAuthError = require('./errors').VKAuthError;

const lastApiVersion = '5.45';

class VKApi {
  /**
   * Class constructor
   * @param  {Object} options
   *
   * appSecret:        string
   * appId:            number
   * authData:
   *  login:           string
   *  pass:            string
   *  phone:           string
   * version:          string
   * token:            string
   * delays:           bool
   * captchaDelay:     number
   * captchaService:   string
   * captchaKey:       string
   */
  constructor (options) {
    let defaultOptions = {
      appSecret: null, 
      appId: null, 
      authData: {
        login: null, 
        pass: null, 
        phone: null
      }, 
      version: lastApiVersion, 
      token: null, 
      delays: true, 
      captchaDelay: 60 * 1000, 
      captchaService: 'anti-captcha', 
      captchaKey: null
    }

    this.options = Object.assign(defaultOptions, options);
    this.lastRequestTime = 0;
    this.lastDelayedRequestTime = 0;
    this.antiCaptcha = AntiCaptcha(this.options.captchaKey, this.options.captchaService);
  }

  /**
   * # Private method
   * 
   * Getting delay duration
   * 
   * @return {Number}
   */
  _getDelay () {
    let dateNow = Date.now();
    let delay = 0;

    if (this.options.delays === false) 
      return 0;

    if ((dateNow - this.lastRequestTime) < 334) {
      delay = 334 - (dateNow - this.lastRequestTime);

      if ((dateNow - this.lastDelayedRequestTime) <= 0) 
        delay = this.lastDelayedRequestTime - dateNow + 334;

      this.lastDelayedRequestTime = delay + dateNow;
    }

    return delay;
  }

  /**
   * # Private method
   *
   * @param {Array} selfArgs
   * @param {String} url
   *
   * Wrapper for the VK API request. Response is returned in JSON format
   */
  _makeRequest (selfArgs, url) {
    let delay = this._getDelay();

    return new Promise((resolve, reject) => {
      setTimeout(() => {
        return resolve(prequest(url, {
          json: true, 
          timeout: 5000
        }).then(r => {
          if (r.error) 
            throw (typeof r.error === 'string' ? new VKAuthError(r) : new VKError(r.error));

          return (typeof r.response === 'undefined' ? r : r.response);
        }).catch(e => {
          if (!~['VKAuthError', 'VKError'].indexOf(e.name) && ~['ETIMEDOUT', 'ESOCKETTIMEDOUT', 'ECONNRESET', 'ECONNREFUSED'].indexOf(e.error.code)) 
            return this[selfArgs.shift()](...selfArgs);

          // Captcha needed
          if (e.vk_error && e.vk_error.error_code === 14) {
            if (this.antiCaptcha !== null) {
              return this.antiCaptcha.recognize(e.vk_error.captcha_img)
                .then(res => {
                  let captchaObj = '&' + helpers.objToString({
                    captcha_sid: e.vk_error.captcha_sid, 
                    captcha_key: encodeURIComponent(res)
                  });

                  url = url + captchaObj;

                  return this._makeRequest(selfArgs, url);
                });
            } else {
              return new Promise(r => setTimeout(() => r(this[selfArgs.shift()](...selfArgs)), this.options.captchaDelay));
            }
          }

          throw e;
        })
        .finally(() => {
          this.lastRequestTime = Date.now();
        }));
      }, delay);
    });
  }

  /**
   * Calling VK API methods
   * 
   * @param {String} method
   * @param {Object} params
   */
  call (method, params) {
    if (typeof method !== 'string')
      return Promise.reject(new Error('Method must be a string'));

    let reqParams = params || {};
        reqParams = Object.assign(reqParams, {
          v: reqParams.v || this.options.version || lastApiVersion, 
          access_token: reqParams.access_token || this.options.token
        });
    let selfArgs = helpers.formatArgs('call', arguments);
    let reqUrl = 'https://api.vk.com/method/' + method + '?' + helpers.objToString(reqParams);

    return this._makeRequest(selfArgs, reqUrl);
  }

  /**
   * Getting access_token
   * 
   * @param {Object} params
   */
  getAccessToken (params) {
    let defaultParams = {
      client_id: this.options.appId, 
      client_secret: this.options.appSecret, 
      code: null, 
      redirect_uri: null, 
      v: this.options.version || lastApiVersion
    }
    let selfArgs = helpers.formatArgs('getAccessToken', arguments);
    let reqParams = Object.assign(defaultParams, params);

    if (!reqParams.client_id || !reqParams.client_secret) 
      return Promise.reject(new Error('One of the parameters [client_secret, client_id] is not specified.'));

    if (reqParams.code === null || reqParams.redirect_uri === null) {
      reqParams['grant_type'] = 'client_credentials';

      delete reqParams.code;
      delete reqParams.redirect_uri;
    }

    let reqUrl = 'https://oauth.vk.com/access_token?' + helpers.objToString(reqParams);

    return this._makeRequest(selfArgs, reqUrl);
  }

  /**
   * Getting access_token after login into vk.com account
   * 
   * @param {Object} params
   */
  getTokenByLogin (params) {
    let reqParams = params || {};
        reqParams.scope = reqParams.scope || '';

    let userLogin = reqParams.login || this.options.authData.login;
    let userPass = reqParams.pass || this.options.authData.pass;

    if (!userLogin || !userPass) 
      return Promise.reject(new Error('One of the parameters [login, pass] is not specified.'));

    let authUrl = this.getOAuthUrl({
      client_id: reqParams.appId || this.options.appId, 
      scope: Array.isArray(reqParams.scope) ? reqParams.scope.join(',') : reqParams.scope, 
      response_type: 'token', 
      v: reqParams.v || this.options.version || lastApiVersion
    });

    if (authUrl === null) 
      return Promise.reject(new Error('Application ID is required.'));

    let _prequest = prequest.defaults({
      jar: prequest.jar(), 
      followAllRedirects: true, 
      resolveWithFullResponse: true
    });

    return _prequest(authUrl)
      .then(r => parsers.parseAuthFields(r.body))
      .then(f => {
        f.fields.pass = userPass;
        f.fields.email = userLogin;

        return f;
      })
      .then(f => _prequest.post(f.url, { form: f.fields }))
      .then(r => parsers.checkForHtmlErrors(r))
      .then(r => {
        if (/act=security_check/.test(r.request.uri.query)) {
          let phone = !/@/.test(userLogin) ? userLogin : this.options.authData.phone;

          return parsers.securityCheck(r, phone).then(f => _prequest.post(f.url, { form: f.fields }));
        }

        return r;
      })
      .then(r => {
        if (!/access_token=/.test(r.request.uri.hash) && !/error=/.test(r.request.uri.hash))
          return parsers.parseGrantAccessLink(r.body).then(l => _prequest.post(l));

        return r;
      })
      .then(r => parsers.checkForUriErros(r))
      .then(r => {
        let access_token = helpers.hashToJson(r.request.uri.hash);

        this.options.token = access_token.access_token;

        return access_token;
      });
  }

  /**
   * Getting OAuth url
   *
   * @param {Object} params
   */
  getOAuthUrl (params) {
    let defaultParams = {
      client_id: this.options.appId, 
      scope: '', 
      redirect_uri: 'https://oauth.vk.com/blank.html', 
      response_type: 'code', 
      display: 'mobile', 
      v: this.options.version || lastApiVersion
    }
    let reqParams = Object.assign(defaultParams, params);

    if (!reqParams.client_id)
      return null;

    return 'https://oauth.vk.com/authorize?' + helpers.objToString(reqParams);
  }

  /**
   * Uploading files to vk.com
   *
   * @param {String} type
   * @param {Readable Stream or Array of Readable Streams} file
   * @param {Object} params
   */
  upload (type, file, params, saveParams) {
    let reqParams = params || {};
        reqParams.access_token = reqParams.access_token || this.options.token;
    let fileToSend = file;

    if (!reqParams.access_token) 
      return Promise.reject(new Error('You do not have permissions to upload files.'));

    let fileTypes = new Map([
      ['audio', ['file', 'audio.getUploadServer', 'audio.save']], 
      ['video', ['video_file', 'video.save']], 
      ['document', ['file', 'docs.getUploadServer', 'docs.save']], 
      ['photo_pm', ['photo', 'photos.getMessagesUploadServer', 'photos.saveMessagesPhoto']], 
      ['photo_wall', ['photo', 'photos.getWallUploadServer', 'photos.saveWallPhoto']], 
      ['photo_main', ['photo', 'photos.getOwnerPhotoUploadServer', 'photos.saveOwnerPhoto']], 
      ['photo_album', ['file', 'photos.getUploadServer', 'photos.save']], 
      ['photo_market', ['file', 'photos.getMarketUploadServer', 'photos.saveMarketPhoto']], 
      ['photo_market_album', ['file', 'photos.getMarketAlbumUploadServer', 'photos.saveMarketAlbumPhoto']]
    ]);

    if (!type || typeof type !== 'string') 
      return Promise.reject(new Error('"type" must be a string.'));

    if (!fileTypes.has(type)) 
      return Promise.reject(new Error('Type "' + type + '" is unsupported.'));

    if (Array.isArray(file)) {
      if (file.length > 1 && type !== 'photo_album') 
        return Promise.reject(new Error('Only "photo_album" type can accept a few files.'));

      if (file.length === 1) 
        fileToSend = file[0];

      if (file.length > 5) 
        fileToSend = file.slice(0, 5);
    }

    let methods = fileTypes.get(type);
    let formData = Array.isArray(fileToSend) ? helpers.arrayToPhotoAlbumObj(fileToSend) : { [methods[0]]: fileToSend };

    return this.call(methods[1], reqParams)
      .then(r => r.upload_url)
      .then(link => prequest.post(link, { formData, json: true }))
      .then(r => {
        if (r.error)
          throw new VKError(r.error);

        if (methods[2]) {
          let sendParams = r;

          if (type === 'photo_album') 
            sendParams.album_id = reqParams.album_id;

          if (reqParams.group_id) 
            sendParams.group_id = reqParams.group_id;

          if (saveParams) 
            sendParams = Object.assign(sendParams, saveParams);

          return this.call(methods[2], helpers.encodeParams(sendParams));
        }

        return r;
      });
  }

  /**
   * Updating options
   * 
   * @param {Object} options
   */
  setOptions (options) {
    this.options = Object.assign(this.options, options);

    return this;
  }
}

module.exports = VKApi;
