import React from "react";

export default function TutorialModal({ inline = false, onClose }) {
  return (
    <div className={inline ? "panel tutorial-panel" : "modal-backdrop"}>
      <div className={inline ? "" : "modal tutorial-modal"}>
        <h2>Solara Tutorial</h2>
        <ol>
          <li>Goal: complete Helio Core in about 15-25 minutes through cooperative resource production.</li>
          <li>You start with Energy 350, Biomass 300, Water 250.</li>
          <li>Open your island from World Map (only your island is enterable).</li>
          <li>Build and upgrade structures on land cells: Solar Center, Bio Garden, Community Center.</li>
          <li>Each building has production/min and consumption/min. Use the level pager in the build panel to inspect each level before building.</li>
          <li>Community Center is now a positive net building at all levels for stable growth.</li>
          <li>Click the Helio Core in world view to open contribution controls and donate any amount.</li>
          <li>Win condition: core totals must reach E1200 / B1000 / W800.</li>
          <li>After winning, active players can vote to restart the game together.</li>
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
