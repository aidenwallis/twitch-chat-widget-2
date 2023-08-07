const params = new URLSearchParams(window.location.search);

export type Theme = (typeof validThemes)[number];
const validThemes = ["default", "simple", "emote_dark"] as const;
const themeValue = (params.get("theme") || "default") as Theme;
export const theme = validThemes.includes(themeValue) ? themeValue : "default";

export function parseChannelFromURL() {
  const [, chunk] = window.location.pathname.split("/");
  if (!chunk) {
    return null;
  }

  const [channelID, channelLogin] = chunk.split("-");
  if (!(channelID && channelLogin)) {
    return null;
  }

  return [channelID, channelLogin] as const;
}

const fadeoutValue = params.get("fadeout");
export let fadeout: string;
if (fadeoutValue !== null) {
  fadeout = fadeoutValue === "off" || fadeoutValue === "0" ? "none" : `${parseInt(fadeoutValue, 10)}s`;
} else {
  fadeout = "15s";
}



export function isEmoteOnly() {
  return theme === "emote_dark";
}
