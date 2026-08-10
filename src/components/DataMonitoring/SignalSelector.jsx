import React, { useState, useRef, useEffect } from "react";
import './DataMonitoring.css';

export function SignalSelector({
  signals,
  selectedSignals,
  toggleSignal,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const wrapperRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () =>
      document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filtered = signals.filter((s) =>
    s.toLowerCase().includes(search.toLowerCase())
  );

  const handleResetAll = (e) => {
    e.stopPropagation(); // prevents dropdown toggle
    selectedSignals.forEach((s) => toggleSignal(s));
    setSearch("");
    setIsOpen(false);
  };

  return (
    <div ref={wrapperRef} className="relative w-full sm:w-72 font-mono">
      <button
        onClick={() => setIsOpen((v) => !v)}
        className="signal-selector-button"
      >
        <span className="truncate">
          {selectedSignals.length > 0 ? `${selectedSignals.length} selected` : 'Select signals'}
        </span>
        <span className="signal-selector-chevron">▾</span>
      </button>

      {isOpen && (
        <div className="signal-selector-dropdown">
          <div className="signal-selector-header">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search signals..."
              className="signal-selector-input"
            />

            <div className="signal-selector-toolbar">
              <span>{selectedSignals.length} selected</span>
              <button onClick={handleResetAll} className="signal-selector-reset">
                Reset all
              </button>
            </div>
          </div>

          <ul className="signal-selector-list custom-scrollbar">
            {filtered.length === 0 && (
              <li className="signal-selector-empty">No signals found</li>
            )}

            {filtered.map((signal) => {
              const checked = selectedSignals.includes(signal);

              return (
                <li
                  key={signal}
                  onClick={() => toggleSignal(signal)}
                  className={`signal-selector-item ${checked ? 'selected' : ''}`}
                >
                  <div className="signal-selector-checkbox">
                    <input type="checkbox" checked={checked} readOnly className="signal-selector-checkbox-input" />
                  </div>
                  <span className="truncate">{signal}</span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}