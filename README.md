# node-vkapi

Node.JS SDK for vk.com API

## Installation

    $ npm install node-vkapi --save

## Usage

```javascript
const VKApi = require('node-vkapi');

// create vk instance
vk = new VKApi({
  appId: 12345678, 
  appSecret: 'ASDwfekdlFAzxlk', 
  authData: {
    login: 'email@gmail.com', 
    pass: 'qwerty123', 
    phone: '+1234566789'
  }, 
  version: '5.42'
});

// make requests
vk.call('users.get', {
  user_ids: '1, 2, 3'
})
.then(r => console.log(r)) // vk api response json object
.catch(e => console.log(e)) // vk api error json object

// get access_token by 'code' param
vk.getAccessToken({
  code: 'jfksdj4ASDjksd', 
  redirect_uri: 'http://yoursite.com/path'
})
.then(r => console.log(r)) // vk api response json object
.catch(e => console.log(e)) // vk api error json object

// get access_token via auth by login and pass
vk.getTokenByLogin({
  scope: ['friends', 'offline', 'photos']
})
.then(t => console.log(r)) // vk api response json object {access_token, expires_in, user_id}
.catch(e => console.log(e)) // error object
```
