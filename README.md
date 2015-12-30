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
  v: '5.42'
});

// handling errors
vk.on('error', (error, args) => {
  console.log(error); // http, parse or other error
  console.log(args); // аргументы ф-ии, при которых возникла ошибка
});

// making requests
vk.call('users.get', {
  user_ids: '1, 2, 3'
}).then(r => console.log(r)) // vk api response json object
.catch(e => console.log(e)) // vk api error json object

```
