import { exitPreviewRoute } from "@gogitcms/preview-astro";

export const prerender = false;

// Leave preview mode: clears the parked cookie and lands on the board, so
// "back to the published site" is one link rather than a cookie-clearing chore.
const exit = exitPreviewRoute();

export function GET() {
  return exit();
}
