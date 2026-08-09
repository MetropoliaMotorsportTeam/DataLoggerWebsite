import React, { useState, useRef, useEffect } from "react";

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
    <div ref={wrapperRef} className="relative w-72 font-mono">

      {/* BUTTON */}
      <button
        onClick={() => setIsOpen((v) => !v)}
        style={{
          backgroundColor: 'var(--surface-layer)',
          border: '1px solid var(--primary-accent)',
          color: 'var(--text-primary)',
        }}
        className="flex items-center justify-between w-full px-4 py-2 text-sm rounded-md"
      >
        <span className="truncate">
          {selectedSignals.length > 0
            ? `${selectedSignals.length} selected`
            : "Select signals"}
        </span>

        <span className="ml-2" style={{ color: 'var(--primary-accent)' }}>▾</span>
      </button>

      {/* DROPDOWN */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-2 rounded-md shadow-xl overflow-hidden" style={{ backgroundColor: 'var(--surface-layer)', border: '1px solid var(--primary-accent)' }}>

          {/* SEARCH + RESET */}
          <div className="p-2 border-b space-y-2" style={{ borderColor: 'var(--primary-accent)' }}>

            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search signals..."
              style={{
                backgroundColor: 'var(--background-base)',
                color: 'var(--text-primary)',
                border: '1px solid var(--primary-accent)',
              }}
              className="w-full px-3 py-2 text-sm rounded outline-none"
            />

            <div className="flex justify-between items-center text-xs" style={{ color: 'var(--text-secondary)' }}>

              <span>
                {selectedSignals.length} selected
              </span>

              <button
                onClick={handleResetAll}
                style={{ color: 'var(--primary-accent)' }}
                className="hover:opacity-80"
              >
                Reset all
              </button>

            </div>
          </div>

          {/* LIST */}
          <ul className="max-h-64 overflow-y-auto">

            {filtered.length === 0 && (
              <li className="p-3 text-sm text-center" style={{ color: 'var(--text-secondary)' }}>
                No signals found
              </li>
            )}

            {filtered.map((signal) => {
              const checked = selectedSignals.includes(signal);

              return (
                <li
                  key={signal}
                  onClick={() => toggleSignal(signal)}
                  className="flex items-center gap-3 px-4 h-10 text-sm cursor-pointer select-none"
                  style={{ color: 'var(--text-primary)', backgroundColor: checked ? 'rgba(200, 255, 0, 0.12)' : 'transparent' }}
                >
                  <div className="flex items-center justify-center w-4 h-4">
                    <input
                      type="checkbox"
                      checked={checked}
                      readOnly
                      style={{ accentColor: 'var(--primary-accent)' }}
                      className="w-4 h-4 shrink-0"
                    />
                  </div>

                  <span className="truncate leading-none">
                    {signal}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}