# Node.js SDK for VKontakte API

```javascript
'use strict';

const VKApi = require('node-vkapi');
const VK    = new VKApi();

VK.call('users.get', {
  user_ids: '1'
}).then(res => {
  console.log(res);
});
```

## Installation

    $ npm install node-vkapi --only=prod --save
    
## Features

* Calling all VK API methods
* Getting user `access_token` using:
    1. Login and password (dirty way)
    2. Login and password (via official Android app)
* Getting server `access_token`
* Uploading files to vk.com
* Recognizing captcha

## Example

```javascript
const VKApi = require('node-vkapi');
const VK    = new VKApi({
  app: {
    id: 1234567890,
    secret: 'app-secret-key'
  }, 
  auth: {
    login: '+79871234567', 
    pass: 'password123'
  }
});

VK.auth.user({
  scope: ['audio', 'photos', 'friends', 'wall', 'offline']
}).then(token => {
  return VK.call('wall.post', {
    owner_id: token.user_id, 
    friends_only: 0, 
    message: 'Post to wall via node-vkapi'
  }).then(res => {
    // wall.post response
    return 'https://vk.com/wall' + token.user_id + '_' + res.post_id;
  });
}).then(link => {
  // returned data from previous .then
  console.log('Post was published: ' + link);
}).catch(error => {
  // catching errors
  console.log(error);
});
```

## API Reference

All methods, except `vkapi.setOptions`, return `Promise(response)`.  
Method `vkapi.setOptions` returns `this`.

### new vkapi(options):
* `options` (Object):
    * `app` (Object): 
        * `id` (Number): Application ID
        * `secret` (String): Application secret-key
    * `auth` (Object):
        * `login` (String)
        * `pass` (String)
        * `phone` (String): Phone number (Example: +79991234567)
    * `captcha` (Object):
        * `delay` (Number): Delay after captcha has been appeared (in ms). `100000ms` by default
        * `service` (String): Captcha service (rucaptcha, anti-captcha, antigate). `anti-captcha` by default
        * `key` (String): Cpatcha service API-key
    * `delays` (Boolean): Enable delays (334ms) between requests? `true` by default
    * `token` (String): Access token
    * `version` (String): `Latest VK API version` by default


You must specify parameter `auth` only if you plan to receive `access_token` by the login and password.

### vkapi.call(method, params):  
* `method` (String)
* `params` (Object):
    * `< .. method params .. >`
    * `v` (String): `vkapi.options.version` by default
    * `access_token` (String): `vkapi.options.token` by default

If the parameter `v` was not passed, then `v` always be equal to the latest version of VK API.  
You must specify parameter `access_token` if the VK API method requires it, but `vkapi.options.token` is null.

If `ETIMEDOUT` or similar error occurs, function does not return it and tries to resend a request with same params. 

### vkapi.auth.server():  

Getting server `access_token`. 
More details: [vk.com/dev/auth_server](https://vk.com/dev/auth_server), [vk.com/dev/secure](https://vk.com/dev/secure)

### vkapi.auth.user(params):  
* `params` (Object):
    * `type` (String): `android` or `null`
    * `scope` (String or Array): Permissions ([vk.com/dev/permissions](https://vk.com/dev/permissions))

If `type === android`, then access token will be got via official Android app ([vk.com/dev/auth_direct](https://vk.com/dev/auth_direct)).  
Else access token will be gained "dirty way".

Before using this method recommended to provide a phone number in `vkapi.options.auth.phone` if `login` is an e-mail, because during authorization may occur "security check" when you have to verify your phone number by entering it in the field. Phone number must start with +.  

If `access_token` was got successfully, it will be saved in `vkapi.options.token`.

### vkapi.upload(type, params):
* `type` (String): One of given [types of uploads](#types-of-uploads)
* `params` (Object):
    * `data` (Readable Stream): or Array of Readable Streams (only for `photo_album` type)
    * `beforeUpload` (Object): Request parameters for 1st API-call (getting upload url). See [vk.com/dev/upload_files](https://vk.com/dev/upload_files)
    * `afterUpload` (Object): Request parameters for 2nd API-call (saving file). As example, you can specify `artist` and `title` params to save audiofile with certain title and artist. (See: [vk.com/dev/audio.save](https://vk.com/dev/audio.save))

Keep in mind, that to upload files you must have the appropriate permissions.

#### Types of uploads
* `audio`
* `audio_msg` [*](https://github.com/olnaz/node-vkapi/blob/master/lib/files-upload.js#L44)
* `video`
* `document`
* `graffiti` [*](https://github.com/olnaz/node-vkapi/blob/master/lib/files-upload.js#L44)
* `photo_pm`
* `photo_wall`
* `photo_main`
* `photo_album`
* `photo_market`
* `photo_market_album`

#### Example of uploading

```javascript
// upload 'photo_wall', then post it to own wall

'use strict';

const fs    = require('fs');
const VKApi = require('node-vkapi');
const VK    = new VKApi({
  token: 'access_token'
});

VK.upload('photo_wall', {
    data: fs.createReadStream('photo.png')
  })
  .then(r => {
    return VK.call('wall.post', {
      owner_id: r[0].owner_id, 
      attachments: 'photo' + r[0].owner_id + '_' + r[0].id
    }).then(res => {
      return 'https://vk.com/wall' + r[0].owner_id + '_' + res.post_id;
    });
  })
  .then(link => console.log('Your post with photo is here: ' + link))
  .catch(e => console.log(e));
```

### vkapi.setOptions(options):  
* `options` (Object): [Constructor object](#new-vkapioptions)
