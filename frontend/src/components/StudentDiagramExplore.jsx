import { useEffect, useState } from "react";
import { AssetViewer, StillViewer } from "./AssetViewer.jsx";
import { readResponseJson } from "../safeJson.js";

export function StudentDiagramExplore() {
  const [pack, setPack] = useState(null);
  const [pick, setPick] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/prepare/assets")
      .then(async (res) => {
        const data = await readResponseJson(res);
        if (!res.ok) throw new Error(data.error || `Could not load assets (${res.status})`);
        return data;
      })
      .then((data) => {
        if (!data.pack?.assets?.length) throw new Error("No lesson models yet.");
        setPack(data.pack);
        setPick(data.pack.assets[0]?.id || null);
      })
      .catch((err) => setError(err.message));
  }, []);

  if (error) {
    return <p className="student-diagram-note">{error}</p>;
  }
  if (!pack) {
    return <p className="student-diagram-note">Loading labeled diagrams…</p>;
  }

  const asset = pack.assets.find((a) => a.id === pick) || pack.assets[0];
  const stillUrl = asset?.sourceImageUrl || asset?.previewUrl;

  return (
    <section className="student-diagram">
      <header>
        <h2>Labeled diagrams</h2>
        <p>Rotate and zoom the 3D model—tap pins for body parts and science facts from the lesson.</p>
      </header>
      <div className="student-diagram-tabs">
        {pack.assets.map((a) => (
          <button key={a.id} type="button" className={a.id === asset.id ? "on" : ""} onClick={() => setPick(a.id)}>
            {a.label}
          </button>
        ))}
      </div>
      {stillUrl && <StillViewer stillUrl={stillUrl} label={asset.label} labels={asset.labels} />}
      {(asset.glbUrl || asset.mesh) && (
        <AssetViewer
          mesh={asset.mesh}
          label={asset.label}
          glbUrl={asset.glbUrl}
          labels={asset.labels}
          stillUrl={stillUrl}
          assetId={asset.id}
          imagePrompt={asset.imagePrompt}
        />
      )}
    </section>
  );
}
