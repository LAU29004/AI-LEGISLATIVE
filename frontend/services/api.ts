// services/api.ts
// ================
// Single source of truth for all FastAPI calls.

const BASE_URL = "http://172.19.221.120:8000"; // change to your machine's IP

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ApiBill {
  id: number;
  bill_number: string;
  title: string;
  year: string | null;
  status: string | null;
  pdf_url: string | null;
  compressed: boolean;
  original_tokens: number;
  compressed_tokens: number;
  compression_ratio: number;
}

export interface ApiSection {
  section_name: string;
  content: string;
}

export interface ApiBillDetail extends ApiBill {
  sections: ApiSection[];
}

export interface ChatResponse {
  answer: string;
  sources: {
    id: string;
    text: string;
    section: string;
    title: string;
    bill_number: string;
    score: number;
  }[];
  bill_number: string | null;
  bill_title: string | null;
  bills_used: { bill_number: string; title: string }[]; // ← added
}

export interface UploadPdfResponse {
  answer: string;
  bill_title: string;
  year: string;
  compression_ratio: number;
  sections_found: string[];
}

export interface IngestResponse {
  status: "already_exists" | "ingested" | "not_found";
  bill_number: string;
  message: string;
}

// ─── Bills ────────────────────────────────────────────────────────────────────

export async function fetchBills(search?: string): Promise<ApiBill[]> {
  const params = new URLSearchParams();
  if (search) params.append("search", search);
  const res = await fetch(`${BASE_URL}/bills?${params}`);
  if (!res.ok) throw new Error(`Failed to fetch bills: ${res.status}`);
  return res.json();
}

export async function fetchBillDetail(
  billNumber: string,
): Promise<ApiBillDetail> {
  const res = await fetch(`${BASE_URL}/bills/${billNumber}`);
  if (res.status === 404) throw new Error(`Bill ${billNumber} not found`);
  if (!res.ok) throw new Error(`Failed to fetch bill: ${res.status}`);
  return res.json();
}

// ─── Chat ─────────────────────────────────────────────────────────────────────

export async function sendChat(
  question: string,
  billNumber?: string,
): Promise<ChatResponse> {
  const res = await fetch(`${BASE_URL}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      question,
      bill_number: billNumber ?? null,
    }),
  });
  if (res.status === 404) {
    throw Object.assign(new Error("bill_not_found"), { status: 404 });
  }
  if (!res.ok) throw new Error(`Chat failed: ${res.status}`);
  return res.json();
}

// ─── PDF Upload ───────────────────────────────────────────────────────────────

export async function uploadPdf(
  fileUri: string,
  fileName: string,
  question?: string,
): Promise<UploadPdfResponse> {
  const formData = new FormData();
  formData.append("file", {
    uri: fileUri,
    name: fileName,
    type: "application/pdf",
  } as any);
  if (question) formData.append("question", question);

  const res = await fetch(`${BASE_URL}/upload-pdf`, {
    method: "POST",
    // ← No Content-Type header — fetch sets it automatically with the correct
    //   multipart boundary. Setting it manually breaks the upload.
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail ?? `Upload failed: ${res.status}`);
  }
  return res.json();
}

// ─── Trigger ingest ───────────────────────────────────────────────────────────

export async function triggerIngest(
  billNumber: string,
): Promise<IngestResponse> {
  const res = await fetch(`${BASE_URL}/trigger-ingest`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ bill_number: billNumber }),
  });
  if (!res.ok) throw new Error(`Ingest trigger failed: ${res.status}`);
  return res.json();
}
