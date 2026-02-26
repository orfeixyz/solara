import React, { useEffect, useMemo, useState } from "react";
import { getBuildingLevelData } from "../data/buildings";
import { imageMap } from "../data/imageMap";

const SVG_W = 1024;
const SVG_H = 1024;
const SVG_SRC = "/images/layout-island.svg";

const CELL_ZONE_OFFSETS = {
  "0-0": { x: -30, y: -42 },
  "1-0": { x: -18, y: -48 },
  "2-0": { x: 0, y: -50 },
  "3-0": { x: 18, y: -48 },
  "4-0": { x: 30, y: -42 },

  "0-1": { x: -42, y: -18 },
  "1-1": { x: -20, y: -20 },
  "2-1": { x: 0, y: -20 },
  "3-1": { x: 20, y: -20 },
  "4-1": { x: 42, y: -18 },

  "0-2": { x: -50, y: 0 },
  "1-2": { x: -24, y: 0 },
  "2-2": { x: 0, y: 0 },
  "3-2": { x: 24, y: 0 },
  "4-2": { x: 50, y: 0 },

  "0-3": { x: -42, y: 18 },
  "1-3": { x: -20, y: 20 },
  "2-3": { x: 0, y: 20 },
  "3-3": { x: 20, y: 20 },
  "4-3": { x: 42, y: 18 },

  "0-4": { x: -30, y: 42 },
  "1-4": { x: -18, y: 48 },
  "2-4": { x: 0, y: 50 },
  "3-4": { x: 18, y: 48 },
  "4-4": { x: 30, y: 42 }
};

function getCellKey(cell) {
  return cell.id || `${cell.x}-${cell.y}`;
}

function getOpaqueCandidates(imageData, width, height) {
  const data = imageData.data;
  const candidates = [];
  let minX = width;
  let minY = height;
  let maxX = 0;
  let maxY = 0;

  for (let y = 0; y < height; y += 4) {
    for (let x = 0; x < width; x += 4) {
      const alpha = data[(y * width + x) * 4 + 3];
      if (alpha > 16) {
        candidates.push({ x, y });
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (!candidates.length) {
    return {
      candidates: [],
      bounds: { minX: 0, minY: 0, maxX: width, maxY: height }
    };
  }

  return {
    candidates,
    bounds: { minX, minY, maxX, maxY }
  };
}

function nearestCandidate(target, candidates, usedIndexes) {
  let best = -1;
  let bestDistance = Number.POSITIVE_INFINITY;

  for (let i = 0; i < candidates.length; i += 1) {
    if (usedIndexes.has(i)) {
      continue;
    }
    const candidate = candidates[i];
    const dx = candidate.x - target.x;
    const dy = candidate.y - target.y;
    const distance = dx * dx + dy * dy;
    if (distance < bestDistance) {
      bestDistance = distance;
      best = i;
    }
  }

  return best;
}

function getGridBounds(cells) {
  if (!cells.length) {
    return { minX: 0, maxX: 0, minY: 0, maxY: 0, cols: 1, rows: 1 };
  }

  let minX = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;

  cells.forEach((cell) => {
    if (cell.x < minX) minX = cell.x;
    if (cell.x > maxX) maxX = cell.x;
    if (cell.y < minY) minY = cell.y;
    if (cell.y > maxY) maxY = cell.y;
  });

  return {
    minX,
    maxX,
    minY,
    maxY,
    cols: maxX - minX + 1,
    rows: maxY - minY + 1
  };
}

function getTargetForCell(cell, gridBounds, maskBounds) {
  const spanX = Math.max(1, maskBounds.maxX - maskBounds.minX);
  const spanY = Math.max(1, maskBounds.maxY - maskBounds.minY);
  const padX = spanX * 0.18;
  const padY = spanY * 0.2;
  const usableX = Math.max(1, spanX - padX * 2);
  const usableY = Math.max(1, spanY - padY * 2);

  const nx = (cell.x - gridBounds.minX + 0.5) / gridBounds.cols;
  const ny = (cell.y - gridBounds.minY + 0.5) / gridBounds.rows;

  const key = getCellKey(cell);
  const calibratedOffset = CELL_ZONE_OFFSETS[key] || { x: 0, y: 0 };

  return {
    x: maskBounds.minX + padX + nx * usableX + calibratedOffset.x,
    y: maskBounds.minY + padY + ny * usableY + calibratedOffset.y
  };
}

function buildSlotMapFromSvgMask(imageData, width, height, cells) {
  const { candidates, bounds } = getOpaqueCandidates(imageData, width, height);
  if (!candidates.length || !cells.length) {
    return {};
  }

  const usedIndexes = new Set();
  const sortedCells = [...cells].sort((a, b) => a.y - b.y || a.x - b.x);
  const gridBounds = getGridBounds(sortedCells);
  const slotMap = {};

  sortedCells.forEach((cell) => {
    const target = getTargetForCell(cell, gridBounds, bounds);
    const index = nearestCandidate(target, candidates, usedIndexes);
    if (index >= 0) {
      usedIndexes.add(index);
      slotMap[getCellKey(cell)] = candidates[index];
    }
  });

  return slotMap;
}

function slotPolygon(cx, cy, size) {
  return [
    `${cx},${cy - size}`,
    `${cx + size},${cy}`,
    `${cx},${cy + size}`,
    `${cx - size},${cy}`
  ].join(" ");
}

function BuildingSprite({ cell, slot, onSelectCell }) {
  if (!cell.buildingId) {
    return null;
  }

  const currentLevel = Math.max(1, Math.min(cell.level || 1, 3));
  const building = getBuildingLevelData(cell.buildingId, currentLevel);
  if (!building) {
    return null;
  }

  const { x, y } = slot;
  const size = 136;

  return (
    <g className="iso-building-group" onClick={() => onSelectCell(cell)}>
      <image
        href={building.image}
        x={x - size / 2}
        y={y - size + 30}
        width={size}
        height={size}
        preserveAspectRatio="xMidYMid meet"
        className="iso-building-image"
      />
      <text x={x} y={y + 38} textAnchor="middle" className="iso-building-level">
        Lv {currentLevel}
      </text>
    </g>
  );
}

function BuildFlag({ cell, slot, onSelectCell }) {
  const size = 56;
  const flagW = 112;
  const flagH = 112;

  return (
    <g className="iso-flag-slot" onClick={() => onSelectCell(cell)}>
      <polygon points={slotPolygon(slot.x, slot.y, size)} className="iso-hit-area" />
      <image
        href={imageMap.misc.flag}
        x={slot.x - flagW / 2}
        y={slot.y - flagH + 28}
        width={flagW}
        height={flagH}
        preserveAspectRatio="xMidYMid meet"
        className="iso-flag-image"
      />
    </g>
  );
}

export default function IslandGrid({ island, onSelectCell, onReadyStateChange }) {
  const cells = useMemo(() => island?.grid || [], [island]);
  const [slotMap, setSlotMap] = useState({});

  useEffect(() => {
    let cancelled = false;

    async function loadSlots() {
      onReadyStateChange?.(false);

      if (!cells.length) {
        setSlotMap({});
        onReadyStateChange?.(true);
        return;
      }

      const image = new Image();
      image.src = SVG_SRC;
      await new Promise((resolve, reject) => {
        image.onload = resolve;
        image.onerror = reject;
      });

      if (cancelled) {
        return;
      }

      const canvas = document.createElement("canvas");
      canvas.width = SVG_W;
      canvas.height = SVG_H;
      const context = canvas.getContext("2d");
      if (!context) {
        setSlotMap({});
        onReadyStateChange?.(true);
        return;
      }

      context.clearRect(0, 0, SVG_W, SVG_H);
      context.drawImage(image, 0, 0, SVG_W, SVG_H);
      const imageData = context.getImageData(0, 0, SVG_W, SVG_H);
      const nextSlotMap = buildSlotMapFromSvgMask(imageData, SVG_W, SVG_H, cells);

      if (!cancelled) {
        setSlotMap(nextSlotMap);
        onReadyStateChange?.(true);
      }
    }

    loadSlots().catch(() => {
      if (!cancelled) {
        setSlotMap({});
        onReadyStateChange?.(true);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [cells, onReadyStateChange]);

  return (
    <section className="panel island-grid-panel">
      <div className="iso-board-wrap">
        <svg viewBox={`0 0 ${SVG_W} ${SVG_H}`} className="iso-board-svg" role="img" aria-label="Island build grid">
          <image
            href={SVG_SRC}
            x="0"
            y="0"
            width={SVG_W}
            height={SVG_H}
            preserveAspectRatio="xMidYMid meet"
          />

          <g className="iso-grid-layer">
            {cells.map((cell) => {
              const slot = slotMap[getCellKey(cell)];
              if (!slot) {
                return null;
              }

              const blocked = cell.type !== "land";
              const occupied = Boolean(cell.buildingId);
              if (blocked || occupied) {
                return null;
              }

              return <BuildFlag key={`f-${getCellKey(cell)}`} cell={cell} slot={slot} onSelectCell={onSelectCell} />;
            })}
          </g>

          <g className="iso-buildings-layer">
            {cells.filter((cell) => cell.buildingId).map((cell) => {
              const slot = slotMap[getCellKey(cell)];
              if (!slot) {
                return null;
              }
              return <BuildingSprite key={`b-${getCellKey(cell)}`} cell={cell} slot={slot} onSelectCell={onSelectCell} />;
            })}
          </g>
        </svg>
      </div>
    </section>
  );
}
