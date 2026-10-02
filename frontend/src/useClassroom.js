import { useCallback, useEffect, useState } from "react";

export function useClassroom() {
  const [state, setState] = useState(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    let source;
    let stopped = false;
    let timer;

    const connect = () => {
      source = new EventSource("/api/events");
      source.onopen = () => setConnected(true);
      source.onmessage = (event) => {
        try {
          setState(JSON.parse(event.data));
        } catch {
          /* ignore a partial frame */
        }
      };
      source.onerror = () => {
        setConnected(false);
        source.close();
        if (!stopped) timer = setTimeout(connect, 1200);
      };
    };

    connect();
    return () => {
      stopped = true;
      clearTimeout(timer);
      source?.close();
    };
  }, []);

  const send = useCallback(async (path, body) => {
    const response = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body || {}),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "Request failed");
    return data;
  }, []);

  return { state, connected, send };
}
