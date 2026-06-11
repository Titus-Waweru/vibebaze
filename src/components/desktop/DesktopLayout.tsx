import { Outlet } from "react-router-dom";
import DesktopShell from "./DesktopShell";

interface DesktopLayoutProps {
  hideRightRail?: boolean;
}

/**
 * Route-level layout that adds the desktop sidebars to every nested route.
 * Mobile UI is untouched because DesktopShell sidebars are `lg:` only.
 */
const DesktopLayout = ({ hideRightRail = false }: DesktopLayoutProps) => (
  <DesktopShell hideRightRail={hideRightRail}>
    <Outlet />
  </DesktopShell>
);

export default DesktopLayout;