'use strict';

/**
 * Uploads files to VK.COM
 */

const prequest   = require('request-promise');
const VKApiError = require('./errors/api-error');

// [type, [var-name, upload-step-1, upload-step-2]]
const FILE_TYPE = new Map([
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

/**
 * @param  {String} type
 * @param  {Object} params
 *         @prop {Readable Stream or Array of Readable Streams} data
 *         @prop {Object} beforeUpload
 *         @prop {Object} afterUpload
 * @return {Promise}
 */
function upload (type, params = {}) {
  let filesToSend = params.data;

  params.beforeUpload = params.beforeUpload || {};

  if (!this.options.token) 
    return Promise.reject(new Error('You are not authorized. Please, get the access token first.'));

  if (typeof type !== 'string') 
    return Promise.reject(new TypeError('"type" must be a string.'));

  if (!FILE_TYPE.has(type)) 
    return Promise.reject(new Error('Type "' + type + '" is unsupported.'));

  if (!filesToSend || (Array.isArray(filesToSend) && filesToSend.length === 0)) 
    return Promise.reject(new Error('"params.data" is undefined.'));

  if (Array.isArray(filesToSend)) {
    // Limit: 5 files
    filesToSend.splice(5);

    if (filesToSend.length > 1 && type !== 'photo_album') 
      return Promise.reject(new Error('Only "photo_album" type can accept a few files.'));

    if (filesToSend.length === 1) 
      filesToSend = filesToSend[0];
  }

  let methods = FILE_TYPE.get(type);
  let formData;

  if (Array.isArray(filesToSend)) {
    if (type === 'photo_album') {
      formData = filesToSend.reduce((obj, value, index) => (obj[('file' + ++index)] = value) && obj, {});
    } else {
      formData = {
        [methods[0]]: filesToSend[0]
      };
    }
  } else {
    formData = {
      [methods[0]]: filesToSend
    };
  }

  return this.call(methods[1], params.beforeUpload)
    .then(response => response.upload_url)
    .then(link => prequest.post(link, { formData, json: true }))
    .then(response => {
      if (response.error)
        throw new VKApiError({
          error: 'VK API Upload Error', 
          description: response.error
        });

      if (methods[2]) {
        if (type === 'photo_album') 
          response.album_id = params.beforeUpload.album_id;

        if (params.beforeUpload.group_id) 
          response.group_id = params.beforeUpload.group_id;

        if (params.afterUpload) 
          response = Object.assign(response, params.afterUpload);

        return this.call(methods[2], response);
      }

      return response;
    });
}

module.exports = upload;