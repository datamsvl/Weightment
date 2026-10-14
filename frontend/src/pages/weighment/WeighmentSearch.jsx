
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./WeighmentSearch.css";

const API_URL = "https://weightment-backend.onrender.com";

const initialFilters = {
  date: "",
  partyName: "",
  vehicleNo: "",
  status: "Active",
};

function formatDate(value) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  });
}

function getStatusClass(status) {
  switch ((status || "").toLowerCase()) {
    case "draft":
      return "status-draft";
    case "open":
      return "status-open";
    case "saved":
      return "status-saved";
    case "convert":
      return "status-convert";
    default:
      return "status-default";
  }
}

export default function WeighmentSearch() {
  const navigate = useNavigate();

  const [filters, setFilters] = useState(initialFilters);
  const [appliedFilters, setAppliedFilters] = useState(initialFilters);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function handleFilterChange(event) {
    const { name, value } = event.target;

    setFilters((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  function handleSearch(event) {
    event.preventDefault();
    setAppliedFilters({ ...filters });
  }

  function handleReset() {
    setFilters({ ...initialFilters });
    setAppliedFilters({ ...initialFilters });
  }

  useEffect(() => {
    const controller = new AbortController();

    async function fetchWeighments() {
      setLoading(true);
      setError("");

      try {
        const params = new URLSearchParams();

        Object.entries(appliedFilters).forEach(([key, value]) => {
          if (!value || value === "All") return;

          params.set(key, value.trim ? value.trim() : value);
        });

        const response = await fetch(
          `${API_URL}?${params.toString()}`,
          { signal: controller.signal }
        );

        const result = await response.json();

        if (!response.ok || result.success === false) {
          throw new Error(
            result.message || "Unable to fetch weighment records."
          );
        }

        const data = Array.isArray(result)
          ? result
          : Array.isArray(result.data)
            ? result.data
            : [];

        setRecords(data);
      } catch (err) {
        if (err.name !== "AbortError") {
          setRecords([]);
          setError(
            err.message || "Unable to connect to the server."
          );
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    fetchWeighments();

    return () => controller.abort();
  }, [appliedFilters]);

  function openRecord(record) {
    if (!record?._id) return;
    navigate(`/weighment/edit/${record._id}`);
  }

  function handleRowKeyDown(event, record) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openRecord(record);
    }
  }

  return (
    <div className="weighment-page">
      {/* Page heading */}
      <div className="ws-page-header">
        <div>
          <h1>Weighment</h1>
          <p>Search and manage weighment records</p>
        </div>

        <button
          type="button"
          className="ws-create-btn"
          onClick={() => navigate("/weighment/create")}
        >
          <span className="ws-create-icon">+</span>
          Create Weighment
        </button>
      </div>

      {/* Search filters */}
      <form className="ws-filter-card" onSubmit={handleSearch}>
        <div className="ws-filter-heading">
          <div>
            <h2>Search Filters</h2>
            <p>Enter the details to find a weighment record.</p>
          </div>
        </div>

        <div className="ws-filter-grid">
          <div className="ws-field">
            <label htmlFor="ws-date">Date</label>
            <input
              id="ws-date"
              type="date"
              name="date"
              value={filters.date}
              onChange={handleFilterChange}
            />
          </div>

          <div className="ws-field">
            <label htmlFor="ws-partyName">Party Name</label>
            <input
              id="ws-partyName"
              type="text"
              name="partyName"
              placeholder="Enter party name"
              value={filters.partyName}
              onChange={handleFilterChange}
            />
          </div>

          <div className="ws-field">
            <label htmlFor="ws-vehicleNo">Vehicle No.</label>
            <input
              id="ws-vehicleNo"
              type="text"
              name="vehicleNo"
              placeholder="Enter vehicle number"
              value={filters.vehicleNo}
              onChange={handleFilterChange}
            />
          </div>

          <div className="ws-field">
            <label htmlFor="ws-status">Status</label>
            <select
              id="ws-status"
              name="status"
              value={filters.status}
              onChange={handleFilterChange}
            >
              <option value="Active">Active</option>
              <option value="All">All</option>
              <option value="Open">Open</option>
              <option value="Draft">Draft</option>
              <option value="Saved">Saved</option>
              <option value="Convert">Convert</option>
            </select>
          </div>
        </div>

        <div className="ws-filter-actions">
          <button type="submit" className="ws-search-btn">
            Search
          </button>

          <button
            type="button"
            className="ws-reset-btn"
            onClick={handleReset}
          >
            Reset
          </button>
        </div>
      </form>

      {/* Search results */}
      <section className="ws-results">
        <div className="ws-results-header">
          <div>
            <h2>Search Results</h2>
            <p>View and edit your weighment records.</p>
          </div>

          <span className="ws-results-count">
            {loading ? "Loading..." : `${records.length} Records`}
          </span>
        </div>

        {loading ? (
          <div className="ws-loading">
            <span className="ws-spinner" />
            Loading weighment records...
          </div>
        ) : error ? (
          <div className="ws-error">
            <p>{error}</p>
            <button
              type="button"
              className="ws-retry-btn"
              onClick={() =>
                setAppliedFilters({ ...appliedFilters })
              }
            >
              Try Again
            </button>
          </div>
        ) : records.length === 0 ? (
          <div className="ws-empty">
            <div className="ws-empty-icon">⌕</div>
            <h3>No weighment records found</h3>
            <p>Change your filters or create a new weighment record.</p>
          </div>
        ) : (
          <div className="ws-table-wrapper">
            <table className="ws-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Vehicle No.</th>
                  <th>Party Name</th>
                  <th>Weighment No.</th>
                  <th>Status</th>
                  <th className="ws-action-heading">Action</th>
                </tr>
              </thead>

              <tbody>
                {records.map((record) => (
                  <tr
                    key={record._id}
                    tabIndex={0}
                    onClick={() => openRecord(record)}
                    onKeyDown={(event) =>
                      handleRowKeyDown(event, record)
                    }
                    title="Click to open this weighment"
                  >
                    <td>{formatDate(record.date)}</td>
                    <td className="ws-vehicle-cell">
                      {record.vehicleNo || "-"}
                    </td>
                    <td className="ws-party-cell">
                      {record.partyName || "-"}
                    </td>
                    <td className="ws-number-cell">
                      {record.weighmentNo || "-"}
                    </td>
                    <td>
                      <span
                        className={`ws-status-badge ${getStatusClass(
                          record.status
                        )}`}
                      >
                        <span className="ws-status-dot" />
                        {record.status || "Unknown"}
                      </span>
                    </td>
                    <td className="ws-action-cell">
                      <button
                        type="button"
                        className="ws-edit-btn"
                        onClick={(event) => {
                          event.stopPropagation();
                          openRecord(record);
                        }}
                      >
                        Edit <span aria-hidden="true">→</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && !error && records.length > 0 && (
          <div className="ws-results-footer">
            Showing {records.length} record
            {records.length !== 1 ? "s" : ""}
          </div>
        )}
      </section>
    </div>
  );
}
