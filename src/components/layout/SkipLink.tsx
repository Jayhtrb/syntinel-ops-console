import type { ReactNode } from 'react';

/** Keyboard shortcut past the sticky header. Visible only on focus. */
export function SkipLink(): ReactNode {
  return (
    <a className="skip-link" href="#main-content">
      Skip to dashboard content
    </a>
  );
}
