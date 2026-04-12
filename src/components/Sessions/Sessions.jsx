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
  const [columns, setColumns] = useState(defaultColumns);
  const [data, setData] = useState([]);
  const [editingCell, setEditingCell] = useState(null);
  const [descriptionModal, setDescriptionModal] = useState({ open: false, rowIndex: null });
  const [descriptionEditing, setDescriptionEditing] = useState(false);
  const [modalDescription, setModalDescription] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleteModal, setDeleteModal] = useState({ open: false });
  const [deleteSessionModal, setDeleteSessionModal] = useState({ open: false });

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

      // initialize columns from server if provided, otherwise use defaults
      const initialColumns = board.columns && board.columns.length ? board.columns : defaultColumns;

      // swap startTime and user positions
      const swappedColumns = [...initialColumns];
      const iStart = swappedColumns.findIndex((c) => c.key === "startTime");
      const iUser = swappedColumns.findIndex((c) => c.key === "user");
      if (iStart !== -1 && iUser !== -1) {
        [swappedColumns[iStart], swappedColumns[iUser]] = [swappedColumns[iUser], swappedColumns[iStart]];
      }

      setColumns(swappedColumns);

      const normalizedData = (board.data || []).map((row) => ({
        ...row,
        startTime: row.startTime || new Date().toISOString(),
        user: row.user || "",
        name: row.name || "",
        description: row.description || "",
      }));

      setData(normalizedData);

      // persist swapped column order back to server so UI and backend match
      await saveBoard(swappedColumns, normalizedData);
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

  const handleAddColumn = async () => {
    const name = window.prompt("Enter new column name:");
    if (!name) return;

    const trimmed = name.toString().trim();
    if (!trimmed) {
      alert("Column name cannot be empty.");
      return;
    }

    // create a simple key from the name
    const baseKey = trimmed.replace(/\s+/g, "_").replace(/[^a-zA-Z0-9_]/g, "").toLowerCase();
    let key = baseKey || `col_${Date.now()}`;
    // ensure unique key
    let suffix = 1;
    const existingKeys = new Set(columns.map((c) => c.key));
    while (existingKeys.has(key)) {
      key = `${baseKey}_${suffix}`;
      suffix += 1;
    }

    const nextColumns = [...columns, { key, name: trimmed }];
    // add empty value for existing rows
    const nextData = data.map((row) => ({ ...row, [key]: "" }));

    setColumns(nextColumns);
    setData(nextData);

    await saveBoard(nextColumns, nextData);
  };

  const handleDeleteColumn = async (colKey) => {
    if (!window.confirm("Are you sure you want to delete this column?")) return;

    const nextColumns = columns.filter((c) => c.key !== colKey);
    const nextData = data.map((row) => {
      const newRow = { ...row };
      delete newRow[colKey];
      return newRow;
    });

    setColumns(nextColumns);
    setData(nextData);
    setEditingCell(null);
    setDeleteModal({ open: false });
    await saveBoard(nextColumns, nextData);
  };

  const handleDeleteSession = async (rowIndex) => {
    if (!window.confirm("Are you sure you want to delete this session?")) return;

    const nextData = data.filter((_, i) => i !== rowIndex);
    setData(nextData);
    setEditingCell(null);
    setDeleteSessionModal({ open: false });
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
    const csvHeaders = columns.map((c) => `${c.name}`);
    const csvRows = data.map((row) => columns.map((c) => row[c.key]));
    return [csvHeaders, ...csvRows];
  };

  if (loading) {
    return <div className="sessions-container">Loading sessions...</div>;
  }

  return (
    <div className="sessions-container">
      <div className="controls">
        <div className="controls-left">
          <button className="btn btn-primary" onClick={handleAddSession}>
            + Add Session
          </button>

          <button
            className="btn btn-primary"
            onClick={handleAddColumn}
            style={{ marginLeft: "8px" }}
          >
            + Add Column
          </button>

          {data.length > 0 && (
            <>
              <button
                className="btn btn-warning"
                onClick={() => setDeleteModal({ open: true })}
                style={{ marginLeft: "8px" }}
              >
                - Delete Column
              </button>
              <button
                className="btn btn-danger"
                onClick={() => setDeleteSessionModal({ open: true })}
                style={{ marginLeft: "8px" }}
              >
                - Delete Session
              </button>
            </>
          )}
        </div>

        <div className="controls-right">
          {data.length > 0 && (
            <button className="btn btn-danger" onClick={handleClearData}>
              Clear Data
            </button>
          )}

          <CSVLink
            data={getCsvData()}
            filename={"sessions.csv"}
            className="btn btn-secondary"
            style={{ marginLeft: "8px" }}
          >
            Export CSV
          </CSVLink>

          {saving && (
            <span style={{ marginLeft: "10px", color: "#888" }}>Saving...</span>
          )}
        </div>
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
                <div
                  style={{ display: "flex", justifyContent: "space-between" }}
                >
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

      {deleteModal.open && (
        <div className="description-modal-backdrop">
          <div className="description-modal">
            <h3>Delete Column</h3>
            {columns.length === 0 ? (
              <div>No columns available.</div>
            ) : (
              <div style={{ maxHeight: 300, overflowY: "auto" }}>
                <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                  {columns.map((col, i) => (
                    <li
                      key={col.key}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "6px 0",
                        borderBottom: "1px solid #eee",
                      }}
                    >
                      <div>
                        <strong>{i + 1}.</strong>&nbsp;{col.name}
                      </div>
                      <div>
                        <button
                          className="btn btn-danger"
                          onClick={() => handleDeleteColumn(col.key)}
                        >
                          Delete
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div style={{ textAlign: "right", marginTop: 12 }}>
              <button
                className="btn btn-secondary"
                onClick={() => setDeleteModal({ open: false })}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteSessionModal.open && (
        <div className="description-modal-backdrop">
          <div className="description-modal">
            <h3>Delete Session</h3>
            {data.length === 0 ? (
              <div>No sessions available.</div>
            ) : (
              <div style={{ maxHeight: 300, overflowY: "auto" }}>
                <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                  {data.map((row, i) => (
                    <li
                      key={i}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "6px 0",
                        borderBottom: "1px solid #eee",
                      }}
                    >
                      <div>
                        <strong>{i + 1}.</strong>&nbsp;{row.name || "(no name)"}{" "}
                        — {row.user || "(no user)"}
                      </div>
                      <div>
                        <button
                          className="btn btn-danger"
                          onClick={() => handleDeleteSession(i)}
                        >
                          Delete
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div style={{ textAlign: "right", marginTop: 12 }}>
              <button
                className="btn btn-secondary"
                onClick={() => setDeleteSessionModal({ open: false })}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="table-wrapper">
        <table className="sessions-table">
          <thead>
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={col.key === "name" ? "col-name" : undefined}
                >
                  {col.name}
                </th>
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
                        className={`${isReadOnly ? "cell-readonly" : "cell-editable"} ${col.key === "name" ? "col-name" : ""}`}
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
