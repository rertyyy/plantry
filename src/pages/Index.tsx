import React, { useState } from "react";
import { motion } from "framer-motion";
import { Mail, Apple } from "lucide-react";

// Sleek, Apple-style "Work in Progress" page
// Copy this file over your existing index.tsx

export default function Index(): JSX.Element {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    if (!email) return;
    // In a real app you'd POST to your API here.
    setSent(true);
    setTimeout(() => setSent(false), 4000);
  }

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-[#0f172a] via-[#071428] to-[#041025] flex items-center justify-center p-6">
      {/* Subtle floating highlights */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.08 }}
          transition={{ duration: 1 }}
          className="absolute -left-36 -top-20 h-96 w-96 rounded-full bg-white/40 blur-3xl"
        />
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.06 }}
          transition={{ duration: 1.5 }}
          className="absolute -right-36 -bottom-24 h-80 w-80 rounded-full bg-cyan-400/30 blur-3xl"
        />
      </div>

      <motion.main
        initial={{ y: 12, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="relative z-10 max-w-2xl w-full mx-auto"
      >
        <div className="backdrop-blur-sm bg-white/6 border border-white/8 rounded-2xl shadow-2xl p-10 sm:p-12">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/8 border border-white/6">
              <Apple className="h-6 w-6 text-white/90" />
            </div>
            <div>
              <h2 className="text-3xl font-semibold leading-tight text-white">Work in progress</h2>
              <p className="mt-1 text-sm text-white/70">We’re polishing things — soon everything will be crisp and ready.</p>
            </div>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 items-center">
            {/* Left: visual/status card */}
            <div className="col-span-1 rounded-xl border border-white/6 bg-white/4 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-white/75">Current status</p>
                  <p className="mt-1 text-lg font-medium text-white">Iterating on UI & accessibility</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-white/70">ETA</p>
                  <p className="mt-1 font-medium text-white">Coming soon</p>
                </div>
              </div>

              <div className="mt-4">
                <div className="relative h-3 w-full rounded-full bg-white/8 overflow-hidden">
                  <motion.div
                    initial={{ width: "8%" }}
                    animate={{ width: ["8%", "46%", "72%", "82%"] }}
                    transition={{ duration: 6, repeat: Infinity, repeatType: "reverse" }}
                    className="absolute left-0 top-0 h-full rounded-full bg-gradient-to-r from-white/60 to-white/30"
                  />
                </div>
                <div className="mt-2 flex items-center justify-between text-xs text-white/60">
                  <span>Design → Dev → QA</span>
                  <span>~82%</span>
                </div>
              </div>
            </div>

            {/* Right: mailing form */}
            <form onSubmit={handleSubmit} className="col-span-1 rounded-xl border border-white/6 bg-gradient-to-b from-white/3 to-white/6 p-5">
              <p className="text-sm text-white/70">Want a heads up when we launch?</p>

              <div className="mt-4 flex gap-3">
                <label htmlFor="email" className="sr-only">Email</label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@applemail.com"
                  className="flex-1 min-w-0 rounded-md border border-white/8 bg-transparent py-2 px-3 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-white/20"
                />
                <button
                  type="submit"
                  aria-label="Notify me"
                  className="inline-flex items-center gap-2 rounded-md bg-white/9 px-4 py-2 text-sm font-medium text-white/90 hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-white/20"
                >
                  <Mail className="h-4 w-4" />
                  <span>{sent ? "Saved" : "Notify"}</span>
                </button>
              </div>

              <p className="mt-3 text-xs text-white/60">We’ll only contact you about this product. No spam.</p>
            </form>
          </div>

          <div className="mt-8 border-t border-white/6 pt-6 text-center">
            <p className="text-sm text-white/60">Need to access the app now?</p>
            <div className="mt-3 flex items-center justify-center gap-3">
              <a
                href="/app"
                className="rounded-md px-4 py-2 text-sm font-medium ring-1 ring-white/6 bg-transparent hover:bg-white/3"
              >
                Go to app
              </a>
              <a
                href="/status"
                className="rounded-md px-4 py-2 text-sm font-medium bg-white/8 hover:bg-white/12"
              >
                System status
              </a>
            </div>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-white/40">Built with care • {new Date().getFullYear()}</p>
      </motion.main>
    </div>
  );
}
