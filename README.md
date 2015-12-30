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

## Usage

`*` - required param

### new vkapi (options):
* `options` (Object)
    * `appSecret` (String): Application secret key
    * `appId` (String or Number)
    * `authData` (Object):
        * `login` (String)
        * `pass` (String)
        * `phone` (String): Phone number (Example: +79991234567)
    * `version` (String): Latest VK API version by default
    * `token` (String): Access token

Параметр `authData` имеет смысл передавать только в том случае, если вы планируете получать `access_token` путем авторизации по логину и паролю.

### vkapi.call (method, params):
* `method`* (String)
* `params` (Object):
    * `< .. method params .. >`
    * `v` (String)
    * `access_token` (String)

Если параметр `v` не передан, то `v` всегда будет равен последней версии VK API.
`access_token` имеет смысл передавать, если метод его требует и в `vkapi.options.token` он не задан. 

### vkapi.getAccessToken (params):
* `params` (Object):
    * `client_id` (String): `vkapi.options.appId` by default
    * `client_secret` (String): `vkapi.options.appSecret` by default
    * `code` (String)
    * `redirect_uri` (String)
    * `v` (String): `vkapi.options.version` by default

Получение `access_token` по переданным параметрам. 

Если переданы параметры `code` и `redirect_uri`, то будет получен пользовательский `access_token`.
Если не передан какой-либо из параметров `code`, `redirect_uri`, то будет получен серверный `access_token`.

### vkapi.getTokenByLogin (params):
* `params` (Object):
    * `appId` (String): `vkapi.options.appId` by default
    * `scope` (String or Array): Permissions (vk.com/dev/permissions)
    * `login` (String)
    * `pass` (String)
    * `v` (String): `vkapi.options.version` by default

### vkapi.setOptions (options):
* `options` (Object): Constructor object
