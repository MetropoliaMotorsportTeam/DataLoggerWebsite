import React, { useState, useEffect, useRef } from "react";
import { CSVLink } from "react-csv";
import "./Sessions.css";

const API_URL = import.meta.env.VITE_API_BASE;

const defaultColumns = [
  { key: "startTime", name: "Session start time" },
  { key: "user", name: "User who made it" },
  { key: "name", name: "Name of session" },
];

const Sessions = () => {
  const [columns] = useState(defaultColumns);
  const [data, setData] = useState([]);
  const [editingCell, setEditingCell] = useState(null);
  const [descriptionModal, setDescriptionModal] = useState({ open: false, rowIndex: null });
  const [descriptionEditing, setDescriptionEditing] = useState(false);
  const [modalDescription, setModalDescription] = useState("");
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

      setData(
        (board.data || []).map((row) => ({
          startTime: row.startTime || new Date().toISOString(),
          user: row.user || "",
          name: row.name || "",
          description: row.description || "",
        })),
      );
    } catch (err) {
      console.error("Failed to load sessions", err);
    } finally {
      setLoading(false);
    }
  };

  const saveBoard = async (nextColumns, nextData) => {
  try {
    setSaving(true);
    const res = await fetch(`${API_URL}/sessions`, {
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

  const isValidSession = (session) => {
    return Boolean(
      session.user && session.user.toString().trim() !== "" &&
      session.name && session.name.toString().trim() !== ""
    );
  };

  const handleAddSession = async () => {
    if (data.some((row) => !isValidSession(row))) {
      alert("Please fill User and Name of session for all existing sessions before adding a new one.");
      return;
    }

    const newSession = {
      startTime: new Date().toISOString(),
      user: "",
      name: "",
      description: "",
    };

    const nextData = [...data, newSession];
    setData(nextData);
    await saveBoard(columns, nextData);
  };

  const openDescription = (rowIndex) => {
    setDescriptionModal({ open: true, rowIndex });
    setModalDescription(data[rowIndex]?.description || "");
    setDescriptionEditing(false);
  };

  const closeDescription = async (save = false) => {
    if (save && descriptionModal.rowIndex !== null && descriptionEditing) {
      const newData = [...data];
      newData[descriptionModal.rowIndex] = {
        ...newData[descriptionModal.rowIndex],
        description: modalDescription,
      };
      setData(newData);
      await saveBoard(columns, newData);
      // stay in view mode, keep modal open
      setDescriptionEditing(false);
      return;
    }

    setDescriptionModal({ open: false, rowIndex: null });
    setDescriptionEditing(false);
    setModalDescription("");
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
    if (editingCell && data[editingCell.rowIndex]) {
      if (!isValidSession(data[editingCell.rowIndex])) {
        alert("Session must contain both User and Name values.");
      }
    }
    setEditingCell(null);
    await saveBoard(columns, data);
  };

  const handleKeyDown = async (e) => {
    if (e.key === "Enter") {
      if (editingCell && data[editingCell.rowIndex]) {
        if (!isValidSession(data[editingCell.rowIndex])) {
          alert("Session must contain both User and Name values.");
        }
      }
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
        <button className="btn btn-primary" onClick={handleAddSession}>
          + Add Session
        </button>

        {data.length > 0 && (
          <>
            <button className="btn btn-danger" onClick={handleClearData}>
              Clear Data
            </button>
          </>
        )}

        {saving && (
          <span style={{ marginLeft: "10px", color: "#888" }}>Saving...</span>
        )}
      </div>

      {descriptionModal.open && (
        <div className="description-modal-backdrop">
          <div className="description-modal">
            <h3>Session Description</h3>
            {!descriptionEditing ? (
              <>
                <div className="description-view">
                  {modalDescription ? modalDescription : "No description yet."}
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <button
                    className="btn btn-secondary"
                    onClick={() => closeDescription(false)}
                  >
                    Close
                  </button>
                  <button
                    className="btn btn-primary"
                    onClick={() => setDescriptionEditing(true)}
                  >
                    Edit
                  </button>
                </div>
              </>
            ) : (
              <>
                <textarea
                  value={modalDescription}
                  onChange={(e) => setModalDescription(e.target.value)}
                  rows={12}
                  style={{ width: "100%", marginBottom: "12px" }}
                />
                <div style={{ textAlign: "right" }}>
                  <button
                    className="btn btn-secondary"
                    onClick={() => setDescriptionEditing(false)}
                    style={{ marginRight: "8px" }}
                  >
                    Cancel
                  </button>
                  <button
                    className="btn btn-primary"
                    onClick={() => closeDescription(true)}
                  >
                    Save
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

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
                        onDoubleClick={() => {
                          if (col.key !== "startTime") {
                            setEditingCell({ rowIndex, colKey: col.key });
                          }
                        }}
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
                        ) : col.key === "name" ? (
                          <div className="session-name-cell">
                            <span>{row.name || "(no name)"}</span>
                            <button
                              className="btn btn-secondary btn-details"
                              onClick={(e) => {
                                e.stopPropagation();
                                openDescription(rowIndex);
                              }}
                            >
                              Details
                            </button>
                          </div>
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
