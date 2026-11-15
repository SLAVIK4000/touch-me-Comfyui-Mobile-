/**
 * Touch me — клиент ComfyUI API.
 *
 * Мобильный интерфейс отдаётся самим сервером ComfyUI по маршруту /mobile/
 * (кастом-нода), поэтому API живёт на том же origin: запросы идут по
 * абсолютным путям корня сервера (/object_info, /prompt, /ws, ...).
 * Никакого CORS и mixed-content не возникает — тот же источник, что и у
 * классического интерфейса.
 *
 * Источники данных идентичны оригинальному интерфейсу ComfyUI: списки
 * моделей/LoRA/сэмплеров читаются из /object_info — ровно оттуда же,
 * откуда их берут выпадающие списки стандартных нод (Checkpoint Loader,
 * LoRA Loader, VAELoader, KSampler ...). Если ComfyUI работает на Colab
 * с папкой моделей в Google Drive (My Drive/ComfyUI/models), мобильный
 * интерфейс показывает те же файлы, что и классический.
 */

/* ---------------- Типы ответов сервера ---------------- */

export interface ObjectInfoNode {
  input?: {
    required?: Record<string, unknown>;
    optional?: Record<string, unknown>;
  };
  output?: unknown[];
}

export type ObjectInfo = Record<string, ObjectInfoNode>;

/** Один файл результата (SaveImage и др.) */
export interface ComfyImageRef {
  filename: string;
  subfolder?: string;
  type?: string;
}

export interface HistoryOutput {
  images?: ComfyImageRef[];
}

export interface HistoryEntry {
  prompt: { id?: string }[] & unknown;
  outputs: Record<string, HistoryOutput>;
  status?: { status_str?: string; completed?: boolean; messages?: unknown[] };
}

export interface SystemStats {
  system?: { comfyui_version?: string; os?: string };
  devices?: { name?: string; type?: string; vram_total?: number }[];
}

/* ---------------- Базовые HTTP-хелперы ---------------- */

/** API живёт на том же origin, что и страница /mobile/ — корень сервера. */
const BASE = "";

function apiUrl(path: string): string {
  return `${BASE}${path}`;
}

async function getJson<T>(path: string, timeoutMs = 15000): Promise<T> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(apiUrl(path), {
      cache: "no-store",
      signal: ctrl.signal,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} на ${path}`);
    return (await res.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(apiUrl(path), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    let detail = `HTTP ${res.status}`;
    try {
      const err = (await res.json()) as { error?: unknown };
      if (err?.error) detail = String(err.error);
    } catch {
      /* тело не JSON — оставляем статус */
    }
    throw new Error(detail);
  }
  return (await res.json()) as T;
}

/* ---------------- Состояние сервера ---------------- */

/** Пинг живого сервера (используется индикатором соединения). */
export async function pingServer(timeoutMs = 6000): Promise<SystemStats | null> {
  try {
    return await getJson<SystemStats>("/system_stats", timeoutMs);
  } catch {
    return null;
  }
}

/* ---------------- /object_info: списки как в оригинальном UI ---------------- */

/** Кэш ответа /object_info (TTL 15 c — одно открытие панели живёт дольше). */
let objectInfoCache: { data: ObjectInfo; at: number } | null = null;

export async function fetchObjectInfo(force = false): Promise<ObjectInfo> {
  if (
    !force &&
    objectInfoCache &&
    Date.now() - objectInfoCache.at < 15000
  ) {
    return objectInfoCache.data;
  }
  const data = await getJson<ObjectInfo>("/object_info");
  objectInfoCache = { data, at: Date.now() };
  return data;
}

/**
 * Допустимые значения виджета ноды — тот же массив, из которого строится
 * выпадающий список в классическом интерфейсе ComfyUI.
 */
export function widgetValues(
  info: ObjectInfo,
  nodeClass: string,
  inputName: string,
): string[] {
  const node = info[nodeClass];
  if (!node) return [];
  const spec = node.input?.required?.[inputName] ?? node.input?.optional?.[inputName];
  if (!Array.isArray(spec)) return [];
  const first = spec[0];
  if (!Array.isArray(first)) return [];
  return first.filter((v): v is string => typeof v === "string");
}

/** Категории папки Models → нода+виджет оригинального интерфейса. */
export const CATEGORY_SOURCE_NODE: Record<
  string,
  { node: string; input: string }
> = {
  checkpoints: { node: "CheckpointLoaderSimple", input: "ckpt_name" },
  unet: { node: "UNETLoader", input: "unet_name" },
  clip: { node: "CLIPLoader", input: "clip_name" },
  vae: { node: "VAELoader", input: "vae_name" },
  loras: { node: "LoraLoader", input: "lora_name" },
  controlnet: { node: "ControlNetLoader", input: "control_net_name" },
  upscale_models: { node: "UpscaleModelLoader", input: "model_name" },
};

/* ---------------- Очередь и генерация ---------------- */

/** API-формат графа: { "<id>": { class_type, inputs } } */
export type ApiWorkflow = Record<
  string,
  { class_type: string; inputs: Record<string, unknown> }
>;

export function newClientId(): string {
  const c = globalThis.crypto as Crypto | undefined;
  if (c?.randomUUID) return c.randomUUID();
  return `tm-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export interface QueueResult {
  prompt_id: string;
  number?: number;
  node_errors?: Record<string, unknown>;
}

/** Постановка workflow в очередь сервера. */
export async function queuePrompt(
  workflow: ApiWorkflow,
  clientId: string,
): Promise<QueueResult> {
  const res = await postJson<QueueResult>("/prompt", {
    prompt: workflow,
    client_id: clientId,
  });
  return res;
}

/** Прерывание текущей генерации. */
export async function interrupt(): Promise<void> {
  try {
    await postJson<unknown>("/interrupt", {});
  } catch {
    /* сервер мог завершить выполнение сам — не критично */
  }
}

/** История одной генерации. */
export async function fetchHistory(
  promptId: string,
): Promise<HistoryEntry | null> {
  const all = await getJson<Record<string, HistoryEntry>>(
    `/history/${promptId}`,
  );
  return all?.[promptId] ?? null;
}

/** Последние N генераций (для стартового наполнения галереи). */
export async function fetchRecentHistory(
  maxItems = 30,
): Promise<Record<string, HistoryEntry>> {
  return getJson<Record<string, HistoryEntry>>(
    `/history?max_items=${maxItems}`,
  );
}

/** URL файла изображения из output/input сервера. */
export function viewUrl(img: ComfyImageRef): string {
  const q = new URLSearchParams({
    filename: img.filename,
    subfolder: img.subfolder ?? "",
    type: img.type ?? "output",
  });
  return apiUrl(`/view?${q.toString()}`);
}

/**
 * Загрузка изображения в input сервера (для img2img).
 * Ответ сервера — { name, subfolder, type: "input" }.
 */
export async function uploadImage(
  blob: Blob,
  filename: string,
): Promise<ComfyImageRef> {
  const form = new FormData();
  form.append("image", blob, filename);
  form.append("overwrite", "true");
  const res = await fetch(apiUrl("/upload/image"), {
    method: "POST",
    body: form,
  });
  if (!res.ok) throw new Error(`загрузка не удалась: HTTP ${res.status}`);
  const data = (await res.json()) as {
    name: string;
    subfolder: string;
    type: string;
  };
  return { filename: data.name, subfolder: data.subfolder, type: data.type };
}

/** Значение для виджета LoadImage: "имя [подпапка]". */
export function loadImageValue(img: ComfyImageRef): string {
  return img.subfolder
    ? `${img.filename} [${img.subfolder}]`
    : `${img.filename} []`;
}

/* ---------------- WebSocket: прогресс ---------------- */

export interface SocketHandlers {
  onStatus?: (data: { sid?: string; status?: unknown }) => void;
  onExecutionStart?: () => void;
  onProgress?: (data: { value: number; max: number }) => void;
  onExecuting?: (data: { node: string | null }) => void;
  onExecuted?: (data: { node: string; output: HistoryOutput }) => void;
  onExecutionSuccess?: () => void;
  onExecutionError?: (data: {
    node_type?: string;
    exception_message?: string;
    exception_type?: string;
  }) => void;
  onClose?: (ev: CloseEvent) => void;
}

/** URL сокета того же origin: /ws?clientId=... */
export function wsUrl(clientId: string): string {
  const proto = globalThis.location?.protocol === "https:" ? "wss" : "ws";
  return `${proto}://${globalThis.location.host}/ws?clientId=${encodeURIComponent(clientId)}`;
}

/**
 * Подключение к сокету этого origin. Возвращает функцию закрытия.
 * Бинарные кадры (превью) игнорируются — прогресс приходит JSON-событиями.
 */
export function connectSocket(
  clientId: string,
  handlers: SocketHandlers,
): () => void {
  let ws: WebSocket | null = null;
  try {
    ws = new WebSocket(wsUrl(clientId));
  } catch {
    handlers.onClose?.(new CloseEvent("CLOSE_ABNORMAL"));
    return () => undefined;
  }

  ws.onmessage = (ev: MessageEvent) => {
    if (typeof ev.data !== "string") return; // бинарное превью — мимо
    try {
      const msg = JSON.parse(ev.data) as { type?: string; data?: unknown };
      const type = msg.type ?? (msg as { event?: string }).event;
      const data = (msg.data ?? msg) as never;
      switch (type) {
        case "status":
          handlers.onStatus?.(data);
          break;
        case "execution_start":
          handlers.onExecutionStart?.();
          break;
        case "progress":
          handlers.onProgress?.(data);
          break;
        case "executing":
          handlers.onExecuting?.(data);
          break;
        case "executed":
          handlers.onExecuted?.(data);
          break;
        case "execution_success":
        case "execution_done":
          handlers.onExecutionSuccess?.();
          break;
        case "execution_error":
          handlers.onExecutionError?.(data);
          break;
        default:
          break; // execution_cached и пр. — не критично
      }
    } catch {
      /* не-JSON кадр — игнорируем */
    }
  };

  ws.onerror = () => {
    /* дальнейшая судьба соединения решается в onclose */
  };
  ws.onclose = (ev) => handlers.onClose?.(ev);

  return () => {
    try {
      ws?.close();
    } catch {
      /* уже закрыт */
    }
  };
}
