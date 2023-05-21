# twitch-chat-widget-2

A rewrite of [twitch-chat-widget](https://github.com/aidenwallis/twitch-chat-widget), but in Web Components, and addressing some of the code smells (while creating others) and improving performance and adding features.

## What's new?

* Messages are held back for `1000ms`, and will not show if a moderator takes action on the message in that time - cleaning up chat from suddenly jumping due to bot deletions.
* Performance improvements: multiple indexes are maintained to make message eviction faster.
* Smaller, faster: written in Web Components using [lit](https://lit.dev), far more performant and lighter than the previous React version.
