import { useEffect, useMemo, useState } from "react";

export default function CurrentListPanel({
  items,
  structure,
  currentList,
  setUi,
  ui,
  columnLabel,
  togglePacked,
  updateItem,
  addItem,
  loadingCurrentList,
  markAllShownPacked,
  deletePackedShown,
  dirty,
  submitting,
  submitChanges,
  deleteAllItems,
  deleteList,
}) {
  const [activeSection, setActiveSection] = useState("ALL");
  const [itemSearch, setItemSearch] = useState("");
  const [onlyPacked, setOnlyPacked] = useState(false);
  const [onlyUnpacked, setOnlyUnpacked] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editItemId, setEditItemId] = useState(null);
  const [newItem, setNewItem] = useState({
    packed: false,
    item: "",
    section: "",
    quantity: "",
    location: "",
    notes: "",
  });

  useEffect(() => {
    setActiveSection("ALL");
    setItemSearch("");
    setOnlyPacked(false);
    setOnlyUnpacked(false);
    setEditModalOpen(false);
    setEditItemId(null);
  }, [currentList?.id]);

  useEffect(() => {
    if (ui.modalItem) {
      setNewItem({
        packed: false,
        item: "",
        section: "",
        quantity: "",
        location: "",
        notes: "",
      });
    }
  }, [ui.modalItem]);

  const currentItems = useMemo(
    () => items.filter((item) => item.listId === currentList?.id),
    [items, currentList?.id],
  );
  const sections = useMemo(
    () =>
      Array.from(
        new Set(
          currentItems
            .map((item) => (item.section || "").trim())
            .filter(Boolean),
        ),
      ),
    [currentItems],
  );
  const sectionCount = sections.length;
  const columns = structure?.columns?.length
    ? structure.columns
    : ["packed", "item", "section", "quantity", "location", "notes"];
  const filteredItems = useMemo(() => {
    const query = itemSearch.toLowerCase().trim();
    let visibleItems = currentItems;

    if (activeSection !== "ALL") {
      visibleItems = visibleItems.filter(
        (item) => item.section === activeSection,
      );
    }
    if (onlyPacked) visibleItems = visibleItems.filter((item) => item.packed);
    if (onlyUnpacked) {
      visibleItems = visibleItems.filter((item) => !item.packed);
    }
    if (query) {
      visibleItems = visibleItems.filter(
        (item) =>
          (item.item || "").toLowerCase().includes(query) ||
          (item.notes || "").toLowerCase().includes(query) ||
          (item.location || "").toLowerCase().includes(query) ||
          (item.section || "").toLowerCase().includes(query),
      );
    }

    return [...visibleItems].sort((a, b) => a.id - b.id);
  }, [currentItems, activeSection, onlyPacked, onlyUnpacked, itemSearch]);

  const closeAddModal = () =>
    setUi((previous) => ({ ...previous, modalItem: false }));
  const closeEditModal = () => {
    setEditModalOpen(false);
    setEditItemId(null);
  };
  const selectedItem = currentItems.find((item) => item.id === editItemId);

  return (
    <>
      <section
        className="panel"
        style={{
          backgroundColor: "var(--surface-layer)",
          border: "1px solid var(--primary-accent)",
        }}
      >
        <div
          className="head"
          style={{ borderBottom: "1px solid var(--primary-accent)" }}
        >
          <h2>Current List</h2>
          <span className="muted" style={{ color: "var(--text-secondary)" }}>
            {currentList
              ? `Created: ${new Date(currentList.created).toLocaleString()}`
              : "No list selected"}
          </span>
        </div>

        <div className="body rightTop">
          <div className="split2">
            <div className="stack">
              <label
                className="muted"
                style={{ color: "var(--text-secondary)" }}
              >
                Name
              </label>

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
                    backgroundColor: "var(--background-base)",
                    color: "var(--text-primary)",
                    border: "1px solid var(--primary-accent)",
                  }}
                >
                  {currentList?.name || "—"}
                </span>
                <button
                  disabled={!currentList}
                  style={{
                    backgroundColor: "var(--surface-layer)",
                    color: "var(--text-primary)",
                    border: "1px solid var(--primary-accent)",
                  }}
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
              <label
                className="muted"
                style={{ color: "var(--text-secondary)" }}
              >
                Structure
              </label>
              <div className="row">
                <span
                  className="badge"
                  style={{
                    backgroundColor: "var(--background-base)",
                    color: "var(--text-primary)",
                    border: "1px solid var(--primary-accent)",
                  }}
                >
                  {currentList ? `${sectionCount} sections • 7 columns` : "—"}
                </span>
                <button
                  style={{
                    backgroundColor: "var(--surface-layer)",
                    color: "var(--text-primary)",
                    border: "1px solid var(--primary-accent)",
                  }}
                  onClick={() => setEditModalOpen(true)}
                >
                  Edit items
                </button>
              </div>
            </div>
          </div>

          <div className="split2">
            <div className="stack">
              <label
                className="muted"
                style={{ color: "var(--text-secondary)" }}
              >
                Filter by section
              </label>
              <div className="chips">
                {["ALL", ...sections].map((sec) => (
                  <div
                    key={sec}
                    className={
                      "chip" + (activeSection === sec ? " active" : "")
                    }
                    style={{
                      backgroundColor:
                        activeSection === sec
                          ? "var(--primary-accent)"
                          : "var(--background-base)",
                      color:
                        activeSection === sec
                          ? "var(--background-base)"
                          : "var(--text-primary)",
                      border: `1px solid ${activeSection === sec ? "var(--primary-accent)" : "var(--text-secondary)"}`,
                    }}
                    onClick={() => setActiveSection(sec)}
                  >
                    {sec === "ALL" ? "All sections" : sec}
                  </div>
                ))}
              </div>
            </div>

            <div className="stack">
              <label
                className="muted"
                style={{ color: "var(--text-secondary)" }}
              >
                Search items
              </label>
              <input
                placeholder="Search item..."
                value={itemSearch}
                onChange={(event) => setItemSearch(event.target.value)}
                style={{
                  backgroundColor: "var(--background-base)",
                  color: "var(--text-primary)",
                  border: "1px solid var(--primary-accent)",
                }}
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
                checked={onlyPacked}
                onChange={(event) => {
                  setOnlyPacked(event.target.checked);
                  if (event.target.checked) setOnlyUnpacked(false);
                }}
              />
              <span
                className="muted"
                style={{ color: "var(--text-secondary)" }}
              >
                Show only packed
              </span>
            </label>

            <label className="row" style={{ gap: 8 }}>
              <input
                type="checkbox"
                style={{ width: "auto", transform: "translateY(1px)" }}
                checked={onlyUnpacked}
                onChange={(event) => {
                  setOnlyUnpacked(event.target.checked);
                  if (event.target.checked) setOnlyPacked(false);
                }}
              />
              <span
                className="muted"
                style={{ color: "var(--text-secondary)" }}
              >
                Show only unpacked
              </span>
            </label>

            <div style={{ flex: 2 }} />
            <button
              className="primary"
              style={{
                backgroundColor: "var(--warning-attention)",
                color: "var(--background-base)",
                opacity: !dirty || submitting ? 0.5 : 1,
                cursor: !dirty || submitting ? "not-allowed" : "pointer",
              }}
              disabled={!currentList || !dirty || submitting}
              onClick={submitChanges}
              title={dirty ? "Save changes to the system" : "No unsaved changes"}
            >
              {submitting
                ? "Saving..."
                : dirty
                  ? "Save to system *"
                  : "Save to system"}
            </button>
            <span
              className="badge"
              style={{
                backgroundColor: "var(--background-base)",
                color: "var(--text-primary)",
                border: "1px solid var(--primary-accent)",
              }}
            >
              {filteredItems.length} shown
            </span>
          </div>

          <div className="tableWrap">
            <table
              style={{ borderCollapse: "separate", borderSpacing: "0 10px" }}
            >
              <thead>
                <tr>
                  {columns.map((c) => (
                    <th key={c} style={{ color: "var(--text-secondary)" }}>
                      {columnLabel(c)}
                    </th>
                  ))}
                  <th style={{ color: "var(--text-secondary)" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((it) => (
                  <tr
                    key={it.id}
                    style={{ backgroundColor: "var(--background-base)" }}
                  >
                    {columns.map((c) => {
                      if (c === "packed") {
                        return (
                          <td key={c}>
                            {it.packed ? (
                              <span
                                className="k ok"
                                style={{ color: "var(--success-positive)" }}
                              >
                                ☑ Packed
                              </span>
                            ) : (
                              <span
                                className="k no"
                                style={{ color: "var(--warning-attention)" }}
                              >
                                ☐ Not packed
                              </span>
                            )}
                          </td>
                        );
                      }
                      if (c === "section")
                        return (
                          <td key={c}>
                            <span
                              className="badge"
                              style={{
                                backgroundColor: "var(--accent-highlight)",
                                color: "var(--background-base)",
                              }}
                            >
                              {it.section}
                            </span>
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
                          style={{ color: "var(--primary-accent)" }}
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
            <button
              className="good"
              onClick={() => markAllShownPacked(filteredItems)}
            >
              Mark all shown as packed
            </button>
            <button
              className="bad"
              onClick={() => deletePackedShown(filteredItems)}
              disabled={
                loadingCurrentList || !filteredItems.some((x) => x.packed)
              }
              style={{
                opacity:
                  !loadingCurrentList && filteredItems.some((x) => x.packed)
                    ? 1
                    : 0.4,
                cursor:
                  !loadingCurrentList && filteredItems.some((x) => x.packed)
                    ? "pointer"
                    : "not-allowed",
              }}
            >
              Delete packed (shown)
            </button>
            <button
              className="bad"
              onClick={deleteAllItems}
              disabled={loadingCurrentList || !currentList}
              style={{
                opacity: currentList && !loadingCurrentList ? 1 : 0.4,
                cursor:
                  currentList && !loadingCurrentList
                    ? "pointer"
                    : "not-allowed",
              }}
            >
              Delete all
            </button>
            <button
              className="bad"
              onClick={deleteList}
              disabled={!currentList}
              style={{
                opacity: currentList ? 1 : 0.4,
                cursor: currentList ? "pointer" : "not-allowed",
                backgroundColor: "#7f1d1d",
              }}
            >
              Delete list
            </button>
          </div>
        </div>
      </section>
      {editModalOpen && (
        <div className="modalBackdrop open" onClick={closeEditModal}>
          <div className="modal" onClick={(event) => event.stopPropagation()}>
            <div className="head">
              <h3>Edit Item</h3>
              <button className="ghost closeX" onClick={closeEditModal}>
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
                    value={editItemId ?? ""}
                    onChange={(event) =>
                      setEditItemId(
                        event.target.value ? Number(event.target.value) : null,
                      )
                    }
                  >
                    <option value="">-- Select an item --</option>
                    {[...currentItems]
                      .sort((a, b) =>
                        (a.item || "").localeCompare(b.item || ""),
                      )
                      .map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.item || "(Unnamed item)"}{" "}
                          {item.section ? `— ${item.section}` : ""}
                        </option>
                      ))}
                  </select>
                  {selectedItem && (
                    <>
                      <label className="row packedRow">
                        <span>Packed?</span>
                        <input
                          type="checkbox"
                          checked={!!selectedItem.packed}
                          onChange={(event) =>
                            updateItem(selectedItem.id, {
                              packed: event.target.checked,
                            })
                          }
                        />
                      </label>
                      <input
                        value={selectedItem.item}
                        onChange={(event) =>
                          updateItem(selectedItem.id, {
                            item: event.target.value,
                          })
                        }
                        placeholder="Item"
                      />
                      <input
                        value={selectedItem.section}
                        onChange={(event) =>
                          updateItem(selectedItem.id, {
                            section: event.target.value,
                          })
                        }
                        placeholder="Section"
                      />
                      <input
                        type="number"
                        value={selectedItem.quantity}
                        onChange={(event) =>
                          updateItem(selectedItem.id, {
                            quantity: Number(event.target.value) || 0,
                          })
                        }
                        placeholder="Quantity"
                      />
                      <input
                        value={selectedItem.location}
                        onChange={(event) =>
                          updateItem(selectedItem.id, {
                            location: event.target.value,
                          })
                        }
                        placeholder="Location"
                      />
                      <input
                        value={selectedItem.notes}
                        onChange={(event) =>
                          updateItem(selectedItem.id, {
                            notes: event.target.value,
                          })
                        }
                        placeholder="Notes"
                      />
                    </>
                  )}
                </>
              )}
            </div>
            <div className="foot">
              <button className="ghost" onClick={closeEditModal}>
                Done
              </button>
            </div>
          </div>
        </div>
      )}
      {ui.modalItem && (
        <div className="modalBackdrop open" onClick={closeAddModal}>
          <div className="modal" onClick={(event) => event.stopPropagation()}>
            <div className="head">
              <h3>Add Item</h3>
              <button className="ghost closeX" onClick={closeAddModal}>
                ✕
              </button>
            </div>
            <div className="body stack">
              <label className="row packedRow">
                <span>Packed?</span>
                <input
                  type="checkbox"
                  checked={newItem.packed}
                  onChange={(event) =>
                    setNewItem((previous) => ({
                      ...previous,
                      packed: event.target.checked,
                    }))
                  }
                />
              </label>
              {["item", "section", "quantity", "location", "notes"].map(
                (field) => (
                  <input
                    key={field}
                    type={field === "quantity" ? "number" : "text"}
                    placeholder={
                      field === "quantity"
                        ? "Quantity"
                        : field[0].toUpperCase() + field.slice(1)
                    }
                    value={newItem[field]}
                    onChange={(event) =>
                      setNewItem((previous) => ({
                        ...previous,
                        [field]: event.target.value,
                      }))
                    }
                  />
                ),
              )}
            </div>
            <div className="foot">
              <button className="ghost" onClick={closeAddModal}>
                Cancel
              </button>
              <button className="primary" onClick={() => addItem(newItem)}>
                Add
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
