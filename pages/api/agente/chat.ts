import type { NextApiResponse } from "next";
import { DataSource } from "typeorm";
import {
  type AuthenticatedRequest,
  withSupabaseAuth,
} from "@/lib/supabase-middleware";
import { decryptApiKey } from "@/lib/agent-crypto";
import { buildSystemPrompt } from "@/lib/agent-default-prompt";
import {
  AGENT_ACCESSIBLE_TABLES,
  TABLE_DESCRIPTIONS,
} from "@/lib/agent-schema";
import type { AgentProvider } from "@/types";
import { getSupabaseServiceRole } from "@/lib/supabase-auth";

// Rate limiter (in-memory)
const rateLimiter = new Map<number, { count: number; resetAt: number }>();

function checkRateLimit(userId: number): boolean {
  const now = Date.now();
  const userLimit = rateLimiter.get(userId);

  if (!userLimit || now > userLimit.resetAt) {
    rateLimiter.set(userId, { count: 1, resetAt: now + 60000 });
    return true;
  }

  if (userLimit.count >= 30) return false;
  userLimit.count++;
  return true;
}

let cachedDataSource: DataSource | null = null;

async function getDataSource(): Promise<DataSource> {
  if (cachedDataSource?.isInitialized) return cachedDataSource;

  const dbUrl = process.env.SUPABASE_DB_URL;
  if (!dbUrl) {
    throw new Error(
      "Variavel de ambiente SUPABASE_DB_URL nao configurada. Adicione no Doppler.",
    );
  }

  if (!dbUrl.startsWith("postgres://") && !dbUrl.startsWith("postgresql://")) {
    throw new Error(
      "SUPABASE_DB_URL com formato invalido. Deve comecar com postgresql:// ou postgres://",
    );
  }

  try {
    cachedDataSource = new DataSource({
      type: "postgres",
      url: dbUrl,
      ssl: { rejectUnauthorized: false },
    });
    await cachedDataSource.initialize();
    return cachedDataSource;
  } catch (err) {
    cachedDataSource = null;
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("Invalid URL") || msg.includes("ERR_INVALID_URL")) {
      throw new Error(
        "SUPABASE_DB_URL com formato invalido. Verifique a connection string no Supabase Dashboard > Settings > Database.",
      );
    }
    if (msg.includes("ECONNREFUSED") || msg.includes("ETIMEDOUT")) {
      throw new Error(
        "Nao foi possivel conectar ao banco de dados. Verifique se a SUPABASE_DB_URL esta correta e se o banco esta acessivel.",
      );
    }
    if (msg.includes("password authentication failed")) {
      throw new Error(
        "Senha do banco de dados incorreta. Verifique a SUPABASE_DB_URL no Doppler.",
      );
    }
    throw new Error(`Erro ao conectar ao banco: ${msg}`);
  }
}

function mapErrorMessage(rawMsg: string): string {
  if (rawMsg.includes("SUPABASE_DB_URL")) return rawMsg;
  if (rawMsg.includes("AGENT_ENCRYPTION_KEY")) {
    return "Chave de encriptacao nao configurada. Contate o administrador.";
  }
  if (
    rawMsg.includes("Incorrect API key") ||
    rawMsg.includes("invalid x-api-key") ||
    rawMsg.includes("invalid_api_key")
  ) {
    return "API key invalida ou revogada. Gere uma nova chave e atualize na aba Configuracao.";
  }
  if (
    rawMsg.includes("insufficient_quota") ||
    rawMsg.includes("rate_limit") ||
    rawMsg.includes("429")
  ) {
    return "Limite de uso da API excedido. Verifique seu plano ou aguarde alguns minutos.";
  }
  if (
    rawMsg.includes("model_not_found") ||
    rawMsg.includes("does not exist") ||
    rawMsg.includes("404")
  ) {
    return "Modelo selecionado nao disponivel. Troque o modelo na aba Configuracao.";
  }
  if (
    rawMsg.includes("ECONNREFUSED") ||
    rawMsg.includes("ETIMEDOUT") ||
    rawMsg.includes("fetch failed")
  ) {
    return "Falha de conexao com o servico de IA. Tente novamente em alguns segundos.";
  }
  if (
    rawMsg.includes("ECONNRESET") ||
    rawMsg.includes("terminated") ||
    rawMsg.includes("socket hang up")
  ) {
    return "A conexao com o servico de IA foi interrompida. Tente novamente ou simplifique a pergunta.";
  }
  if (rawMsg.includes("timeout") || rawMsg.includes("Timeout")) {
    return "A consulta demorou demais e foi cancelada. Tente simplificar sua pergunta.";
  }
  if (rawMsg.includes("401")) {
    return "Erro de autenticacao com a API. Verifique sua API key na aba Configuracao.";
  }
  return rawMsg;
}

function sendSSE(res: NextApiResponse, data: Record<string, unknown>) {
  res.write(`data: ${JSON.stringify(data)}\n\n`);
  if (typeof (res as unknown as { flush?: () => void }).flush === "function") {
    (res as unknown as { flush: () => void }).flush();
  }
}

function sendSSEError(res: NextApiResponse, message: string) {
  sendSSE(res, { type: "error", message });
  res.write("data: [DONE]\n\n");
  res.end();
}

export const config = {
  api: {
    bodyParser: true,
    responseLimit: false,
  },
};

type InputItem =
  | { role: "user" | "assistant" | "system"; content: string }
  | { type: "function_call_output"; call_id: string; output: string };

interface FunctionCall {
  id: string;
  call_id: string;
  name: string;
  arguments: string;
}

interface ToolCallRecord {
  tool_name: string;
  args: Record<string, unknown>;
  result: unknown;
  start_time?: number;
  execution_time_ms?: number;
}

interface SqlQueryRecord {
  sql: string;
  explanation: string;
  rows_returned: number;
  execution_time_ms: number;
}

interface StreamRunResult {
  finalText: string;
  reasoningText: string;
  responseId: string | null;
  pendingFunctionCalls: FunctionCall[];
  usage: { input_tokens: number; output_tokens: number } | null;
}

interface OpenAIStreamEvent {
  type?: string;
  delta?: string;
  item_id?: string;
  output_index?: number;
  arguments?: string;
  item?: {
    id?: string;
    type?: string;
    name?: string;
    call_id?: string;
    arguments?: string;
  };
  response?: {
    id?: string;
    usage?: {
      input_tokens?: number;
      output_tokens?: number;
      prompt_tokens?: number;
      completion_tokens?: number;
    };
    error?: { message?: string };
  };
  error?: { message?: string };
}

const QUERY_SQL_TOOL = {
  type: "function",
  name: "query_sql",
  description:
    "Executa uma consulta SQL SELECT somente leitura no PostgreSQL do MeguisPet. Use para analises ad-hoc quando as respostas exigirem dados reais.",
  parameters: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description:
          "Consulta SQL PostgreSQL. Apenas SELECT/WITH. Use LIMIT 500 ou menor.",
      },
    },
    required: ["query"],
    additionalProperties: false,
  },
  strict: true,
} as const;

const DESCRIBE_TABLE_TOOL = {
  type: "function",
  name: "describe_table",
  description:
    "Mostra descricao, colunas e relacoes de uma tabela permitida ao agente.",
  parameters: {
    type: "object",
    properties: {
      table_name: {
        type: "string",
        enum: AGENT_ACCESSIBLE_TABLES,
        description: "Nome da tabela permitida.",
      },
    },
    required: ["table_name"],
    additionalProperties: false,
  },
  strict: true,
} as const;

const LIST_TABLES_TOOL = {
  type: "function",
  name: "list_tables",
  description: "Lista as tabelas que o agente pode consultar.",
  parameters: {
    type: "object",
    properties: {},
    additionalProperties: false,
  },
  strict: true,
} as const;

const TOOLS = [QUERY_SQL_TOOL, DESCRIBE_TABLE_TOOL, LIST_TABLES_TOOL];
const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";
const DEFAULT_MODEL = "gpt-5-mini";
const READ_ONLY_TIMEOUT_MS = 20_000;
const MAX_ROWS_RETURNED = 500;

const ALLOWED_TABLES = new Set<string>(AGENT_ACCESSIBLE_TABLES);
const BANNED_TABLES = [
  "usuarios",
  "agent_configs",
  "agent_conversations",
  "agent_messages",
  "role_permissions_config",
  "auth.users",
];

function normalizeSql(sql: string): string {
  const trimmed = sql.trim();
  const withoutTrailingSemicolon = trimmed.replace(/;\s*$/, "");
  if (withoutTrailingSemicolon.includes(";")) {
    throw new Error("query_sql aceita uma unica instrucao SELECT por vez.");
  }
  return withoutTrailingSemicolon;
}

function extractCteNames(sql: string): Set<string> {
  const ctes = new Set<string>();
  const regex = /(?:WITH|,)\s+"?([a-zA-Z_][a-zA-Z0-9_]*)"?\s+AS\s*\(/gi;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(sql)) !== null) {
    ctes.add(match[1].toLowerCase());
  }
  return ctes;
}

function validateReadOnlySql(sql: string): string {
  const normalized = normalizeSql(sql);
  const compact = normalized.replace(/\s+/g, " ").trim();
  const upper = compact.toUpperCase();

  if (!upper.startsWith("SELECT") && !upper.startsWith("WITH")) {
    throw new Error("query_sql aceita apenas SELECT/WITH.");
  }

  const banned =
    /\b(INSERT|UPDATE|DELETE|DROP|TRUNCATE|ALTER|CREATE|GRANT|REVOKE|REPLACE|MERGE|CALL|COPY|VACUUM|ANALYZE)\b/i;
  if (banned.test(compact)) {
    throw new Error("query_sql e somente leitura. Escrita/DDL nao e permitido.");
  }

  const lower = compact.toLowerCase();
  for (const table of BANNED_TABLES) {
    if (lower.includes(table)) {
      throw new Error(`Tabela nao permitida para o agente: ${table}`);
    }
  }

  const cteNames = extractCteNames(compact);
  const tableRegex = /\b(?:from|join)\s+("?[\w.]+"?)/gi;
  let match: RegExpExecArray | null;
  while ((match = tableRegex.exec(compact)) !== null) {
    const rawName = match[1].replace(/"/g, "");
    const tableName = rawName.split(".").pop()?.toLowerCase() || rawName;
    if (cteNames.has(tableName)) continue;
    if (!ALLOWED_TABLES.has(tableName)) {
      throw new Error(
        `Tabela '${rawName}' nao esta liberada para o agente. Use list_tables para ver as tabelas permitidas.`,
      );
    }
  }

  return normalized;
}

async function executeReadOnlySql(sql: string): Promise<{
  rows: unknown[];
  rowCount: number;
  truncated: boolean;
}> {
  const query = validateReadOnlySql(sql);
  const dataSource = await getDataSource();

  const rows = await dataSource.transaction(async (manager) => {
    await manager.query("SET TRANSACTION READ ONLY");
    await manager.query(`SET LOCAL statement_timeout = ${READ_ONLY_TIMEOUT_MS}`);
    return manager.query(query) as Promise<unknown[]>;
  });

  const safeRows = Array.isArray(rows) ? rows : [];
  return {
    rows: safeRows.slice(0, MAX_ROWS_RETURNED),
    rowCount: safeRows.length,
    truncated: safeRows.length > MAX_ROWS_RETURNED,
  };
}

async function describeTable(tableName: string): Promise<Record<string, unknown>> {
  const normalized = tableName.toLowerCase();
  if (!ALLOWED_TABLES.has(normalized)) {
    throw new Error(`Tabela nao permitida: ${tableName}`);
  }

  const dataSource = await getDataSource();
  const columns = await dataSource.query(
    `
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = $1
      ORDER BY ordinal_position
    `,
    [normalized],
  ) as unknown[];

  return {
    table: normalized,
    description: TABLE_DESCRIPTIONS[normalized] || "",
    columns,
  };
}

async function executeTool(
  call: FunctionCall,
  send: (data: Record<string, unknown>) => void,
  toolCalls: ToolCallRecord[],
  sqlQueries: SqlQueryRecord[],
): Promise<InputItem> {
  let args: Record<string, unknown> = {};
  try {
    args = JSON.parse(call.arguments || "{}") as Record<string, unknown>;
  } catch {
    args = {};
  }

  const startedAt = Date.now();
  const record: ToolCallRecord = {
    tool_name: call.name,
    args,
    result: null,
    start_time: startedAt,
  };
  toolCalls.push(record);

  if (call.name === "query_sql") {
    const sql = String(args.query || "");
    send({ type: "tool_call", tool: call.name, args, sql });

    const queryRecord: SqlQueryRecord = {
      sql,
      explanation: "Consulta executada pelo agente",
      rows_returned: 0,
      execution_time_ms: 0,
    };
    sqlQueries.push(queryRecord);

    try {
      const result = await executeReadOnlySql(sql);
      const ms = Date.now() - startedAt;
      queryRecord.rows_returned = result.rowCount;
      queryRecord.execution_time_ms = ms;
      record.result = result;
      record.execution_time_ms = ms;
      send({
        type: "tool_result",
        tool: call.name,
        result,
        sql,
        rows_returned: result.rowCount,
        execution_time_ms: ms,
      });
      return {
        type: "function_call_output",
        call_id: call.call_id,
        output: JSON.stringify(result),
      };
    } catch (err) {
      const ms = Date.now() - startedAt;
      const output = { error: err instanceof Error ? err.message : String(err) };
      queryRecord.execution_time_ms = ms;
      record.result = output;
      record.execution_time_ms = ms;
      send({
        type: "tool_result",
        tool: call.name,
        result: output,
        sql,
        execution_time_ms: ms,
      });
      return {
        type: "function_call_output",
        call_id: call.call_id,
        output: JSON.stringify(output),
      };
    }
  }

  send({ type: "tool_call", tool: call.name, args });

  try {
    const result = call.name === "describe_table"
      ? await describeTable(String(args.table_name || ""))
      : {
        tables: AGENT_ACCESSIBLE_TABLES.map((table) => ({
          name: table,
          description: TABLE_DESCRIPTIONS[table] || "",
        })),
      };
    const ms = Date.now() - startedAt;
    record.result = result;
    record.execution_time_ms = ms;
    send({
      type: "tool_result",
      tool: call.name,
      result,
      execution_time_ms: ms,
    });
    return {
      type: "function_call_output",
      call_id: call.call_id,
      output: JSON.stringify(result),
    };
  } catch (err) {
    const ms = Date.now() - startedAt;
    const output = { error: err instanceof Error ? err.message : String(err) };
    record.result = output;
    record.execution_time_ms = ms;
    send({
      type: "tool_result",
      tool: call.name,
      result: output,
      execution_time_ms: ms,
    });
    return {
      type: "function_call_output",
      call_id: call.call_id,
      output: JSON.stringify(output),
    };
  }
}

async function* parseOpenAIStream(
  body: ReadableStream<Uint8Array>,
): AsyncGenerator<OpenAIStreamEvent> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const events = buffer.split("\n\n");
    buffer = events.pop() || "";

    for (const rawEvent of events) {
      const dataLines = rawEvent
        .split("\n")
        .filter((line) => line.startsWith("data: "))
        .map((line) => line.slice(6));
      for (const data of dataLines) {
        if (!data || data === "[DONE]") continue;
        try {
          yield JSON.parse(data) as OpenAIStreamEvent;
        } catch {
          // Ignore non-JSON stream fragments.
        }
      }
    }
  }
}

async function createOpenAIStream(
  apiKey: string,
  payload: Record<string, unknown>,
): Promise<ReadableStream<Uint8Array>> {
  const response = await fetch(OPENAI_RESPONSES_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ ...payload, stream: true }),
  });

  if (!response.ok || !response.body) {
    let detail = await response.text();
    try {
      const parsed = JSON.parse(detail) as { error?: { message?: string } };
      detail = parsed.error?.message || detail;
    } catch {
      // Keep raw detail.
    }
    throw new Error(detail || `OpenAI API error ${response.status}`);
  }

  return response.body;
}

async function runResponsesStream(
  apiKey: string,
  payload: Record<string, unknown>,
  send: (data: Record<string, unknown>) => void,
  state: { answerStartSent: boolean },
): Promise<StreamRunResult> {
  const stream = await createOpenAIStream(apiKey, payload);
  const result: StreamRunResult = {
    finalText: "",
    reasoningText: "",
    responseId: null,
    pendingFunctionCalls: [],
    usage: null,
  };

  const argBuffer = new Map<string, string>();

  for await (const event of parseOpenAIStream(stream)) {
    const type = event.type;
    if (!type) continue;

    if (type === "response.created" || type === "response.in_progress") {
      if (event.response?.id) result.responseId = event.response.id;
      continue;
    }

    if (type === "response.output_text.delta") {
      const delta = event.delta || "";
      if (delta) {
        if (!state.answerStartSent) {
          send({ type: "answer_start" });
          state.answerStartSent = true;
        }
        result.finalText += delta;
        send({ type: "token", content: delta });
      }
      continue;
    }

    if (type === "response.reasoning_summary_text.delta") {
      const delta = event.delta || "";
      if (delta) {
        result.reasoningText += delta;
        send({ type: "reasoning_token", content: delta });
      }
      continue;
    }

    if (type === "response.function_call_arguments.delta") {
      const itemId = event.item?.id || event.item_id ||
        (event.output_index !== undefined ? String(event.output_index) : "");
      if (itemId && event.delta) {
        argBuffer.set(itemId, (argBuffer.get(itemId) || "") + event.delta);
      }
      continue;
    }

    if (type === "response.function_call_arguments.done") {
      const itemId = event.item?.id || event.item_id ||
        (event.output_index !== undefined ? String(event.output_index) : "");
      if (itemId && event.arguments) {
        argBuffer.set(itemId, event.arguments);
      }
      continue;
    }

    if (type === "response.output_item.added") {
      const item = event.item;
      if (item?.type === "function_call") {
        send({ type: "thinking", content: `Preparando ${item.name}...` });
      }
      continue;
    }

    if (type === "response.output_item.done") {
      const item = event.item;
      if (item?.type === "function_call" && item.name) {
        result.pendingFunctionCalls.push({
          id: item.id || item.call_id || item.name,
          call_id: item.call_id || item.id || item.name,
          name: item.name,
          arguments: item.arguments || argBuffer.get(item.id || "") ||
            argBuffer.get(String(result.pendingFunctionCalls.length)) || "{}",
        });
      }
      continue;
    }

    if (type === "response.completed") {
      if (event.response?.id) result.responseId = event.response.id;
      const usage = event.response?.usage;
      if (usage) {
        result.usage = {
          input_tokens: usage.input_tokens || usage.prompt_tokens || 0,
          output_tokens: usage.output_tokens || usage.completion_tokens || 0,
        };
      }
      continue;
    }

    if (type === "response.failed" || type === "error") {
      const msg =
        event.response?.error?.message ||
        event.error?.message ||
        "Erro no modelo";
      throw new Error(msg);
    }
  }

  return result;
}

async function runAgentLoop(
  apiKey: string,
  model: string,
  initialPayload: Record<string, unknown>,
  send: (data: Record<string, unknown>) => void,
): Promise<StreamRunResult & {
  toolCalls: ToolCallRecord[];
  sqlQueries: SqlQueryRecord[];
}> {
  const state = { answerStartSent: false };
  const toolCalls: ToolCallRecord[] = [];
  const sqlQueries: SqlQueryRecord[] = [];
  const aggregate: StreamRunResult = {
    finalText: "",
    reasoningText: "",
    responseId: null,
    pendingFunctionCalls: [],
    usage: { input_tokens: 0, output_tokens: 0 },
  };

  let payload = initialPayload;

  for (let hop = 0; hop < 6; hop++) {
    const result = await runResponsesStream(apiKey, payload, send, state);
    aggregate.finalText += result.finalText;
    aggregate.reasoningText += result.reasoningText;
    aggregate.responseId = result.responseId || aggregate.responseId;
    aggregate.usage = {
      input_tokens:
        (aggregate.usage?.input_tokens || 0) + (result.usage?.input_tokens || 0),
      output_tokens:
        (aggregate.usage?.output_tokens || 0) +
        (result.usage?.output_tokens || 0),
    };

    if (result.pendingFunctionCalls.length === 0) {
      aggregate.pendingFunctionCalls = [];
      return { ...aggregate, toolCalls, sqlQueries };
    }

    const outputs: InputItem[] = [];
    for (const call of result.pendingFunctionCalls) {
      outputs.push(await executeTool(call, send, toolCalls, sqlQueries));
    }

    payload = {
      model,
      previous_response_id: result.responseId,
      input: outputs,
      tools: TOOLS,
      reasoning: { effort: "medium" },
      text: { verbosity: "low" },
    };
  }

  throw new Error(
    "A consulta exigiu muitas etapas. Tente simplificar a pergunta ou reduzir o periodo.",
  );
}

const FORMAT_REMINDER =
  [
    "Lembrete de formato:",
    "1. Responda em Markdown GFM.",
    "2. Use tabelas GFM para dados tabulares.",
    "3. Para graficos, use somente bloco ```chart``` com JSON valido para o frontend.",
    "4. Nunca use graficos ASCII, barras com caracteres, nem tabela com coluna de barras visuais.",
  ].join("\n");

const CHART_REQUEST_REMINDER =
  [
    "O usuario pediu ou provavelmente espera um grafico.",
    "A resposta final DEVE conter um bloco ```chart``` valido.",
    "Contrato MeguisPet: { type, title, data, xAxis, yAxis }.",
    "Use xAxis/yAxis, nao xKey/yKey.",
    "Nunca use labels/datasets/backgroundColor; isso e formato Chart.js e nao e o contrato do MeguisPet.",
    "Exemplo: ```chart\n{\"type\":\"bar\",\"title\":\"Vendas por dia\",\"data\":[{\"dia\":\"01/04\",\"vendas\":1,\"faturamento\":1000}],\"xAxis\":\"dia\",\"yAxis\":[\"vendas\",\"faturamento\"]}\n```",
    "Nao produza linhas como '01/04 █ (1) R$ 1.000,00'. Isso e proibido.",
    "Nao repita todos os dados em tabela depois do grafico.",
  ].join("\n");

function isChartRequest(text: string): boolean {
  return /\b(gr[aá]fico|chart|visual|evolu[cç][aã]o|distribui[cç][aã]o|compar(a|ar|e|ativo)|top\s*\d*|ranking|por dia|por m[eê]s|por semana|por vendedor|por produto)\b/i
    .test(text);
}

const handler = async (req: AuthenticatedRequest, res: NextApiResponse) => {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({
      success: false,
      message: `Method ${req.method} Not Allowed`,
    });
  }

  const supabase = req.supabaseClient;
  const userId = req.user.id;

  if (!checkRateLimit(userId)) {
    return res.status(429).json({
      success: false,
      message: "Limite de requisicoes excedido. Tente novamente em 1 minuto.",
    });
  }

  const { conversationId, message, attachments } = req.body;

  if (!conversationId) {
    return res.status(400).json({
      success: false,
      message: "conversationId e obrigatorio",
    });
  }

  if (!message || !message.trim()) {
    return res.status(400).json({
      success: false,
      message: "message e obrigatoria",
    });
  }

  let sseStarted = false;

  try {
    const { data: conversation, error: convError } = await supabase
      .from("agent_conversations")
      .select("id, total_input_tokens, total_output_tokens")
      .eq("id", conversationId)
      .eq("usuario_id", userId)
      .eq("is_active", true)
      .single();

    if (convError || !conversation) {
      return res.status(404).json({
        success: false,
        message: "Conversa nao encontrada",
      });
    }

    let { data: agentConfig, error: configError } = await supabase
      .from("agent_configs")
      .select("*")
      .eq("usuario_id", userId)
      .single();

    if (configError || !agentConfig || !agentConfig.api_key_encrypted) {
      const serviceRole = getSupabaseServiceRole();
      const { data: globalConfig } = await serviceRole
        .from("agent_configs")
        .select("*")
        .not("api_key_encrypted", "is", null)
        .order("created_at", { ascending: true })
        .limit(1)
        .single();

      if (!globalConfig) {
        return res.status(400).json({
          success: false,
          message:
            "Nenhuma API key configurada. Peca ao administrador para configurar o Agente Megui.",
        });
      }

      agentConfig = agentConfig
        ? {
          ...globalConfig,
          ...agentConfig,
          api_key_encrypted: globalConfig.api_key_encrypted,
        }
        : globalConfig;
    }

    if ((agentConfig.provider as AgentProvider) !== "openai") {
      return res.status(400).json({
        success: false,
        message:
          "O agente agora usa a OpenAI Responses API. Selecione o provedor OpenAI na configuracao.",
      });
    }

    const apiKey = decryptApiKey(agentConfig.api_key_encrypted);
    const model = agentConfig.model || DEFAULT_MODEL;

    const keyPreview = apiKey.length > 8
      ? `${apiKey.substring(0, 7)}...${apiKey.substring(apiKey.length - 4)}`
      : "***";
    console.log(
      `[API Agente Chat] Responses API Model: ${model}, Key preview: ${keyPreview}`,
    );

    const { error: insertError } = await supabase.from("agent_messages").insert(
      {
        conversation_id: conversationId,
        role: "user",
        content: message.trim(),
        attachments: attachments || null,
      },
    );
    if (insertError) {
      console.error(
        "[API Agente Chat] Erro ao salvar mensagem do usuario:",
        insertError,
      );
    }

    const { data: historyDesc } = await supabase
      .from("agent_messages")
      .select("role, content")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: false })
      .limit(12);

    const historyRaw = historyDesc ? [...historyDesc].reverse() : [];
    const history: typeof historyRaw = [];
    for (const msg of historyRaw) {
      const prev = history[history.length - 1];
      if (prev && prev.role === msg.role && prev.content === msg.content) {
        continue;
      }
      history.push(msg);
    }

    const input: InputItem[] = history
      .filter((msg) => msg.role === "user" || msg.role === "assistant")
      .map((msg) => ({
        role: msg.role === "assistant" ? "assistant" : "user",
        content: msg.content,
      }));

    input.push({ role: "system", content: FORMAT_REMINDER });
    if (isChartRequest(message.trim())) {
      input.push({ role: "system", content: CHART_REQUEST_REMINDER });
    }

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    sseStarted = true;

    sendSSE(res, { type: "thinking", content: "Analisando sua pergunta..." });

    const startTime = Date.now();
    const initialPayload: Record<string, unknown> = {
      model,
      instructions: buildSystemPrompt(agentConfig.system_prompt),
      input,
      tools: TOOLS,
      reasoning: { effort: "medium" },
      text: { verbosity: "low" },
      max_output_tokens: agentConfig.max_tokens || 4096,
    };

    const result = await runAgentLoop(apiKey, model, initialPayload, (data) =>
      sendSSE(res, data)
    );

    const thinkingTime = Date.now() - startTime;
    const totalToolTime = result.toolCalls.reduce(
      (sum, tc) => sum + (tc.execution_time_ms || 0),
      0,
    );
    const timingBreakdown = {
      total_time_ms: thinkingTime,
      llm_thinking_ms: Math.max(0, thinkingTime - totalToolTime),
      tool_execution_ms: totalToolTime,
      tools_count: result.toolCalls.length,
    };

    const totalInputTokens = result.usage?.input_tokens || 0;
    const totalOutputTokens = result.usage?.output_tokens || 0;

    sendSSE(res, {
      type: "usage",
      input_tokens: totalInputTokens,
      output_tokens: totalOutputTokens,
      model,
      thinking_time_ms: thinkingTime,
      timing_breakdown: timingBreakdown,
    });

    res.write("data: [DONE]\n\n");
    res.end();

    if (result.finalText) {
      await supabase.from("agent_messages").insert({
        conversation_id: conversationId,
        role: "assistant",
        content: result.finalText,
        tool_calls: result.toolCalls.length > 0 ? result.toolCalls : null,
        sql_queries: result.sqlQueries.length > 0 ? result.sqlQueries : null,
        input_tokens: totalInputTokens,
        output_tokens: totalOutputTokens,
        model_used: model,
        thinking_time_ms: thinkingTime,
        timing_breakdown: timingBreakdown,
      });
    }

    await supabase
      .from("agent_conversations")
      .update({
        last_message_at: new Date().toISOString(),
        total_input_tokens:
          (conversation as Record<string, unknown>).total_input_tokens
            ? Number(
              (conversation as Record<string, unknown>).total_input_tokens,
            ) + totalInputTokens
            : totalInputTokens,
        total_output_tokens:
          (conversation as Record<string, unknown>).total_output_tokens
            ? Number(
              (conversation as Record<string, unknown>).total_output_tokens,
            ) + totalOutputTokens
            : totalOutputTokens,
      })
      .eq("id", conversationId);
  } catch (error) {
    console.error("[API Agente Chat] Erro:", error);

    const rawMsg = error instanceof Error ? error.message : String(error);
    const userMessage = mapErrorMessage(rawMsg);

    if (sseStarted) {
      try {
        sendSSEError(res, userMessage);
      } catch {
        // Response may already be closed.
      }
    } else {
      return res.status(500).json({
        success: false,
        message: userMessage,
      });
    }
  }
};

export default withSupabaseAuth(handler);
