# node-vkapi

[![Dependency Status](https://david-dm.org/olnaz/node-vkapi.svg)](https://david-dm.org/olnaz/node-vkapi)

```javascript
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
* Uploading files to vk.com (soon)

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


Параметр `authData` имеет смысл передавать только в том случае, если вы планируете получать `access_token` путем авторизации по логину и паролю.

### vkapi.call(method, params):  
* `method`* (String)
* `params` (Object):
    * `< .. method params .. >`
    * `v` (String): `vkapi.options.version` by default
    * `access_token` (String): `vkapi.options.token` by default
* returns Object{< .. VK API Response .. >}

Если параметр `v` не передан, то `v` всегда будет равен последней версии VK API.  
Параметр `access_token` имеет смысл передавать, если метод его требует и в `vkapi.options.token` он не задан. 

При возникновении ошибки `ETIMEDOUT` функция не возвращает её, а посылает аналогичный запрос. 

### vkapi.getAccessToken(params):  
* `params` (Object):
    * `client_id` (String): `vkapi.options.appId` by default
    * `client_secret` (String): `vkapi.options.appSecret` by default
    * `code` (String)
    * `redirect_uri` (String)
    * `v` (String): `vkapi.options.version` by default
* returns Object{access_token, expires_in?, user_id?, email?}

Получение `access_token` по переданным параметрам. 

Если переданы параметры `code` и `redirect_uri`, то будет получен пользовательский `access_token`.  
Если не передан какой-либо из параметров [`code`, `redirect_uri`], то будет получен серверный `access_token`.

### vkapi.getTokenByLogin(params):  
* `params` (Object):
    * `appId` (String): `vkapi.options.appId` by default
    * `scope` (String or Array): Permissions (vk.com/dev/permissions)
    * `login` (String): `vkapi.options.authData.login` by default
    * `pass` (String): `vkapi.options.authData.pass` by default
    * `v` (String): `vkapi.options.version` by default
* returns Object{access_token, expires_in, user_id, email?}

Перед использованием метода рекомендуется указать номер телефона в `vkapi.options.authData.phone`, если `login` является е-мэилом, так как при авторизации возможна "проверка безопасности", когда нужно подтвердить свой номер телефона, введя его в поле.  
Номер телефона должен начинаться с +.  

После успешного получения токена, он сохраняется в `vkapi.options.token`.

### vkapi.setOptions(options):  
* `options` (Object): [Constructor object](#new-vkapi-options)
* returns this
