import React, { useEffect, useMemo, useRef, useState } from "react";
import "./packinglist.css";
import ListsPanel from "./ListsPanel";
import CurrentListPanel from "./CurrentListPanel";

// ---------------------------
// CSV helpers (same logic as HTML)
// ---------------------------
function csvEscape(value) {
  if (value === null || value === undefined) return "";
  const s = String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

const API_URL = import.meta.env.VITE_API_BASE || "/api";

function getAuthHeaders(extra = {}) {
  const token = sessionStorage.getItem("token");
  return {
    ...extra,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

function parseCsvLine(line) {
  const out = [];
  let i = 0,
    cur = "",
    inQuotes = false;
  while (i < line.length) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i++;
        continue;
      }
      cur += ch;
      i++;
      continue;
    } else {
      if (ch === '"') {
        inQuotes = true;
        i++;
        continue;
      }
      if (ch === ",") {
        out.push(cur);
        cur = "";
        i++;
        continue;
      }
      cur += ch;
      i++;
      continue;
    }
  }
  out.push(cur);
  return out;
}

function splitLines(text) {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .filter((l) => l.trim().length > 0);
}

function todayISO() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function defaultListName() {
  return `packing_list_${todayISO()}`;
}

// ---------------------------
// DB serialize/deserialize
// ---------------------------
function parsePackingCsv(csvText, listId = 1) {
  const lines = splitLines(csvText);
  if (!lines.length) {
    return {
      structures: [
        {
          id: 1,
          sections: [],
          columns: [
            "packed",
            "item",
            "section",
            "quantity",
            "location",
            "notes",
          ],
        },
      ],
      items: [],
      nextId: 1,
    };
  }

  const header = parseCsvLine(lines[0]).map((h) =>
    (h || "").trim().toLowerCase(),
  );

  const findIndex = (...names) => {
    for (const name of names) {
      const idx = header.indexOf(name);
      if (idx >= 0) return idx;
    }
    return -1;
  };

  const iPacked = findIndex("packed?", "packed");
  const iItem = findIndex("item");
  const iSection = findIndex("section");
  const iQty = findIndex("quantity", "qty");
  const iLocation = findIndex("location");
  const iNotes = findIndex("notes", "note");

  if (iItem < 0) {
    throw new Error('CSV must contain an "Item" column');
  }

  const items = [];
  let nextId = 1;

  for (let r = 1; r < lines.length; r++) {
    const cols = parseCsvLine(lines[r]);

    const item = (cols[iItem] || "").trim();
    if (!item) continue;

    const packedRaw =
      iPacked >= 0 ? (cols[iPacked] || "").trim().toLowerCase() : "";
    const packed =
      packedRaw === "yes" ||
      packedRaw === "true" ||
      packedRaw === "1" ||
      packedRaw === "y";

    items.push({
      id: nextId++,
      listId,
      packed,
      item,
      section: iSection >= 0 ? (cols[iSection] || "").trim() : "",
      quantity: iQty >= 0 ? Number(cols[iQty] || 0) || 0 : 0,
      location: iLocation >= 0 ? (cols[iLocation] || "").trim() : "",
      notes: iNotes >= 0 ? (cols[iNotes] || "").trim() : "",
    });
  }

  const sections = Array.from(
    new Set(items.map((it) => it.section).filter(Boolean)),
  );

  return {
    structures: [
      {
        id: 1,
        sections,
        columns: ["packed", "item", "section", "quantity", "location", "notes"],
      },
    ],
    items,
    nextId,
  };
}

function buildPackingCsv(items) {
  const headers = [
    "Packed?",
    "Item",
    "Section",
    "Quantity",
    "Location",
    "Notes",
  ];

  const rows = items.map((it) => [
    it.packed ? "YES" : "NO",
    it.item || "",
    it.section || "",
    it.quantity ?? "",
    it.location || "",
    it.notes || "",
  ]);

  return [headers, ...rows]
    .map((row) => row.map(csvEscape).join(","))
    .join("\n");
}

function columnLabel(c) {
  const map = {
    packed: "Packed?",
    item: "Item",
    section: "Section",
    quantity: "Quantity",
    location: "Location",
    notes: "Notes",
  };
  return map[c] || c;
}

export default function Packinglist() {
  const [db, setDbState] = useState({
    structures: [],
    lists: [],
    items: [],
    nextId: 1,
  });
  const dbRef = useRef(db);
  const setDb = (updater) => {
    const nextDb =
      typeof updater === "function" ? updater(dbRef.current) : updater;
    dbRef.current = nextDb;
    setDbState(nextDb);
  };

  const [loadingLists, setLoadingLists] = useState(false);
  // true when the current list has local changes that are not on the server yet
  const [dirty, setDirty] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loadingCurrentList, setLoadingCurrentList] = useState(false);
  const listLoadRequestRef = useRef(0);
  const listSaveQueuesRef = useRef(new Map());

  const [ui, setUi] = useState({
    currentListId: null,
    modalItem: false,
    modalListName: false,
    listNameMode: "new", // "new" | "rename"
    listNameDraft: "",
  });

  const [csvInputKey, setCsvInputKey] = useState(0);

  const saveListToServer = async (list, itemsToSave) => {
    if (!list?.key) throw new Error("No file key for current list");

    const csvText = buildPackingCsv(itemsToSave);

    const file = new File([csvText], list.key, { type: "text/csv" });
    const formData = new FormData();
    formData.append("file", file);
    formData.append("key", list.key);

    const previousSave = listSaveQueuesRef.current.get(list.key);
    const saveRequest = (previousSave || Promise.resolve())
      .catch(() => {})
      .then(async () => {
        const res = await fetch(`${API_URL}/packinglist/upload`, {
          method: "POST",
          headers: getAuthHeaders(),
          body: formData,
        });

        if (!res.ok) {
          throw new Error("Failed to save list to server");
        }
      });

    listSaveQueuesRef.current.set(list.key, saveRequest);
    try {
      await saveRequest;
    } finally {
      if (listSaveQueuesRef.current.get(list.key) === saveRequest) {
        listSaveQueuesRef.current.delete(list.key);
      }
    }
  };

  // ensure current list
  useEffect(() => {
    if (ui.currentListId && db.lists.some((l) => l.id === ui.currentListId))
      return;
    const last = [...db.lists].sort((a, b) =>
      a.created > b.created ? -1 : 1,
    )[0];
    setUi((p) => ({ ...p, currentListId: last?.id ?? null }));
  }, [db.lists, ui.currentListId]);

  // persist db

  useEffect(() => {
    setDb((prev) => {
      const seen = new Set();
      let changed = false;
      let nextId = prev.nextId;

      const items = prev.items.map((it) => {
        if (!seen.has(it.id)) {
          seen.add(it.id);
          return it;
        }
        // duplicate found -> assign new id
        changed = true;
        const newIt = { ...it, id: nextId++ };
        seen.add(newIt.id);
        return newIt;
      });

      if (!changed && nextId === prev.nextId) return prev;

      return { ...prev, items, nextId };
    });
  }, []);

  const fetchAvailableLists = async () => {
    setLoadingLists(true);
    try {
      const res = await fetch(`${API_URL}/packinglist`, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error("Failed to load lists");

      const data = await res.json();

      const serverLists = await Promise.all(
        (data.items || []).map(async (file) => {
          let itemCount = null;

          try {
            const fileRes = await fetch(
              `${API_URL}/packinglist/file?key=${encodeURIComponent(file.key)}`,
              { headers: getAuthHeaders() },
            );
            if (!fileRes.ok)
              throw new Error("Failed to load list for item count");
            const csvText = await fileRes.text();
            const parsed = parsePackingCsv(csvText, file.key);
            itemCount = parsed.items.length;
          } catch (err) {
            console.error("Failed counting items for", file.key, err);
          }

          return {
            id: file.key,
            name: file.key.replace(/\.csv$/i, ""),
            created: file.lastModified || new Date().toISOString(),
            structureId: 1,
            key: file.key,
            itemCount,
          };
        }),
      );

      setDb((prev) => ({
        ...prev,
        lists: serverLists,
        structures: prev.structures.length
          ? prev.structures
          : [
              {
                id: 1,
                sections: [],
                columns: [
                  "packed",
                  "item",
                  "section",
                  "quantity",
                  "location",
                  "notes",
                ],
              },
            ],
      }));
    } catch (err) {
      console.error(err);
      alert("Could not load packing lists from server.");
    } finally {
      setLoadingLists(false);
    }
  };

  const fetchListContent = async (fileKey, listId) => {
    const requestId = ++listLoadRequestRef.current;
    setLoadingCurrentList(true);
    try {
      const res = await fetch(
        `${API_URL}/packinglist/file?key=${encodeURIComponent(fileKey)}`,
        { headers: getAuthHeaders() },
      );
      if (!res.ok) throw new Error("Failed to load CSV");

      const csvText = await res.text();
      const parsed = parsePackingCsv(csvText, listId);

      if (requestId !== listLoadRequestRef.current) return;

      setDirty(false);
      setDb((prev) => ({
        ...prev,
        items: parsed.items,
        structures: parsed.structures,
        nextId: parsed.nextId,
        lists: prev.lists.map((l) =>
          l.id === listId ? { ...l, itemCount: parsed.items.length } : l,
        ),
      }));
    } catch (err) {
      if (requestId !== listLoadRequestRef.current) return;
      console.error(err);
      alert("Could not load selected list.");
    } finally {
      if (requestId === listLoadRequestRef.current) {
        setLoadingCurrentList(false);
      }
    }
  };

  const currentList = useMemo(
    () => db.lists.find((l) => l.id === ui.currentListId) || null,
    [db.lists, ui.currentListId],
  );

  useEffect(() => {
    if (!currentList) {
      listLoadRequestRef.current += 1;
      setLoadingCurrentList(false);
      return;
    }

    fetchListContent(currentList.key, currentList.id);
  }, [currentList?.id, currentList?.key]);

  // -------- actions --------
  const createNewList = async (name) => {
    if (!confirmDiscardChanges()) return;
    const cleanName = (name || "").trim() || defaultListName();
    const requestedKey = cleanName.toLowerCase().endsWith(".csv")
      ? cleanName
      : `${cleanName}.csv`;
    const sanitizedKey = requestedKey
      .split(/[\\/]/)
      .pop()
      .replace(/[^a-z0-9._-]+/gi, "_")
      .replace(/^[_\s.-]+/, "")
      .replace(/[_\s.-]+$/, "");
    const baseKey = sanitizedKey.toLowerCase().endsWith(".csv")
      ? sanitizedKey
      : `${sanitizedKey || "file"}.csv`;
    const existingKeys = new Set(
      dbRef.current.lists.map((list) => list.key.toLowerCase()),
    );
    const extensionIndex = baseKey.toLowerCase().lastIndexOf(".csv");
    const baseName = baseKey.slice(0, extensionIndex);
    let fileKey = baseKey;
    let suffix = 2;
    while (existingKeys.has(fileKey.toLowerCase())) {
      fileKey = `${baseName}-${suffix++}.csv`;
    }

    const csvText = buildPackingCsv([]);

    const file = new File([csvText], fileKey, { type: "text/csv" });
    const formData = new FormData();
    formData.append("file", file);
    formData.append("key", fileKey);

    try {
      const res = await fetch(`${API_URL}/packinglist/upload`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: formData,
      });

      if (!res.ok) throw new Error("Failed to create new list");

      await fetchAvailableLists();

      setUi((p) => ({
        ...p,
        currentListId: fileKey,
        modalListName: false,
        listNameDraft: "",
      }));
    } catch (err) {
      console.error(err);
      alert("Failed to create list on server.");
    }
  };

  const renameCurrentList = (name) => {
    if (!currentList) return;
    const nextName = (name || "").trim();
    if (!nextName) return;

    setDb((p) => ({
      ...p,
      lists: p.lists.map((x) =>
        x.id === currentList.id ? { ...x, name: nextName } : x,
      ),
    }));

    setUi((p) => ({
      ...p,
      modalListName: false,
      listNameDraft: "",
    }));
  };

  const setItemCount = (lists, listId, items) =>
    lists.map((l) =>
      l.id === listId
        ? { ...l, itemCount: items.filter((it) => it.listId === listId).length }
        : l,
    );

  // The edit actions below only change the frontend state. Nothing is sent to
  // the backend until the user presses "Submit" (see submitChanges).
  const togglePacked = (itemId) => {
    const nextItems = dbRef.current.items.map((it) =>
      it.id === itemId ? { ...it, packed: !it.packed } : it,
    );
    setDb((p) => ({ ...p, items: nextItems }));
    setDirty(true);
  };

  const addItem = ({ packed, item, section, quantity, location, notes }) => {
    if (!currentList) {
      alert("No list selected!");
      return;
    }

    const newItem = {
      id: dbRef.current.nextId,
      listId: currentList.id,
      packed: !!packed,
      item: item || "",
      section: section || "",
      quantity: Number(quantity) || 0,
      location: location || "",
      notes: notes || "",
    };

    const nextItems = [...dbRef.current.items, newItem];

    setDb((prev) => ({
      ...prev,
      items: nextItems,
      nextId: prev.nextId + 1,
      lists: setItemCount(prev.lists, currentList.id, nextItems),
    }));
    setDirty(true);
    setUi((p) => ({ ...p, modalItem: false }));
  };

  const updateItem = (itemId, patch) => {
    const nextItems = dbRef.current.items.map((it) =>
      it.id === itemId ? { ...it, ...patch } : it,
    );
    setDb((p) => ({ ...p, items: nextItems }));
    setDirty(true);
  };

  const markAllShownPacked = (shownItems) => {
    const ids = new Set(shownItems.map((x) => x.id));
    const nextItems = dbRef.current.items.map((it) =>
      ids.has(it.id) ? { ...it, packed: true } : it,
    );
    setDb((p) => ({ ...p, items: nextItems }));
    setDirty(true);
  };

  const deletePackedShown = (shownItems) => {
    if (!confirm("Delete all packed items currently shown?")) return;

    const ids = new Set(shownItems.filter((x) => x.packed).map((x) => x.id));
    if (ids.size === 0) return;

    const nextItems = dbRef.current.items.filter((it) => !ids.has(it.id));
    setDb((p) => ({
      ...p,
      items: nextItems,
      lists: setItemCount(p.lists, currentList.id, nextItems),
    }));
    setDirty(true);
  };

  const deleteAllItems = () => {
    if (!currentList) return;
    if (!confirm(`Delete all items in "${currentList.name}"?`)) return;

    const nextItems = dbRef.current.items.filter(
      (it) => it.listId !== currentList.id,
    );
    setDb((p) => ({
      ...p,
      items: nextItems,
      lists: setItemCount(p.lists, currentList.id, nextItems),
    }));
    setDirty(true);
  };

  // Sends the current list to the backend.
  const submitChanges = async () => {
    if (!currentList || !dirty || submitting) return;
    setSubmitting(true);
    try {
      const itemsToSave = dbRef.current.items.filter(
        (it) => it.listId === currentList.id,
      );
      await saveListToServer(currentList, itemsToSave);
      setDirty(false);
    } catch (err) {
      console.error(err);
      alert("Failed to save changes to the server. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // Ask before leaving a list that has unsaved changes.
  const confirmDiscardChanges = () =>
    !dirty || confirm("You have unsaved changes. Discard them and continue?");

  const deleteList = async () => {
    if (!currentList) return;
    if (
      !confirm(
        `Permanently delete the list "${currentList.name}"? This cannot be undone.`,
      )
    )
      return;

    try {
      const res = await fetch(
        `${API_URL}/packinglist?key=${encodeURIComponent(currentList.key)}`,
        {
          method: "DELETE",
          headers: getAuthHeaders(),
        },
      );
      if (!res.ok) throw new Error("Failed to delete list");

      setDb((p) => ({
        ...p,
        lists: p.lists.filter((l) => l.id !== currentList.id),
        items: p.items.filter((it) => it.listId !== currentList.id),
      }));
      setDirty(false);
      setUi((p) => ({ ...p, currentListId: null }));
    } catch (err) {
      console.error(err);
      alert("Failed to delete the list. Please try again.");
    }
  };

  const importCsvToCurrentList = async (file) => {
    if (!currentList || !file) return;

    const formData = new FormData();
    formData.append("file", file);
    formData.append("key", currentList.key);

    const res = await fetch(`${API_URL}/packinglist/upload`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: formData,
    });

    if (!res.ok) {
      alert("Failed to upload CSV to server.");
      return;
    }

    await fetchListContent(currentList.key, currentList.id);
    alert("CSV uploaded successfully.");
  };

  const exportCsv = () => {
    if (!currentList) return;

    const items = db.items.filter((it) => it.listId === currentList.id);
    const csvContent = buildPackingCsv(items);

    const blob = new Blob([csvContent], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${currentList.name}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    fetchAvailableLists();
  }, []);

  // warn before closing/reloading the tab with unsaved changes
  useEffect(() => {
    if (!dirty) return;
    const handler = (e) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  // -------- UI --------
  return (
    <div
      style={{
        fontFamily: "'Roboto Mono', monospace",
        color: "var(--text-primary)",
        backgroundColor: "var(--background-base)",
      }}
    >
      <header>
        <div
          className="topbar"
          style={{
            backgroundColor: "var(--surface-layer)",
            borderBottom: "1px solid var(--primary-accent)",
            paddingTop: "14px",
            paddingBottom: "14px",
          }}
        >
          <div className="brand">
            <span
              className="dot"
              style={{ backgroundColor: "var(--primary-accent)" }}
            />
            <span>Packing List</span>
          </div>
          <div className="actions">
            <button
              className="primary"
              style={{
                backgroundColor: "var(--primary-accent)",
                color: "var(--background-base)",
              }}
              onClick={() =>
                setUi((p) => ({
                  ...p,
                  modalListName: true,
                  listNameMode: "new",
                  listNameDraft: defaultListName(),
                }))
              }
            >
              + New Packing List
            </button>
            <button
              style={{
                backgroundColor: "var(--surface-layer)",
                color: "var(--text-primary)",
                border: "1px solid var(--primary-accent)",
              }}
              onClick={() => setUi((p) => ({ ...p, modalItem: true }))}
            >
              + Add Item
            </button>
            <button
              style={{
                backgroundColor: "var(--surface-layer)",
                color: "var(--text-primary)",
                border: "1px solid var(--primary-accent)",
              }}
              onClick={() => {
                if (!currentList) {
                  alert("No list selected!");
                  return;
                }
                document.getElementById("csvFileInput").click();
              }}
            >
              Upload CSV
            </button>
            <button
              style={{
                backgroundColor: "var(--surface-layer)",
                color: "var(--text-primary)",
                border: "1px solid var(--primary-accent)",
              }}
              onClick={exportCsv}
            >
              Export CSV
            </button>
          </div>
        </div>
      </header>

      <input
        key={csvInputKey}
        id="csvFileInput"
        type="file"
        accept=".csv,text/csv"
        style={{ display: "none" }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          importCsvToCurrentList(file);
          setCsvInputKey((k) => k + 1);
        }}
      />

      <main>
        <div className="grid">
          <ListsPanel
            db={db}
            currentList={currentList}
            ui={ui}
            setUi={setUi}
            loadingLists={loadingLists}
            createNewList={createNewList}
            renameCurrentList={renameCurrentList}
            confirmDiscardChanges={confirmDiscardChanges}
          />
          <CurrentListPanel
            items={db.items}
            structure={db.structures.find(
              (structure) => structure.id === currentList?.structureId,
            )}
            currentList={currentList}
            setUi={setUi}
            ui={ui}
            columnLabel={columnLabel}
            togglePacked={togglePacked}
            updateItem={updateItem}
            addItem={addItem}
            loadingCurrentList={loadingCurrentList}
            markAllShownPacked={markAllShownPacked}
            deletePackedShown={deletePackedShown}
            deleteAllItems={deleteAllItems}
            deleteList={deleteList}
            dirty={dirty}
            submitting={submitting}
            submitChanges={submitChanges}
          />
        </div>
      </main>
    </div>
  );
}
