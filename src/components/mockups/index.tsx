import type { Mockup as MockupKey } from "~/lib/content";
import { DiffMockup } from "./Diff";
import { FormMockup } from "./Form";
import { BrowserMockup } from "./Browser";
import { ScheduleMockup } from "./Schedule";

/**
 * One component per `mockup` key in the content schema. A feature names one
 * in its frontmatter; the detail modal renders it inside the same 16px frame
 * for every feature so the panel doesn't jump. Composed from real
 * design-system components: no screenshots, no image assets.
 */
const MOCKUPS: Record<MockupKey, () => React.JSX.Element> = {
  diff: DiffMockup,
  form: FormMockup,
  browser: BrowserMockup,
  schedule: ScheduleMockup,
};

export function Mockup({ kind }: { kind: MockupKey }) {
  const Component = MOCKUPS[kind];
  return <Component />;
}
