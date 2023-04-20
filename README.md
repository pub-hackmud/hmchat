# hmchat
Next-gen hackmud chat library.

## Usage example
```js
import HMChat from "@pub-hackmud/hmchat";
// or with require:
// const HMChat = require("@pub-hackmud/hmchat").default;

const hm = new HMChat();

hm.on("started", () => {
    hm.send({
        from: hm.users[0],
        to: hm.users[1],
        msg: "Hello world!",
    })
});

hm.on("chats", chats => {
    for (const chat of chats) {
        console.log(chat.msg);
    }
});

hm.login("YOUR_CHAT_TOKEN_OR_CHAT_PASS");
```

## Reference

### new HMChat(options)
Creates a HMChat instance.

Arguments
 * `options`: Behaviour options
    * `pollFrequency`: Time to wait between polls in milliseconds. (default: 2s, min: 700ms)
    * `accountFrequency`: Time to wait between accountData polls in milliseconds (default: 10m, min: 5m)

#### Properties

 * `config`: Behaviour options. Do not edit.
 * `token`: Current Chat API token
 * `accountData`: Cached [`AccountData`](#accountdata). (empty on init: wait for `accountData` event)
 * `chats`: `Map` of all received [`Chat`](#chat)s
 * `status`: Current status of the `HMChat` instance
    * `"unauthed"`: [`HMChat.login`](#async-logintoken-start) is yet to be (successfully) called
    * `"running"`: The loop is currently running
    * `"stopped"`: The loop was stopped using [`HMChat.stop`](#stop)
    * `"errored"`: The loop was stopped due to an error
 * `users`: Array of usernames associated with the current account
 * `channels`: Map of channels. Key is channel name, value is a Set of joined users

#### async login(token, start)
Logs in using a chat pass or a chat token.

Arguments:
 * `token`: Chat pass or chat token
 * `start`: Whether this call should start the loop (default: true)

#### on(event, handler)
Adds an event handler.

Events:
 * `started`: Emits when loop is started. (args: none)
 * `stopped`: Emits when loop is stopped. (args: none)
 * `error`: Emits if an error occurs. (args: the error)
 * `chats`: Emits when new chats are received. (args: array of [`Chat`](#chat))
 * `accountData`: Emits when new accountData is received. (args: [`AccountData`](#accountdata))

#### removeEventHandler(event, handler)
Removes a previously added event handler.

#### start()
Starts the loop. You can use this to restart polling after it was stopped or an error occurred.

#### stop()
Stops the loop. You can use this to pause or end polling.

#### async send(chat)
Sends a chat message.

Arguments:
 * `chat`: Chat message to send
    * `from`: User to send message from (`string`)
    * `msg`: Message content (`string`)
    * `to`: User to send message to (`string`, present if tell)
    * `channel`: Channel to send message to (`string`, present if send)

#### preaddUsers(...users)
Adds users to poll messages from without fetching accountData. Useful if you've just created a new user and you don't want to wait for your accountData rate-limit to expire.

### Chat
A chat message.

Properties:
 * `id`: Internal ObjectID of the message (`string`)
 * `t`: Timestamp when the message was sent (`Date`)
 * `from_user`: Message sender (`string`)
 * `to_users`: Polled users who received the message (`string[]`)
 * `msg`: Message content (`string`)
 * `is_join`: Is this a join message? (`true` or `undefined`)
 * `is_leave`: Is this a leave message? (`true` or `undefined`)
 * `channel`: Channel of the message. (`string` or `undefined` if it's a tell.)

### AccountData
Account data provided by the API.

```ts
type Username = string
type Channel = string

type UsersInChannel = Set<Username>
type ChannelsOfUser = Map<Channel, UsersInChannel>

type AccountData = Map<Username, ChannelsOfUser>
```
