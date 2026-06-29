import { useEffect, useMemo, useState } from "react";
import {
  Newspaper,
  RefreshCw,
  X,
  ExternalLink,
  AlertCircle,
  Sun,
  Moon,
} from "lucide-react";
import {
  getTimeline,
  getCluster,
  triggerIngest,
  getIngestStatus,
  API_BASE_URL,
} from "./lib/api";

function formatDate(value) {
  if (!value) return "Unknown";
  return new Date(value).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function App() {
  const [dark, setDark] = useState(true);
  const [timeline, setTimeline] = useState([]);
  const [selectedCluster, setSelectedCluster] = useState(null);
  const [selectedClusterId, setSelectedClusterId] = useState(null);
  const [selectedSources, setSelectedSources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  const allSources = useMemo(() => {
    const set = new Set();
    timeline.forEach((item) => (item.sources || []).forEach((s) => set.add(s)));
    return [...set].sort();
  }, [timeline]);

  async function loadTimeline(sources = selectedSources) {
    try {
      setError("");
      setLoading(true);
      const data = await getTimeline(sources);
      setTimeline(data.items || []);
    } catch {
      setError("Could not load timeline. Check backend.");
    } finally {
      setLoading(false);
    }
  }

  async function openCluster(id) {
    try {
      setSelectedClusterId(id);
      const data = await getCluster(id);
      setSelectedCluster(data);
    } catch {
      setError("Could not load cluster.");
    }
  }

  async function refreshNews() {
    try {
      setRefreshing(true);
      const job = await triggerIngest();

      const interval = setInterval(async () => {
        const status = await getIngestStatus(job.jobId);
        if (status.status === "completed" || status.status === "failed") {
          clearInterval(interval);
          setRefreshing(false);
          loadTimeline();
        }
      }, 3000);
    } catch {
      setRefreshing(false);
      setError("Could not refresh data.");
    }
  }

  function toggleSource(source) {
    const next = selectedSources.includes(source)
      ? selectedSources.filter((s) => s !== source)
      : [...selectedSources, source];

    setSelectedSources(next);
    loadTimeline(next);
  }

  useEffect(() => {
    loadTimeline([]);
  }, []);

  return (
    <div className="min-h-screen w-full bg-slate-50 text-slate-900 dark:bg-[#0B0E14] dark:text-white transition-colors">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-48 -left-40 h-[520px] w-[520px] rounded-full bg-indigo-500/20 blur-3xl" />
        <div className="absolute -bottom-48 -right-40 h-[520px] w-[520px] rounded-full bg-fuchsia-500/20 blur-3xl" />
      </div>

      <div className="relative w-full px-6 py-6 lg:px-10 xl:px-14">
        <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-indigo-400/30 bg-indigo-500/15">
              <Newspaper className="text-indigo-500 dark:text-indigo-300" size={22} />
            </div>
            <div>
              <h1 className="text-xl font-black">News Pulse</h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Topic-clustered live news timeline
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setDark(!dark)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-700 shadow-sm dark:border-white/10 dark:bg-white/5 dark:text-slate-200"
            >
              {dark ? <Sun size={17} /> : <Moon size={17} />}
            </button>

            <button
              onClick={refreshNews}
              disabled={refreshing}
              className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white shadow-lg shadow-indigo-500/20 disabled:opacity-60"
            >
              <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
              {refreshing ? "Refreshing..." : "Refresh"}
            </button>
          </div>
        </header>

        <section className="mb-6 w-full rounded-3xl border border-slate-200 bg-white p-7 shadow-xl dark:border-white/10 dark:bg-white/[0.04] lg:p-9">
          <span className="text-[11px] font-black uppercase tracking-[0.22em] text-indigo-600 dark:text-indigo-300">
            Live RSS Intelligence
          </span>

          <h2 className="mt-3 max-w-5xl text-4xl font-black leading-tight md:text-5xl xl:text-6xl">
            Track how stories evolve across sources.
          </h2>

          <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-400 md:text-base">
            Articles are fetched from public RSS feeds, grouped using Option A
            keyword-overlap clustering, and displayed as story activity windows.
          </p>

          <p className="mt-3 break-all text-xs text-slate-400">
            Backend: {API_BASE_URL}
          </p>

          <div className="mt-7 grid grid-cols-1 gap-3 sm:grid-cols-3 lg:max-w-3xl">
            {[
              ["Clusters", timeline.length],
              ["Sources", allSources.length],
              [
                "Articles",
                timeline.reduce((sum, item) => sum + Number(item.articleCount || 0), 0),
              ],
            ].map(([label, value]) => (
              <div
                key={label}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-white/10 dark:bg-black/25"
              >
                <div className="text-3xl font-black">{value}</div>
                <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  {label}
                </div>
              </div>
            ))}
          </div>
        </section>

        {error && (
          <div className="mb-6 flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-600 dark:text-red-200">
            <AlertCircle size={18} />
            {error}
          </div>
        )}

        <section className="mb-6 w-full rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.03]">
          <h3 className="mb-3 text-sm font-black uppercase tracking-wide">
            Source Filter
          </h3>

          <div className="flex flex-wrap gap-2">
            {allSources.map((source) => (
              <button
                key={source}
                onClick={() => toggleSource(source)}
                className={`rounded-full border px-4 py-2 text-xs font-bold transition ${
                  selectedSources.includes(source)
                    ? "border-indigo-500 bg-indigo-600 text-white"
                    : "border-slate-200 bg-slate-100 text-slate-600 hover:bg-slate-200 dark:border-white/10 dark:bg-white/5 dark:text-slate-300"
                }`}
              >
                {selectedSources.includes(source) && "✓ "}
                {source}
              </button>
            ))}
          </div>
        </section>

        <main className="grid w-full grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.65fr)_430px]">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.03]">
            <span className="text-[11px] font-black uppercase tracking-[0.2em] text-indigo-600 dark:text-indigo-300">
              Live Timeline
            </span>

            <h3 className="mt-1 mb-5 text-2xl font-black">
              Topic Activity Windows
            </h3>

            {loading ? (
              <div className="rounded-2xl border border-dashed border-slate-300 p-14 text-center text-slate-500 dark:border-white/10">
                Loading timeline...
              </div>
            ) : (
              <div className="space-y-4">
                {timeline.map((item) => (
                  <button
                    key={item.clusterId}
                    onClick={() => openCluster(item.clusterId)}
                    className={`w-full rounded-2xl border p-5 text-left transition hover:-translate-y-0.5 ${
                      selectedClusterId === item.clusterId
                        ? "border-indigo-500 bg-indigo-500/10"
                        : "border-slate-200 bg-slate-50 hover:border-indigo-300 dark:border-white/10 dark:bg-black/20"
                    }`}
                  >
                    <div className="flex gap-4">
                      <div className="min-w-0 flex-1">
                        <h4 className="truncate text-lg font-black">
                          {item.label}
                        </h4>
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                          {formatDate(item.start)} → {formatDate(item.end)}
                        </p>
                      </div>

                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-fuchsia-500 text-sm font-black text-white">
                        {item.articleCount}
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {(item.sources || []).map((source) => (
                        <span
                          key={source}
                          className="rounded-md bg-slate-200 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-600 dark:bg-white/10 dark:text-slate-300"
                        >
                          {source}
                        </span>
                      ))}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </section>

          <aside className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#0f172a]/90 xl:sticky xl:top-6 xl:h-fit">
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h3 className="text-lg font-black">Cluster Details</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Click a timeline item
                </p>
              </div>

              {selectedCluster && (
                <button
                  onClick={() => {
                    setSelectedCluster(null);
                    setSelectedClusterId(null);
                  }}
                  className="rounded-lg bg-slate-100 p-2 dark:bg-white/10"
                >
                  <X size={16} />
                </button>
              )}
            </div>

            {!selectedCluster ? (
              <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500 dark:border-white/10">
                Select a topic to view articles.
              </div>
            ) : (
              <div>
                <h4 className="text-base font-black">{selectedCluster.label}</h4>
                <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
                  {selectedCluster.articleCount} related articles
                </p>

                <div className="max-h-[68vh] space-y-3 overflow-auto pr-1">
                  {(selectedCluster.articles || []).map((article) => (
                    <a
                      key={article.id}
                      href={article.url}
                      target="_blank"
                      rel="noreferrer"
                      className="block rounded-xl border border-slate-200 bg-slate-50 p-4 transition hover:bg-slate-100 dark:border-white/10 dark:bg-white/[0.04] dark:hover:bg-white/[0.08]"
                    >
                      <div className="mb-2 flex justify-between gap-3">
                        <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-300">
                          {article.source}
                        </span>
                        <span className="text-xs text-slate-400">
                          {formatDate(article.publishedAt)}
                        </span>
                      </div>

                      <h5 className="text-sm font-bold leading-snug">
                        {article.title}
                      </h5>

                      <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
                        {article.summary || "No summary available."}
                      </p>

                      <div className="mt-3 flex items-center gap-1 text-xs font-bold text-indigo-600 dark:text-indigo-300">
                        Read full article <ExternalLink size={13} />
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </aside>
        </main>
      </div>
    </div>
  );
}