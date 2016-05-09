'use strict';

function _keys (object) {
  if (typeof object === 'string') 
    return [];

  return Object.keys(object);
}

function extend (target) {
  let output = Object.assign({}, target);
  let args = [].slice.call(arguments, 1).filter(v => v != null);

  for (let i = 0; i < args.length; i++) {
    let keys = _keys(args[i]);

    if (keys.length === 0) 
      continue;

    for (let j = 0; j < keys.length; j++) {
      if (output.hasOwnProperty(keys[j])) {
        let keys2 = _keys(args[i][keys[j]]);

        if (keys2.length === 0) {
          output[keys[j]] = args[i][keys[j]];
          continue;
        }

        output[keys[j]] = extend(output[keys[j]], args[i][keys[j]]);
      }
    }
  }

  return output;
}

module.exports = extend;