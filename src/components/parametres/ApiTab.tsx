"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";

const PROVIDERS = [
  { id: "anthropic",  label: "Anthropic (Claude)" },
  { id: "openai",     label: "OpenAI (GPT)"       },
  { id: "google",     label: "Google (Gemini)"    },
  { id: "openrouter", label: "OpenRouter"          },
  { id: "xai",        label: "xAI (Grok)"         },
  { id: "zhipu",      label: "Zhipu AI (GLM)"     },
] as const;

type ProviderId = typeof PROVIDERS[number]["id"];

const MODELS_BY_PROVIDER: Record<ProviderId, { id: string; label: string }[]> = {
  anthropic: [
    { id: "claude-opus-4-8",           label: "Claude Opus 4.8 — Meilleur"    },
    { id: "claude-sonnet-4-6",         label: "Claude Sonnet 4.6 — Équilibré" },
    { id: "claude-haiku-4-5-20251001", label: "Claude Haiku 4.5 — Rapide"    },
  ],
  openai: [
    { id: "gpt-4o",      label: "GPT-4o — Meilleur"        },
    { id: "gpt-4o-mini", label: "GPT-4o Mini — Rapide"     },
    { id: "o4-mini",     label: "o4-mini — Raisonnement"   },
    { id: "o3",          label: "o3 — Raisonnement avancé" },
  ],
  google: [
    { id: "gemini-2.5-pro",   label: "Gemini 2.5 Pro — Meilleur" },
    { id: "gemini-2.5-flash", label: "Gemini 2.5 Flash — Rapide" },
    { id: "gemini-2.0-flash", label: "Gemini 2.0 Flash — Léger"  },
  ],
  openrouter: [
    { id: "openrouter/meta-llama/llama-4-maverick",  label: "Llama 4 Maverick — Meta"    },
    { id: "openrouter/meta-llama/llama-4-scout",     label: "Llama 4 Scout — Rapide"     },
    { id: "openrouter/mistralai/mistral-large-2411", label: "Mistral Large — Mistral AI" },
    { id: "openrouter/deepseek/deepseek-r1",         label: "DeepSeek R1 — Raisonnement" },
  ],
  xai: [
    { id: "grok-3",      label: "Grok 3 — Meilleur"    },
    { id: "grok-3-fast", label: "Grok 3 Fast — Rapide" },
    { id: "grok-3-mini", label: "Grok 3 Mini — Léger"  },
  ],
  zhipu: [
    { id: "glm-4",       label: "GLM-4 — Meilleur"              },
    { id: "glm-4-air",   label: "GLM-4 Air — Équilibré"         },
    { id: "glm-4-flash", label: "GLM-4 Flash — Rapide/Gratuit"  },
    { id: "glm-z1",      label: "GLM-Z1 — Raisonnement"         },
  ],
};

const PROVIDER_COLORS: Record<ProviderId, string> = {
  anthropic:  "#E8651A",
  openai:     "#10A37F",
  google:     "#4285F4",
  openrouter: "#6366F1",
  xai:        "#111827",
  zhipu:      "#7B2FBE",
};

const KEY_PLACEHOLDERS: Record<ProviderId, string> = {
  anthropic:  "sk-ant-api03-...",
  openai:     "sk-proj-...",
  google:     "AIzaSy...",
  openrouter: "sk-or-v1-...",
  xai:        "xai-...",
  zhipu:      "xxxxxxxx.xxxxxxxxx",
};

type HasKeys = Record<ProviderId, boolean>;
type Keys    = Record<ProviderId, string>;

const DEFAULT_HAS: HasKeys = { anthropic: false, openai: false, google: false, openrouter: false, xai: false, zhipu: false };
const DEFAULT_KEYS: Keys   = { anthropic: "", openai: "", google: "", openrouter: "", xai: "", zhipu: "" };

export default function ApiTab() {
  const [loading, setLoading]               = useState(true);
  const [activeProvider, setActiveProvider] = useState<ProviderId>("anthropic");
  const [hasKeys, setHasKeys]               = useState<HasKeys>(DEFAULT_HAS);
  const [keys, setKeys]                     = useState<Keys>(DEFAULT_KEYS);
  const [preferredModel, setPreferredModel] = useState("claude-sonnet-4-6");
  const [showKey, setShowKey]               = useState(false);
  const [saving, setSaving]                 = useState(false);
  const [testing, setTesting]               = useState(false);
  const [testResult, setTestResult]         = useState<{ ok: boolean; message: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await fetch("/api/user/api-settings");
      const data = await res.json();
      setPreferredModel(data.preferredModel ?? "claude-sonnet-4-6");
      setHasKeys({
        anthropic:  !!data.hasClaudeKey,
        openai:     !!data.hasOpenaiKey,
        google:     !!data.hasGoogleKey,
        openrouter: !!data.hasOpenrouterKey,
        xai:        !!data.hasGrokKey,
        zhipu:      !!data.hasGlmKey,
      });
      setKeys({
        anthropic:  data.claudeApiKey     ?? "",
        openai:     data.openaiApiKey     ?? "",
        google:     data.googleApiKey     ?? "",
        openrouter: data.openrouterApiKey ?? "",
        xai:        data.grokApiKey       ?? "",
        zhipu:      data.glmApiKey        ?? "",
      });
      const m = data.preferredModel ?? "";
      if      (m.startsWith("gpt") || m.startsWith("o1") || m.startsWith("o3") || m.startsWith("o4")) setActiveProvider("openai");
      else if (m.startsWith("gemini"))    setActiveProvider("google");
      else if (m.startsWith("grok-"))     setActiveProvider("xai");
      else if (m.startsWith("glm"))       setActiveProvider("zhipu");
      else if (m.startsWith("openrouter/") || m.includes("/")) setActiveProvider("openrouter");
      else    setActiveProvider("anthropic");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleProviderChange = (p: ProviderId) => {
    setActiveProvider(p);
    setTestResult(null);
    const first = MODELS_BY_PROVIDER[p][0]?.id;
    if (first) setPreferredModel(first);
  };

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/user/api-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          claudeApiKey:     keys.anthropic,
          openaiApiKey:     keys.openai,
          googleApiKey:     keys.google,
          openrouterApiKey: keys.openrouter,
          grokApiKey:       keys.xai,
          glmApiKey:        keys.zhipu,
          preferredModel,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success("Paramètres API sauvegardés");
      await load();
    } catch {
      toast.error("Erreur lors de la sauvegarde");
    } finally {
      setSaving(false);
    }
  };

  const testConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const currentKey = keys[activeProvider];
      const keyToSend  = currentKey.includes("•") ? "" : currentKey.trim();
      const res = await fetch("/api/user/test-api", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: activeProvider, apiKey: keyToSend, model: preferredModel }),
      });
      const data = await res.json();
      setTestResult({ ok: res.ok, message: data.message ?? (res.ok ? "Connexion réussie" : "Erreur inconnue") });
    } catch {
      setTestResult({ ok: false, message: "Erreur réseau" });
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-[#003087] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const providerColor = PROVIDER_COLORS[activeProvider];

  return (
    <div className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden">
      <div className="lg:grid lg:grid-cols-[220px_1fr]">
        <div className="border-b lg:border-b-0 lg:border-r border-[#E2E8F0] p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider mb-3" style={{ color: "#6B7280" }}>
            Fournisseur IA
          </p>
          <div className="flex lg:flex-col gap-1 overflow-x-auto pb-1 lg:pb-0">
            {PROVIDERS.map((p) => {
              const isActive = activeProvider === p.id;
              const hasKey   = hasKeys[p.id as ProviderId];
              const color    = PROVIDER_COLORS[p.id as ProviderId];
              return (
                <button
                  key={p.id}
                  onClick={() => handleProviderChange(p.id as ProviderId)}
                  className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-sm transition-all text-left shrink-0 lg:shrink"
                  style={
                    isActive
                      ? { background: `${color}15`, border: `1px solid ${color}40`, color: "#111827" }
                      : { border: "1px solid transparent", color: "#6B7280" }
                  }
                >
                  <span className="font-medium whitespace-nowrap">{p.label}</span>
                  {hasKey && (
                    <span
                      className="text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0"
                      style={{ background: `${color}15`, color }}
                    >
                      ✓
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-base font-semibold" style={{ color: "#111827" }}>
              {PROVIDERS.find((p) => p.id === activeProvider)?.label}
            </h2>
            <span
              className="text-xs font-medium px-2 py-1 rounded-full"
              style={
                hasKeys[activeProvider]
                  ? { background: `${providerColor}15`, color: providerColor }
                  : { background: "#F3F4F6", color: "#9CA3AF" }
              }
            >
              {hasKeys[activeProvider] ? "✓ Clé active" : "Non configuré"}
            </span>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: "#6B7280" }}>
                Modèle IA
              </label>
              <div className="relative">
                <select
                  value={preferredModel}
                  onChange={(e) => setPreferredModel(e.target.value)}
                  className="w-full text-sm px-3 py-2.5 rounded-lg outline-none appearance-none cursor-pointer"
                  style={{ background: "#F3F4F6", border: "1px solid #E2E8F0", color: "#111827" }}
                >
                  {MODELS_BY_PROVIDER[activeProvider].map((m) => (
                    <option key={m.id} value={m.id}>{m.label}</option>
                  ))}
                </select>
                <span className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[10px]" style={{ color: "#9CA3AF" }}>▼</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: "#6B7280" }}>
                Clé API
              </label>
              <div className="relative">
                <input
                  type={showKey ? "text" : "password"}
                  placeholder={hasKeys[activeProvider] ? "••••••••••••••••••••" : KEY_PLACEHOLDERS[activeProvider]}
                  value={keys[activeProvider]}
                  onChange={(e) => setKeys((prev) => ({ ...prev, [activeProvider]: e.target.value }))}
                  className="w-full text-sm px-3 py-2.5 pr-16 rounded-lg outline-none font-mono"
                  style={{ background: "#F3F4F6", border: "1px solid #E2E8F0", color: "#111827" }}
                />
                <button
                  type="button"
                  onClick={() => setShowKey((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs"
                  style={{ color: "#9CA3AF" }}
                >
                  {showKey ? "Cacher" : "Voir"}
                </button>
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <button
                onClick={testConnection}
                disabled={testing}
                className="flex-1 text-sm py-2.5 rounded-lg font-semibold transition-all disabled:opacity-40 flex items-center justify-center gap-2"
                style={{ background: "#F3F4F6", border: "1px solid #E2E8F0", color: "#374151" }}
              >
                {testing ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
                    Test…
                  </>
                ) : "🔌 Tester la connexion"}
              </button>
              <button
                onClick={save}
                disabled={saving}
                className="flex-1 text-sm py-2.5 rounded-lg font-semibold text-white transition-all disabled:opacity-50"
                style={{ background: providerColor }}
              >
                {saving ? "Sauvegarde…" : "💾 Sauvegarder"}
              </button>
            </div>

            {testResult && (
              <div
                className="rounded-lg px-3 py-2 text-sm"
                style={{
                  background: testResult.ok ? "#E8F5E9" : "#FEF2F2",
                  border:     `1px solid ${testResult.ok ? "#A5D6A7" : "#FECACA"}`,
                  color:      testResult.ok ? "#2E7D32" : "#DC2626",
                }}
              >
                {testResult.message}
              </div>
            )}

            <p className="text-[10px] text-center" style={{ color: "#9CA3AF" }}>
              Vos clés sont chiffrées et stockées en sécurité.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
