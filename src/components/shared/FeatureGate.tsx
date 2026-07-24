"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { usePlan } from "@/components/providers/PlanProvider";

interface FeatureGateProps {
  children: React.ReactNode;
  feature?: string;
  requiredPlan?: string;
}

export default function FeatureGate({ children, feature, requiredPlan = "Starter" }: FeatureGateProps) {
  const { plan } = usePlan();
  const router = useRouter();

  if (plan === "free" || plan === "anonymous") {
    return (
      <motion.div
        className="flex flex-col items-center justify-center rounded-2xl p-10 text-center relative overflow-hidden"
        style={{
          background: "var(--bg-secondary)",
          border: "1px solid var(--border)",
          minHeight: 320,
        }}
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
      >
        {/* Decorative gradient orb */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div
            className="absolute w-64 h-64 rounded-full blur-[80px] opacity-20"
            style={{ background: "var(--accent)", top: "-20%", left: "50%", transform: "translateX(-50%)" }}
          />
        </div>

        <motion.div
          className="w-16 h-16 rounded-2xl mb-5 flex items-center justify-center relative z-10"
          style={{ background: "var(--accent-muted)", border: "1px solid var(--border-accent)" }}
          animate={{ rotate: [0, -5, 5, -3, 0] }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </motion.div>

        <motion.h3
          className="text-lg font-bold mb-2 relative z-10"
          style={{ color: "var(--text-primary)" }}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.35 }}
        >
          {feature ? `${feature}` : "This feature"} requires {requiredPlan}
        </motion.h3>

        <motion.p
          className="text-sm mb-6 relative z-10 max-w-xs"
          style={{ color: "var(--text-muted)" }}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.35 }}
        >
          Upgrade to {requiredPlan} to unlock this feature and more.
        </motion.p>

        <motion.button
          onClick={() => router.push("/pricing")}
          className="px-8 py-3 rounded-xl text-sm font-semibold relative z-10"
          style={{ background: "var(--accent)", color: "white", boxShadow: "0 4px 20px rgba(129,140,248,0.3)" }}
          whileHover={{ scale: 1.03, boxShadow: "0 6px 28px rgba(129,140,248,0.4)" }}
          whileTap={{ scale: 0.97 }}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.35 }}
        >
          View Plans
        </motion.button>
      </motion.div>
    );
  }

  return <>{children}</>;
}
