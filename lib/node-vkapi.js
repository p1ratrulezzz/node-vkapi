'use strict';

const prequest = require('request-promise');

const helpers = require('./helpers');
const parsers = require('./parsers');
const VKError = require('./error').VKError;
const VKAuthError = require('./error').VKAuthError;

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
   * @ Приватный метод
   * 
   * Обёртка для VK API запроса. Ответ возвращается в JSON
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
      return Promise.reject(new Error('method must be a string'));

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
   * @param  {Object} params
   *
   * Пытается получить access_token по переданным параметрам. 
   * 
   * Если переданы параметры code и redirect_uri, то будет получен пользовательский access_token.
   * Если не передан какой-либо из параметров (code, redirect_uri), то будет получен серверный access_token.
   *
   * Подробнее о серверном access_token:
   * https://vk.com/dev/auth_server
   * https://vk.com/dev/secure
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
      return Promise.reject(new Error('Один из параметров client_id или client_secret не задан.'));
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
   * Получение access_token после авторизации по логину и паролю
   * @param {Object} params
   *
   * params: {
   *   appId?: 1234567890, 
   *   login?: 'your@email.com', 
   *   pass?: 'your_password', 
   *   scope?: ['friends', 'photos', 'etc..'], 
   *   v?: '5.42'
   * }
   */
  getTokenByLogin (params) {
    params = params || {};
    params.scope = params.scope || '';

    let userLogin = params.login || this.options.authData.login;
    let userPass = params.pass || this.options.authData.pass;

    if (!userLogin || !userPass) 
      return Promise.reject(new Error('login или pass не задан'));

    let authUrl = this.getOAuthUrl({
      client_id: params.appId || this.options.appId, 
      scope: Array.isArray(params.scope) ? params.scope.join(',') : params.scope, 
      response_type: 'token', 
      v: params.v || this.options.version || lastApiVersion
    });

    if (authUrl === null) 
      return Promise.reject(new Error('Application ID is required'));

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
   * Получение URL для OAuth-авторизации во ВКонтакте
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