import { Lobby } from "./Lobby.jsx";
import { Student } from "./Student.jsx";
import { Teacher } from "./Teacher.jsx";

export function App() {
  const path = window.location.pathname;
  if (path.startsWith("/teacher")) return <Teacher />;
  if (path.startsWith("/student")) return <Student />;
  return <Lobby />;
}
