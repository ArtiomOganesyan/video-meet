"use client";

import { useCallback, useEffect, useRef } from "react";
import type { PeerInfo } from "../types";

type PeerVideoProps = Pick<PeerInfo, "peer" | "username" | "stream"> & {
  className?: string;
  videoClassName?: string;
  labelClassName?: string;
};

export default function PeerVideo({
  peer,
  username,
  stream,
  className,
  videoClassName,
  labelClassName,
}: PeerVideoProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const attachStream = useCallback(
    (incomingStream: MediaStream) => {
      if (!videoRef.current) return;

      if (videoRef.current.srcObject === incomingStream) return;
      videoRef.current.srcObject = incomingStream;

      try {
        const playPromise = videoRef.current.play();
        if (playPromise && typeof playPromise.catch === "function") {
          playPromise.catch((err) => {
            console.warn("PeerVideo: play() prevented", { username, err });
          });
        }
      } catch (err) {
        console.warn("PeerVideo: play() threw", { username, err });
      }
    },
    [username]
  );

  useEffect(() => {
    const handleStream = (incomingStream: MediaStream) => {
      attachStream(incomingStream);
    };

    peer.on("stream", handleStream);

    return () => {
      peer.removeListener("stream", handleStream);
    };
  }, [attachStream, peer]);

  useEffect(() => {
    if (stream) {
      attachStream(stream);
    }
  }, [attachStream, stream]);

  return (
    <div className={className}>
      <video ref={videoRef} autoPlay playsInline className={videoClassName} />
      <div className={labelClassName}>{username}</div>
    </div>
  );
}
