'use strict';

const test  = require('ava');
const vkapi = require('./lib/vkapi');

const owner_id = <wall_owner_id>;
const api = new vkapi({
  app: {
    id:     <app_id>, 
    secret: '<app_secret>'
  }, 

  auth: {
    login: '<user_login>', 
    pass:  '<user_password>'
  }
});

test.cb('User authorization (Android)', t => {
  api.auth.user({ type: 'android', scope: 'all' })
    .then(r => {
      t.pass();
      t.end();
    }).catch(e => {
      t.fail();
      t.end();
    });
});

test.cb('User authorization (Dirty-way)', t => {
  api.auth.user({ scope: 'all' })
    .then(r => {
      t.pass();
      t.end();
    }).catch(e => {
      t.fail();
      t.end();
    });
});

test.cb('Server authorization', t => {
  api.auth.server()
    .then(r => {
      t.pass();
      t.end();
    }).catch(e => {
      t.fail();
      t.end();
    });
});

test.cb('"Too many requests per second"', t => {
  api.auth.user({ type: 'android', scope: 'all' })
    .then(r => {
      function doAWallPost (message) {
        api.call('wall.post', { owner_id, message })
          .then(response => null)
          .catch(error => {
            if (error.code === 6) 
              t.fail();
            else
              t.pass();

            t.end();
          });
      }

      for (let i = 0; i < 20; i++) 
        doAWallPost(`message ${i}`);
    }).catch(e => {
      t.fail();
      t.end();
    });
});