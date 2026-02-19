import React from "react";
import ImageLoader from "./ImageLoader";
import useAnimatedNumber from "../hooks/useAnimatedNumber";
import { imageMap } from "../data/imageMap";

function ResourceItem({ label, value, production, icon, highlight }) {
  const animatedValue = useAnimatedNumber(value || 0);
  const animatedProduction = useAnimatedNumber(production || 0);

  return (
    <div className={`resource-item ${highlight ? "pulse" : ""}`}>
      <ImageLoader src={icon} alt={label} className="resource-icon" />
      <div>
        <strong>{label}</strong>
        <p>{animatedValue} total</p>
        <small>+{animatedProduction}/min</small>
      </div>
    </div>
  );
}

export default function ResourcePanel({ resources }) {
  const totals = resources?.totals || {};
  const production = resources?.productionPerMinute || resources?.productionPerHour || {};
  const efficiency = resources?.efficiency ?? 100;
  const imbalance = resources?.imbalance ?? 0;

  return (
    <section className="resource-panel">
      <div className="resource-grid">
        <ResourceItem
          label="Energy"
          value={totals.energy}
          production={production.energy}
          icon={imageMap.resources.energy}
          highlight={(production.energy || 0) < 0}
        />
        <ResourceItem
          label="Water"
          value={totals.water}
          production={production.water}
          icon={imageMap.resources.water}
          highlight={(production.water || 0) < 0}
        />
        <ResourceItem
          label="Biomass"
          value={totals.biomass}
          production={production.biomass}
          icon={imageMap.resources.biomass}
          highlight={(production.biomass || 0) < 0}
        />
      </div>

      <div className="resource-metrics">
        <div className="metric">
          <span>Efficiency</span>
          <strong className={efficiency >= 80 ? "ok" : "warn"}>{efficiency}%</strong>
        </div>
        <div className="metric">
          <span>Imbalance</span>
          <strong className={imbalance <= 0 ? "ok" : "warn"}>{imbalance}</strong>
        </div>
      </div>
    </section>
  );
}
