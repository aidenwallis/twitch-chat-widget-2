# twitch-chat-widget-2

A rewrite of [twitch-chat-widget](https://github.com/aidenwallis/twitch-chat-widget), but in Web Components, and addressing some of the code smells (while creating others) and improving performance and adding features.

## Usage

If you'd like to use the hosted version of this widget, you can access it through the [Cloudflare Pages](https://pages.cloudflare.com) deployment:

```
https://chatwidget.fossadev.com/<twitch id>-<twitch username>
```

For example, `aiden` has a twitch user ID of `87763385`, thus, the URL becomes:

```
https://chatwidget.fossadev.com/87763385-aiden
```

### Themes

The widget supports 3 themes, you can change them by adding `?theme=<theme>` to the URL.

* `default`: The default theme.
* `simple`: A cleaner, transparent overlay.
* `emote_black`: Only shows emotes on a black background.


## What's new?

* Messages are held back for `1000ms`, and will not show if a moderator takes action on the message in that time - cleaning up chat from suddenly jumping due to bot deletions.
* Performance improvements: multiple indexes are maintained to make message eviction faster.
* Smaller, faster: written in Web Components using [lit](https://lit.dev), far more performant and lighter than the previous React version.
