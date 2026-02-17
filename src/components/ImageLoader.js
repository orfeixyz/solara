import React, { useEffect, useState } from "react";
import { imageMap } from "../data/imageMap";

export default function ImageLoader({ src, alt, className = "", ...rest }) {
  const [currentSrc, setCurrentSrc] = useState(src || imageMap.misc.placeholder);

  useEffect(() => {
    setCurrentSrc(src || imageMap.misc.placeholder);
  }, [src]);

  return (
    <img
      src={currentSrc}
      alt={alt}
      className={className}
      onError={() => setCurrentSrc(imageMap.misc.placeholder)}
      {...rest}
    />
  );
}
