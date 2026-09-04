import { marked } from "marked";

/**
 * The feature description, markdown to HTML. Two paragraphs by convention:
 * what the problem is, then a note on scope or current state. The prose
 * styles (src/styles/roadmap.css, .detail__desc) set the second paragraph in
 * the secondary ink, so the convention is visible rather than enforced.
 *
 * Authors are maintainers writing in the CMS, so raw HTML is left alone
 * rather than sanitised: the same trust the rest of the repository extends.
 */
export function renderMarkdown(md: string): string {
  return marked.parse(md, { async: false, gfm: true, breaks: false }) as string;
}
