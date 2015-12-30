'use strict';

module.exports = {
  /**
   * Конвертирует JSON-объект в key=value строку
   */
  objToString (obj) {
    return obj ? Object.keys(obj).map(value => (value + '=' + (obj[value] || ''))).join('&') : '';
  }, 

  /**
   * Получает "массив" arguments и возвращает нормальный массив с аргументами, 
   * добавляя первым аргументом название вызванного метода класса VK.
   */
  formatArgs (name, args) {
    let newArgs = [].slice.call(args);
        newArgs.unshift(name);

    return newArgs;
  }, 

  hashToJson (hash) {
    let hashObj = {};

    hash.slice(1).split('&').forEach(v => {
      let val = v.split('=');

      hashObj[val[0]] = val[1];
    });

    return hashObj;
  }
}