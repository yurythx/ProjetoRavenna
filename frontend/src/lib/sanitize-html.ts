import DOMPurify from "isomorphic-dompurify";

const ALLOWED_TAGS = [
  "a",
  "p",
  "br",
  "strong",
  "b",
  "em",
  "i",
  "u",
  "s",
  "blockquote",
  "ul",
  "ol",
  "li",
  "h1",
  "h2",
  "h3",
  "pre",
  "code",
  "hr",
  "span",
  "div",
  "img",
];

const ALLOWED_ATTR = ["href", "title", "target", "rel", "src", "alt", "width", "height", "style", "class"];

export function sanitizeRichTextHtml(value: string) {
  const html = value ?? "";
  return DOMPurify.sanitize(html, { ALLOWED_TAGS, ALLOWED_ATTR });
}

