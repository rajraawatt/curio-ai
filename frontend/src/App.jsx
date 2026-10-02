import { Lobby } from "./Lobby.jsx";
import { Prepare } from "./Prepare.jsx";
import { Student } from "./Student.jsx";
import { Teacher } from "./Teacher.jsx";

export function App() {
  const path = window.location.pathname;
  if (path.startsWith("/teacher")) return <Teacher />;
  if (path.startsWith("/student")) return <Student />;
  if (path.startsWith("/prepare")) return <Prepare />;
  return <Lobby />;
}
