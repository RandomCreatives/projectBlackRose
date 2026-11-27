import ScrollEffects from "@/components/ScrollEffects";

/**
 * Chrome for the public site only: the pointer light, the grain and the warm washes.
 * The admin panel lives outside this group so none of it leaks into a work screen.
 */
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="site">
      <a className="skip" href="#room">
        Skip to content
      </a>
      <div id="glow" aria-hidden="true" />
      {children}
      <ScrollEffects />
    </div>
  );
}
