import React, { useState, useEffect, useRef } from "react";
import { CSVLink } from "react-csv";
import "./Sessions.css";
import { getApiBase, getAuthHeaders, handleUnauthorized } from '../../utils/api';
import { useUnsavedChanges } from "../../hooks/useUnsavedChanges";

const API_URL = getApiBase();

const defaultColumns = [
  { key: "user", name: "User who made it" },
  { key: "startTime", name: "Session start time" },
  { key: "name", name: "Name of session" },
  { key: "description", name: "Details"},
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
  const [unsavedChanges, setUnsavedChanges] = useState(false); 

  const inputRef = useRef(null);

  useUnsavedChanges(unsavedChanges);

  const fetchBoard = async () => {
    try {
      setLoading(true);

      const res = await fetch(`${API_URL}/sessions/file?key=sessions.csv`, {
        method: "GET",
        headers: getAuthHeaders(),
      });

      if (res.status === 401) {
        handleUnauthorized(res);
        return;
      }

      if (!res.ok) throw new Error("Failed to load sessions");
      
      const board = {
        columns:[],
        data:{},
      };
      const csvText = await res.text();
      const rows = parseCSV(csvText);

      rows[0].map((rowName) => {
        let key = "";
        switch(rowName){
          case "User who made it":key="user";break;
          case "Session start time":key="startTime";break;
          case "Name of session":key="name";break;
          case "Details":key="description";break;
          default:{// create a simple key from the name
            const baseKey = rowName.replace(/\s+/g, "_").replace(/[^a-zA-Z0-9_]/g, "").toLowerCase();
            key = baseKey || `col_${Date.now()}`;
            // ensure unique key
            let suffix = 1;
            const existingKeys = new Set(columns.map((c) => c.key));
            while (existingKeys.has(key)) {
              key = `${baseKey}_${suffix}`;
              suffix += 1;
            }
            break;
          }
        }
        board.columns.push({key:key, name:rowName})
      })

      board.data = rows.slice(1).map(row => {                                        
        const obj = {};                                                              
        board.columns.forEach((col, i) => {                                          
          obj[col.key] = row[i]; // optionally convert types here        
        });                                                                          
        return obj;                                                                  
      });      
      // initialize columns from server if provided, otherwise use defaults
      const initialColumns = board.columns && board.columns.length ? board.columns : defaultColumns;
      setColumns(initialColumns);

      const normalizedData = (board.data || []).map((row) => ({
        ...row,
        startTime: row.startTime || new Date().toISOString(),
        user: row.user || "",
        name: row.name || "",
        description: row.description || "",
      }));
      setData(normalizedData);

      await saveBoard(initialColumns, normalizedData);
    } catch (err) {
      console.error("Failed to load sessions", err);
    } finally {
      setLoading(false);
    }
  };

  const createCSVFile = (nextColumns, nextData, filename = 'sessions.csv') => {
    const columns = nextColumns.map((column) => 
      column.name || "",
    );
    const keys = nextColumns.map((column) => 
      column.key || "",
    );
    const keysRow = columns.join(',');
    const dataRows = nextData.map(row => 
      keys.map(col => {
        const cellValue = row[col] !== undefined && row[col] !== null ? String(row[col]) : '';
        if (cellValue.includes(',') || cellValue.includes('"') || cellValue.includes('\n')) {
          return `"${cellValue.replace(/"/g, '""')}"`;
        }
        return cellValue;
      }).join(',')
    );
    // 3. Combine into a raw string
    const csvContent = [keysRow, ...dataRows].join('\n');
    // 4. Return a File object
    return new File([csvContent], filename, { type: 'text/csv' });
  }

  function parseCSV(text) {                                                      
    const rows = [];                                                             
    let row = [];                                                                
    let field = '';                                                              
    let inQuotes = false;                                                        
                                                                                
    for (let i = 0; i < text.length; i++) {                                      
      const char = text[i];                                                      
      const next = text[i + 1];                                                  
                                                                                
      if (inQuotes) {                                                            
        if (char === '"' && next === '"') { field += '"'; i++; } // escaped ""   
        else if (char === '"') inQuotes = false;                                 
        else field += char;                                                      
      } else {                                                                   
        if (char === '"') inQuotes = true;                                       
        else if (char === ',') { row.push(field); field = ''; }                  
        else if (char === '\n' || char === '\r') {                               
          if (char === '\r' && next === '\n') i++; // skip \r\n                  
          row.push(field);                                                       
          rows.push(row);                                                        
          row = []; field = '';                                                  
        } else field += char;                                                    
      }                                                                          
    }                                                                            
    if (field !== '' || row.length > 0) { row.push(field); rows.push(row); }     
    return rows;                                                                 
  }      

  const saveBoard = async (nextColumns, nextData) => {
  try {
    setSaving(true);
    const file = createCSVFile(nextColumns, nextData);
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch(`${API_URL}/sessions`, {
      method: "PUT",
      headers: getAuthHeaders(),
      body: formData,
    });

    if (!res.ok) throw new Error("Failed to save sessions");
  } catch (err) {
    console.error("Failed to save sessions", err);
  } finally {
    setSaving(false);
    setUnsavedChanges(false);
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
    setUnsavedChanges(true);
    // await saveBoard(columns, nextData);
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
    setUnsavedChanges(true);

    // await saveBoard(nextColumns, nextData);
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
    setUnsavedChanges(true);
    // await saveBoard(nextColumns, nextData);
  };

  const handleDeleteSession = async (rowIndex) => {
    if (!window.confirm("Are you sure you want to delete this session?")) return;

    const nextData = data.filter((_, i) => i !== rowIndex);
    setData(nextData);
    setEditingCell(null);
    setDeleteSessionModal({ open: false });
    setUnsavedChanges(true);
    // await saveBoard(columns, nextData);
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
      console.log(data);
      console.log(columns);
      // await saveBoard(columns, newData);
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
    setUnsavedChanges(true);
    // await saveBoard(columns, data);
  };

  const handleKeyDown = async (e) => {
    if (e.key === "Enter") {
      setEditingCell(null);
      setUnsavedChanges(true);
      // await saveBoard(columns, data);
    }
  };

  const handleSaveData = async () => {
    if (
      window.confirm(
        "Are you sure you want to overwrite session data? This cannot be undone.",
      )
    ) {
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
    return <div className="sessions-container" style={{ color: 'var(--text-primary)' }}>Loading sessions...</div>;
  }

  return (
    <div className="sessions-container" style={{ fontFamily: "'Roboto Mono', monospace", color: 'var(--text-primary)', backgroundColor: 'var(--background-base)' }}>
      <div className="controls" style={{ backgroundColor: 'var(--surface-layer)', borderBottom: '1px solid var(--primary-accent)', padding: '1rem' }}>
        <div className="controls-left">
          <button className="btn btn-primary" onClick={handleAddSession} style={{ backgroundColor: 'var(--primary-accent)', color: 'var(--background-base)' }}>
            + Add Session
          </button>

          <button
            className="btn btn-primary"
            onClick={handleAddColumn}
            style={{ marginLeft: "8px", backgroundColor: 'var(--primary-accent)', color: 'var(--background-base)' }}
          >
            + Add Column
          </button>

          {data.length > 0 && (
            <>
              <button
                className="btn btn-warning"
                onClick={() => setDeleteModal({ open: true })}
                style={{ marginLeft: "8px", backgroundColor: 'var(--warning-attention)', color: 'var(--background-base)' }}
              >
                - Delete Column
              </button>
              <button
                className="btn btn-danger"
                onClick={() => setDeleteSessionModal({ open: true })}
                style={{ marginLeft: "8px", backgroundColor: 'var(--warning-attention)', color: 'var(--background-base)' }}
              >
                - Delete Session
              </button>
            </>
          )}
        </div>

        <div className="controls-right">
          {data.length > 0 && (
            <button className="btn btn-danger" onClick={handleClearData} style={{ backgroundColor: 'var(--warning-attention)', color: 'var(--background-base)' }}>
              Clear Data
            </button>
          )}

          {data.length > 0 && (
            <button className="btn btn-primary" onClick={handleSaveData} style={{ marginLeft: "8px", backgroundColor: 'var(--surface-layer)', color: 'var(--text-primary)', border: '1px solid var(--primary-accent)'  }}>
              Save Data
            </button>
          )}

          <CSVLink
            data={getCsvData()}
            filename={"sessions.csv"}
            className="btn btn-secondary"
            style={{ marginLeft: "8px", backgroundColor: 'var(--surface-layer)', color: 'var(--text-primary)', border: '1px solid var(--primary-accent)' }}
          >
            Export CSV
          </CSVLink>

          {saving && (
            <span style={{ marginLeft: "10px", color: 'var(--text-secondary)' }}>Saving...</span>
          )}
        </div>
      </div>

      {descriptionModal.open && (
        <div className="description-modal-backdrop">
          <div className="description-modal" style={{ backgroundColor: 'var(--surface-layer)', border: '1px solid var(--primary-accent)', color: 'var(--text-primary)' }}>
            <h3>Session Description</h3>
            {!descriptionEditing ? (
              <>
                <div className="description-view" style={{ backgroundColor: 'var(--background-base)', border: '1px solid var(--primary-accent)', padding: '1rem', marginBottom: '1rem' }}>
                  {modalDescription ? modalDescription : "No description yet."}
                </div>
                <div
                  style={{ display: "flex", justifyContent: "space-between" }}
                >
                  <button
                    className="btn btn-secondary"
                    onClick={() => closeDescription(false)}
                    style={{ backgroundColor: 'var(--surface-layer)', color: 'var(--text-primary)', border: '1px solid var(--primary-accent)' }}
                  >
                    Close
                  </button>
                  <button
                    className="btn btn-primary"
                    onClick={() => setDescriptionEditing(true)}
                    style={{ backgroundColor: 'var(--primary-accent)', color: 'var(--background-base)' }}
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
                  style={{ width: "100%", marginBottom: "12px", backgroundColor: 'var(--background-base)', color: 'var(--text-primary)', border: '1px solid var(--primary-accent)' }}
                />
                <div style={{ textAlign: "right" }}>
                  <button
                    className="btn btn-secondary"
                    onClick={() => setDescriptionEditing(false)}
                    style={{ marginRight: "8px", backgroundColor: 'var(--surface-layer)', color: 'var(--text-primary)', border: '1px solid var(--primary-accent)' }}
                  >
                    Cancel
                  </button>
                  <button
                    className="btn btn-primary"
                    onClick={() => closeDescription(true)}
                    style={{ backgroundColor: 'var(--primary-accent)', color: 'var(--background-base)' }}
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
          <div className="description-modal" style={{ backgroundColor: 'var(--surface-layer)', border: '1px solid var(--primary-accent)', color: 'var(--text-primary)' }}>
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
                        borderBottom: '1px solid var(--primary-accent)',
                      }}
                    >
                      <div>
                        <strong>{i + 1}.</strong>&nbsp;{col.name}
                      </div>
                      <div>
                        <button
                          className="btn btn-danger"
                          onClick={() => handleDeleteColumn(col.key)}
                          style={{ backgroundColor: 'var(--warning-attention)', color: 'var(--background-base)' }}
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
                style={{ backgroundColor: 'var(--surface-layer)', color: 'var(--text-primary)', border: '1px solid var(--primary-accent)' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteSessionModal.open && (
        <div className="description-modal-backdrop">
          <div className="description-modal" style={{ backgroundColor: 'var(--surface-layer)', border: '1px solid var(--primary-accent)', color: 'var(--text-primary)' }}>
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
                        borderBottom: '1px solid var(--primary-accent)',
                      }}
                    >
                      <div style={{ color: "#ffffff" }}>
                        <strong>{i + 1}.</strong>&nbsp;{row.name || "(no name)"}{" "}
                        — {row.user || "(no user)"}
                      </div>
                      <div>
                        <button
                          className="btn btn-danger"
                          onClick={() => handleDeleteSession(i)}
                          style={{ backgroundColor: 'var(--warning-attention)', color: 'var(--background-base)' }}
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
                style={{ backgroundColor: 'var(--surface-layer)', color: 'var(--text-primary)', border: '1px solid var(--primary-accent)' }}
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
            <tr style={{ borderBottom: '2px solid var(--primary-accent)' }}>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={col.key === "name" ? "col-name" : undefined}
                  style={{ color: 'var(--text-secondary)' }}
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
                    color: 'var(--text-secondary)',
                  }}
                >
                  No sessions recorded. Click "Add Session" to start.
                </td>
              </tr>
            ) : (
              data.map((row, rowIndex) => (
                <tr key={rowIndex} style={{ borderBottom: '1px solid var(--surface-layer)' }}>
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
                        style={{ backgroundColor: 'var(--surface-layer)', color: 'var(--text-primary)' }}
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
                            style={{ backgroundColor: 'var(--background-base)', color: 'var(--text-primary)', border: '1px solid var(--primary-accent)' }}
                          />
                        ) : col.key === "startTime" && row[col.key] ? (
                          new Date(row[col.key]).toLocaleString()
                        ) : col.key === "name" ? (
                          <div className="session-name-cell">
                            <span>{row.name || "(no name)"}</span>
                            {/* <button
                              className="btn btn-secondary btn-details"
                              onClick={(e) => {
                                e.stopPropagation();
                                openDescription(rowIndex);
                              }}
                              style={{ backgroundColor: 'var(--background-base)', color: 'var(--text-primary)', border: '1px solid var(--primary-accent)' }}
                            >
                              Details
                            </button> */}
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
