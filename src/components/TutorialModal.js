import React from "react";

export default function TutorialModal({ inline = false, onClose }) {
  return (
    <div className={inline ? "panel tutorial-panel" : "modal-backdrop"}>
      <div className={inline ? "" : "modal tutorial-modal"}>
        <h2>Solara Tutorial</h2>
        <ol>
          <li>Open your island from World Map (green-highlighted island).</li>
          <li>Click green cells to construct buildings. Red cells are blocked terrain.</li>
          <li>Use Building Modal to inspect production, consumption and upgrade costs.</li>
          <li>Monitor efficiency and imbalance in the Resource Panel.</li>
          <li>Use chat to coordinate with other players in real time.</li>
          <li>Adjust time multiplier (x1/x2/x5) for production pacing tests.</li>
        </ol>
        <p>
          Development note: Update this component to add onboarding steps for future systems
          like research, diplomacy or trade routes.
        </p>
        {!inline && (
          <button type="button" onClick={onClose}>
            Close
          </button>
        )}
      </div>
    </div>
  );
}
