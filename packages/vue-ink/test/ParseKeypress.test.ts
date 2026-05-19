import { describe, it, expect } from "vitest";
import parseKeypress from "../../renderer/src/parse-keypress.ts";

describe("parseKeypress", () => {
  it("parses lowercase letters", () => {
    const key = parseKeypress("a");
    expect(key.name).toBe("a");
    expect(key.ctrl).toBe(false);
    expect(key.shift).toBe(false);
    expect(key.meta).toBe(false);
  });

  it("parses uppercase letters with shift flag", () => {
    const key = parseKeypress("A");
    expect(key.name).toBe("a");
    expect(key.shift).toBe(true);
  });

  it("parses ctrl+letter as ctrl=true with the letter name", () => {
    const key = parseKeypress("\x01");
    expect(key.name).toBe("a");
    expect(key.ctrl).toBe(true);
  });

  it("parses Escape then f as meta+f (single combined key)", () => {
    const key = parseKeypress("\x1bf");
    expect(key.name).toBe("f");
    expect(key.meta).toBe(true);
  });

  it("parses Escape then F as meta+shift+f", () => {
    const key = parseKeypress("\x1bF");
    expect(key.name).toBe("f");
    expect(key.meta).toBe(true);
    expect(key.shift).toBe(true);
  });

  it("parses arrow keys", () => {
    expect(parseKeypress("\x1b[A").name).toBe("up");
    expect(parseKeypress("\x1b[B").name).toBe("down");
    expect(parseKeypress("\x1b[C").name).toBe("right");
    expect(parseKeypress("\x1b[D").name).toBe("left");
  });

  it("parses Shift+Tab as tab + shift", () => {
    const key = parseKeypress("\x1b[Z");
    expect(key.name).toBe("tab");
    expect(key.shift).toBe(true);
  });

  it("parses tab", () => {
    expect(parseKeypress("\t").name).toBe("tab");
  });

  it("parses return / enter / backspace / escape", () => {
    expect(parseKeypress("\r").name).toBe("return");
    expect(parseKeypress("\n").name).toBe("enter");
    expect(parseKeypress("\x7f").name).toBe("backspace");
    expect(parseKeypress("\x1b").name).toBe("escape");
  });

  it("parses page up/down, home, end, delete, insert", () => {
    expect(parseKeypress("\x1b[5~").name).toBe("pageup");
    expect(parseKeypress("\x1b[6~").name).toBe("pagedown");
    expect(parseKeypress("\x1b[H").name).toBe("home");
    expect(parseKeypress("\x1b[F").name).toBe("end");
    expect(parseKeypress("\x1b[3~").name).toBe("delete");
    expect(parseKeypress("\x1b[2~").name).toBe("insert");
  });

  it("parses function keys f1-f4", () => {
    expect(parseKeypress("\x1bOP").name).toBe("f1");
    expect(parseKeypress("\x1bOQ").name).toBe("f2");
    expect(parseKeypress("\x1bOR").name).toBe("f3");
    expect(parseKeypress("\x1bOS").name).toBe("f4");
  });

  it("parses Ctrl+Arrow", () => {
    const key = parseKeypress("\x1b[1;5A");
    expect(key.name).toBe("up");
    expect(key.ctrl).toBe(true);
  });

  it("parses meta+Arrow with double-escape", () => {
    const key = parseKeypress("\x1b\x1b[A");
    expect(key.name).toBe("up");
    expect(key.meta).toBe(true);
  });

  it("parses multi-byte unicode (emoji) as a single key", () => {
    const key = parseKeypress("😀");
    expect(key.sequence).toBe("😀");
  });

  it("parses Uint8Array input", () => {
    const buf = new TextEncoder().encode("a");
    const key = parseKeypress(buf);
    expect(key.name).toBe("a");
  });

  it("parses Uint8Array with meta bit high", () => {
    // 0x80 + 'a' (0x61) = 0xe1 — high bit indicates meta prefix
    const buf = new Uint8Array([0xe1]);
    const key = parseKeypress(buf);
    expect(key.meta).toBe(true);
    expect(key.name).toBe("a");
  });

  it("parses kitty CSI-u sequence with eventType", () => {
    const key = parseKeypress("\x1b[97;1:3u");
    expect(key.name).toBe("a");
    expect(key.eventType).toBe("release");
    expect(key.isKittyProtocol).toBe(true);
  });

  it("parses kitty modifier — super", () => {
    // modifiers = super(8)+1 = 9
    const key = parseKeypress("\x1b[97;9u");
    expect(key.super).toBe(true);
    expect(key.name).toBe("a");
  });

  it("parses kitty modifier — hyper", () => {
    // modifiers = hyper(16)+1 = 17
    const key = parseKeypress("\x1b[97;17u");
    expect(key.hyper).toBe(true);
  });

  it("parses kitty special letter key with eventType", () => {
    // CSI 1 ; 1 : 1 A → up arrow press
    const key = parseKeypress("\x1b[1;1:1A");
    expect(key.name).toBe("up");
    expect(key.eventType).toBe("press");
    expect(key.isKittyProtocol).toBe(true);
  });

  it("parses kitty special number key (delete release)", () => {
    // CSI 3 ; 1 : 3 ~ → delete release
    const key = parseKeypress("\x1b[3;1:3~");
    expect(key.name).toBe("delete");
    expect(key.eventType).toBe("release");
  });
});

const kittyKey = (
  codepoint: number,
  modifiers?: number,
  eventType?: number,
  textCodepoints?: number[],
): string => {
  let seq = `\x1b[${codepoint}`;
  if (modifiers !== undefined || eventType !== undefined || textCodepoints !== undefined) {
    seq += `;${modifiers ?? 1}`;
  }
  if (eventType !== undefined || textCodepoints !== undefined) {
    seq += `:${eventType ?? 1}`;
  }
  if (textCodepoints !== undefined) {
    seq += `;${textCodepoints.join(":")}`;
  }
  seq += "u";
  return seq;
};

describe("kitty protocol parsing — modifiers and basic protocol", () => {
  it("parses simple character", () => {
    const result = parseKeypress(kittyKey(97));
    expect(result.name).toBe("a");
    expect(result.ctrl).toBe(false);
    expect(result.shift).toBe(false);
    expect(result.meta).toBe(false);
    expect(result.eventType).toBe("press");
    expect(result.isKittyProtocol).toBe(true);
  });

  it("parses uppercase character (shift)", () => {
    const result = parseKeypress(kittyKey(65, 2));
    expect(result.name).toBe("a");
    expect(result.shift).toBe(true);
    expect(result.ctrl).toBe(false);
    expect(result.eventType).toBe("press");
  });

  it("parses ctrl modifier", () => {
    const result = parseKeypress(kittyKey(97, 5));
    expect(result.name).toBe("a");
    expect(result.ctrl).toBe(true);
    expect(result.shift).toBe(false);
    expect(result.eventType).toBe("press");
  });

  it("parses alt/option modifier", () => {
    const result = parseKeypress(kittyKey(97, 3));
    expect(result.name).toBe("a");
    expect(result.meta).toBe(true);
    expect(result.ctrl).toBe(false);
    expect(result.eventType).toBe("press");
  });

  it("parses super modifier", () => {
    const result = parseKeypress(kittyKey(97, 9));
    expect(result.name).toBe("a");
    expect(result.super).toBe(true);
    expect(result.ctrl).toBe(false);
    expect(result.eventType).toBe("press");
  });

  it("parses hyper modifier", () => {
    const result = parseKeypress(kittyKey(97, 17));
    expect(result.name).toBe("a");
    expect(result.hyper).toBe(true);
    expect(result.super).toBe(false);
    expect(result.eventType).toBe("press");
  });

  it("parses meta modifier", () => {
    const result = parseKeypress(kittyKey(97, 33));
    expect(result.name).toBe("a");
    expect(result.meta).toBe(true);
    expect(result.eventType).toBe("press");
  });

  it("parses caps lock", () => {
    const result = parseKeypress(kittyKey(97, 65));
    expect(result.name).toBe("a");
    expect(result.capsLock).toBe(true);
    expect(result.eventType).toBe("press");
  });

  it("parses num lock", () => {
    const result = parseKeypress(kittyKey(97, 129));
    expect(result.name).toBe("a");
    expect(result.numLock).toBe(true);
    expect(result.eventType).toBe("press");
  });

  it("parses combined modifiers (ctrl+shift)", () => {
    const result = parseKeypress(kittyKey(97, 6));
    expect(result.name).toBe("a");
    expect(result.ctrl).toBe(true);
    expect(result.shift).toBe(true);
    expect(result.meta).toBe(false);
    expect(result.eventType).toBe("press");
  });

  it("parses combined modifiers (super+ctrl)", () => {
    const result = parseKeypress(kittyKey(115, 13));
    expect(result.name).toBe("s");
    expect(result.super).toBe(true);
    expect(result.ctrl).toBe(true);
    expect(result.shift).toBe(false);
    expect(result.eventType).toBe("press");
  });

  it("parses escape key", () => {
    const result = parseKeypress(kittyKey(27));
    expect(result.name).toBe("escape");
    expect(result.eventType).toBe("press");
  });

  it("parses return/enter key", () => {
    const result = parseKeypress(kittyKey(13));
    expect(result.name).toBe("return");
    expect(result.eventType).toBe("press");
  });

  it("parses tab key", () => {
    const result = parseKeypress(kittyKey(9));
    expect(result.name).toBe("tab");
    expect(result.eventType).toBe("press");
  });

  it("parses backspace key (codepoint 8)", () => {
    const result = parseKeypress(kittyKey(8));
    expect(result.name).toBe("backspace");
    expect(result.eventType).toBe("press");
  });

  it("parses backspace key (codepoint 127)", () => {
    const result = parseKeypress(kittyKey(127));
    expect(result.name).toBe("backspace");
    expect(result.eventType).toBe("press");
  });

  it("legacy parser - meta + backspace (0x7F)", () => {
    const result = parseKeypress("\x1b\x7f");
    expect(result.name).toBe("backspace");
    expect(result.meta).toBe(true);
  });

  it("parses space key", () => {
    const result = parseKeypress(kittyKey(32));
    expect(result.name).toBe("space");
    expect(result.eventType).toBe("press");
  });
});

describe("kitty protocol parsing — event types", () => {
  it("parses event type press", () => {
    const result = parseKeypress(kittyKey(97, 1, 1));
    expect(result.name).toBe("a");
    expect(result.eventType).toBe("press");
  });

  it("parses event type repeat", () => {
    const result = parseKeypress(kittyKey(97, 1, 2));
    expect(result.name).toBe("a");
    expect(result.eventType).toBe("repeat");
  });

  it("parses event type release", () => {
    const result = parseKeypress(kittyKey(97, 1, 3));
    expect(result.name).toBe("a");
    expect(result.eventType).toBe("release");
  });
});

describe("kitty protocol parsing — special chars and unicode", () => {
  it("parses number keys", () => {
    const result = parseKeypress(kittyKey(49));
    expect(result.name).toBe("1");
    expect(result.eventType).toBe("press");
  });

  it("parses special character", () => {
    const result = parseKeypress(kittyKey(64));
    expect(result.name).toBe("@");
    expect(result.eventType).toBe("press");
  });

  it("parses ctrl+letter as codepoint 1-26", () => {
    const result = parseKeypress(kittyKey(1, 5));
    expect(result.name).toBe("a");
    expect(result.ctrl).toBe(true);
  });

  it("preserves sequence and raw", () => {
    const seq = kittyKey(97, 5);
    const result = parseKeypress(seq);
    expect(result.sequence).toBe(seq);
    expect(result.raw).toBe(seq);
  });

  it("parses text-as-codepoints field", () => {
    const result = parseKeypress(kittyKey(97, 2, 1, [65]));
    expect(result.name).toBe("a");
    expect(result.text).toBe("A");
    expect(result.shift).toBe(true);
    expect(result.isKittyProtocol).toBe(true);
  });

  it("parses text-as-codepoints with multiple codepoints", () => {
    const result = parseKeypress(kittyKey(97, 1, 1, [72, 101]));
    expect(result.text).toBe("He");
    expect(result.isKittyProtocol).toBe(true);
  });

  it("parses supplementary unicode codepoint", () => {
    const result = parseKeypress(kittyKey(128_512));
    expect(result.name).toBe("😀");
    expect(result.isKittyProtocol).toBe(true);
  });

  it("parses text-as-codepoints with supplementary unicode", () => {
    const result = parseKeypress(kittyKey(97, 1, 1, [128_512]));
    expect(result.text).toBe("😀");
    expect(result.isKittyProtocol).toBe(true);
  });

  it("text defaults to character from codepoint", () => {
    const result = parseKeypress(kittyKey(97));
    expect(result.text).toBe("a");
    expect(result.isKittyProtocol).toBe(true);
  });
});

describe("kitty protocol parsing — arrow and special keys", () => {
  it("parses arrow keys with event type", () => {
    const up = parseKeypress("\x1b[1;1:1A");
    expect(up.name).toBe("up");
    expect(up.eventType).toBe("press");
    expect(up.isKittyProtocol).toBe(true);

    const down = parseKeypress("\x1b[1;1:3B");
    expect(down.name).toBe("down");
    expect(down.eventType).toBe("release");
    expect(down.isKittyProtocol).toBe(true);

    const right = parseKeypress("\x1b[1;1:2C");
    expect(right.name).toBe("right");
    expect(right.eventType).toBe("repeat");
    expect(right.isKittyProtocol).toBe(true);

    const left = parseKeypress("\x1b[1;1:1D");
    expect(left.name).toBe("left");
    expect(left.eventType).toBe("press");
    expect(left.isKittyProtocol).toBe(true);
  });

  it("parses arrow keys with modifiers", () => {
    const result = parseKeypress("\x1b[1;5:1A");
    expect(result.name).toBe("up");
    expect(result.ctrl).toBe(true);
    expect(result.eventType).toBe("press");
    expect(result.isKittyProtocol).toBe(true);
  });

  it("parses home and end keys", () => {
    const home = parseKeypress("\x1b[1;1:1H");
    expect(home.name).toBe("home");
    expect(home.eventType).toBe("press");
    expect(home.isKittyProtocol).toBe(true);

    const end = parseKeypress("\x1b[1;1:1F");
    expect(end.name).toBe("end");
    expect(end.eventType).toBe("press");
    expect(end.isKittyProtocol).toBe(true);
  });

  it("parses tilde-terminated special keys", () => {
    const del = parseKeypress("\x1b[3;1:1~");
    expect(del.name).toBe("delete");
    expect(del.eventType).toBe("press");
    expect(del.isKittyProtocol).toBe(true);

    const ins = parseKeypress("\x1b[2;1:1~");
    expect(ins.name).toBe("insert");
    expect(ins.isKittyProtocol).toBe(true);

    const pgup = parseKeypress("\x1b[5;1:1~");
    expect(pgup.name).toBe("pageup");
    expect(pgup.isKittyProtocol).toBe(true);

    const f5 = parseKeypress("\x1b[15;1:1~");
    expect(f5.name).toBe("f5");
    expect(f5.isKittyProtocol).toBe(true);
  });

  it("parses tilde keys with modifiers", () => {
    const result = parseKeypress("\x1b[3;2:1~");
    expect(result.name).toBe("delete");
    expect(result.shift).toBe(true);
    expect(result.eventType).toBe("press");
    expect(result.isKittyProtocol).toBe(true);
  });
});

describe("kitty protocol parsing — invalid input", () => {
  it("invalid codepoint above U+10FFFF returns safe empty keypress", () => {
    const result = parseKeypress("\x1b[1114112u");
    expect(result.name).toBe("");
    expect(result.ctrl).toBe(false);
    expect(result.isKittyProtocol).toBe(true);
    expect(result.isPrintable).toBe(false);
  });

  it("surrogate codepoint returns safe empty keypress", () => {
    const result = parseKeypress("\x1b[55296u");
    expect(result.name).toBe("");
    expect(result.ctrl).toBe(false);
    expect(result.isKittyProtocol).toBe(true);
    expect(result.isPrintable).toBe(false);
  });

  it("invalid text codepoint replaced with fallback", () => {
    const result = parseKeypress(kittyKey(97, 1, 1, [1_114_112]));
    expect(result.name).toBe("a");
    expect(result.text).toBe("?");
    expect(result.isKittyProtocol).toBe(true);
  });

  it("malformed modifier 0 does not set all flags", () => {
    const result = parseKeypress("\x1b[97;0u");
    expect(result.name).toBe("a");
    expect(result.ctrl).toBe(false);
    expect(result.shift).toBe(false);
    expect(result.meta).toBe(false);
    expect(result.super ?? false).toBe(false);
    expect(result.isKittyProtocol).toBe(true);
  });
});

describe("kitty protocol parsing — legacy fallback", () => {
  it("non-kitty sequences fall back to legacy parsing", () => {
    const result = parseKeypress("\x1b[A");
    expect(result.name).toBe("up");
    expect(result.isKittyProtocol).toBeUndefined();
  });

  it("non-kitty sequences - ctrl+c", () => {
    const result = parseKeypress("\x03");
    expect(result.name).toBe("c");
    expect(result.ctrl).toBe(true);
    expect(result.isKittyProtocol).toBeUndefined();
  });
});

describe("kitty protocol parsing — isPrintable", () => {
  it("is true for regular characters", () => {
    expect(parseKeypress(kittyKey(97)).isPrintable).toBe(true);
  });

  it("is true for digits", () => {
    expect(parseKeypress(kittyKey(49)).isPrintable).toBe(true);
  });

  it("is true for symbols", () => {
    expect(parseKeypress(kittyKey(64)).isPrintable).toBe(true);
  });

  it("is true for emoji", () => {
    expect(parseKeypress(kittyKey(128_512)).isPrintable).toBe(true);
  });

  it("is false for escape", () => {
    expect(parseKeypress(kittyKey(27)).isPrintable).toBe(false);
  });

  it("is true for return", () => {
    expect(parseKeypress(kittyKey(13)).isPrintable).toBe(true);
  });

  it("is false for tab", () => {
    expect(parseKeypress(kittyKey(9)).isPrintable).toBe(false);
  });

  it("is true for space", () => {
    expect(parseKeypress(kittyKey(32)).isPrintable).toBe(true);
  });

  it("is false for backspace", () => {
    expect(parseKeypress(kittyKey(8)).isPrintable).toBe(false);
  });

  it("is false for ctrl+letter", () => {
    expect(parseKeypress(kittyKey(1, 5)).isPrintable).toBe(false);
  });

  it("is false for special keys (arrows)", () => {
    expect(parseKeypress("\x1b[1;1:1A").isPrintable).toBe(false);
  });

  it("capslock (57358) is non-printable", () => {
    const result = parseKeypress("\x1b[57358u");
    expect(result.name).toBe("capslock");
    expect(result.isPrintable).toBe(false);
    expect(result.isKittyProtocol).toBe(true);
  });

  it("printscreen (57361) is non-printable", () => {
    const result = parseKeypress("\x1b[57361u");
    expect(result.name).toBe("printscreen");
    expect(result.isPrintable).toBe(false);
    expect(result.isKittyProtocol).toBe(true);
  });

  it("f13 (57376) is non-printable", () => {
    const result = parseKeypress("\x1b[57376u");
    expect(result.name).toBe("f13");
    expect(result.isPrintable).toBe(false);
    expect(result.isKittyProtocol).toBe(true);
  });

  it("mediaplay (57428) is non-printable", () => {
    const result = parseKeypress("\x1b[57428u");
    expect(result.name).toBe("mediaplay");
    expect(result.isPrintable).toBe(false);
    expect(result.isKittyProtocol).toBe(true);
  });

  it("leftshift (57441) is non-printable", () => {
    const result = parseKeypress("\x1b[57441u");
    expect(result.name).toBe("leftshift");
    expect(result.isPrintable).toBe(false);
    expect(result.isKittyProtocol).toBe(true);
  });

  it("leftcontrol (57442) is non-printable", () => {
    const result = parseKeypress("\x1b[57442u");
    expect(result.name).toBe("leftcontrol");
    expect(result.isPrintable).toBe(false);
    expect(result.isKittyProtocol).toBe(true);
  });

  it("kp0 (57399) is non-printable", () => {
    const result = parseKeypress("\x1b[57399u");
    expect(result.name).toBe("kp0");
    expect(result.isPrintable).toBe(false);
    expect(result.isKittyProtocol).toBe(true);
  });

  it("scrolllock (57359) is non-printable", () => {
    const result = parseKeypress("\x1b[57359u");
    expect(result.name).toBe("scrolllock");
    expect(result.isPrintable).toBe(false);
    expect(result.isKittyProtocol).toBe(true);
  });

  it("numlock (57360) is non-printable", () => {
    const result = parseKeypress("\x1b[57360u");
    expect(result.name).toBe("numlock");
    expect(result.isPrintable).toBe(false);
    expect(result.isKittyProtocol).toBe(true);
  });

  it("pause (57362) is non-printable", () => {
    const result = parseKeypress("\x1b[57362u");
    expect(result.name).toBe("pause");
    expect(result.isPrintable).toBe(false);
    expect(result.isKittyProtocol).toBe(true);
  });

  it("volume keys are non-printable", () => {
    const lower = parseKeypress("\x1b[57438u");
    expect(lower.name).toBe("lowervolume");
    expect(lower.isPrintable).toBe(false);

    const raise = parseKeypress("\x1b[57439u");
    expect(raise.name).toBe("raisevolume");
    expect(raise.isPrintable).toBe(false);

    const mute = parseKeypress("\x1b[57440u");
    expect(mute.name).toBe("mutevolume");
    expect(mute.isPrintable).toBe(false);
  });
});

describe("kitty protocol parsing — text on return/space", () => {
  it("space key has text field set to space character", () => {
    const result = parseKeypress(kittyKey(32));
    expect(result.text).toBe(" ");
  });

  it("return key has text field set to carriage return", () => {
    const result = parseKeypress(kittyKey(13));
    expect(result.text).toBe("\r");
  });
});
