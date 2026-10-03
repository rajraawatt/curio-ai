import { useEffect, useState } from "react";
import { Lobby } from "./Lobby.jsx";
import { Prepare } from "./Prepare.jsx";
import { Student } from "./Student.jsx";
import { Teacher } from "./Teacher.jsx";

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
  if (path.startsWith("/teacher")) return <Teacher />;
  if (path.startsWith("/student")) return <Student />;
  if (path.startsWith("/prepare")) return <Prepare />;
  return <Lobby />;
}
