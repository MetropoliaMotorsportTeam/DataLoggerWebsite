import { useMemo, useState } from "react";

export default function ListsPanel({
  db,
  ui,
  setUi,
  loadingLists,
  createNewList,
  renameCurrentList,
}) {
  const [search, setSearch] = useState("");
  const filteredLists = useMemo(() => {
    const query = search.toLowerCase().trim();
    return [...db.lists]
      .sort((a, b) => (a.created > b.created ? -1 : 1))
      .filter((list) => !query || list.name.toLowerCase().includes(query));
  }, [db.lists, search]);

  const closeNameModal = () =>
    setUi((previous) => ({ ...previous, modalListName: false }));

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
          <h2>Lists</h2>
          <span className="muted" style={{ color: "var(--text-secondary)" }}>
            {db.lists.length} total
          </span>
        </div>

        <div className="body stack">
          <input
            placeholder="Search lists..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            style={{
              backgroundColor: "var(--background-base)",
              color: "var(--text-primary)",
              border: "1px solid var(--primary-accent)",
            }}
          />

          <div className="list">
            {filteredLists.map((list) => {
              const active = list.id === ui.currentListId;
              return (
                <div
                  key={list.id}
                  className={"listItem" + (active ? " active" : "")}
                  style={{
                    backgroundColor: active
                      ? "var(--primary-accent)"
                      : "transparent",
                    color: active
                      ? "var(--background-base)"
                      : "var(--text-primary)",
                  }}
                  onClick={() =>
                    setUi((previous) => ({
                      ...previous,
                      currentListId: list.id,
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
                      {list.name}
                    </div>
                    <div
                      className="mini"
                      style={{
                        color: active
                          ? "var(--background-base)"
                          : "var(--text-secondary)",
                      }}
                    >
                      {new Date(list.created).toLocaleString()}
                    </div>
                  </div>
                  <div
                    className="badge"
                    style={{
                      backgroundColor: active
                        ? "var(--background-base)"
                        : "var(--surface-layer)",
                      color: active
                        ? "var(--primary-accent)"
                        : "var(--text-primary)",
                    }}
                  >
                    {list.itemCount == null
                      ? loadingLists
                        ? "…"
                        : "—"
                      : `${list.itemCount} items`}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="hint" style={{ color: "var(--text-secondary)" }}>
            New list defaults to <b>packing_list_YYYY-MM-DD</b> and copies the
            last list’s structure.
          </div>
        </div>
      </section>

      {ui.modalListName && (
        <div className="modalBackdrop open" onClick={closeNameModal}>
          <div className="modal" onClick={(event) => event.stopPropagation()}>
            <div className="head">
              <h3>
                {ui.listNameMode === "new"
                  ? "New Packing List"
                  : "Rename Packing List"}
              </h3>
              <button className="ghost closeX" onClick={closeNameModal}>
                ✕
              </button>
            </div>

            <div className="body stack">
              <label className="muted">Name</label>
              <input
                autoFocus
                value={ui.listNameDraft}
                onChange={(event) =>
                  setUi((previous) => ({
                    ...previous,
                    listNameDraft: event.target.value,
                  }))
                }
                placeholder="Enter list name..."
              />
            </div>

            <div className="foot">
              <button className="ghost" onClick={closeNameModal}>
                Cancel
              </button>
              <button
                className="primary"
                onClick={() => {
                  if (ui.listNameMode === "new") {
                    createNewList(ui.listNameDraft);
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
    </>
  );
}
