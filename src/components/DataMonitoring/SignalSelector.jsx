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
        className="flex items-center justify-between w-full px-4 py-2 text-sm text-gray-100 bg-gray-800/60 border border-gray-700 rounded-md"
      >
        <span className="truncate">
          {selectedSignals.length > 0
            ? `${selectedSignals.length} selected`
            : "Select signals"}
        </span>

        <span className="ml-2 text-gray-400">▾</span>
      </button>

      {/* DROPDOWN */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-2 bg-gray-900 border border-gray-700 rounded-md shadow-xl overflow-hidden">

          {/* SEARCH + RESET */}
          <div className="p-2 border-b border-gray-700 space-y-2">

            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search signals..."
              className="w-full px-3 py-2 text-sm bg-gray-800 text-white rounded outline-none"
            />

            <div className="flex justify-between items-center text-xs text-gray-400">

              <span>
                {selectedSignals.length} selected
              </span>

              <button
                onClick={handleResetAll}
                className="text-red-400 hover:text-red-300"
              >
                Reset all
              </button>

            </div>
          </div>

          {/* LIST */}
          <ul className="max-h-64 overflow-y-auto">

            {filtered.length === 0 && (
              <li className="p-3 text-sm text-gray-500 text-center">
                No signals found
              </li>
            )}

            {filtered.map((signal) => {
              const checked = selectedSignals.includes(signal);

              return (
                <li
                  key={signal}
                  onClick={() => toggleSignal(signal)}
                  className="flex items-center gap-3 px-4 h-10 text-sm text-gray-200 hover:bg-blue-600 cursor-pointer select-none"
                >
                  <div className="flex items-center justify-center w-4 h-4">
                    <input
                      type="checkbox"
                      checked={checked}
                      readOnly
                      className="w-4 h-4 accent-blue-500 shrink-0"
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