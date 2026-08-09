import { marked } from "marked";
import sanitizeHtml from "sanitize-html";

marked.setOptions({
  gfm: true,
  breaks: true,
});

const allowedTags = sanitizeHtml.defaults.allowedTags.concat([
  "img",
  "del",
  "ins",
  "input",
  "sup",
  "sub",
  "code",
  "pre",
  "blockquote",
  "hr",
  "table",
  "thead",
  "tbody",
  "tr",
  "th",
  "td",
]);

const allowedAttributes: Record<string, string[]> = {
  ...sanitizeHtml.defaults.allowedAttributes,
  a: ["href", "title", "target", "rel", "class"],
  img: ["src", "alt", "title", "width", "height"],
  code: ["class"],
  input: ["type", "checked", "disabled"],
};

export function renderCommentMarkdown(content: string): string {
  const raw = marked.parse(content, { async: false }) as string;
  return sanitizeHtml(raw, {
    allowedTags,
    allowedAttributes,
    allowedSchemes: ["http", "https", "mailto"],
    transformTags: {
      a: sanitizeHtml.simpleTransform("a", {
        target: "_blank",
        rel: "noopener noreferrer nofollow ugc",
      }),
    },
  });
}

export function stripMarkdown(content: string): string {
  return renderCommentMarkdown(content)
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
