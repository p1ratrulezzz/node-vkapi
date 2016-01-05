'use strict';

module.exports = {
  // Converts JSON Object to 'key=value' String
  objToString (obj) {
    return obj ? Object.keys(obj).map(value => (value + '=' + (obj[value] || ''))).join('&') : '';
  }, 

  // Converts Array [arguments] to ['funcName', arguments[0], arguments[1], arguments[n]]
  formatArgs (name, args) {
    let newArgs = [].slice.call(args);
        newArgs.unshift(name);

    return newArgs;
  }, 

  // Converts hash 'key=value' String (site.com/path#hashString) to JSON Object
  hashToJson (hash) {
    let hashObj = {};

    hash.slice(1).split('&').forEach(v => {
      let val = v.split('=');

      hashObj[val[0]] = val[1];
    });

    return hashObj;
  }, 

  // Converts Array to Object { [file + (n+1)]: Array[n] }
  // Only for vkapi.upload('photo_album')
  arrayToPhotoAlbumObj (array) {
    let obj = {};

    array.forEach((v, i) => {
      obj[('file' + ++i)] = v;
    });

    return obj;
  }, 

  // Encodes post params before send
  encodeParams (obj) {
    for (let key in obj) 
      obj[key] = encodeURIComponent(obj[key]);

    return obj;
  }
}