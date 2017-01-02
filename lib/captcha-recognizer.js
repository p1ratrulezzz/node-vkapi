'use strict';

/**
 * Recognizing VK Captcha via anti-captcha.com (or rucaptcha.com/antigate.com) service
 */

const prequest = require('request-promise');

class CaptchaRecognizer {
  constructor (params) {
    this.key = params.key;

    this.uploadUrl = 'http://' + params.service + '.com/in.php';
    this.checkUrl = 'http://' + params.service + '.com/res.php';

    this.waitTimes = 0;
  }

  recognize (url) {
    return this.download(url)
      .then(buf => this.convert(buf))
      .then(base64str => this.upload(base64str))
      .then(id => this.wait(id))
      .then(id => this.check(id));
  }

  download (url) {
    return prequest(url, { encoding: null });
  }

  convert (buffer) {
    return buffer.toString('base64');
  }

  upload (base64str) {
    return prequest.post(this.uploadUrl, {
      formData: {
        method: 'base64', 
        key: this.key, 
        body: {
          value: base64str, 
          options: {
            contentType: 'image/jpg'
          }
        }
      }
    }).then(res => {
      if (res.startsWith('OK')) 
        return res.split('|')[1];

      throw res;
    });
  }

  wait (captchaId, check) {
    return new Promise(resolve => {
      setTimeout(() => {
        this.waitTimes++;

        return resolve(check ? this.check(captchaId) : captchaId);
      }, this.waitTimes === 0 ? 10000 : 5000);
    });
  }

  check (captchaId) {
    return prequest(this.checkUrl, {
      qs: {
        key: this.key, 
        action: 'get', 
        id: captchaId
      }
    }).then(res => {
      if (res.startsWith('ERROR')) 
        throw res;

      if (~res.indexOf('NOT_READY')) 
        return this.wait(captchaId, true);

      return res.split('|')[1];
    });
  }
}

module.exports = CaptchaRecognizer;