'use strict';

const prequest = require('request-promise');
const vkapi = require('node-vkapi');

const arrayToPhotoAlbumObj = require('./helpers').arrayToPhotoAlbumObj;

const uploadTypes = new Map([
  ['audio', ['file', 'audio.getUploadServer', 'audio.save']], 
  ['video', ['video_file', 'video.save']], 
  ['document', ['file', 'docs.getUploadServer', 'docs.save']], 
  ['photo_pm', ['photo', 'photos.getMessagesUploadServer', 'photos.saveMessagesPhoto']], 
  ['photo_wall', ['photo', 'photos.getWallUploadServer', 'photos.saveWallPhoto']], 
  ['photo_main', ['photo', 'photos.getOwnerPhotoUploadServer', 'photos.saveOwnerPhoto']], 
  ['photo_album', ['file', 'photos.getUploadServer', 'photos.save']]
]);

function sendFile (type, file, params) => {
  let methods = uploadTypes.get(type);
  let formData = Array.isArray(file) ? arrayToPhotoAlbumObj(file) : { [methods[0]]: file };
  let api = new vkapi({ token: params.access_token });

  return api.call(methods[1], params).then(r => {
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

      return api.call(methods[2], r);
    }

    return r;
  });
}

module.exports.send = sendFile;
module.exports.uploadTypes = uploadTypes;