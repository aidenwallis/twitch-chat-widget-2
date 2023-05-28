import { LitElement, css, html } from "lit";
import { customElement, property } from "lit/decorators.js";
import { classMap } from "lit/directives/class-map.js";
import { map } from "lit/directives/map.js";
import { styleMap } from "lit/directives/style-map.js";
import { ColorCorrection } from "./color-correction";
import { lookupBadge } from "./external-data";
import { Fragment } from "./fragment";
import { FragmentedChatMessage } from "./twitch-connection";
import { Theme, isEmoteOnly, theme } from "./url";

const colorCorrection = new ColorCorrection();

const themes: Record<Theme, ReturnType<typeof css>> = {
  simple: css`
    .message {
      text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.95);
    }
  `,
  default: css`
    .message {
      background-color: #1b1d20;
      padding: 10px 7px;
      border-radius: 4px;
      font-size: 14px;
      animation: message-enter 0.15s ease;
    }

    @keyframes message-enter {
      from {
        transform: translateY(10px);
        opacity: 0;
      }
      to {
        opacity: 1;
        transform: translateY(0px);
      }
    }
  `,
  emote_dark: css`
    .emote {
      height: 30rem;
    }

    .emote-content {
      display: block;
      text-align: center;
      padding: 3rem 0;
    }
  `,
};

@customElement("app-message")
export class MessageElement extends LitElement {
  @property()
  message?: FragmentedChatMessage;

  static styles = [
    css`
      :host {
        font-family: Inter, sans-serif;
      }

      .fade-out {
        animation: fade-out 0.15s ease 15s forwards;
      }

      .container {
        padding-bottom: 5px;
      }

      .content {
        color: #fff;
      }

      .message {
        font-family: 16px;
        word-wrap: break-word;
        line-height: 1.5;
        vertical-align: middle;
      }

      .emote {
        margin-bottom: -7px;
        display: inline;
      }

      .badges {
        display: inline;
      }

      .badge {
        margin-right: 2px;
        display: inline-block;
        margin-bottom: -4px;
      }

      .name {
        font-weight: 500;
        padding-right: 3px;
      }

      @keyframes fade-out {
        from {
          opacity: 1;
        }
        to {
          opacity: 0;
        }
      }
    `,
    themes[theme],
  ];

  render() {
    if (!this.message) {
      return null;
    }

    if (isEmoteOnly()) {
      const firstEmote = this.message.content.fragments.find((f) => f.type === "image");
      if (!firstEmote) return null;
      return html`<div class="emote-content">${renderFragment(firstEmote)}</div> `;
    }

    return html`
      <div class="container">
        <div class="fade-out">
          <div class="message">
            <span class="badges">
              ${map(this.message.sender.badges, (badge) => {
                const version = lookupBadge(badge.id, badge.version);
                if (!version) {
                  return null;
                }

                return html`<img src="${version.url}" alt="${version.alt}" class="badge" />`;
              })}
            </span>
            <span
              class="name"
              style="${styleMap({ color: colorCorrection.calculate(resolveNameColor(this.message.sender)) })}"
              >${renderName(this.message.sender)}:</span
            >
            <span class="${classMap({ content: true, italic: this.message.content.action })}"
              >${map(this.message.content.fragments, renderFragment)}</span
            >
          </div>
        </div>
      </div>
    `;
  }
}

function renderFragment(fragment: Fragment) {
  switch (fragment.type) {
    case "text": {
      return fragment.text;
    }

    case "image": {
      return html`<img src="${fragment.image}" alt="${fragment.text}" class="emote" />`;
    }
  }
}

function renderName(sender: FragmentedChatMessage["sender"]) {
  return sender.displayName.toLowerCase() === sender.login.toLowerCase()
    ? sender.displayName
    : `${sender.displayName} (${sender.login})`;
}

function resolveNameColor(sender: FragmentedChatMessage["sender"]) {
  return sender.color || "#aaa";
}

declare global {
  interface HTMLElementTagNameMap {
    "app-message": MessageElement;
  }
}
