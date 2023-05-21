import { IRCMessage, parse as parseMessage } from "irc-message-ts";

export type ChatMessage = ReturnType<typeof buildMessage>;

enum ConnectionState {
  Connected,
  Connecting,
  Disconnected,
}

const MAX_RECONNECT_TIMEOUT = 10 * 1000;
const newlineRx = /[\r\n]+/;

const isActionRegex = /^\u0001ACTION (.*)\u0001$/;

export class TwitchConnection {
  private conn?: WebSocket;
  private connectionAttempts = 0;
  private forceDisconnect = false;
  private login?: string;
  private state = ConnectionState.Disconnected;
  private messageCallback?: (msg: ChatMessage) => void;
  private userTimeoutCallback?: (login: string) => void;
  private deleteMessageCallback?: (id: string) => void;
  private connectionTimeout?: ReturnType<typeof setTimeout>;

  public join(login: string) {
    if (login === this.login) return;

    this.send("PART #" + this.login);
    this.login = login;
    this.send("JOIN #" + this.login);
  }

  public connect() {
    if (this.forceDisconnect) return;
    if (this.state !== ConnectionState.Disconnected) return;

    ++this.connectionAttempts;

    this.state = ConnectionState.Connecting;
    // give 5s to connect
    this.connectionTimeout = setTimeout(() => this.handleDisconnect(), 5000);

    this.conn = new WebSocket("wss://irc-ws.chat.twitch.tv/");

    this.conn.onopen = () => {
      this.connectionAttempts = 0;
      this.connectionTimeout && clearTimeout(this.connectionTimeout);

      this.send("CAP REQ :twitch.tv/tags twitch.tv/commands");
      this.send("PASS oauth:123123132");
      this.send("NICK justinfan123");
      this.login && this.send("JOIN #" + this.login);
    };

    this.conn.onmessage = (event) => {
      if (!event.data) return;
      const lines = event.data.split(newlineRx);
      for (const line of lines) {
        this.handleLine(line);
      }
    };

    this.conn.onerror = () => this.handleDisconnect();
    this.conn.onclose = () => this.handleDisconnect();
  }

  public onMessage(cb: (msg: ChatMessage) => void) {
    this.messageCallback = cb;
  }

  public onUserTimeout(cb: (login: string) => void) {
    this.userTimeoutCallback = cb;
  }

  public onDeleteMessage(cb: (id: string) => void) {
    this.deleteMessageCallback = cb;
  }

  private handleLine(line: string) {
    if (!line) return;
    const parsed = parseMessage(line);
    if (!parsed) return;

    switch (parsed.command) {
      case "PING": {
        return this.send(line.replace("PING", "PONG"));
      }

      case "PRIVMSG": {
        return this.messageCallback?.(buildMessage(parsed));
      }

      case "CLEARCHAT": {
        return this.userTimeoutCallback?.(parsed.trailing || "");
      }

      case "CLEARMSG": {
        return parsed.tags["target-msg-id"] && this.deleteMessageCallback?.(parsed.tags["target-msg-id"]);
      }
    }
  }

  private handleDisconnect() {
    // prevent duplicate reconnection attempts
    if (this.state === ConnectionState.Disconnected) return;
    this.state = ConnectionState.Disconnected;

    this.conn && this.conn.close();

    console.log("Disconnected from Twitch.");

    setTimeout(() => this.connect(), Math.min(this.connectionAttempts * 2000, MAX_RECONNECT_TIMEOUT));
  }

  public disconnect(): void {
    this.forceDisconnect = true;
    this.conn && this.conn.close();
  }

  private send(line: string) {
    if (line.includes("\n")) return;

    if (this.conn && this.conn.readyState == WebSocket.OPEN) this.conn.send(line + "\r\n");
  }
}

function parseBadges(raw: string) {
  const spl = raw.split(",");
  const out: { id: string; version: string }[] = [];

  for (const rawSpl of spl) {
    const [id, version] = rawSpl.split("/");
    id && version && out.push({ id, version });
  }

  return out;
}

function parseEmotes(raw: string) {
  const spl = raw.split("/");

  // index by starting point, it'll be used later when we parse into fragments
  const out: Record<number, { id: string; start: number; end: number }> = {};

  for (const emote of spl) {
    const [id, rawPlacements] = emote.split(":");
    if (!(id && rawPlacements)) continue;

    const placements = rawPlacements.split(",");
    for (const placement of placements) {
      const [rawStart, rawEnd] = placement.split("-");
      if (!(rawStart && rawEnd)) continue;

      const start = parseInt(rawStart);
      const end = parseInt(rawEnd);
      if (isNaN(start) || isNaN(end)) continue;

      out[start] = { id, start, end };
    }
  }

  return out;
}

export function buildMessage(data: IRCMessage) {
  const actionMatch = data.trailing.match(isActionRegex);

  return {
    id: data.tags["id"] || "",
    content: {
      action: !!actionMatch,
      emotes: parseEmotes(data?.tags?.emotes || ""),
      text: actionMatch ? actionMatch[1] : data.trailing,
    },
    sender: {
      id: data.tags["user-id"] || "",
      login: data.prefix?.split("!")[0] || "",
      displayName: data.tags["display-name"] || "",
      color: data.tags.color,
      badges: parseBadges(data?.tags?.badges || ""),
    },
  };
}
