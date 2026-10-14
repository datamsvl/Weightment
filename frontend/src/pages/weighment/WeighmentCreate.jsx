import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./WeighmentCreate.css";
import ItemNameCombobox from "./ItemNameCombobox";

const API_URL = "https://weightment-backend.onrender.com/api/weighments";

const createRow = (id) => ({
  id,
  itemName: "",
  grossWeight: "",
  tareWeight: "",
  netWeight: "",
  transferTareToNext: false,
});

const isBlank = (value) =>
  value === "" || value === null || value === undefined;

const calculateNet = (gross, tare) => {
  if (isBlank(gross) || isBlank(tare)) return "";

  const result = Number(gross) - Number(tare);

  return Number.isFinite(result)
    ? Number(result.toFixed(3))
    : "";
};

function WeighmentCreate() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    date: new Date().toLocaleDateString("en-CA"),
    partyName: "",
    partyGrossWeight: "",
    partyTareWeight: "",
    vehicleNo: "",
    itemName: "Scrap",
    status: "Open",
  });

  const [firstWeight, setFirstWeight] = useState("");
  const [secondWeight, setSecondWeight] = useState("");
  const [weightInMT, setWeightInMT] = useState("");
  const [captureStage, setCaptureStage] = useState(1);

  const [rows, setRows] = useState([createRow(1)]);
  const [nextId, setNextId] = useState(2);
  const [rowsToAdd, setRowsToAdd] = useState(1);
  const [saving, setSaving] = useState(false);

  const [popup, setPopup] = useState({
    message: "",
    type: "success",
  });

  useEffect(() => {
    if (!popup.message) return;

    const timer = setTimeout(() => {
      setPopup({ message: "", type: "success" });
    }, 3000);

    return () => clearTimeout(timer);
  }, [popup]);

  const showPopup = (message, type = "success") => {
    setPopup({ message, type });
  };

  const updateForm = (event) => {
    const { name, value } = event.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Update a row and calculate/transfer weights automatically.
  const updateRow = (rowId, field, value) => {
    setRows((previousRows) => {
      const updatedRows = previousRows.map((row) => ({ ...row }));

      const index = updatedRows.findIndex(
        (row) => row.id === rowId
      );

      if (index === -1) return previousRows;

      const row = updatedRows[index];

      row[field] = value;

      // When Net Weight is entered:
      // Tare Weight = Gross Weight - Net Weight.
      if (field === "netWeight") {
        if (
          isBlank(value) ||
          isBlank(row.grossWeight) ||
          !Number.isFinite(Number(value)) ||
          !Number.isFinite(Number(row.grossWeight))
        ) {
          row.tareWeight = "";
          return updatedRows;
        }

        const gross = Number(row.grossWeight);
        const net = Number(value);
        const tare = Number((gross - net).toFixed(3));

        if (tare < 0) {
          row.tareWeight = "";
          return updatedRows;
        }

        row.tareWeight = tare;

        // Automatically transfer the tare weight to the
        // next row's gross weight, if the next row exists.
        if (updatedRows[index + 1]) {
          updatedRows[index + 1].grossWeight = tare;
        }

        return updatedRows;
      }

      // If Gross Weight changes, recalculate Net Weight.
      if (field === "grossWeight") {
        if (
          !isBlank(value) &&
          !isBlank(row.tareWeight) &&
          Number.isFinite(Number(value)) &&
          Number(value) >= Number(row.tareWeight)
        ) {
          row.netWeight = Number(
            (Number(value) - Number(row.tareWeight)).toFixed(3)
          );
        } else {
          row.netWeight = "";
        }
      }

      // If Tare Weight changes, recalculate Net Weight
      // and transfer the new tare to the next row.
      if (field === "tareWeight") {
        if (
          !isBlank(value) &&
          !isBlank(row.grossWeight) &&
          Number.isFinite(Number(value)) &&
          Number(value) >= 0 &&
          Number(row.grossWeight) >= Number(value)
        ) {
          row.netWeight = Number(
            (Number(row.grossWeight) - Number(value)).toFixed(3)
          );
        } else {
          row.netWeight = "";
        }

        if (
          updatedRows[index + 1] &&
          !isBlank(value) &&
          Number.isFinite(Number(value)) &&
          Number(value) >= 0
        ) {
          updatedRows[index + 1].grossWeight = Number(value);
        }
      }

      return updatedRows;
    });
  };

  // Existing manual tare-to-next-row transfer option.
  const handleTransferTareToNext = (rowId, checked) => {
    const index = rows.findIndex((row) => row.id === rowId);

    if (index === -1) return;

    if (index === rows.length - 1) {
      showPopup(
        "Add a next row before selecting this checkbox.",
        "error"
      );
      return;
    }

    const currentRow = rows[index];

    if (checked && isBlank(currentRow.tareWeight)) {
      showPopup(
        "Enter the current row's Tare Weight first.",
        "error"
      );
      return;
    }

    const transferredWeight = Number(currentRow.tareWeight);

    setRows((previousRows) =>
      previousRows.map((row, rowIndex) => {
        if (rowIndex === index) {
          return {
            ...row,
            transferTareToNext: checked,
          };
        }

        if (rowIndex === index + 1 && checked) {
          return {
            ...row,
            grossWeight: transferredWeight,
            netWeight: calculateNet(
              transferredWeight,
              row.tareWeight
            ),
          };
        }

        return row;
      })
    );

    if (checked) {
      setFirstWeight(transferredWeight);
      setSecondWeight("");

      setForm((previous) => ({
        ...previous,
        partyGrossWeight: transferredWeight,
        partyTareWeight: "",
      }));

      setCaptureStage(2);
    }
  };

  const addRows = () => {
    const count = Math.max(
      1,
      Math.min(50, Number(rowsToAdd) || 1)
    );

    const newRows = Array.from(
      { length: count },
      (_, index) => createRow(nextId + index)
    );

    setRows((previousRows) => [
      ...previousRows,
      ...newRows,
    ]);

    setNextId((previous) => previous + count);
  };

  const deleteRow = (rowId) => {
    if (rows.length <= 1) {
      showPopup(
        "At least one item row is required.",
        "error"
      );
      return;
    }

    setRows((previousRows) =>
      previousRows.filter((row) => row.id !== rowId)
    );
  };

  // Capture first and second weights using the existing
  // manual weight-entry interface.
  const handleGetWeight = () => {
    if (
      weightInMT.trim() === "" ||
      !Number.isFinite(Number(weightInMT)) ||
      Number(weightInMT) < 0
    ) {
      showPopup(
        "Please enter a valid weight in MT.",
        "error"
      );
      return;
    }

    if (!rows.length) {
      showPopup(
        "Please add at least one item row.",
        "error"
      );
      return;
    }

    const lastRow = rows[rows.length - 1];
    const weight = Number(weightInMT);

    if (captureStage === 1) {
      setFirstWeight(weight);
      setSecondWeight("");

      setForm((previous) => ({
        ...previous,
        partyGrossWeight: weight,
        partyTareWeight: "",
      }));

      setRows((previousRows) =>
        previousRows.map((row) =>
          row.id === lastRow.id
            ? {
                ...row,
                grossWeight: weight,
                tareWeight: "",
                netWeight: "",
              }
            : row
        )
      );

      setCaptureStage(2);
    } else {
      setSecondWeight(weight);

      setForm((previous) => ({
        ...previous,
        partyTareWeight: weight,
      }));

      setRows((previousRows) =>
        previousRows.map((row) =>
          row.id === lastRow.id
            ? {
                ...row,
                tareWeight: weight,
                netWeight: calculateNet(
                  row.grossWeight,
                  weight
                ),
              }
            : row
        )
      );

      setCaptureStage(1);
    }

    setWeightInMT("");
  };

  const handleReset = () => {
    setForm({
      date: new Date().toLocaleDateString("en-CA"),
      partyName: "",
      partyGrossWeight: "",
      partyTareWeight: "",
      vehicleNo: "",
      itemName: "Scrap",
      status: "Open",
    });

    setFirstWeight("");
    setSecondWeight("");
    setWeightInMT("");
    setCaptureStage(1);

    setRows([createRow(1)]);
    setNextId(2);
    setRowsToAdd(1);

    setPopup({
      message: "",
      type: "success",
    });
  };

  const partyNetWeight = calculateNet(
    form.partyGrossWeight,
    form.partyTareWeight
  );

  const captureNetWeight = calculateNet(
    firstWeight,
    secondWeight
  );

  // Total of every item row's net weight (shown under the table).
  const totalItemNetWeight = Number(
    rows
      .reduce((sum, row) => {
        const net =
          row.netWeight !== ""
            ? row.netWeight
            : calculateNet(row.grossWeight, row.tareWeight);

        const value = Number(net);

        return isBlank(net) || !Number.isFinite(value)
          ? sum
          : sum + value;
      }, 0)
      .toFixed(3)
  );

  const handleSave = async (
    event,
    targetStatus = form.status
  ) => {
    event.preventDefault();

    if (
      !form.date ||
      !form.partyName.trim() ||
      !form.vehicleNo.trim()
    ) {
      showPopup(
        "Date, Party Name, and Vehicle No are required.",
        "error"
      );
      return;
    }

    const gross = isBlank(form.partyGrossWeight)
      ? null
      : Number(form.partyGrossWeight);

    const tare = isBlank(form.partyTareWeight)
      ? null
      : Number(form.partyTareWeight);

    if (
      (gross !== null &&
        (!Number.isFinite(gross) || gross < 0)) ||
      (tare !== null &&
        (!Number.isFinite(tare) || tare < 0))
    ) {
      showPopup(
        "Gross and tare weights must be valid non-negative numbers.",
        "error"
      );
      return;
    }

    if (
      gross !== null &&
      tare !== null &&
      tare > gross
    ) {
      showPopup(
        "Party Tare Weight cannot exceed Party Gross Weight.",
        "error"
      );
      return;
    }

    const first = isBlank(firstWeight)
      ? null
      : Number(firstWeight);

    const second = isBlank(secondWeight)
      ? null
      : Number(secondWeight);

    const payload = {
      ...form,
      status: targetStatus,
      firstWeight: first,
      secondWeight: second,
      partyGrossWeight: gross,
      partyTareWeight: tare,
      partyNetWeight:
        gross === null || tare === null
          ? null
          : Number((gross - tare).toFixed(3)),
      netWeight:
        first === null || second === null
          ? null
          : Number((first - second).toFixed(3)),
      items: rows.map((row) => {
        const grossBlank = isBlank(row.grossWeight);
        const tareBlank = isBlank(row.tareWeight);

        const itemGross = grossBlank
          ? null
          : Number(row.grossWeight);

        const itemTare = tareBlank
          ? null
          : Number(row.tareWeight);

        const itemNet =
          !grossBlank && !tareBlank
            ? Number((itemGross - itemTare).toFixed(3))
            : null;

        return {
          itemName: row.itemName.trim(),
          grossWeight: itemGross,
          tareWeight: itemTare,
          netWeight: itemNet,
          transferTareToNext: Boolean(
            row.transferTareToNext
          ),
        };
      }),
    };

    setSaving(true);

    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || "Failed to save weighment."
        );
      }

      showPopup(
        `Weighment saved successfully! Weighment No: ${result.data.weighmentNo}`,
        "success"
      );

      setTimeout(() => navigate("/weighment"), 1600);
    } catch (error) {
      showPopup(
        error.message || "Failed to save weighment.",
        "error"
      );
    } finally {
      setSaving(false);
    }
  };

  const popupElement = popup.message ? (
    <div
      style={popupStyles.overlay}
      role="alertdialog"
      aria-modal="true"
      aria-live="assertive"
    >
      <div style={popupStyles.card}>
        <div
          style={{
            ...popupStyles.icon,
            color:
              popup.type === "success"
                ? "#15803d"
                : "#dc2626",
            background:
              popup.type === "success"
                ? "#dcfce7"
                : "#fee2e2",
          }}
        >
          {popup.type === "success" ? "✓" : "✕"}
        </div>

        <h3 style={popupStyles.title}>
          {popup.type === "success"
            ? "Success!"
            : "Failed!"}
        </h3>

        <p style={popupStyles.message}>
          {popup.message}
        </p>

        <button
          type="button"
          style={popupStyles.button}
          onClick={() =>
            setPopup({
              message: "",
              type: "success",
            })
          }
        >
          OK
        </button>
      </div>
    </div>
  ) : null;

  return (
    <div className="create-weighment-page">
      <div className="cw-top-line" />

      <header className="cw-header">
        <div className="cw-header-left">
          <button
            type="button"
            className="cw-back-button"
            onClick={() => navigate("/weighment")}
          >
            ← Back
          </button>

          <h2>Create Weighment</h2>
        </div>
      </header>

      <form onSubmit={(event) => handleSave(event, "Saved")}>
        <main className="cw-content">
          <section className="cw-card">
            <h3 className="cw-section-title">
              ▤ WEIGHMENT DETAILS
            </h3>

            <div className="cw-details-grid">
              <div className="cw-field">
                <label htmlFor="partyName">
                  PARTY NAME *
                </label>
                <input
                  id="partyName"
                  name="partyName"
                  value={form.partyName}
                  onChange={updateForm}
                  placeholder="Enter party name"
                  required
                />
              </div>

              <div className="cw-field">
                <label htmlFor="partyGrossWeight">
                  PARTY GROSS WEIGHT
                </label>
                <input
                  id="partyGrossWeight"
                  type="number"
                  min="0"
                  step="any"
                  name="partyGrossWeight"
                  value={form.partyGrossWeight ?? ""}
                  onChange={updateForm}
                />
              </div>

              <div className="cw-field">
                <label htmlFor="partyTareWeight">
                  PARTY TARE WEIGHT
                </label>
                <input
                  id="partyTareWeight"
                  type="number"
                  min="0"
                  step="any"
                  name="partyTareWeight"
                  value={form.partyTareWeight ?? ""}
                  onChange={updateForm}
                />
              </div>

              <div className="cw-field">
                <label htmlFor="partyNetWeight">
                  PARTY NET WEIGHT
                </label>
                <input
                  id="partyNetWeight"
                  value={partyNetWeight}
                  readOnly
                  className="cw-net-input"
                />
              </div>

              <div className="cw-field">
                <label htmlFor="vehicleNo">
                  VEHICLE NO *
                </label>
                <input
                  id="vehicleNo"
                  name="vehicleNo"
                  value={form.vehicleNo}
                  onChange={updateForm}
                  placeholder="Enter vehicle number"
                  required
                />
              </div>

              <div className="cw-field">
                <label htmlFor="itemName">
                  ITEM NAME *
                </label>
                <select
                  id="itemName"
                  name="itemName"
                  value={form.itemName}
                  onChange={updateForm}
                  required
                >
                  <option value="Scrap">Scrap</option>
                  <option value="Ramming Mass">
                    Ramming Mass
                  </option>
                  <option value="Sponge Iron">
                    Sponge Iron
                  </option>
                  <option value="Others">Others</option>
                </select>
              </div>

              <div className="cw-field">
                <label htmlFor="status">STATUS</label>
                <select
                  id="status"
                  name="status"
                  value={form.status}
                  onChange={updateForm}
                >
                  <option value="Open">Open</option>
                  <option value="Draft">Draft</option>
                  <option value="Saved">Saved</option>
                  <option value="Convert">Convert</option>
                </select>
              </div>

              <div className="cw-field">
                <label htmlFor="date">DATE *</label>
                <input
                  id="date"
                  type="date"
                  name="date"
                  value={form.date}
                  onChange={updateForm}
                  required
                />
              </div>
            </div>
          </section>

          <section className="cw-card">
            <h3 className="cw-section-title">
              ⚖ WEIGHT CAPTURE
            </h3>

            <div className="cw-capture-panel">
              <div className="cw-field">
                <label htmlFor="firstWeight">
                  FIRST WEIGHT
                </label>
                <input
                  id="firstWeight"
                  value={firstWeight ?? ""}
                  readOnly
                  className="cw-weight-input"
                  placeholder="—"
                />
              </div>

              <div className="cw-field">
                <label htmlFor="secondWeight">
                  SECOND WEIGHT
                </label>
                <input
                  id="secondWeight"
                  value={secondWeight ?? ""}
                  readOnly
                  className="cw-weight-input"
                  placeholder="—"
                />
              </div>

              <div className="cw-field">
                <label htmlFor="captureNetWeight">
                  NET WEIGHT
                </label>
                <input
                  id="captureNetWeight"
                  value={captureNetWeight}
                  readOnly
                  className="cw-net-input"
                  placeholder="—"
                />
              </div>

              <div className="cw-field">
                <label htmlFor="weightInMT">
                  WEIGHT (IN MT)
                  <span className="cw-weight-hint">
                    {" "}— enter weight here
                  </span>
                </label>

                <div className="cw-weight-entry">
                  <input
                    id="weightInMT"
                    type="number"
                    min="0"
                    step="any"
                    value={weightInMT}
                    onChange={(event) =>
                      setWeightInMT(event.target.value)
                    }
                    placeholder="Enter weight in MT"
                  />

                  <button
                    type="button"
                    className="cw-get-weight-button"
                    onClick={handleGetWeight}
                  >
                    Get Weight
                  </button>
                </div>

                <span className="cw-stage-label">
                  {captureStage === 1
                    ? "Next capture: First weight"
                    : "Next capture: Second weight"}
                </span>
              </div>
            </div>
          </section>

          <section className="cw-card">
            <h3 className="cw-section-title">▧ ITEMS</h3>

            <div className="cw-table-wrapper">
              <table className="cw-table cw-items-table">
                <thead>
                  <tr>
                    <th>SL NO</th>
                    <th>ITEM NAME</th>
                    <th>GROSS WEIGHT</th>
                    <th>TARE WEIGHT</th>
                    <th>NET WEIGHT</th>
                    <th>SELECT</th>
                    <th>ACTION</th>
                  </tr>
                </thead>

                <tbody>
                  {rows.map((row, index) => (
                    <tr key={row.id}>
                      <td className="cw-slno">
                        {index + 1}
                      </td>

                      <td>
                        <ItemNameCombobox
                          value={row.itemName}
                          onChange={(name) =>
                            updateRow(row.id, "itemName", name)
                          }
                          placeholder="Select or type item name"
                        />
                      </td>

                      <td>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={row.grossWeight ?? ""}
                          onChange={(event) =>
                            updateRow(
                              row.id,
                              "grossWeight",
                              event.target.value
                            )
                          }
                          placeholder="Gross weight"
                          className="cw-weight-input"
                        />
                      </td>

                      <td>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={row.tareWeight ?? ""}
                          onChange={(event) =>
                            updateRow(
                              row.id,
                              "tareWeight",
                              event.target.value
                            )
                          }
                          placeholder="Tare weight"
                          className="cw-weight-input"
                        />
                      </td>

                      <td>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={
                            row.netWeight !== ""
                              ? row.netWeight
                              : calculateNet(
                                  row.grossWeight,
                                  row.tareWeight
                                )
                          }
                          onChange={(event) =>
                            updateRow(
                              row.id,
                              "netWeight",
                              event.target.value
                            )
                          }
                          placeholder="Net weight"
                          className="cw-net-input"
                        />
                      </td>

                      <td>
                        <input
                          type="checkbox"
                          checked={Boolean(
                            row.transferTareToNext
                          )}
                          disabled={index === rows.length - 1}
                          title={
                            index === rows.length - 1
                              ? "Add another row first"
                              : "Transfer tare weight to the next row"
                          }
                          onChange={(event) =>
                            handleTransferTareToNext(
                              row.id,
                              event.target.checked
                            )
                          }
                        />
                      </td>

                      <td>
                        <button
                          type="button"
                          className="cw-delete-button"
                          onClick={() => deleteRow(row.id)}
                          disabled={rows.length === 1}
                          title="Delete row"
                        >
                          🗑
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="cw-total-bar">
              <span className="cw-total-label">
                TOTAL NET WEIGHT (ALL ITEMS)
              </span>
              <span className="cw-total-value">
                {totalItemNetWeight}
              </span>
            </div>

            <div className="cw-row-controls">
              <label htmlFor="rowsToAdd">
                Rows to add:
              </label>

              <input
                id="rowsToAdd"
                type="number"
                min="1"
                max="50"
                value={rowsToAdd}
                onChange={(event) =>
                  setRowsToAdd(event.target.value)
                }
              />

              <button
                type="button"
                className="cw-insert-button"
                onClick={addRows}
              >
                + Insert Row
              </button>
            </div>
          </section>
        </main>

        <footer className="cw-footer">
          <button
            type="button"
            className="cw-cancel-button"
            onClick={() => navigate("/weighment")}
          >
            Cancel
          </button>

          <button
            type="button"
            className="cw-draft-button"
            disabled={saving}
            onClick={(event) =>
              handleSave(event, "Draft")
            }
          >
            {saving ? "Saving..." : "Save as Draft"}
          </button>

          <button
            type="submit"
            className="cw-save-button"
            disabled={saving}
          >
            {saving ? "Saving..." : "Save & Create"}
          </button>
        </footer>
      </form>

      {popupElement}
    </div>
  );
}

const popupStyles = {
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.45)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "16px",
    zIndex: 99999,
  },
  card: {
    width: "340px",
    maxWidth: "100%",
    boxSizing: "border-box",
    background: "#fff",
    borderRadius: "14px",
    padding: "28px 24px",
    textAlign: "center",
    boxShadow: "0 12px 40px rgba(0,0,0,0.2)",
  },
  icon: {
    width: "58px",
    height: "58px",
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    margin: "0 auto 12px",
    fontSize: "32px",
    fontWeight: "bold",
  },
  title: {
    margin: "8px 0",
    fontSize: "22px",
    color: "#222",
  },
  message: {
    color: "#555",
    margin: "10px 0 22px",
    overflowWrap: "anywhere",
  },
  button: {
    width: "100%",
    border: "none",
    borderRadius: "8px",
    padding: "11px",
    background: "#2563eb",
    color: "#fff",
    fontWeight: 600,
    cursor: "pointer",
  },
};

export default WeighmentCreate;