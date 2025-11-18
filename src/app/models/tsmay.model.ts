export interface TSMay {
  id?: number;
  congSuat?: number | null;
  soMay?: string | null;
  sbb?: string | null;
  lsx?: string | null;
  tChuanLSX?: string | null;
  tbkt?: string | null;
  po?: string | null;
  io?: string | null;
  pk75H1?: string | null;
  pk75H2?: string | null;
  uk75H1?: string | null;
  uk75H2?: string | null;
  udmHVH1?: string | null;
  udmHVH2?: string | null;
  udmLV?: string | null;
}

export interface CreateTSMayRequest {
  congSuat?: number | null;
  soMay?: string | null;
  sbb?: string | null;
  lsx?: string | null;
  tChuanLSX?: string | null;
  tbkt?: string | null;
  po?: string | null;
  io?: string | null;
  pk75H1?: string | null;
  pk75H2?: string | null;
  uk75H1?: string | null;
  uk75H2?: string | null;
  udmHVH1?: string | null;
  udmHVH2?: string | null;
  udmLV?: string | null;
}

export interface BulkCreateTSMayRequest {
  items: CreateTSMayRequest[];
}

export interface BulkCreateTSMayResponse {
  success: boolean;
  total: number;
  created: number;
  failed: number;
  errors?: Array<{
    index: number;
    data: CreateTSMayRequest;
    error: string;
  }>;
}

