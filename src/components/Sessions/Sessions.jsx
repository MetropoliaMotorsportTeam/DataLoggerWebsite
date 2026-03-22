import React, { useState, useEffect, useRef } from "react";
import { CSVLink } from "react-csv";
import "./Sessions.css";

const API_URL = import.meta.env.VITE_API_BASE;

const Sessions = () => {
  const [columns, setColumns] = useState([
    { key: "startTime", name: "Session start time" },
  ]);
  const [data, setData] = useState([]);
  const [editingCell, setEditingCell] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const inputRef = useRef(null);

  const fetchBoard = async () => {
    try {
      setLoading(true);

      const res = await fetch(`${API_URL}/sessions`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!res.ok) throw new Error("Failed to load sessions");

      const board = await res.json();

      setColumns(
        board.columns?.length
          ? board.columns
          : [{ key: "startTime", name: "Session start time" }],
      );
      setData(board.data || []);
    } catch (err) {
      console.error("Failed to load sessions", err);
    } finally {
      setLoading(false);
    }
  };

  const saveBoard = async (nextColumns, nextData) => {
    try {
      setSaving(true);
      const res = await fetch(API_URL, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          columns: nextColumns,
          data: nextData,
        }),
      });

      if (!res.ok) throw new Error("Failed to save sessions");
    } catch (err) {
      console.error("Failed to save sessions", err);
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    fetchBoard();
  }, []);

  useEffect(() => {
    if (editingCell && inputRef.current) {
      inputRef.current.focus();
    }
  }, [editingCell]);

  const handleAddColumn = async () => {
    const name = window.prompt("Enter the name for the new parameter:");
    if (!name || name.trim() === "") return;

    if (columns.some((c) => c.name.toLowerCase() === name.toLowerCase())) {
      alert("A parameter with this name already exists.");
      return;
    }

    const key =
      name
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]/g, "") +
      "_" +
      Date.now();

    const nextColumns = [...columns, { key, name: name.trim() }];
    const nextData = data.map((row) => ({
      ...row,
      [key]: "",
    }));

    setColumns(nextColumns);
    setData(nextData);
    await saveBoard(nextColumns, nextData);
  };

  const handleAddSession = async () => {
    const newSession = {};

    columns.forEach((col) => {
      if (col.key === "startTime") {
        newSession[col.key] = new Date().toISOString();
      } else {
        newSession[col.key] = "";
      }
    });

    const nextData = [...data, newSession];
    setData(nextData);
    await saveBoard(columns, nextData);
  };

  const handleCellClick = (rowIndex, colKey) => {
    if (colKey === "startTime") return;
    setEditingCell({ rowIndex, colKey });
  };

  const handleCellChange = (e) => {
    if (!editingCell) return;

    const { rowIndex, colKey } = editingCell;
    const value = e.target.value;

    const newData = [...data];
    newData[rowIndex] = { ...newData[rowIndex], [colKey]: value };
    setData(newData);
  };

  const handleBlur = async () => {
    setEditingCell(null);
    await saveBoard(columns, data);
  };

  const handleKeyDown = async (e) => {
    if (e.key === "Enter") {
      setEditingCell(null);
      await saveBoard(columns, data);
    }
  };

  const handleClearData = async () => {
    if (
      window.confirm(
        "Are you sure you want to clear all session data? This cannot be undone.",
      )
    ) {
      setData([]);
      await saveBoard(columns, []);
    }
  };

  const getCsvData = () => {
    const csvHeaders = columns.map((c) => c.name);
    const csvRows = data.map((row) => columns.map((c) => row[c.key]));
    return [csvHeaders, ...csvRows];
  };

  if (loading) {
    return <div className="sessions-container">Loading sessions...</div>;
  }

  return (
    <div className="sessions-container">
      <div className="controls">
        <button className="btn btn-secondary" onClick={handleAddColumn}>
          + Add Parameter (Column)
        </button>

        <button className="btn btn-primary" onClick={handleAddSession}>
          + Add Session (Row)
        </button>

        {data.length > 0 && (
          <>
            <CSVLink
              data={getCsvData()}
              filename={`test-sessions-${new Date().toISOString().split("T")[0]}.csv`}
              className="btn btn-primary"
              style={{ textDecoration: "none", display: "inline-block" }}
            >
              Export to CSV
            </CSVLink>

            <button className="btn btn-danger" onClick={handleClearData}>
              Clear Data
            </button>
          </>
        )}

        {saving && (
          <span style={{ marginLeft: "10px", color: "#888" }}>Saving...</span>
        )}
      </div>

      <div className="table-wrapper">
        <table className="sessions-table">
          <thead>
            <tr>
              {columns.map((col) => (
                <th key={col.key}>{col.name}</th>
              ))}
            </tr>
          </thead>

          <tbody>
            {data.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  style={{
                    textAlign: "center",
                    padding: "40px",
                    color: "#888",
                  }}
                >
                  No sessions recorded. Click "Add Session" to start.
                </td>
              </tr>
            ) : (
              data.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  {columns.map((col) => {
                    const isEditing =
                      editingCell?.rowIndex === rowIndex &&
                      editingCell?.colKey === col.key;

                    const isReadOnly = col.key === "startTime";

                    return (
                      <td
                        key={col.key}
                        className={
                          isReadOnly ? "cell-readonly" : "cell-editable"
                        }
                        onClick={() => handleCellClick(rowIndex, col.key)}
                      >
                        {isEditing ? (
                          <input
                            ref={inputRef}
                            type="text"
                            value={row[col.key] || ""}
                            onChange={handleCellChange}
                            onBlur={handleBlur}
                            onKeyDown={handleKeyDown}
                            className="cell-input"
                          />
                        ) : col.key === "startTime" && row[col.key] ? (
                          new Date(row[col.key]).toLocaleString()
                        ) : (
                          row[col.key]
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Sessions;
