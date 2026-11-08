import { useState } from "react";
import { Button } from "../ui/base/button";

export function VideoSoundControl({
  mediaRef
}: {
  mediaRef: { current: HTMLMediaElement };
}) {
  const [muted, setMuted] = useState(false);
  return (
    <Button
      variant="outline"
      className="h-11"
      aria-pressed={muted}
      onClick={() => {
        mediaRef.current.muted = !mediaRef.current.muted;
        setMuted(mediaRef.current.muted);
      }}
    >
      {muted ? "Unmute" : "Mute"}
    </Button>
  );
}
