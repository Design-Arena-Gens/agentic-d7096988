'use client';

import { FormEvent, useMemo, useState } from "react";
import {
  CallDirection,
  callDirections,
  defaultTemplates,
} from "@/lib/constants";
import { applyTemplate } from "@/lib/templateEngine";

type StatusState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "success"; message: string; sid?: string; dryRun: boolean }
  | { kind: "error"; message: string };

type HistoryEntry = {
  id: string;
  direction: CallDirection;
  to: string;
  renderedMessage: string;
  template: string;
  timestamp: string;
  sid?: string;
  error?: string;
  dryRun: boolean;
};

const directionLabels: Record<CallDirection, string> = {
  incoming: "Incoming Call",
  outgoing: "Outgoing Call",
  missed: "Missed Call",
};

const directionDescriptions: Record<CallDirection, string> = {
  incoming: "Notify callers when their call is being received.",
  outgoing: "Confirm to contacts that you are calling them.",
  missed: "Apologise and reassure callers after a missed call.",
};

const fallbackNumbers = {
  caller: "+15551234567",
  recipient: "+15559876543",
};

export default function Home() {
  const [direction, setDirection] = useState<CallDirection>("incoming");
  const [callerNumber, setCallerNumber] = useState("");
  const [recipientNumber, setRecipientNumber] = useState("");
  const [templates, setTemplates] = useState<Record<CallDirection, string>>({
    incoming: defaultTemplates.incoming,
    outgoing: defaultTemplates.outgoing,
    missed: defaultTemplates.missed,
  });
  const [status, setStatus] = useState<StatusState>({ kind: "idle" });
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  const activeTemplate = templates[direction];

  const previewMessage = useMemo(() => {
    const payload = {
      direction,
      callerNumber: callerNumber || fallbackNumbers.caller,
      recipientNumber: recipientNumber || fallbackNumbers.recipient,
    };
    return applyTemplate(activeTemplate, payload);
  }, [activeTemplate, callerNumber, direction, recipientNumber]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus({ kind: "loading" });

    try {
      const response = await fetch("/api/calls", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          direction,
          callerNumber,
          recipientNumber,
          customMessage: activeTemplate,
        }),
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to send message");
      }

      const dryRun = Boolean(payload.data?.dryRun);
      const sid =
        !dryRun && typeof payload.data?.sid === "string"
          ? payload.data.sid
          : undefined;

      const entry: HistoryEntry = {
        id: crypto.randomUUID(),
        direction,
        to: callerNumber,
        renderedMessage: applyTemplate(activeTemplate, {
          direction,
          callerNumber,
          recipientNumber,
        }),
        template: activeTemplate,
        timestamp: new Date().toISOString(),
        sid,
        dryRun,
        error:
          dryRun && payload.data?.error
            ? String(payload.data.error)
            : undefined,
      };

      setHistory((current) => [entry, ...current].slice(0, 10));
      setStatus({
        kind: "success",
        message: payload.message,
        sid,
        dryRun,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unexpected error occurred";

      const entry: HistoryEntry = {
        id: crypto.randomUUID(),
        direction,
        to: callerNumber,
        renderedMessage: applyTemplate(activeTemplate, {
          direction,
          callerNumber,
          recipientNumber,
        }),
        template: activeTemplate,
        timestamp: new Date().toISOString(),
        error: message,
        dryRun: false,
      };

      setHistory((current) => [entry, ...current].slice(0, 10));
      setStatus({ kind: "error", message });
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-10 px-4 py-10 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-3">
          <span className="text-sm font-semibold uppercase tracking-wide text-sky-400">
            Call Automation Agent
          </span>
          <h1 className="text-3xl font-semibold text-white sm:text-4xl">
            Automatically message callers for every call event.
          </h1>
          <p className="max-w-3xl text-base text-slate-300 sm:text-lg">
            Configure how your callers are informed about incoming, outgoing, and
            missed calls. The agent reacts to call events and sends personalised
            SMS messages instantly through Twilio.
          </p>
        </header>

        <section className="grid gap-8 lg:grid-cols-[2fr,3fr]">
          <form
            className="flex flex-col gap-6 rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur"
            onSubmit={handleSubmit}
          >
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-xl font-semibold text-white">
                Trigger a Call Message
              </h2>
              <div className="text-xs font-medium uppercase tracking-wide text-slate-400">
                Live Preview
              </div>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium text-slate-200">
                  Caller Number
                </span>
                <input
                  className="h-11 rounded-xl border border-white/10 bg-white/10 px-3 text-sm text-white outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-400/30"
                  placeholder="+15551234567"
                  value={callerNumber}
                  onChange={(event) => setCallerNumber(event.target.value)}
                  required
                />
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium text-slate-200">
                  Recipient Number
                </span>
                <input
                  className="h-11 rounded-xl border border-white/10 bg-white/10 px-3 text-sm text-white outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-400/30"
                  placeholder="+15559876543"
                  value={recipientNumber}
                  onChange={(event) => setRecipientNumber(event.target.value)}
                  required
                />
              </label>
            </div>

            <div className="flex flex-col gap-3">
              <span className="text-sm font-medium text-slate-200">
                Call Event
              </span>
              <div className="grid gap-3 sm:grid-cols-3">
                {callDirections.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setDirection(option)}
                    className={`rounded-2xl border p-4 text-left transition ${
                      option === direction
                        ? "border-sky-500 bg-sky-500/20 text-white shadow-[0_0_0_1px_rgba(56,189,248,0.5)]"
                        : "border-white/10 bg-white/5 text-slate-200 hover:border-white/20"
                    }`}
                  >
                    <div className="text-sm font-semibold uppercase tracking-wide">
                      {directionLabels[option]}
                    </div>
                    <p className="mt-2 text-xs text-slate-300">
                      {directionDescriptions[option]}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium text-slate-200">
                Message Template
              </span>
              <textarea
                className="min-h-[140px] rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-400/40"
                value={activeTemplate}
                onChange={(event) =>
                  setTemplates((current) => ({
                    ...current,
                    [direction]: event.target.value,
                  }))
                }
              />
              <p className="text-xs text-slate-400">
                Use placeholders: <code className="text-sky-300">{"{{caller}}"}</code>,{" "}
                <code className="text-sky-300">{"{{recipient}}"}</code>,{" "}
                <code className="text-sky-300">{"{{direction}}"}</code>.
              </p>
            </div>

            <button
              type="submit"
              disabled={status.kind === "loading"}
              className="flex h-12 items-center justify-center rounded-2xl bg-sky-500 text-sm font-semibold text-white transition hover:bg-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400/60 disabled:cursor-not-allowed disabled:bg-sky-500/50"
            >
              {status.kind === "loading" ? "Sending message..." : "Send message now"}
            </button>

            {status.kind === "success" && (
              <div className="rounded-2xl border border-emerald-400/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
                <span>{status.message}</span>
                {status.sid ? (
                  <span className="ml-2 font-mono text-xs text-emerald-300">
                    SID: {status.sid}
                  </span>
                ) : null}
                {status.dryRun ? (
                  <span className="ml-2 text-xs text-emerald-200/80">
                    (Dry-run mode)
                  </span>
                ) : null}
              </div>
            )}
            {status.kind === "error" && (
              <div className="rounded-2xl border border-rose-400/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                {status.message}
              </div>
            )}
          </form>

          <div className="flex flex-col gap-6">
            <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900 to-slate-800 p-6 shadow-lg">
              <div className="flex items-center justify-between gap-4">
                <h2 className="text-xl font-semibold text-white">
                  Message Preview
                </h2>
                <span className="text-xs font-medium uppercase tracking-wide text-slate-400">
                  Real-time
                </span>
              </div>
              <div className="mt-4 rounded-2xl border border-white/10 bg-black/40 p-5">
                <p className="text-sm text-slate-100">{previewMessage}</p>
              </div>
              <dl className="mt-4 grid grid-cols-1 gap-4 text-xs text-slate-300 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-black/30 p-3">
                  <dt className="font-medium uppercase tracking-wide text-slate-400">
                    Direction
                  </dt>
                  <dd className="mt-1 text-sm text-white">
                    {directionLabels[direction]}
                  </dd>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/30 p-3">
                  <dt className="font-medium uppercase tracking-wide text-slate-400">
                    Recipient (Caller)
                  </dt>
                  <dd className="mt-1 font-mono text-sm text-slate-200">
                    {callerNumber || fallbackNumbers.caller}
                  </dd>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/30 p-3">
                  <dt className="font-medium uppercase tracking-wide text-slate-400">
                    From (Your line)
                  </dt>
                  <dd className="mt-1 font-mono text-sm text-slate-200">
                    {recipientNumber || fallbackNumbers.recipient}
                  </dd>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/30 p-3">
                  <dt className="font-medium uppercase tracking-wide text-slate-400">
                    Template length
                  </dt>
                  <dd className="mt-1 text-sm text-white">
                    {activeTemplate.length} characters
                  </dd>
                </div>
              </dl>
            </div>

            <div className="rounded-3xl border border-white/5 bg-white/5 p-6 backdrop-blur">
              <div className="flex items-center justify-between gap-4">
                <h2 className="text-xl font-semibold text-white">
                  Recent Dispatches
                </h2>
                <span className="text-xs font-medium uppercase tracking-wide text-slate-400">
                  Latest 10
                </span>
              </div>
              {history.length === 0 ? (
                <p className="mt-4 text-sm text-slate-300">
                  No messages sent yet. Trigger your first event to populate the
                  history log.
                </p>
              ) : (
                <ul className="mt-4 flex flex-col gap-3 text-sm">
                  {history.map((entry) => (
                    <li
                      key={entry.id}
                      className="rounded-2xl border border-white/10 bg-black/30 p-4"
                    >
                      <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-wide text-slate-400">
                        <span>{directionLabels[entry.direction]}</span>
                        <span className="text-white/30">•</span>
                        <span>{new Date(entry.timestamp).toLocaleString()}</span>
                        <span className="text-white/30">•</span>
                        <span className="font-mono text-sky-300">{entry.to}</span>
                        {entry.sid ? (
                          <>
                            <span className="text-white/30">•</span>
                            <span className="font-mono text-emerald-300">
                              SID {entry.sid}
                            </span>
                          </>
                        ) : null}
                        {entry.dryRun ? (
                          <>
                            <span className="text-white/30">•</span>
                            <span className="text-emerald-300/80">
                              Dry-run mode
                            </span>
                          </>
                        ) : null}
                        {entry.error ? (
                          <>
                            <span className="text-white/30">•</span>
                            <span className="text-rose-300">{entry.error}</span>
                          </>
                        ) : null}
                      </div>
                      <p className="mt-2 text-slate-100">{entry.renderedMessage}</p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
