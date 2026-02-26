import React, { useEffect, useState } from "react";
import { imageMap } from "../data/imageMap";
import { isAssetCached } from "../utils/assetLoader";

export default function ImageLoader({
  src,
  alt,
  className = "",
  priority = false,
  lazy = true,
  ...rest
}) {
  const fallback = imageMap.misc.placeholder;
  const targetSrc = src || fallback;
  const [currentSrc, setCurrentSrc] = useState(targetSrc);

  useEffect(() => {
    setCurrentSrc(targetSrc);
  }, [targetSrc]);

  return (
    <img
      src={currentSrc}
      alt={alt}
      className={className}
      loading={priority ? "eager" : lazy ? "lazy" : "eager"}
      decoding="async"
      fetchPriority={priority ? "high" : "auto"}
      onError={() => setCurrentSrc(fallback)}
      data-cached={isAssetCached(targetSrc) ? "1" : "0"}
      {...rest}
    />
  );
}
