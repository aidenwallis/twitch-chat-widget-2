import { LitElement, html } from "lit";
import { customElement, state } from "lit/decorators.js";
import { when } from "lit/directives/when.js";
import { loadData } from "./external-data";
import "./messages";
import { parseChannelFromURL } from "./url";

@customElement("app-root")
export class RootElement extends LitElement {
  @state()
  private channelLogin?: string;

  constructor() {
    super();
  }

  connectedCallback() {
    super.connectedCallback();

    this.channelLogin = undefined;

    const parsed = parseChannelFromURL();
    if (!parsed) {
      return;
    }

    loadData(parsed[0]).then(() => {
      this.channelLogin = parsed[1];
    });
  }

  render() {
    return html`
      ${when(this.channelLogin, () => html`<app-messages channelLogin="${this.channelLogin}"></app-messages>`)}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "app-root": RootElement;
  }
}
