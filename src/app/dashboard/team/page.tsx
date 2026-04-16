"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { WorkflowStateName } from "@/types";

interface TeamCaseItem {
  case_id: string;
  case_type: string;
  status: WorkflowStateName;
  applicant_name: string;
  created_date: string;
  last_updated: string;
  evidence_flag: "none" | "reminder" | "escalation";
  days_outstanding: number | null;
  assigned_to?: string;
}

interface TeamCasesResponse {
  cases: TeamCaseItem[];
  totalCount: number;
  escalationCount: number;
  stateCounts?: Record<string, number>;
}

interface TeamMember {
  username: string;
  display_name: string;
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

export default function TeamLeaderPage() {
  const router = useRouter();
  const [data, setData] = useState<TeamCasesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sortField, setSortField] = useState("created_date");
  const [sortOrder, setSortOrder] = useState("desc");
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [reassignCaseId, setReassignCaseId] = useState<string | null>(null);
  const [reassignTarget, setReassignTarget] = useState("");
  const [reassignError, setReassignError] = useState("");
  const [reassigning, setReassigning] = useState(false);

  const fetchCases = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ view: "team" });
      if (statusFilter) params.set("status", statusFilter);
      params.set("sort", sortField);
      params.set("order", sortOrder);

      const res = await fetch(`/api/dashboard/cases?${params.toString()}`);
      if (res.status === 401) {
        router.push("/dashboard/login");
        return;
      }
      if (!res.ok) throw new Error("Failed to fetch cases");
      const json: TeamCasesResponse = await res.json();
      setData(json);

      // Extract unique team members from case data
      const members = new Map<string, string>();
      for (const c of json.cases) {
        if (c.assigned_to) {
          members.set(c.assigned_to, c.assigned_to);
        }
      }
      setTeamMembers(
        Array.from(members.entries()).map(([username]) => ({
          username,
          display_name: username,
        }))
      );
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

  async function handleReassign(caseId: string) {
    if (!reassignTarget) {
      setReassignError("Select a team member to reassign to");
      return;
    }
    setReassigning(true);
    setReassignError("");
    try {
      const res = await fetch(`/api/dashboard/cases/${caseId}/reassign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newAssignee: reassignTarget }),
      });
      if (!res.ok) {
        const body = await res.json();
        setReassignError(body.error || "Failed to reassign case");
        return;
      }
      setReassignCaseId(null);
      setReassignTarget("");
      fetchCases();
    } catch {
      setReassignError("Failed to reassign case");
    } finally {
      setReassigning(false);
    }
  }

  const escalatedCases = data?.cases.filter((c) => c.evidence_flag === "escalation") ?? [];

  return (
    <div className="govuk-width-container">
      <main className="govuk-main-wrapper" id="main-content" role="main">
        <h1 className="govuk-heading-l">Team cases</h1>

        {error && (
          <div className="govuk-error-summary" aria-labelledby="error-summary-title" role="alert" tabIndex={-1}>
            <h2 className="govuk-error-summary__title" id="error-summary-title">There is a problem</h2>
            <div className="govuk-error-summary__body"><p>{error}</p></div>
          </div>
        )}

        {/* State counts summary */}
        {data?.stateCounts && (
          <div style={{ marginBottom: "30px" }}>
            <h2 className="govuk-heading-m">Cases by status</h2>
            <div className="govuk-grid-row">
              {Object.entries(data.stateCounts).map(([state, count]) => (
                <div key={state} className="govuk-grid-column-one-quarter" style={{ marginBottom: "10px" }}>
                  <div style={{ padding: "15px", border: "1px solid #b1b4b6", textAlign: "center" }}>
                    <p className="govuk-body govuk-!-font-weight-bold govuk-!-margin-bottom-1" style={{ fontSize: "36px" }}>
                      {count}
                    </p>
                    <p className="govuk-body-s govuk-!-margin-bottom-0">
                      {STATUS_DISPLAY[state as WorkflowStateName] ?? state}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {data && (
          <div className="govuk-grid-row" style={{ marginBottom: "20px" }}>
            <div className="govuk-grid-column-one-half">
              <p className="govuk-body">
                <strong className="govuk-!-font-weight-bold">Total cases:</strong> {data.totalCount}
              </p>
            </div>
            <div className="govuk-grid-column-one-half">
              <p className="govuk-body">
                <strong className="govuk-!-font-weight-bold">Escalations:</strong>{" "}
                <span style={{ color: data.escalationCount > 0 ? "#d4351c" : undefined, fontWeight: data.escalationCount > 0 ? "bold" : undefined }}>
                  {data.escalationCount}
                </span>
              </p>
            </div>
          </div>
        )}

        {/* Escalated cases panel */}
        {escalatedCases.length > 0 && (
          <div style={{ marginBottom: "30px", border: "5px solid #d4351c", padding: "20px" }}>
            <h2 className="govuk-heading-m" style={{ color: "#d4351c" }}>
              Escalated cases — action required
            </h2>
            <table className="govuk-table">
              <thead className="govuk-table__head">
                <tr className="govuk-table__row">
                  <th scope="col" className="govuk-table__header">Case reference</th>
                  <th scope="col" className="govuk-table__header">Applicant</th>
                  <th scope="col" className="govuk-table__header">Assigned to</th>
                  <th scope="col" className="govuk-table__header">Days outstanding</th>
                </tr>
              </thead>
              <tbody className="govuk-table__body">
                {escalatedCases.map((c) => (
                  <tr key={c.case_id} className="govuk-table__row">
                    <td className="govuk-table__cell">
                      <a href={`/dashboard/cases/${c.case_id}`} className="govuk-link">{c.case_id}</a>
                    </td>
                    <td className="govuk-table__cell">{c.applicant_name}</td>
                    <td className="govuk-table__cell">{c.assigned_to}</td>
                    <td className="govuk-table__cell">
                      <strong className="govuk-tag govuk-tag--red">{c.days_outstanding}d</strong>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Filter controls */}
        <div className="govuk-grid-row" style={{ marginBottom: "20px" }}>
          <div className="govuk-grid-column-one-third">
            <div className="govuk-form-group">
              <label className="govuk-label" htmlFor="status-filter">Filter by status</label>
              <select className="govuk-select" id="status-filter" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="">All statuses</option>
                {Object.entries(STATUS_DISPLAY).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
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
                <th scope="col" className="govuk-table__header">Case reference</th>
                <th scope="col" className="govuk-table__header">Applicant</th>
                <th scope="col" className="govuk-table__header">Case type</th>
                <th scope="col" className="govuk-table__header">Status</th>
                <th scope="col" className="govuk-table__header">Assigned to</th>
                <th scope="col" className="govuk-table__header" style={{ cursor: "pointer" }} onClick={() => handleSort("created_date")}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handleSort("created_date"); } }}
                  tabIndex={0} role="button"
                  aria-sort={sortField === "created_date" ? (sortOrder === "asc" ? "ascending" : "descending") : "none"}>
                  Date created {sortField === "created_date" ? (sortOrder === "asc" ? "▲" : "▼") : ""}
                </th>
                <th scope="col" className="govuk-table__header" style={{ cursor: "pointer" }} onClick={() => handleSort("last_updated")}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handleSort("last_updated"); } }}
                  tabIndex={0} role="button"
                  aria-sort={sortField === "last_updated" ? (sortOrder === "asc" ? "ascending" : "descending") : "none"}>
                  Last updated {sortField === "last_updated" ? (sortOrder === "asc" ? "▲" : "▼") : ""}
                </th>
                <th scope="col" className="govuk-table__header">Flags</th>
                <th scope="col" className="govuk-table__header">Actions</th>
              </tr>
            </thead>
            <tbody className="govuk-table__body">
              {data.cases.map((c) => (
                <tr key={c.case_id} className="govuk-table__row">
                  <td className="govuk-table__cell">
                    <a href={`/dashboard/cases/${c.case_id}`} className="govuk-link">{c.case_id}</a>
                  </td>
                  <td className="govuk-table__cell">{c.applicant_name}</td>
                  <td className="govuk-table__cell">{CASE_TYPE_DISPLAY[c.case_type] ?? c.case_type}</td>
                  <td className="govuk-table__cell">{STATUS_DISPLAY[c.status] ?? c.status}</td>
                  <td className="govuk-table__cell">{c.assigned_to}</td>
                  <td className="govuk-table__cell">{formatDate(c.created_date)}</td>
                  <td className="govuk-table__cell">{formatDate(c.last_updated)}</td>
                  <td className="govuk-table__cell">
                    {c.evidence_flag === "escalation" && (
                      <strong className="govuk-tag govuk-tag--red" title={`${c.days_outstanding} days outstanding — escalation required`}>
                        Escalation ({c.days_outstanding}d)
                      </strong>
                    )}
                    {c.evidence_flag === "reminder" && (
                      <strong className="govuk-tag govuk-tag--yellow" title={`${c.days_outstanding} days outstanding — reminder due`}>
                        Reminder ({c.days_outstanding}d)
                      </strong>
                    )}
                  </td>
                  <td className="govuk-table__cell">
                    {reassignCaseId === c.case_id ? (
                      <div>
                        <select
                          className="govuk-select"
                          value={reassignTarget}
                          onChange={(e) => setReassignTarget(e.target.value)}
                          aria-label={`Reassign case ${c.case_id} to`}
                        >
                          <option value="">Select team member</option>
                          {teamMembers
                            .filter((m) => m.username !== c.assigned_to)
                            .map((m) => (
                              <option key={m.username} value={m.username}>{m.display_name}</option>
                            ))}
                        </select>
                        <div style={{ marginTop: "5px" }}>
                          <button
                            className="govuk-button govuk-button--secondary govuk-!-margin-right-1"
                            style={{ marginBottom: 0 }}
                            onClick={() => handleReassign(c.case_id)}
                            disabled={reassigning}
                          >
                            {reassigning ? "Reassigning…" : "Confirm"}
                          </button>
                          <button
                            className="govuk-button govuk-button--warning"
                            style={{ marginBottom: 0 }}
                            onClick={() => { setReassignCaseId(null); setReassignTarget(""); setReassignError(""); }}
                          >
                            Cancel
                          </button>
                        </div>
                        {reassignError && (
                          <p className="govuk-error-message" style={{ marginTop: "5px" }}>
                            <span className="govuk-visually-hidden">Error:</span> {reassignError}
                          </p>
                        )}
                      </div>
                    ) : (
                      <button
                        className="govuk-button govuk-button--secondary"
                        style={{ marginBottom: 0 }}
                        onClick={() => { setReassignCaseId(c.case_id); setReassignTarget(""); setReassignError(""); }}
                      >
                        Reassign
                      </button>
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
