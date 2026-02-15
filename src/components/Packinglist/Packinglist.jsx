import React, { useEffect, useMemo, useState } from "react";
import "./packinglist.css";

const LS_KEY = "packing_demo_csv_v1";

// ---------------------------
// CSV helpers (same logic as HTML)
// ---------------------------
function csvEscape(value) {
  if (value === null || value === undefined) return "";
  const s = String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function csvRow(fields) {
  return fields.map(csvEscape).join(",");
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
function serializeDbToCsv(db) {
  const lines = [];
  lines.push(csvRow(["META", "nextId", db.nextId]));
  db.structures.forEach((s) => {
    lines.push(
      csvRow(["STRUCT", s.id, s.sections.join("|"), s.columns.join("|")]),
    );
  });
  db.lists.forEach((l) => {
    lines.push(csvRow(["LIST", l.id, l.name, l.created, l.structureId]));
  });
  db.items.forEach((it) => {
    lines.push(
      csvRow([
        "ITEM",
        it.id,
        it.listId,
        it.packed ? "true" : "false",
        it.item,
        it.section,
        it.quantity,
        it.location,
        it.notes,
      ]),
    );
  });
  return lines.join("\n");
}

function loadDbFromCsv(csvText) {
  const fresh = { structures: [], lists: [], items: [], nextId: 1 };
  const lines = splitLines(csvText);

  for (const line of lines) {
    const cols = parseCsvLine(line);
    const type = cols[0];

    if (type === "META" && cols[1] === "nextId") {
      fresh.nextId = Number(cols[2] || 1) || 1;
    } else if (type === "STRUCT") {
      fresh.structures.push({
        id: Number(cols[1]),
        sections: (cols[2] || "").split("|").filter(Boolean),
        columns: (cols[3] || "").split("|").filter(Boolean),
      });
    } else if (type === "LIST") {
      fresh.lists.push({
        id: Number(cols[1]),
        name: cols[2] || "",
        created: cols[3] || "",
        structureId: Number(cols[4]),
      });
    } else if (type === "ITEM") {
      fresh.items.push({
        id: Number(cols[1]),
        listId: Number(cols[2]),
        packed: (cols[3] || "").toLowerCase() === "true",
        item: cols[4] || "",
        section: cols[5] || "",
        quantity: Number(cols[6] || 0) || 0,
        location: cols[7] || "",
        notes: cols[8] || "",
      });
    }
  }

  if (fresh.structures.length === 0) {
    fresh.structures.push({
      id: 1,
      sections: ["Clothing", "Toiletries", "Tech", "Documents", "Misc"],
      columns: ["packed", "item", "section", "quantity", "location", "notes"],
    });
  }

  // repair nextId if missing
  const maxId = Math.max(
    0,
    ...fresh.structures.map((s) => s.id),
    ...fresh.lists.map((l) => l.id),
    ...fresh.items.map((i) => i.id),
  );
  if (!fresh.nextId || fresh.nextId < maxId + 1) fresh.nextId = maxId + 1;

  return fresh;
}

function seedStarterData() {
  let nextId = 1;
  const uid = () => nextId++;

  const s = {
    id: uid(),
    sections: ["Clothing", "Toiletries", "Tech", "Documents", "Misc"],
    columns: ["packed", "item", "section", "quantity", "location", "notes"],
  };

  const list = {
    id: uid(),
    name: defaultListName(),
    created: new Date().toISOString(),
    structureId: s.id,
  };

  const items = [
    {
      id: uid(),
      listId: list.id,
      packed: false,
      item: "Socks",
      section: "Clothing",
      quantity: 6,
      location: "suitcase",
      notes: "",
    },
    {
      id: uid(),
      listId: list.id,
      packed: true,
      item: "Jacket",
      section: "Clothing",
      quantity: 1,
      location: "wear",
      notes: "warm",
    },
    {
      id: uid(),
      listId: list.id,
      packed: false,
      item: "Toothbrush",
      section: "Toiletries",
      quantity: 1,
      location: "toiletry bag",
      notes: "",
    },
    {
      id: uid(),
      listId: list.id,
      packed: false,
      item: "Passport",
      section: "Documents",
      quantity: 1,
      location: "pocket",
      notes: "check expiry",
    },
  ];

  return { structures: [s], lists: [list], items, nextId };
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
  const [db, setDb] = useState(() => {
    const csv = localStorage.getItem(LS_KEY);
    if (!csv) {
      const seeded = seedStarterData();
      localStorage.setItem(LS_KEY, serializeDbToCsv(seeded));
      return seeded;
    }
    try {
      return loadDbFromCsv(csv);
    } catch {
      const seeded = seedStarterData();
      localStorage.setItem(LS_KEY, serializeDbToCsv(seeded));
      return seeded;
    }
  });

  const [ui, setUi] = useState({
    currentListId: null,
    listSearch: "",
    activeSection: "ALL",
    itemSearch: "",
    onlyUnpacked: false,
    onlyPacked: false,

    modalItem: false,
    modalStructure: false,
    modalImport: false,
    editingItemId: null,
    modalEditItem: false,
    editItemId: null,

    // ✅ NEW: one modal for both "New list" and "Rename"
    modalListName: false,
    listNameMode: "new", // "new" | "rename"
    listNameDraft: "",
  });

  const [csvInputKey, setCsvInputKey] = useState(0);

  // ensure current list
  useEffect(() => {
    if (ui.currentListId && db.lists.some((l) => l.id === ui.currentListId))
      return;
    const last = [...db.lists].sort((a, b) =>
      a.created > b.created ? -1 : 1,
    )[0];
    setUi((p) => ({ ...p, currentListId: last?.id ?? null }));
  }, [db.lists, ui.currentListId]);

  // persist db changes
  useEffect(() => {
    localStorage.setItem(LS_KEY, serializeDbToCsv(db));
  }, [db]);

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


  const currentList = useMemo(
    () => db.lists.find((l) => l.id === ui.currentListId) || null,
    [db.lists, ui.currentListId],
  );

  const currentStruct = useMemo(() => {
    if (!currentList) return null;
    return db.structures.find((s) => s.id === currentList.structureId) || null;
  }, [db.structures, currentList]);

  const sectionCount = useMemo(() => {
    if (!currentList) return 0;
    const set = new Set(
      db.items
        .filter((it) => it.listId === currentList.id)
        .map((it) => (it.section || "").trim())
        .filter(Boolean),
    );
    return set.size;
  }, [db.items, currentList]);

  const filteredLists = useMemo(() => {
    const q = ui.listSearch.toLowerCase().trim();
    return [...db.lists]
      .sort((a, b) => (a.created > b.created ? -1 : 1))
      .filter((l) => !q || l.name.toLowerCase().includes(q));
  }, [db.lists, ui.listSearch]);

  const sections = useMemo(() => {
    if (!currentList) return [];

    const fromItems = db.items
      .filter((it) => it.listId === currentList.id)
      .map((it) => (it.section || "").trim())
      .filter(Boolean);

    return Array.from(new Set(fromItems));
  }, [db.items, currentList]);
  const columns = useMemo(
    () =>
      currentStruct?.columns?.length
        ? currentStruct.columns
        : ["packed", "item", "section", "quantity", "location", "notes"],
    [currentStruct],
  );

  const filteredItems = useMemo(() => {
    if (!currentList) return [];
    const q = ui.itemSearch.toLowerCase().trim();

    let items = db.items.filter((it) => it.listId === currentList.id);

    if (ui.activeSection !== "ALL")
      items = items.filter((it) => it.section === ui.activeSection);
    if (ui.onlyPacked) items = items.filter((it) => it.packed);
    if (ui.onlyUnpacked) items = items.filter((it) => !it.packed);

    if (q) {
      items = items.filter(
        (it) =>
          (it.item || "").toLowerCase().includes(q) ||
          (it.notes || "").toLowerCase().includes(q) ||
          (it.location || "").toLowerCase().includes(q) ||
          (it.section || "").toLowerCase().includes(q),
      );
    }

    items.sort((a, b) => a.id - b.id);

    return items;
  }, [
    db.items,
    currentList,
    ui.activeSection,
    ui.onlyPacked, 
    ui.onlyUnpacked,
    ui.itemSearch,
  ]);

  // -------- actions --------
  const createNewList = (name, useLastStructure) => {
    const created = new Date().toISOString();
    let newListId = null;

    setDb((prev) => {
      const structures = [...prev.structures];
      const lists = [...prev.lists];

      const newStructId = prev.nextId; // struct id
      const listId = prev.nextId + 1; // list id (right after struct)
      newListId = listId;

      if (useLastStructure && prev.lists.length) {
        const last = [...prev.lists].sort((a, b) =>
          a.created > b.created ? -1 : 1,
        )[0];
        const s = prev.structures.find((x) => x.id === last.structureId);
        structures.push({
          id: newStructId,
          sections: [...(s?.sections || [])],
          columns: [...(s?.columns || [])],
        });
      } else {
        structures.push({
          id: newStructId,
          sections: [],
          columns: [
            "packed",
            "item",
            "section",
            "quantity",
            "location",
            "notes",
          ],
        });
      }

      lists.push({
        id: listId,
        name: (name || "").trim() || defaultListName(),
        created,
        structureId: newStructId,
      });

      return { ...prev, structures, lists, nextId: prev.nextId + 2 };
    });

    // switch to it + reset filters + close modal
    setUi((p) => ({
      ...p,
      currentListId: newListId ?? p.currentListId,
      activeSection: "ALL",
      itemSearch: "",
      onlyUnpacked: false,
      modalListName: false,
      listNameDraft: "",
    }));
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

  const togglePacked = (itemId) => {
    setDb((p) => ({
      ...p,
      items: p.items.map((it) =>
        it.id === itemId ? { ...it, packed: !it.packed } : it,
      ),
    }));
  };

  const addItem = ({ packed, item, section, quantity, location, notes }) => {
    if (!currentList) {
      alert("No list selected!");
      return;
    }

    setDb((prev) => {
      const newItem = {
        id: prev.nextId,
        listId: currentList.id,
        packed: !!packed,
        item: item || "",
        section: section || "",
        quantity: Number(quantity) || 0,
        location: location || "",
        notes: notes || "",
      };

      return {
        ...prev,
        items: [...prev.items, newItem],
        nextId: prev.nextId + 1,
      };
    });

    setUi((p) => ({ ...p, modalItem: false }));
  };

  const updateItem = (itemId, patch) => {
    setDb((p) => ({
      ...p,
      items: p.items.map((it) => (it.id === itemId ? { ...it, ...patch } : it)),
    }));
  };

  const markAllShownPacked = () => {
    const ids = new Set(filteredItems.map((x) => x.id));
    setDb((p) => ({
      ...p,
      items: p.items.map((it) =>
        ids.has(it.id) ? { ...it, packed: true } : it,
      ),
    }));
  };

  const deletePackedShown = () => {
    if (!confirm("Delete all packed items currently shown?")) return;
    const ids = new Set(filteredItems.filter((x) => x.packed).map((x) => x.id));
    setDb((p) => ({ ...p, items: p.items.filter((it) => !ids.has(it.id)) }));
  };

  const importCsvToCurrentList = async (file) => {
    if (!currentList) {
      alert("No list selected!");
      return;
    }
    if (!file) return;

    const text = await file.text();
    const lines = splitLines(text);
    if (!lines.length) {
      alert("CSV is empty.");
      return;
    }

    // Parse header
    const header = parseCsvLine(lines[0]).map((h) =>
      (h || "").trim().toLowerCase(),
    );
    const idx = (name) => header.indexOf(name);

    // Support a few common header variants
    const iPacked = idx("packed?") >= 0 ? idx("packed?") : idx("packed");
    const iItem = idx("item");
    const iSection = idx("section");
    const iQty = idx("quantity") >= 0 ? idx("quantity") : idx("qty");
    const iLoc = idx("location");
    const iNotes = idx("notes");

    if (iItem < 0) {
      alert('CSV must have at least an "Item" column.');
      return;
    }

    setDb((prev) => {
      // Remove current list items
      const kept = prev.items.filter((it) => it.listId !== currentList.id);

      let nextId = prev.nextId;
      const imported = [];

      for (let r = 1; r < lines.length; r++) {
        const cols = parseCsvLine(lines[r]);

        const packedRaw =
          iPacked >= 0 ? (cols[iPacked] || "").trim().toLowerCase() : "";
        const packed =
          packedRaw === "true" ||
          packedRaw === "1" ||
          packedRaw === "yes" ||
          packedRaw === "y";

        const item = (cols[iItem] || "").trim();
        if (!item) continue; // skip empty rows

        const section = iSection >= 0 ? (cols[iSection] || "").trim() : "";
        const quantity = iQty >= 0 ? Number((cols[iQty] || "").trim()) || 0 : 0;
        const location = iLoc >= 0 ? (cols[iLoc] || "").trim() : "";
        const notes = iNotes >= 0 ? (cols[iNotes] || "").trim() : "";

        imported.push({
          id: nextId++,
          listId: currentList.id,
          packed,
          item,
          section,
          quantity,
          location,
          notes,
        });
      }

      return {
        ...prev,
        items: [...kept, ...imported],
        nextId,
      };
    });

    // Optional: reset filters so user sees imported stuff
    setUi((p) => ({
      ...p,
      activeSection: "ALL",
      itemSearch: "",
      onlyPacked: false,
      onlyUnpacked: false,
    }));

    alert("CSV loaded into the current list!");
  };

  const exportCsv = () => {
    if (!currentList) return;

    const items = db.items.filter((it) => it.listId === currentList.id);
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

    const csvContent = [headers, ...rows]
      .map((row) => row.map(csvEscape).join(","))
      .join("\n");

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

  // -------- UI --------
  return (
    <div>
      <header>
        <div className="topbar">
          <div className="brand">
            <span className="dot" />
            <span>Packing List</span>
            <span className="badge">CSV: localStorage</span>
          </div>

          <div className="actions">
            <button
              className="primary"
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
              onClick={() =>
                setUi((p) => ({ ...p, modalItem: true, editingItemId: null }))
              }
            >
              + Add Item
            </button>
            <button
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

            <button onClick={exportCsv}>Export CSV</button>
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
          {/* Left */}
          <section className="panel">
            <div className="head">
              <h2>Lists</h2>
              <span className="muted">{db.lists.length} total</span>
            </div>

            <div className="body stack">
              <input
                placeholder="Search lists..."
                value={ui.listSearch}
                onChange={(e) =>
                  setUi((p) => ({ ...p, listSearch: e.target.value }))
                }
              />

              <div className="list">
                {filteredLists.map((l) => {
                  const itemCount = db.items.filter(
                    (it) => it.listId === l.id,
                  ).length;
                  const active = l.id === ui.currentListId;
                  return (
                    <div
                      key={l.id}
                      className={"listItem" + (active ? " active" : "")}
                      onClick={() =>
                        setUi((p) => ({
                          ...p,
                          currentListId: l.id,
                          activeSection: "ALL",
                          itemSearch: "",
                          onlyUnpacked: false,
                        }))
                      }
                    >
                      <div style={{ minWidth: 0 }}>
                        <div
                          style={{
                            fontWeight: 700,
                            fontSize: 13,
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {l.name}
                        </div>
                        <div className="mini">
                          {new Date(l.created).toLocaleString()}
                        </div>
                      </div>
                      <div className="badge">{itemCount} items</div>
                    </div>
                  );
                })}
              </div>

              <div className="hint">
                New list defaults to <b>packing_list_YYYY-MM-DD</b> and copies
                the last list’s structure.
              </div>
            </div>
          </section>

          {/* Right */}
          <section className="panel">
            <div className="head">
              <h2>Current List</h2>
              <span className="muted">
                {currentList
                  ? `Created: ${new Date(currentList.created).toLocaleString()}`
                  : "No list selected"}
              </span>
            </div>

            <div className="body rightTop">
              <div className="split2">
                <div className="stack">
                  <label className="muted">Name</label>

                  {/* ✅ Name + Rename button (no inline input) */}
                  <div
                    className="row"
                    style={{ gap: 10, justifyContent: "flex-start" }}
                  >
                    <span
                      className="badge"
                      style={{
                        maxWidth: 260,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {currentList?.name || "—"}
                    </span>
                    <button
                      disabled={!currentList}
                      onClick={() => {
                        if (!currentList) return;
                        setUi((p) => ({
                          ...p,
                          modalListName: true,
                          listNameMode: "rename",
                          listNameDraft: currentList.name || "",
                        }));
                      }}
                    >
                      Rename
                    </button>
                  </div>
                </div>

                <div className="stack">
                  <label className="muted">Structure</label>
                  <div className="row">
                    <span className="badge">
                      {currentList
                        ? `${sectionCount} sections • 7 columns`
                        : "—"}
                    </span>
                    <button
                      onClick={() =>
                        setUi((p) => ({
                          ...p,
                          modalEditItem: true,
                          editItemId: null,
                        }))
                      }
                    >
                      Edit items
                    </button>
                  </div>
                </div>
              </div>

              <div className="split2">
                <div className="stack">
                  <label className="muted">Filter by section</label>
                  <div className="chips">
                    {["ALL", ...sections].map((sec) => (
                      <div
                        key={sec}
                        className={
                          "chip" + (ui.activeSection === sec ? " active" : "")
                        }
                        onClick={() =>
                          setUi((p) => ({ ...p, activeSection: sec }))
                        }
                      >
                        {sec === "ALL" ? "All sections" : sec}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="stack">
                  <label className="muted">Search items</label>
                  <input
                    placeholder="Search item..."
                    value={ui.itemSearch}
                    onChange={(e) =>
                      setUi((p) => ({ ...p, itemSearch: e.target.value }))
                    }
                  />
                </div>
              </div>

              <div
                className="row"
                style={{ gap: 16, justifyContent: "flex-start" }}
              >
                <label className="row" style={{ gap: 8 }}>
                  <input
                    type="checkbox"
                    style={{ width: "auto", transform: "translateY(1px)" }}
                    checked={ui.onlyPacked}
                    onChange={(e) =>
                      setUi((p) => ({
                        ...p,
                        onlyPacked: e.target.checked,
                        onlyUnpacked: e.target.checked ? false : p.onlyUnpacked,
                      }))
                    }
                  />
                  <span className="muted">Show only packed</span>
                </label>

                <label className="row" style={{ gap: 8 }}>
                  <input
                    type="checkbox"
                    style={{ width: "auto", transform: "translateY(1px)" }}
                    checked={ui.onlyUnpacked}
                    onChange={(e) =>
                      setUi((p) => ({
                        ...p,
                        onlyUnpacked: e.target.checked,
                        onlyPacked: e.target.checked ? false : p.onlyPacked,
                      }))
                    }
                  />
                  <span className="muted">Show only unpacked</span>
                </label>

                <div style={{ flex: 2 }} />
                <span className="badge">{filteredItems.length} shown</span>
              </div>

              <div className="tableWrap">
                <table>
                  <thead>
                    <tr>
                      {columns.map((c) => (
                        <th key={c}>{columnLabel(c)}</th>
                      ))}
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredItems.map((it) => (
                      <tr key={it.id}>
                        {columns.map((c) => {
                          if (c === "packed") {
                            return (
                              <td key={c}>
                                {it.packed ? (
                                  <span className="k ok">☑ Packed</span>
                                ) : (
                                  <span className="k no">☐ Not packed</span>
                                )}
                              </td>
                            );
                          }
                          if (c === "section")
                            return (
                              <td key={c}>
                                <span className="badge">{it.section}</span>
                              </td>
                            );
                          if (c === "item")
                            return (
                              <td key={c}>
                                <div style={{ fontWeight: 700 }}>{it.item}</div>
                              </td>
                            );
                          return <td key={c}>{String(it[c] ?? "")}</td>;
                        })}
                        <td>
                          <div
                            className="row"
                            style={{ gap: 8, justifyContent: "flex-start" }}
                          >
                            <button
                              className="ghost"
                              onClick={() => togglePacked(it.id)}
                            >
                              {it.packed ? "Unpack" : "Pack"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {!filteredItems.length && (
                      <tr>
                        <td colSpan={columns.length + 1} className="muted">
                          No items match your filters.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="row">
                <button className="good" onClick={markAllShownPacked}>
                  Mark all shown as packed
                </button>
                <button className="bad" onClick={deletePackedShown}>
                  Delete packed (shown)
                </button>
              </div>
            </div>
          </section>
        </div>
      </main>

      {/* ✅ NEW/RENAME LIST MODAL */}
      {ui.modalListName && (
        <div
          className={`modalBackdrop ${ui.modalListName ? "open" : ""}`}
          onClick={() => setUi((p) => ({ ...p, modalListName: false }))}
        >
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="head">
              <h3>
                {ui.listNameMode === "new"
                  ? "New Packing List"
                  : "Rename Packing List"}
              </h3>
              <button
                className="ghost closeX"
                onClick={() => setUi((p) => ({ ...p, modalListName: false }))}
              >
                ✕
              </button>
            </div>

            <div className="body stack">
              <label className="muted">Name</label>
              <input
                autoFocus
                value={ui.listNameDraft}
                onChange={(e) =>
                  setUi((p) => ({ ...p, listNameDraft: e.target.value }))
                }
                placeholder="Enter list name..."
              />
            </div>

            <div className="foot">
              <button
                className="ghost"
                onClick={() => setUi((p) => ({ ...p, modalListName: false }))}
              >
                Cancel
              </button>

              <button
                className="primary"
                onClick={() => {
                  if (ui.listNameMode === "new") {
                    createNewList(ui.listNameDraft, true);
                  } else {
                    renameCurrentList(ui.listNameDraft);
                  }
                }}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* edit item */}
      {ui.modalEditItem && (
        <div
          className={`modalBackdrop ${ui.modalEditItem ? "open" : ""}`}
          onClick={() =>
            setUi((p) => ({ ...p, modalEditItem: false, editItemId: null }))
          }
        >
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="head">
              <h3>Edit Item</h3>
              <button
                className="ghost closeX"
                onClick={() =>
                  setUi((p) => ({
                    ...p,
                    modalEditItem: false,
                    editItemId: null,
                  }))
                }
              >
                ✕
              </button>
            </div>

            <div className="body stack">
              {!currentList ? (
                <div className="muted">No list selected.</div>
              ) : (
                <>
                  <label className="muted">Choose item</label>
                  <select
                    value={ui.editItemId ?? ""}
                    onChange={(e) =>
                      setUi((p) => ({
                        ...p,
                        editItemId: e.target.value
                          ? Number(e.target.value)
                          : null,
                      }))
                    }
                  >
                    <option value="">-- Select an item --</option>
                    {db.items
                      .filter((it) => it.listId === currentList.id)
                      .slice()
                      .sort((a, b) =>
                        (a.item || "").localeCompare(b.item || ""),
                      )
                      .map((it) => (
                        <option key={it.id} value={it.id}>
                          {it.item || "(Unnamed item)"}{" "}
                          {it.section ? `— ${it.section}` : ""}
                        </option>
                      ))}
                  </select>

                  {ui.editItemId &&
                    (() => {
                      const it = db.items.find((x) => x.id === ui.editItemId);
                      if (!it) return null;

                      return (
                        <>
                          <div style={{ height: 8 }} />

                          <label className="row packedRow">
                            <span>Packed?</span>
                            <input
                              type="checkbox"
                              checked={!!it.packed}
                              onChange={(e) =>
                                updateItem(it.id, { packed: e.target.checked })
                              }
                            />
                          </label>

                          <input
                            value={it.item}
                            onChange={(e) =>
                              updateItem(it.id, { item: e.target.value })
                            }
                            placeholder="Item"
                          />
                          <input
                            value={it.section}
                            onChange={(e) =>
                              updateItem(it.id, { section: e.target.value })
                            }
                            placeholder="Section"
                          />
                          <input
                            type="number"
                            value={it.quantity}
                            onChange={(e) =>
                              updateItem(it.id, {
                                quantity: Number(e.target.value) || 0,
                              })
                            }
                            placeholder="Quantity"
                          />
                          <input
                            value={it.location}
                            onChange={(e) =>
                              updateItem(it.id, { location: e.target.value })
                            }
                            placeholder="Location"
                          />
                          <input
                            value={it.notes}
                            onChange={(e) =>
                              updateItem(it.id, { notes: e.target.value })
                            }
                            placeholder="Notes"
                          />
                        </>
                      );
                    })()}
                </>
              )}
            </div>

            <div className="foot">
              <button
                className="ghost"
                onClick={() =>
                  setUi((p) => ({
                    ...p,
                    modalEditItem: false,
                    editItemId: null,
                  }))
                }
              >
                Cancel
              </button>
              <button
                className="primary"
                disabled={!ui.editItemId}
                onClick={() =>
                  setUi((p) => ({
                    ...p,
                    modalEditItem: false,
                    editItemId: null,
                  }))
                }
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ITEM MODAL (your existing one) */}
      {ui.modalItem && (
        <div
          className={`modalBackdrop ${ui.modalItem ? "open" : ""}`}
          onClick={() => setUi((p) => ({ ...p, modalItem: false }))}
        >
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="head">
              <h3>Add Item</h3>
              <button
                className="ghost closeX"
                onClick={() => setUi((p) => ({ ...p, modalItem: false }))}
              >
                ✕
              </button>
            </div>

            <div className="body stack">
              <label className="row packedRow">
                <span>Packed?</span>
                <input type="checkbox" id="newItemPacked" />
              </label>

              <input placeholder="Item" id="newItemName" />
              <input placeholder="Section" id="newItemSection" />
              <input placeholder="Quantity" type="number" id="newItemQty" />
              <input placeholder="Location" id="newItemLocation" />
              <input placeholder="Notes" id="newItemNotes" />
            </div>

            <div className="foot">
              <button
                className="ghost"
                onClick={() => setUi((p) => ({ ...p, modalItem: false }))}
              >
                Cancel
              </button>

              <button
                className="primary"
                onClick={() => {
                  addItem({
                    packed: document.getElementById("newItemPacked").checked,
                    item: document.getElementById("newItemName").value,
                    section: document.getElementById("newItemSection").value,
                    quantity: document.getElementById("newItemQty").value,
                    location: document.getElementById("newItemLocation").value,
                    notes: document.getElementById("newItemNotes").value,
                  });
                }}
              >
                Add
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
