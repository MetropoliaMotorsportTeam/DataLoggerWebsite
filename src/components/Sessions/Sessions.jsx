import React, { useState, useEffect, useRef } from 'react';
import { CSVLink } from 'react-csv';
import './Sessions.css';

const Sessions = () => {
  const [columns, setColumns] = useState([]);
  const [data, setData] = useState([]);
  const [editingCell, setEditingCell] = useState(null); // { rowIndex, colKey }
  
  // Ref to focus input when editing starts
  const inputRef = useRef(null);

  useEffect(() => {
    // Load data from localStorage on component mount
    try {
      const savedColumns = localStorage.getItem('sessionColumns');
      const savedData = localStorage.getItem('sessionData');

      if (savedColumns) {
        const parsedColumns = JSON.parse(savedColumns);
        // Ensure startTime is always present and first
        const hasStartTime = parsedColumns.some(c => c.key === 'startTime');
        if (!hasStartTime) {
          setColumns([{ key: 'startTime', name: 'Session start time' }, ...parsedColumns]);
        } else {
          setColumns(parsedColumns);
        }
      } else {
        setColumns([{ key: 'startTime', name: 'Session start time' }]);
      }

      if (savedData) {
        setData(JSON.parse(savedData));
      }
    } catch (e) {
      console.error("Failed to load session data", e);
      // Fallback
      setColumns([{ key: 'startTime', name: 'Session start time' }]);
    }
  }, []);

  useEffect(() => {
    // Save data to localStorage whenever it changes
    localStorage.setItem('sessionColumns', JSON.stringify(columns));
    localStorage.setItem('sessionData', JSON.stringify(data));
  }, [columns, data]);

  useEffect(() => {
    if (editingCell && inputRef.current) {
      inputRef.current.focus();
    }
  }, [editingCell]);

  const handleAddColumn = () => {
    const name = window.prompt("Enter the name for the new parameter:");
    if (!name || name.trim() === "") return;

    const key = name.toLowerCase().trim().replace(/[^a-z0-9]/g, '') + "_" + Date.now(); // Unique key
    
    // Check if column exists (by name, loosely)
    if (columns.some(c => c.name.toLowerCase() === name.toLowerCase())) {
      alert("A parameter with this name already exists.");
      return;
    }

    setColumns([...columns, { key, name: name.trim() }]);
    
    // Add empty values for this new column to all existing rows
    setData(prevData => prevData.map(row => ({
      ...row,
      [key]: ''
    })));
  };

  const handleAddSession = () => {
    const newSession = {};
    columns.forEach(col => {
      if (col.key === 'startTime') {
        newSession[col.key] = new Date().toLocaleString();
      } else {
        newSession[col.key] = '';
      }
    });
    setData([...data, newSession]);
  };

  const handleCellClick = (rowIndex, colKey) => {
    if (colKey === 'startTime') return; // Read-only
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

  const handleBlur = () => {
    setEditingCell(null);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      setEditingCell(null);
    }
  };

  const handleClearData = () => {
    if (window.confirm("Are you sure you want to clear all session data? This cannot be undone.")) {
      setData([]);
    }
  };

  const getCsvData = () => {
    const csvHeaders = columns.map(c => c.name);
    const csvRows = data.map(row => columns.map(c => row[c.key]));
    return [csvHeaders, ...csvRows];
  };

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
              filename={`test-sessions-${new Date().toISOString().split('T')[0]}.csv`}
              className="btn btn-primary"
              style={{ textDecoration: 'none', display: 'inline-block' }}
            >
              Export to CSV
            </CSVLink>
            <button className="btn btn-danger" onClick={handleClearData}>
              Clear Data
            </button>
          </>
        )}
      </div>

      <div className="table-wrapper">
        <table className="sessions-table">
          <thead>
            <tr>
              {columns.map(col => (
                <th key={col.key}>{col.name}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} style={{ textAlign: 'center', padding: '40px', color: '#888' }}>
                  No sessions recorded. Click "Add Session" to start.
                </td>
              </tr>
            ) : (
              data.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  {columns.map(col => {
                    const isEditing = editingCell?.rowIndex === rowIndex && editingCell?.colKey === col.key;
                    const isReadOnly = col.key === 'startTime';
                    
                    return (
                      <td 
                        key={col.key}
                        className={isReadOnly ? 'cell-readonly' : 'cell-editable'}
                        onClick={() => handleCellClick(rowIndex, col.key)}
                      >
                        {isEditing ? (
                          <input
                            ref={inputRef}
                            type="text"
                            value={row[col.key] || ''}
                            onChange={handleCellChange}
                            onBlur={handleBlur}
                            onKeyDown={handleKeyDown}
                            className="cell-input"
                          />
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