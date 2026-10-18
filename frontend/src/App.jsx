import { useEffect, useState } from "react";
import { MockPicker, Studio } from "./studio/Studio.jsx";
import { Analytics } from "./Analytics.jsx";

function usePathname() {
  const [path, setPath] = useState(() => window.location.pathname);
  useEffect(() => {
    const sync = () => setPath(window.location.pathname);
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, []);
  return path;
}

export function App() {
  const path = usePathname();
  if (path === "/analytics" || path.startsWith("/analytics/")) return <Analytics key="analytics" />;
  if (path.startsWith("/studio/mocks")) return <MockPicker key="studio-mocks" />;
  const mockId = path.match(/^\/studio\/mock\/([^/]+)/)?.[1];
  if (mockId) return <Studio key={`studio-mock-${mockId}`} mockId={mockId} />;
  if (path.startsWith("/studio/mock")) return <MockPicker key="studio-mocks" />;
  return <Studio key="studio" />;
}
