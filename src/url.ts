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


export const fadeout= resolveFadeout();
function resolveFadeout() {
  const raw = params.get("fadeout");
  if (raw === "off" || raw === "none") {
    return null;
  }

  if (!raw) {
    return "15s";
  }

  const value = parseInt(raw);
  if (isNaN(value) || value < 0) {
    return "15s";
  }

  return `${value}s`;
}



export function isEmoteOnly() {
  return theme === "emote_dark";
}
