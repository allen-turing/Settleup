"use client";

import { useMemo, useState } from "react";
import { Lightbulb, ListChecks, Send } from "lucide-react";

type Priority = "LOW" | "MEDIUM" | "HIGH";

interface FeatureRequestWorkflowProps {
    defaultName?: string;
    defaultEmail?: string;
}

const areas = [
    "Expense Logging",
    "Group Collaboration",
    "Analytics & Insights",
    "Settlements",
    "Notifications",
    "Mobile Experience",
    "Other",
];

export default function FeatureRequestWorkflow({
    defaultName = "",
    defaultEmail = "",
}: FeatureRequestWorkflowProps) {
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [successMessage, setSuccessMessage] = useState("");
    const [error, setError] = useState("");

    const [workflowArea, setWorkflowArea] = useState(areas[0]);
    const [title, setTitle] = useState("");
    const [priority, setPriority] = useState<Priority>("MEDIUM");
    const [problem, setProblem] = useState("");
    const [expectedOutcome, setExpectedOutcome] = useState("");
    const [requesterName, setRequesterName] = useState(defaultName);
    const [requesterEmail, setRequesterEmail] = useState(defaultEmail);

    const progressPercent = useMemo(() => (step / 3) * 100, [step]);

    const resetForm = () => {
        setStep(1);
        setWorkflowArea(areas[0]);
        setTitle("");
        setPriority("MEDIUM");
        setProblem("");
        setExpectedOutcome("");
        setRequesterName(defaultName);
        setRequesterEmail(defaultEmail);
    };

    const canGoNextFromStep1 = title.trim().length >= 6;
    const canGoNextFromStep2 = problem.trim().length >= 20 && expectedOutcome.trim().length >= 10;
    const canSubmit = requesterName.trim() && requesterEmail.trim();

    const handleSubmit = async (e: React.SyntheticEvent) => {
        e.preventDefault();
        if (!canSubmit) {
            setError("Please complete your name and email.");
            return;
        }

        setLoading(true);
        setError("");
        setSuccessMessage("");

        try {
            const response = await fetch("/api/feature-requests", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    requesterName: requesterName.trim(),
                    requesterEmail: requesterEmail.trim(),
                    title: title.trim(),
                    problem: problem.trim(),
                    expectedOutcome: expectedOutcome.trim(),
                    workflowArea,
                    priority,
                }),
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || "Failed to submit request.");
            }

            setSuccessMessage("Thanks! Your feature request was submitted.");
            resetForm();
        } catch (err: any) {
            setError(err.message || "Something went wrong.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <section className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
            <div className="glass-card rounded-3xl p-6 sm:p-8 border border-white/10 bg-gradient-to-br from-zinc-900/80 to-zinc-950/80">
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6 mb-6">
                    <div>
                        <p className="text-[11px] uppercase tracking-[0.2em] text-purple-300/80 font-semibold mb-2">
                            Product Feedback Loop
                        </p>
                        <h2 className="text-2xl sm:text-3xl font-extrabold text-white leading-tight">
                            Request A Feature In 3 Quick Steps
                        </h2>
                        <p className="text-zinc-400 text-sm mt-2 max-w-2xl">
                            Tell us what slows you down, what you expect, and where it should fit.
                            This helps us prioritize roadmap work based on real user pain.
                        </p>
                    </div>
                    <div className="min-w-[170px]">
                        <div className="text-[11px] text-zinc-400 mb-2">Progress</div>
                        <div className="h-2 rounded-full bg-zinc-800 overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-cyan-400 to-purple-500 transition-all duration-300"
                                style={{ width: `${progressPercent}%` }}
                            />
                        </div>
                        <div className="text-xs text-zinc-500 mt-2">Step {step} of 3</div>
                    </div>
                </div>

                {successMessage && (
                    <div className="mb-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
                        {successMessage}
                    </div>
                )}

                {error && (
                    <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                    {step === 1 && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="md:col-span-2">
                                <label className="block text-xs font-semibold text-zinc-400 mb-1.5">Feature Title</label>
                                <input
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder="Example: Bulk import expenses from UPI screenshots"
                                    className="w-full px-3 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-sm text-white"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-zinc-400 mb-1.5">Priority</label>
                                <select
                                    value={priority}
                                    onChange={(e) => setPriority(e.target.value as Priority)}
                                    className="w-full px-3 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-sm text-white"
                                >
                                    <option value="LOW">Low</option>
                                    <option value="MEDIUM">Medium</option>
                                    <option value="HIGH">High</option>
                                </select>
                            </div>
                            <div className="md:col-span-3">
                                <label className="block text-xs font-semibold text-zinc-400 mb-1.5">Workflow Area</label>
                                <div className="flex flex-wrap gap-2">
                                    {areas.map((area) => (
                                        <button
                                            key={area}
                                            type="button"
                                            onClick={() => setWorkflowArea(area)}
                                            className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition ${workflowArea === area
                                                    ? "bg-purple-500/20 border-purple-400/40 text-purple-300"
                                                    : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white"
                                                }`}
                                        >
                                            {area}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-semibold text-zinc-400 mb-1.5">Current Problem</label>
                                <textarea
                                    value={problem}
                                    onChange={(e) => setProblem(e.target.value)}
                                    rows={5}
                                    placeholder="What is difficult in the current flow?"
                                    className="w-full px-3 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-sm text-white resize-none"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-zinc-400 mb-1.5">Expected Outcome</label>
                                <textarea
                                    value={expectedOutcome}
                                    onChange={(e) => setExpectedOutcome(e.target.value)}
                                    rows={5}
                                    placeholder="What should happen ideally?"
                                    className="w-full px-3 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-sm text-white resize-none"
                                    required
                                />
                            </div>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-semibold text-zinc-400 mb-1.5">Your Name</label>
                                <input
                                    value={requesterName}
                                    onChange={(e) => setRequesterName(e.target.value)}
                                    className="w-full px-3 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-sm text-white"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-zinc-400 mb-1.5">Your Email</label>
                                <input
                                    type="email"
                                    value={requesterEmail}
                                    onChange={(e) => setRequesterEmail(e.target.value)}
                                    className="w-full px-3 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-sm text-white"
                                    required
                                />
                            </div>
                            <div className="md:col-span-2 rounded-xl bg-zinc-900/60 border border-zinc-800 px-4 py-3 text-xs text-zinc-400">
                                <p className="font-semibold text-zinc-300 mb-1">Submission Summary</p>
                                <p><span className="text-zinc-500">Area:</span> {workflowArea}</p>
                                <p><span className="text-zinc-500">Title:</span> {title || "-"}</p>
                                <p><span className="text-zinc-500">Priority:</span> {priority}</p>
                            </div>
                        </div>
                    )}

                    <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                        <div className="flex items-center gap-2 text-zinc-500 text-xs">
                            {step === 1 && <Lightbulb className="h-4 w-4" />}
                            {step === 2 && <ListChecks className="h-4 w-4" />}
                            {step === 3 && <Send className="h-4 w-4" />}
                            <span>
                                {step === 1 && "Define what you need"}
                                {step === 2 && "Explain impact and value"}
                                {step === 3 && "Submit to roadmap queue"}
                            </span>
                        </div>

                        <div className="flex items-center gap-2">
                            {step > 1 && (
                                <button
                                    type="button"
                                    onClick={() => setStep((s) => s - 1)}
                                    className="px-4 py-2 rounded-lg border border-zinc-700 text-zinc-300 text-sm font-semibold hover:text-white"
                                >
                                    Back
                                </button>
                            )}

                            {step < 3 && (
                                <button
                                    type="button"
                                    onClick={() => setStep((s) => s + 1)}
                                    disabled={(step === 1 && !canGoNextFromStep1) || (step === 2 && !canGoNextFromStep2)}
                                    className="px-4 py-2 rounded-lg bg-purple-600 text-white text-sm font-semibold disabled:opacity-50"
                                >
                                    Continue
                                </button>
                            )}

                            {step === 3 && (
                                <button
                                    type="submit"
                                    disabled={loading || !canSubmit}
                                    className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold disabled:opacity-50"
                                >
                                    {loading ? "Submitting..." : "Submit Request"}
                                </button>
                            )}
                        </div>
                    </div>
                </form>
            </div>
        </section>
    );
}
