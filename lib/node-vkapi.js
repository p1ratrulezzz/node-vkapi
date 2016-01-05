'use strict';

const prequest = require('request-promise');

const helpers = require('./helpers');
const parsers = require('./parsers');
const VKError = require('./errors').VKError;
const VKAuthError = require('./errors').VKAuthError;

const lastApiVersion = '5.42';

class VKApi {
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
      token: null
    }

    this.options = Object.assign(defaultOptions, options);
  }

  /**
   * @ Private method
   *
   * @param {Array} selfArgs
   * @param {String} url
   *
   * Wrapper for the VK API request. Response is returned in JSON format
   */
  _makeRequest (selfArgs, url) {
    return prequest(url, {
      json: true
    }).then(r => {
      if (r.error) 
        throw (typeof r.error === 'string' ? new VKAuthError(r) : new VKError(r.error));

      return (typeof r.response === 'undefined' ? r : r.response);
    }).catch(e => {
      if (!~['VKAuthError', 'VKError'].indexOf(e.name) && e.error.code === 'ETIMEDOUT') 
        return this[selfArgs.shift()](...selfArgs);

      return Promise.reject(e);
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

    params = params || {};
    params = Object.assign(params, {
      v: params.v || this.options.version || lastApiVersion, 
      access_token: params.access_token || this.options.token
    });

    let selfArgs = helpers.formatArgs('call', arguments);
    let reqUrl = 'https://api.vk.com/method/' + method + '?' + helpers.objToString(params);

    return this._makeRequest(selfArgs, reqUrl);
  }

  /**
   * Getting access_token
   * 
   * @param  {Object} params
   */
  getAccessToken (params) {
    let selfArgs = helpers.formatArgs('getAccessToken', arguments);

    let defaultParams = {
      client_id: this.options.appId, 
      client_secret: this.options.appSecret, 
      code: null, 
      redirect_uri: null, 
      v: this.options.version || lastApiVersion
    }

    params = Object.assign(defaultParams, params);

    if (!params.client_id || !params.client_secret) {
      return Promise.reject(new Error('One of the parameters [client_secret, client_id] is not specified.'));
    }

    if (params.code === null || params.redirect_uri === null) {
      params['grant_type'] = 'client_credentials';

      delete params.code;
      delete params.redirect_uri;
    }

    let reqUrl = 'https://oauth.vk.com/access_token?' + helpers.objToString(params);

    return this._makeRequest(selfArgs, reqUrl);
  }

  /**
   * Getting access_token after login to vk.com
   * 
   * @param {Object} params
   */
  getTokenByLogin (params) {
    params = params || {};
    params.scope = params.scope || '';

    let userLogin = params.login || this.options.authData.login;
    let userPass = params.pass || this.options.authData.pass;

    if (!userLogin || !userPass) 
      return Promise.reject(new Error('One of the parameters [login, pass] is not specified.'));

    let authUrl = this.getOAuthUrl({
      client_id: params.appId || this.options.appId, 
      scope: Array.isArray(params.scope) ? params.scope.join(',') : params.scope, 
      response_type: 'token', 
      v: params.v || this.options.version || lastApiVersion
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
      .then(parsers.checkForHtmlErrors)
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
      .then(parsers.checkForUriErros)
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

    params = Object.assign(defaultParams, params);

    if (!params.client_id)
      return null;

    return 'https://oauth.vk.com/authorize?' + helpers.objToString(params);
  }

  /**
   * Uploading files to VK.COM
   *
   * @param {String} type
   * @param {Readable Stream or Array of Readable Streams} file
   * @param {Object} params
   */
  upload (type, file, params) {
    params = params || {};
    params.access_token = params.access_token || this.options.token;

    if (!params.access_token) 
      return Promise.reject(new Error('You do not have permissions to upload files.'));

    let fileTypes = new Map([
      ['audio', ['file', 'audio.getUploadServer', 'audio.save']], 
      ['video', ['video_file', 'video.save']], 
      ['document', ['file', 'docs.getUploadServer', 'docs.save']], 
      ['photo_pm', ['photo', 'photos.getMessagesUploadServer', 'photos.saveMessagesPhoto']], 
      ['photo_wall', ['photo', 'photos.getWallUploadServer', 'photos.saveWallPhoto']], 
      ['photo_main', ['photo', 'photos.getOwnerPhotoUploadServer', 'photos.saveOwnerPhoto']], 
      ['photo_album', ['file', 'photos.getUploadServer', 'photos.save']]
    ]);

    if (!type || typeof type !== 'string') 
      return Promise.reject(new Error('Type must be a string.'));

    if (!fileTypes.has(type)) 
      return Promise.reject(new Error('Type "' + type + '" is unsupported.'));

    if (Array.isArray(file)) {
      if (file.length > 1 && type !== 'photo_album') 
        return Promise.reject(new Error('Only "photo_album" type can send a few files.'));

      if (file.length === 1) 
        file = file[0];

      if (file.length > 5) 
        file = file.slice(0, 5);
    }

    let methods = fileTypes.get(type);
    let formData = Array.isArray(file) ? helpers.arrayToPhotoAlbumObj(file) : { [methods[0]]: file };

    return this.call(methods[1], params).then(r => {
        return r.upload_url;
      })
      .then(link => prequest.post(link, { formData, json: true }))
      .then(r => {
        if (r.error)
          throw new Error(r.error);

        if (methods[2]) {
          if (type === 'photo_album') {
            r.album_id = params.album_id;

            if (params.group_id) 
              r.group_id = params.group_id;
          }

          return this.call(methods[2], helpers.encodeParams(r));
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