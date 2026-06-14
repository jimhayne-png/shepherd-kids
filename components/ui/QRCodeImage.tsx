"use client";

import { useEffect, useRef } from "react";
import QRCode from "qrcode";

interface QRCodeImageProps {
  value: string;
  size?: number;
}

export default function QRCodeImage({ value, size = 64 }: QRCodeImageProps) {
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    let active = true;
    QRCode.toDataURL(value, { width: 300, margin: 1, errorCorrectionLevel: "M" })
      .then((url) => {
        if (active && imgRef.current) imgRef.current.src = url;
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [value]);

  return <img ref={imgRef} alt="" style={{ width: size, height: size, display: "block" }} />;
}
