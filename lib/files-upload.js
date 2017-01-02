'use strict';

/**
 * Uploads files to VK.COM
 */

/**
 * Module dependencies.
 * @private
 */
const prequest   = require('request-promise');
const VKApiError = require('./errors/api-error');

/**
 * Local constants.
 * @private
 */
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
 *   @property {Readable Stream or Array of Readable Streams} data
 *   @property {Object}  beforeUpload
 *   @property {Object}  afterUpload
 * @return {Promise}
 * @public
 *
 * this = ./vkapi.js#VKApi instance
 */
function upload (type = '', params = {}) {
  let filesToSend = params.data;

  params.beforeUpload = params.beforeUpload || {};

  // Use at your own risk. This is just a "hack" giving the ability to upload 
  // graffities or audio messages to vk.com. 
  // Only .png/.svg graffities and .mp3 audio messages were tested. 
  // 
  // To send uploaded graffiti/audio message just attach it to message 
  // as a document (doc<owner_id>_<doc_id>). 
  // 
  // Read more: vk.com/dev/messages.send

  if (type === 'graffiti') {
    type = 'document';
    params.beforeUpload.type = 'graffiti';
  }

  if (type === 'audio_msg') {
    type = 'document';
    params.beforeUpload.type = 'audio_message';
  }

  // No token, can't upload
  if (!this.options.token) 
    return Promise.reject(new Error('You are not authorized. Please, get the access token first.'));

  // "type" is not a string
  if (typeof type !== 'string') 
    return Promise.reject(new TypeError('"type" must be a string.'));

  // Unsupported type
  if (!FILE_TYPE.has(type)) 
    return Promise.reject(new Error('Type "' + type + '" is unsupported.'));

  // No files to upload
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

  // Step 1: get an upload url
  return this.call(methods[1], params.beforeUpload)
    .then(response => {
      let uploadUrl = response.upload_url;

      return prequest.post(uploadUrl, {
        formData, 
        json: true
      });
    })
    .then(response => {
      if (response.error) 
        throw new VKApiError({
          description: response.error
        });

      // Step 2: save the file uploaded
      if (methods[2]) {
        if (type === 'photo_album') 
          response.album_id = params.beforeUpload.album_id;

        if (params.beforeUpload.group_id) 
          response.group_id = params.beforeUpload.group_id;

        if (params.afterUpload) 
          response = Object.assign(response, params.afterUpload);

        return this.call(methods[2], response);
      }

      // "video" type has no second step
      return response;
    });
}

module.exports = upload;