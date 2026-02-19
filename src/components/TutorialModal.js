import React from "react";

export default function TutorialModal({ inline = false, onClose }) {
  return (
    <div className={inline ? "panel tutorial-panel" : "modal-backdrop"}>
      <div className={inline ? "" : "modal tutorial-modal"}>
        <h2>Solara Tutorial</h2>
        <ol>
          <li>Goal: complete Helio Core in about 15-25 minutes with cooperative resource management.</li>
          <li>You start with Energy 350, Biomass 300, Water 250.</li>
          <li>Open your island from World Map (only your island is enterable).</li>
          <li>Build and upgrade structures on land cells: Solar Center, Bio Garden, Community Center.</li>
          <li>Each building has production/min and consumption/min. Use the level pager in the build panel to inspect each level before building.</li>
          <li>Efficiency depends on resource balance. Formula: Efficiency = 100 - (Imbalance * 0.5), clamped between 70 and 115.</li>
          <li>Imbalance formula: (|Energy - Biomass| + |Biomass - Water|) / 2.</li>
          <li>Your net production per minute must stay positive in Energy, Water and Biomass to prepare for final activation.</li>
          <li>Click the Helio Core in world view to open contribution controls and donate any amount.</li>
          <li>Win requirements: core totals >= E1200/B1000/W800, at least one Level 3 building, efficiency >= 90, and positive net E/W/B production.</li>
        </ol>
        {!inline && (
          <button type="button" onClick={onClose}>
            Close
          </button>
        )}
      </div>
    </div>
  );
}
