import { lookupEmote } from "./external-data";
import { ChatMessage } from "./twitch-connection";
import { isEmoteOnly } from "./url";

export type BaseFragment = { text: string };

export type TextFragment = BaseFragment & {
  type: "text";
};

export type ImageFragment = BaseFragment & {
  type: "image";
  image: string;
};

export type Fragment = TextFragment | ImageFragment;

// FragmentGenerationFactory is responsible for taking a message string and breaking it down into renderable fragments
export class FragmentGenerationFactory {
  constructor(private message: ChatMessage) {}

  build() {
    const fragments: Fragment[] = [];

    let buffer = "";
    let word = "";

    const _matchWord = () => {
      const thirdPartyEmote = lookupEmote(word);
      if (thirdPartyEmote) {
        _flushBuffer();
        fragments.push({ type: "image", text: word, image: thirdPartyEmote.url });
        word = "";
        return;
      }

      // no word matched, just push it to the buffer and continue
      buffer += word;
      word = "";
    };

    const _flushBuffer = () => {
      buffer && fragments.push({ type: "text", text: buffer });
      buffer = "";
    };

    // Array.from respects unicode emoji as a single item in the array
    const chars = Array.from(this.message.content.text);

    for (let i = 0; i < chars.length; ++i) {
      const nativeEmote = this.message.content.emotes[i];
      if (nativeEmote) {
        // There's an emote starting here, fast build next fragment from buffer, append emote fragment, and skip to when it's done.
        _flushBuffer();

        fragments.push({
          type: "image",
          text: chars.slice(nativeEmote.start, nativeEmote.end + 1).join(""),
          image: `https://static-cdn.jtvnw.net/emoticons/v2/${nativeEmote.id}/default/dark/${
            isEmoteOnly() ? "3" : "1"
          }.0`,
        });

        i = nativeEmote.end;
        continue;
      }

      const char = chars[i];
      if (char === " ") {
        _matchWord();
        buffer += char; // matchWord will push to buffer either way, regardless of emote or not, so retain space char
        continue;
      }

      // push character to active word buffer
      word += char;
    }

    // one last flush of buffer for end of message
    _matchWord();
    _flushBuffer();

    return fragments;
  }
}
