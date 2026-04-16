"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { WorkflowStateName } from "@/types";

interface DashboardCaseItem {
  case_id: string;
  case_type: string;
  status: WorkflowStateName;
  applicant_name: string;
  created_date: string;
  last_updated: string;
  evidence_flag: "none" | "reminder" | "escalation";
  days_outstanding: number | null;
}

interface DashboardCasesResponse {
  cases: DashboardCaseItem[];
  totalCount: number;
  escalationCount: number;
}

const STATUS_DISPLAY: Record<WorkflowStateName, string> = {
  awaiting_evidence: "Awaiting evidence",
  evidence_received: "Evidence received",
  under_review: "Under review",
  awaiting_assessment: "Awaiting assessment",
  approved: "Approved",
  rejected: "Rejected",
  escalated: "Escalated",
  closed: "Closed",
};

const CASE_TYPE_DISPLAY: Record<string, string> = {
  dsa_application: "DSA Application",
  allowance_review: "Allowance Review",
  compliance_check: "Compliance Check",
};

export default function CaseListPage() {
  const router = useRouter();
  const [data, setData] = useState<DashboardCasesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sortField, setSortField] = useState("created_date");
  const [sortOrder, setSortOrder] = useState("desc");

  const fetchCases = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set("status", statusFilter);
      params.set("sort", sortField);
      params.set("order", sortOrder);

      const res = await fetch(`/api/dashboard/cases?${params.toString()}`);
      if (res.status === 401) {
        router.push("/dashboard/login");
        return;
      }
      if (!res.ok) {
        throw new Error("Failed to fetch cases");
      }
      const json: DashboardCasesResponse = await res.json();
      setData(json);
    } catch {
      setError("Sorry, there is a problem with the service. Try again later.");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, sortField, sortOrder, router]);

  useEffect(() => {
    fetchCases();
  }, [fetchCases]);

  function handleSort(field: string) {
    if (sortField === field) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortOrder("desc");
    }
  }

  function formatDate(iso: string): string {
    const d = new Date(iso);
    return d.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }

  return (
    <div className="govuk-width-container">
      <main className="govuk-main-wrapper" id="main-content" role="main">
        <h1 className="govuk-heading-l">Your cases</h1>

        {error && (
          <div
            className="govuk-error-summary"
            aria-labelledby="error-summary-title"
            role="alert"
            tabIndex={-1}
          >
            <h2 className="govuk-error-summary__title" id="error-summary-title">
              There is a problem
            </h2>
            <div className="govuk-error-summary__body">
              <p>{error}</p>
            </div>
          </div>
        )}

        {data && (
          <div className="govuk-grid-row" style={{ marginBottom: "20px" }}>
            <div className="govuk-grid-column-one-half">
              <p className="govuk-body">
                <strong className="govuk-!-font-weight-bold">Total cases:</strong>{" "}
                {data.totalCount}
              </p>
            </div>
            <div className="govuk-grid-column-one-half">
              <p className="govuk-body">
                <strong className="govuk-!-font-weight-bold">Escalations:</strong>{" "}
                <span
                  style={{
                    color: data.escalationCount > 0 ? "#d4351c" : undefined,
                    fontWeight: data.escalationCount > 0 ? "bold" : undefined,
                  }}
                >
                  {data.escalationCount}
                </span>
              </p>
            </div>
          </div>
        )}

        {/* Filter controls */}
        <div className="govuk-grid-row" style={{ marginBottom: "20px" }}>
          <div className="govuk-grid-column-one-third">
            <div className="govuk-form-group">
              <label className="govuk-label" htmlFor="status-filter">
                Filter by status
              </label>
              <select
                className="govuk-select"
                id="status-filter"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">All statuses</option>
                {Object.entries(STATUS_DISPLAY).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {loading && <p className="govuk-body">Loading cases…</p>}

        {!loading && data && data.cases.length === 0 && (
          <p className="govuk-body">No cases found.</p>
        )}

        {!loading && data && data.cases.length > 0 && (
          <table className="govuk-table">
            <thead className="govuk-table__head">
              <tr className="govuk-table__row">
                <th scope="col" className="govuk-table__header">
                  Case reference
                </th>
                <th scope="col" className="govuk-table__header">
                  Applicant
                </th>
                <th scope="col" className="govuk-table__header">
                  Case type
                </th>
                <th scope="col" className="govuk-table__header">
                  Status
                </th>
                <th
                  scope="col"
                  className="govuk-table__header"
                  style={{ cursor: "pointer" }}
                  onClick={() => handleSort("created_date")}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handleSort("created_date"); } }}
                  tabIndex={0}
                  role="button"
                  aria-sort={
                    sortField === "created_date"
                      ? sortOrder === "asc"
                        ? "ascending"
                        : "descending"
                      : "none"
                  }
                >
                  Date created{" "}
                  {sortField === "created_date"
                    ? sortOrder === "asc"
                      ? "▲"
                      : "▼"
                    : ""}
                </th>
                <th
                  scope="col"
                  className="govuk-table__header"
                  style={{ cursor: "pointer" }}
                  onClick={() => handleSort("last_updated")}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handleSort("last_updated"); } }}
                  tabIndex={0}
                  role="button"
                  aria-sort={
                    sortField === "last_updated"
                      ? sortOrder === "asc"
                        ? "ascending"
                        : "descending"
                      : "none"
                  }
                >
                  Last updated{" "}
                  {sortField === "last_updated"
                    ? sortOrder === "asc"
                      ? "▲"
                      : "▼"
                    : ""}
                </th>
                <th scope="col" className="govuk-table__header">
                  Flags
                </th>
              </tr>
            </thead>
            <tbody className="govuk-table__body">
              {data.cases.map((c) => (
                <tr key={c.case_id} className="govuk-table__row">
                  <td className="govuk-table__cell">
                    <a
                      href={`/dashboard/cases/${c.case_id}`}
                      className="govuk-link"
                    >
                      {c.case_id}
                    </a>
                  </td>
                  <td className="govuk-table__cell">{c.applicant_name}</td>
                  <td className="govuk-table__cell">
                    {CASE_TYPE_DISPLAY[c.case_type] ?? c.case_type}
                  </td>
                  <td className="govuk-table__cell">
                    {STATUS_DISPLAY[c.status] ?? c.status}
                  </td>
                  <td className="govuk-table__cell">
                    {formatDate(c.created_date)}
                  </td>
                  <td className="govuk-table__cell">
                    {formatDate(c.last_updated)}
                  </td>
                  <td className="govuk-table__cell">
                    {c.evidence_flag === "escalation" && (
                      <strong
                        className="govuk-tag govuk-tag--red"
                        title={`${c.days_outstanding} days outstanding — escalation required`}
                      >
                        Escalation ({c.days_outstanding}d)
                      </strong>
                    )}
                    {c.evidence_flag === "reminder" && (
                      <strong
                        className="govuk-tag govuk-tag--yellow"
                        title={`${c.days_outstanding} days outstanding — reminder due`}
                      >
                        Reminder ({c.days_outstanding}d)
                      </strong>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </main>
    </div>
  );
}
