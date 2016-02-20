'use strict';

const cheerio = require('cheerio');
const VKAuthError = require('./errors').VKAuthError;

module.exports = {
  parseGrantAccessLink (rbody) {
    return new Promise((resolve, reject) => {
      let $ = cheerio.load(rbody);
      let form = $('form[method="post"]');

      if (form.length === 0)
        return reject(new Error('Failed to parse the form'));

      return resolve(form.attr('action'));
    });
  }, 

  parseAuthFields (rbody) {
    return new Promise((resolve, reject) => {
      let $ = cheerio.load(rbody);
      let form = $('form[method="post"]');
      let fields = {};

      form.serializeArray().forEach(v => {
        fields[v.name] = v.value;
      });

      return resolve({
        url: form.attr('action'), 
        fields
      });
    });
  }, 

  checkForHtmlErrors (r) {
    return new Promise((resolve, reject) => {
      let $ = cheerio.load(r.body);
      let error = $('.service_msg_warning');

      if (error.length !== 0)
        return reject(new VKAuthError({
          error: 'Auth error', 
          error_description: error.text()
        }));

      return resolve(r);
    })
  }, 

  checkForUriErros (r) {
    return new Promise((resolve, reject) => {
      let uriHash = r.request.uri.hash;

      if (/error=/.test(uriHash))
        return reject(new VKAuthError({
          error: uriHash.match(/error=([^&e]+)/)[1], 
          error_description: uriHash.match(/error_description=(.*)/)[1]
        }));

      return resolve(r);
    });
  }, 

  securityCheck (r, phone) {
    return new Promise((resolve, reject) => {
      if (!phone)
        return reject(new Error('You must specify the phone number to pass the security check.'));

      let $ = cheerio.load(r.body);
      let form = $('form[method="post"]');
      let postUrl = form.attr('action');

      if (postUrl[0] === '/' && postUrl[1] !== '/')
        postUrl = 'https://' + r.request.uri.host + postUrl;

      let code = $('input[name="code"]');
      let prel = code.prev('.field_prefix').text().trim().length;
      let postl = code.next('.field_prefix').text().trim().length;

      let codef = phone.slice(prel, phone.length - postl);

      return resolve({
        url: postUrl, 
        fields: {
          code: codef
        }
      });
    });
  }
}