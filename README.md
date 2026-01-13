# tgtb (Telegram Utility Bot)

[jump to usage duh](#Usage)

This is a powerful utility library for Telegram API.
Useful for full featured integration and testing.
This library is carefuly crafted and thoroughly tested and has been used in production.

Features:
- Utilizes only WebAPI so can be used in any js runtime
- There is no complexity or any abstraction layer using Telegram Bot API as is
- Typesafety, with extra types exported from @grammy/types for convenience
- Properly rate limited per chat/group/bot with paid broadcasts support. Configurable for complex scenarios
- Tests functions for webapps, oauth logins or fake data generators like `randomBotUsername`

<details>
<summary><b>Why this library was created?</b></summary>
I really dont like the current state of js api wrappers for telegram.
Its usually a heavy frameworks which requires some "learning" about how to use it.
Or just wraps entire api handlers when its become very complex to update when new api version released.

I think the api wrapper for telegram (or any) should solve those problems:
1. No heavy abstractions
2. Rate limiting just works
3. Utility included like tests or 

Telegram HTTP API actually so brilliantly structured so you can use just one Proxy object to call its methods.
In early days i used code from [this gist](https://gist.github.com/izzqz/24086734f245a9cbdd97ea3a4711d561).
Now its become tgtb. Thank you for reading this btw
</details>

## Usage

Install it using JSR ([what is this?](https://jsr.io/docs/introduction))
```sh
npx jsr add @izzqz/tgtb
```


## Current state

- [ ] Add support for telegram sms relay
- [ ] Add types for 
- [ ] Add docs
- [ ] Add examples

## Some design decisions

bla bla bla

## FAQ

#### Why its not published in npm?

I want this library works in many runtimes (nodejs, deno, bun, cf workers... you named)
So i have two options:
1. Fight with bundlers and build stuff
2. Just publish it to jsr

jsr having npm compatibility so why not benefit from it?!

#### Its only works in ESM i using CJS!

Sorry no bueno. Feel free to fork it. There is not much work to change it







