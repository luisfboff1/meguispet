import type { NextApiResponse } from "next";
import { DataSource } from "typeorm";
// @ts-ignore - moduleResolution: node can't resolve subpath exports, but bundler resolves correctly
import { SqlDatabase } from "@langchain/classic/sql_db";
// @ts-ignore - moduleResolution: node can't resolve subpath exports, but bundler resolves correctly
import { SqlToolkit } from "@langchain/classic/agents/toolkits/sql";
// @ts-ignore - moduleResolution: node can't resolve subpath exports, but bundler resolves correctly
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import {
  AIMessage,
  HumanMessage,
  SystemMessage,
} from "@langchain/core/messages";
import {
  type AuthenticatedRequest,
  withSupabaseAuth,
} from "@/lib/supabase-middleware";
import { decryptApiKey } from "@/lib/agent-crypto";
import { createLLM } from "@/lib/agent-provider-factory";
import { buildSystemPrompt } from "@/lib/agent-default-prompt";
import { AGENT_ACCESSIBLE_TABLES } from "@/lib/agent-schema";
import type { AgentProvider } from "@/types";

// Rate limiter (in-memory)
const rateLimiter = new Map<number, { count: number; resetAt: number }>();

function checkRateLimit(userId: number): boolean {
  const now = Date.now();
  const userLimit = rateLimiter.get(userId);

  if (!userLimit || now > userLimit.resetAt) {
    rateLimiter.set(userId, { count: 1, resetAt: now + 60000 });
    return true;
  }

  if (userLimit.count >= 30) {
    return false;
  }

  userLimit.count++;
  return true;
}

// Cache DataSource to reuse connections
let cachedDataSource: DataSource | null = null;

async function getDataSource(): Promise<DataSource> {
  if (cachedDataSource?.isInitialized) {
    return cachedDataSource;
  }

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

/** Map raw error messages to user-friendly PT-BR messages */
function mapErrorMessage(rawMsg: string): string {
  if (rawMsg.includes("SUPABASE_DB_URL")) return rawMsg;
  if (rawMsg.includes("AGENT_ENCRYPTION_KEY")) {
    return "Chave de encriptacao nao configurada. Contate o administrador.";
  }
  if (
    rawMsg.includes("Incorrect API key") ||
    rawMsg.includes("invalid x-api-key") || rawMsg.includes("invalid_api_key")
  ) {
    return "API key invalida ou revogada. Gere uma nova chave e atualize na aba Configuracao.";
  }
  if (
    rawMsg.includes("insufficient_quota") || rawMsg.includes("rate_limit") ||
    rawMsg.includes("429")
  ) {
    return "Limite de uso da API excedido. Verifique seu plano ou aguarde alguns minutos.";
  }
  if (
    rawMsg.includes("model_not_found") || rawMsg.includes("does not exist") ||
    rawMsg.includes("404")
  ) {
    return "Modelo selecionado nao disponivel. Troque o modelo na aba Configuracao.";
  }
  if (
    rawMsg.includes("ECONNREFUSED") || rawMsg.includes("ETIMEDOUT") ||
    rawMsg.includes("fetch failed")
  ) {
    return "Falha de conexao com o servico de IA. Tente novamente em alguns segundos.";
  }
  if (rawMsg.includes("timeout") || rawMsg.includes("Timeout")) {
    return "A consulta demorou demais e foi cancelada. Tente simplificar sua pergunta.";
  }
  if (rawMsg.includes("401")) {
    return "Erro de autenticacao com a API. Verifique sua API key na aba Configuracao.";
  }
  if (
    rawMsg.includes("GRAPH_RECURSION_LIMIT") ||
    rawMsg.includes("Recursion limit")
  ) {
    return "A consulta foi muito complexa e excedeu o limite de etapas. Tente simplificar sua pergunta ou ser mais especifico.";
  }
  return rawMsg;
}

/** Send SSE event and flush */
function sendSSE(res: NextApiResponse, data: Record<string, unknown>) {
  res.write(`data: ${JSON.stringify(data)}\n\n`);
  // Force flush if available (Node.js streams)
  if (typeof (res as unknown as { flush?: () => void }).flush === "function") {
    (res as unknown as { flush: () => void }).flush();
  }
}

/** Send SSE error + done and end response */
function sendSSEError(res: NextApiResponse, message: string) {
  sendSSE(res, { type: "error", message });
  res.write("data: [DONE]\n\n");
  res.end();
}

// Disable body parsing for streaming
export const config = {
  api: {
    bodyParser: true,
    responseLimit: false,
  },
};

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

  // Rate limiting
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

  // Track whether SSE has been initialized
  let sseStarted = false;

  try {
    // 1. Verify conversation belongs to user
    const { data: conversation, error: convError } = await supabase
      .from("agent_conversations")
      .select("id")
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

    // 2. Get user's agent config
    const { data: agentConfig, error: configError } = await supabase
      .from("agent_configs")
      .select("*")
      .eq("usuario_id", userId)
      .single();

    if (configError || !agentConfig) {
      return res.status(400).json({
        success: false,
        message:
          "Configure sua API key na aba Configuracao antes de usar o chat.",
      });
    }

    if (!agentConfig.api_key_encrypted) {
      return res.status(400).json({
        success: false,
        message:
          "API key nao configurada. Va na aba Configuracao para adicionar.",
      });
    }

    // 3. Decrypt API key
    const apiKey = decryptApiKey(agentConfig.api_key_encrypted);

    // DEBUG: verify decrypted key (remove after testing)
    const keyPreview = apiKey.length > 8
      ? `${apiKey.substring(0, 7)}...${apiKey.substring(apiKey.length - 4)}`
      : "***";
    console.log(
      `[API Agente Chat] Provider: ${agentConfig.provider}, Model: ${agentConfig.model}, Key preview: ${keyPreview}`,
    );

    // 4. Create LLM instance
    const llm = createLLM({
      provider: agentConfig.provider as AgentProvider,
      model: agentConfig.model,
      apiKey,
      temperature: parseFloat(agentConfig.temperature) || 0.3,
      maxTokens: agentConfig.max_tokens || 4096,
      topP: parseFloat(agentConfig.top_p) || 1.0,
      frequencyPenalty: parseFloat(agentConfig.frequency_penalty) || 0,
      presencePenalty: parseFloat(agentConfig.presence_penalty) || 0,
      streaming: true,
    });

    // 5. Create SQL Database connection
    const dataSource = await getDataSource();
    const db = await SqlDatabase.fromDataSourceParams({
      appDataSource: dataSource,
      includesTables: [...AGENT_ACCESSIBLE_TABLES],
    });

    // 6. Create SQL Agent
    const toolkit = new SqlToolkit(db, llm);
    const tools = toolkit.getTools();

    const systemPrompt = buildSystemPrompt(agentConfig.system_prompt);

    const agent = createReactAgent({
      llm,
      tools,
      messageModifier: systemPrompt,
    });

    // 7. Get conversation history BEFORE saving the new message
    //    Fetch the MOST RECENT messages (DESC), then reverse to chronological order
    //    Limited to 20 messages (10 pairs) to provide more context for agent decisions
    const { data: historyDesc } = await supabase
      .from("agent_messages")
      .select("role, content")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: false })
      .limit(20);

    // Reverse to chronological order (oldest first) for the LLM
    const historyRaw = historyDesc ? [...historyDesc].reverse() : [];

    // Deduplicate consecutive messages with identical content from same role
    // This prevents the LLM from pattern-matching repeated responses
    const history: typeof historyRaw = [];
    for (const msg of historyRaw) {
      const prev = history[history.length - 1];
      if (prev && prev.role === msg.role && prev.content === msg.content) {
        continue; // skip duplicate
      }
      history.push(msg);
    }

    // 8. Save user message to DB (check for errors)
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

    // 9. Set up SSE streaming
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    sseStarted = true;

    // Send initial thinking event
    sendSSE(res, { type: "thinking", content: "Analisando sua pergunta..." });

    // 10. Stream agent response
    const startTime = Date.now();
    let fullResponse = "";
    const sqlQueries: {
      sql: string;
      explanation: string;
      rows_returned: number;
      execution_time_ms: number;
    }[] = [];
    const toolCalls: {
      tool_name: string;
      args: Record<string, unknown>;
      result: unknown;
    }[] = [];
    let totalInputTokens = 0;
    let totalOutputTokens = 0;

    // Build messages array with proper LangChain message types
    // Use deduplicated history from DB + explicitly append current user message
    const messages: (HumanMessage | AIMessage)[] = [];
    for (const msg of history) {
      if (msg.role === "user") {
        messages.push(new HumanMessage(msg.content));
      } else if (msg.role === "assistant") {
        messages.push(new AIMessage(msg.content));
      }
    }
    // Always explicitly append the current user message (even if DB insert failed)
    messages.push(new HumanMessage(message.trim()));

    // ===================== DEBUG LOGGING =====================
    console.log("\n" + "=".repeat(80));
    console.log("[AGENT DEBUG] NOVA REQUISICAO");
    console.log("=".repeat(80));
    console.log(`[AGENT DEBUG] ConversationId: ${conversationId}`);
    console.log(`[AGENT DEBUG] UserId: ${userId}`);
    console.log(
      `[AGENT DEBUG] Provider: ${agentConfig.provider} | Model: ${agentConfig.model}`,
    );
    console.log(
      `[AGENT DEBUG] Temperature: ${agentConfig.temperature} | MaxTokens: ${agentConfig.max_tokens}`,
    );
    console.log(
      `[AGENT DEBUG] RecursionLimit: ${agentConfig.recursion_limit || 25}`,
    );
    console.log(
      `[AGENT DEBUG] System prompt customizado: ${
        agentConfig.system_prompt
          ? "SIM (" + agentConfig.system_prompt.length + " chars)"
          : "NAO (usando default)"
      }`,
    );
    console.log(
      `[AGENT DEBUG] Historico do banco (bruto): ${
        historyDesc?.length || 0
      } msgs | Apos dedup: ${history.length} msgs`,
    );
    console.log(
      `[AGENT DEBUG] Total de mensagens enviadas ao agente: ${messages.length}`,
    );
    console.log("[AGENT DEBUG] --- Mensagens enviadas ao LLM ---");
    messages.forEach((m, i) => {
      const type = m instanceof HumanMessage
        ? "USER"
        : m instanceof AIMessage
        ? "ASSISTANT"
        : "OTHER";
      const preview = typeof m.content === "string"
        ? m.content.substring(0, 150)
        : JSON.stringify(m.content).substring(0, 150);
      console.log(
        `[AGENT DEBUG]   [${i}] ${type}: "${preview}${
          typeof m.content === "string" && m.content.length > 150 ? "..." : ""
        }"`,
      );
    });
    console.log(
      `[AGENT DEBUG] System prompt (primeiros 300 chars): "${
        systemPrompt.substring(0, 300)
      }..."`,
    );
    console.log(
      `[AGENT DEBUG] Tabelas acessiveis: ${AGENT_ACCESSIBLE_TABLES.join(", ")}`,
    );
    console.log(
      `[AGENT DEBUG] Insert da msg do usuario no banco: ${
        insertError ? "FALHOU - " + insertError.message : "OK"
      }`,
    );
    console.log("=".repeat(80) + "\n");
    // ===================== FIM DEBUG =====================

    const recursionLimit = agentConfig.recursion_limit || 25;
    const stream = await agent.stream(
      { messages },
      { recursionLimit },
    );

    // Track pending tool calls (args) so we can match with results
    const pendingToolArgs = new Map<string, Record<string, unknown>>();

    for await (const event of stream) {
      // Handle agent messages
      if (event.agent) {
        const agentMessages = event.agent.messages || [];
        for (const msg of agentMessages) {
          if (msg.content && typeof msg.content === "string") {
            fullResponse = msg.content;
            sendSSE(res, { type: "token", content: msg.content });
          }

          // Extract token usage from AIMessage metadata
          const usageMeta = msg.usage_metadata || msg.response_metadata?.usage;
          if (usageMeta) {
            totalInputTokens += usageMeta.input_tokens ||
              usageMeta.prompt_tokens || 0;
            totalOutputTokens += usageMeta.output_tokens ||
              usageMeta.completion_tokens || 0;
          }

          // Track tool calls from agent (capture args for SQL display)
          if (msg.tool_calls && Array.isArray(msg.tool_calls)) {
            for (const tc of msg.tool_calls) {
              // Store args by tool call id so we can match with result
              if (tc.id) pendingToolArgs.set(tc.id, tc.args || {});

              const sqlText = tc.args?.input || tc.args?.query || "";

              toolCalls.push({
                tool_name: tc.name,
                args: tc.args || {},
                result: null,
              });

              // If this is a SQL query, track it immediately with the SQL text
              if (tc.name === "sql_db_query" || tc.name === "query-sql") {
                const sqlString = typeof sqlText === "string" ? sqlText : String(sqlText);

                sqlQueries.push({
                  sql: sqlString,
                  explanation: "Consulta executada pelo agente",
                  rows_returned: 0,
                  execution_time_ms: 0,
                });

                // Log agent decisions for debugging
                if (process.env.NODE_ENV === 'development') {
                  console.log(`[AGENT DECISION] User message: "${message.substring(0, 100)}"`);
                  console.log(`[AGENT DECISION] Generated SQL: ${sqlString.substring(0, 300)}`);

                  // Try to extract WHERE filters to understand agent's decision
                  const whereMatch = sqlString.match(/WHERE\s+([\s\S]+?)(?:GROUP|ORDER|LIMIT|$)/i);
                  if (whereMatch) {
                    const whereClause = whereMatch[1].trim();
                    console.log(`[AGENT DECISION] Filters detected: ${whereClause.substring(0, 200)}`);

                    // Warn if status filter was added
                    if (/status\s*=\s*['"]pago['"]/i.test(whereClause)) {
                      console.warn(`[AGENT DECISION] ⚠️ Agent added status='pago' filter - was it requested?`);
                    }
                  } else {
                    console.log(`[AGENT DECISION] No WHERE filters detected`);
                  }
                }
              }

              sendSSE(res, {
                type: "tool_call",
                tool: tc.name,
                args: tc.args,
                sql: sqlText || undefined,
              });
            }
          }
        }
      }

      // Handle tool results
      if (event.tools) {
        const toolMessages = event.tools.messages || [];
        for (const msg of toolMessages) {
          const toolName = msg.name || "unknown";
          const toolResult = typeof msg.content === "string"
            ? msg.content
            : JSON.stringify(msg.content);
          const execTime = Date.now() - startTime;

          // Update the last matching tool call with the result
          for (let i = toolCalls.length - 1; i >= 0; i--) {
            if (
              toolCalls[i].tool_name === toolName &&
              toolCalls[i].result === null
            ) {
              toolCalls[i].result = toolResult;
              break;
            }
          }

          // Update SQL query with execution time and row count
          if (toolName === "sql_db_query" || toolName === "query-sql") {
            for (let i = sqlQueries.length - 1; i >= 0; i--) {
              if (sqlQueries[i].execution_time_ms === 0) {
                sqlQueries[i].execution_time_ms = execTime;
                const lines = toolResult.split("\n").filter((l: string) =>
                  l.trim()
                );
                sqlQueries[i].rows_returned = Math.max(0, lines.length - 1);
                break;
              }
            }
          }

          sendSSE(res, {
            type: "tool_result",
            tool: toolName,
            result: toolResult.substring(0, 1000),
            execution_time_ms: execTime,
          });
        }
      }
    }

    const thinkingTime = Date.now() - startTime;

    // ===================== DEBUG RESPONSE =====================
    console.log("\n" + "-".repeat(80));
    console.log("[AGENT DEBUG] RESPOSTA COMPLETA");
    console.log("-".repeat(80));
    console.log(`[AGENT DEBUG] Tempo total: ${thinkingTime}ms`);
    console.log(`[AGENT DEBUG] Tool calls feitas: ${toolCalls.length}`);
    toolCalls.forEach((tc, i) => {
      console.log(`[AGENT DEBUG]   Tool[${i}]: ${tc.tool_name}`);
      if (tc.args?.input) {
        console.log(
          `[AGENT DEBUG]     SQL: ${String(tc.args.input).substring(0, 200)}`,
        );
      }
      if (tc.result) {
        console.log(
          `[AGENT DEBUG]     Result (preview): ${
            String(tc.result).substring(0, 200)
          }`,
        );
      }
    });
    console.log(`[AGENT DEBUG] SQL queries: ${sqlQueries.length}`);
    console.log(
      `[AGENT DEBUG] Tokens - Input: ${totalInputTokens} | Output: ${totalOutputTokens}`,
    );
    console.log(
      `[AGENT DEBUG] Resposta final (preview): "${
        fullResponse.substring(0, 300)
      }${fullResponse.length > 300 ? "..." : ""}"`,
    );
    console.log("-".repeat(80) + "\n");
    // ===================== FIM DEBUG RESPONSE =====================

    // 10. Send usage info
    sendSSE(res, {
      type: "usage",
      input_tokens: totalInputTokens,
      output_tokens: totalOutputTokens,
      model: agentConfig.model,
    });

    // 11. Signal done
    res.write("data: [DONE]\n\n");
    res.end();

    // 12. Save assistant message to DB (after streaming completes)
    if (fullResponse) {
      await supabase.from("agent_messages").insert({
        conversation_id: conversationId,
        role: "assistant",
        content: fullResponse,
        tool_calls: toolCalls.length > 0 ? toolCalls : null,
        sql_queries: sqlQueries.length > 0 ? sqlQueries : null,
        input_tokens: totalInputTokens,
        output_tokens: totalOutputTokens,
        model_used: agentConfig.model,
        thinking_time_ms: thinkingTime,
      });
    }

    // 13. Update conversation metadata
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
      // SSE already started - send error via SSE stream
      try {
        sendSSEError(res, userMessage);
      } catch {
        // Response may already be closed
      }
    } else {
      // SSE not started - return normal JSON error
      return res.status(500).json({
        success: false,
        message: userMessage,
      });
    }
  }
};

export default withSupabaseAuth(handler);
