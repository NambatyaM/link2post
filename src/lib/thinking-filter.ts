const THINK_OPEN = "think";
const THINK_CLOSE = "think";

function indexOfTag(buf: string, tag: string, closing: boolean): number {
  const prefix = closing ? "</" : "<";
  return buf.indexOf(prefix + tag + ">");
}

function tagEndOffset(tag: string): number {
  return ("</" + tag + ">").length;
}

export function stripThinkingTags(text: string): string {
  const open = "<" + THINK_OPEN + ">";
  const close = "</" + THINK_OPEN + ">";
  const regex = new RegExp(open.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "[\\s\\S]*?" + close.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g");
  return text.replace(regex, "").trim();
}

export function createThinkingFilter() {
  let buffer = "";
  let inThinking = false;

  return function filter(content: string): string {
    buffer += content;

    while (true) {
      if (inThinking) {
        const endIdx = indexOfTag(buffer, THINK_CLOSE, true);
        if (endIdx === -1) {
          buffer = "";
          return "";
        }
        buffer = buffer.slice(endIdx + tagEndOffset(THINK_CLOSE));
        inThinking = false;
      } else {
        const startIdx = indexOfTag(buffer, THINK_OPEN, false);
        if (startIdx === -1) {
          const safe = buffer;
          buffer = "";
          return safe;
        }
        const before = buffer.slice(0, startIdx);
        buffer = buffer.slice(startIdx);
        inThinking = true;
        return before;
      }
    }
  };
}
