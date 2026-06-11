import { ReactNode } from "react";
import LeftSidebar from "./LeftSidebar";
import RightSidebar from "./RightSidebar";

interface DesktopShellProps {
  children: ReactNode;
  /** Hide right sidebar on this page (e.g. messages full-width) */
  hideRightRail?: boolean;
}

/**
 * Adaptive 3-column shell.
 * - <lg (mobile/tablet): renders children as-is; existing mobile Navbar handles nav.
 * - lg+ (desktop): fixed left sidebar + centered content.
 * - xl+: adds right discovery rail.
 * Pages opting in should wrap their main content in this shell.
 */
const DesktopShell = ({ children, hideRightRail = false }: DesktopShellProps) => {
  return (
    <>
      <LeftSidebar />
      {!hideRightRail && <RightSidebar />}
      <div
        className={`lg:pl-64 xl:pl-72 ${
          hideRightRail ? "" : "xl:pr-80"
        } transition-[padding] duration-200`}
      >
        {children}
      </div>
    </>
  );
};

export default DesktopShell;