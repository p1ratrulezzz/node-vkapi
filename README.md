# Node.js SDK for VKontakte API

[![Dependency Status](https://david-dm.org/olnaz/node-vkapi.svg)](https://david-dm.org/olnaz/node-vkapi)

```javascript
'use strict';

const VKApi = require('node-vkapi');

let VK = new VKApi();

VK.call('users.get', {
    user_ids: '1'
}).then(res => {
    console.log(res);
});
```

## Installation

    $ npm install node-vkapi --save
    
## Features

* Calling all VK API methods
* Getting user `access_token` using:
    1. `code` and `redirect_uri` params
    2. User's login and password
* Getting server `access_token`
* Uploading files to vk.com

## Example

```javascript
const VKApi = require('node-vkapi');

let VK = new VKApi({
    appId: 1234567890, 
    appSecret: 'app-secret-key', 
    authData: {
        login: '+79871234567', 
        pass: 'password123'
    }, 
    version: '5.40'
});

VK.getTokenByLogin({
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

`*` - required param

All methods, except `vkapi.setOptions`, return `Promise(response)`.  
Method `vkapi.setOptions` returns `this`.

### new vkapi(options):
* `options` (Object)
    * `appSecret` (String): Application secret key
    * `appId` (String or Number)
    * `authData` (Object):
        * `login` (String)
        * `pass` (String)
        * `phone` (String): Phone number (Example: +79991234567)
    * `version` (String): `Latest VK API version` by default
    * `token` (String): Access token
    * `delays` (Boolean): Enable delays (334ms) between requests? `true` by default
    * `captchaDelay` (Number): Delay after captcha has been appeared (in ms). `60000ms` by default
    * `captchaService` (String): Captcha service (rucaptcha, anti-captcha, antigate). `anti-captcha` by default
    * `captchaKey` (String): Cpatcha service API-key


You must pass parameter `authData` only if you plan to receive `access_token` by the login and password.

### vkapi.call(method, params):  
* `method`* (String)
* `params` (Object):
    * `< .. method params .. >`
    * `v` (String): `vkapi.options.version` by default
    * `access_token` (String): `vkapi.options.token` by default
* returns Object{< .. VK API Response .. >}

If the parameter `v` was not passed, then `v` always be equal to the latest version of VK API.  
You must pass parameter `authData` if the VK API method requires it and `vkapi.options.token` is null.

If the `ETIMEDOUT` error occurs function does not return it, and instead of this sends a request with same params. 

### vkapi.getAccessToken(params):  
* `params` (Object):
    * `client_id` (String): `vkapi.options.appId` by default
    * `client_secret` (String): `vkapi.options.appSecret` by default
    * `code` (String)
    * `redirect_uri` (String)
    * `v` (String): `vkapi.options.version` by default
* returns Object{access_token, expires_in?, user_id?, email?}

Getting `access_token` by passed params. 

If `code` and `redirect_uri` params were passed, then user `access_token` will be got.  
If one of params [`code`, `redirect_uri`] was not passed, then server `access_token` will be got. 

More details: [vk.com/dev/auth_server](https://vk.com/dev/auth_server), [vk.com/dev/secure](https://vk.com/dev/secure)

### vkapi.getTokenByLogin(params):  
* `params` (Object):
    * `appId` (String): `vkapi.options.appId` by default
    * `scope` (String or Array): Permissions ([vk.com/dev/permissions](https://vk.com/dev/permissions))
    * `login` (String): `vkapi.options.authData.login` by default
    * `pass` (String): `vkapi.options.authData.pass` by default
    * `v` (String): `vkapi.options.version` by default
* returns Object{access_token, expires_in, user_id, email?}

Before using this method recommended to provide a phone number in `vkapi.options.authData.phone`, if `login` is an e-mail, because during authorization may occur "security check" when you need to verify your phone number by entering it in the field.  
Phone number must start with +.  

If `access_token` was got successfully, it will be saved in `vkapi.options.token`.

### vkapi.upload(type, file, params, saveParams):
* `type` (String): One of given [types of uploads](#types-of-uploads)
* `file` (Readable Stream): or Array of Readable Streams (only for `photo_album` type)
* `params` (Object):
    * `< .. method params .. >`: See [vk.com/dev/upload_files](https://vk.com/dev/upload_files)
    * `access_token`* (String): `vkapi.options.token` by default. **Required**, if default token was not set.
* `saveParams` (Object): 
    * `< .. VK API method save-params .. >`: As example, you can specify `artist` and `title` params to save audiofile with certain title and artist. (See: [vk.com/dev/audio.save](https://vk.com/dev/audio.save))
* returs Object{< .. VK API Response .. >}

Keep in mind, that to upload files you must have the appropriate permissions.

#### Types of uploads
* `audio`
* `video`
* `document`
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

const fs = require('fs');
const VKapi = require('node-vkapi');

const VK = new VKapi({
  token: 'access_token'
});

VK.upload('photo_wall', fs.createReadStream('photo.png'))
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
* returns this
