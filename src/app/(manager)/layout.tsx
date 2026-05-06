/**
 * (manager) layout — minimal pass-through.
 *
 * After the v9.0 delete pass dropped the orphan Sidebar/Topbar
 * components, this layout no longer needs to do anything except
 * render its children. The /check-in/[id] route owns its own
 * header + back link.
 */

export default function ManagerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
