import type { JobScores } from "../types";

interface ScoreDisplayProps {
  scores: JobScores;
}

export function ScoreDisplay({ scores }: ScoreDisplayProps) {
  return (
    <div className="space-y-4">
      {/* User Cost */}
      <ScoreBar
        label="User Cost"
        value={scores.userCost}
        rationale={scores.costRationale}
        colorScheme="cost"
      />

      {/* User Benefit */}
      <ScoreBar
        label="User Benefit"
        value={scores.userBenefit}
        rationale={scores.benefitRationale}
        colorScheme="benefit"
      />

      {/* Value ratio indicator */}
      <div className="pt-2 border-t border-gray-100">
        <ValueRatio cost={scores.userCost} benefit={scores.userBenefit} />
      </div>
    </div>
  );
}

interface ScoreBarProps {
  label: string;
  value: number;
  rationale: string;
  colorScheme: "cost" | "benefit";
}

function ScoreBar({ label, value, rationale, colorScheme }: ScoreBarProps) {
  const percentage = (value / 10) * 100;

  // Color scheme: cost is red (high = bad), benefit is green (high = good)
  const colors = {
    cost: {
      bar: getGradientClass(value, "cost"),
      text: "text-red-700",
      bg: "bg-red-50",
    },
    benefit: {
      bar: getGradientClass(value, "benefit"),
      text: "text-green-700",
      bg: "bg-green-50",
    },
  };

  const scheme = colors[colorScheme];

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className={`text-sm font-medium ${scheme.text}`}>{label}</span>
        <span className="text-sm font-bold text-gray-900">{value}/10</span>
      </div>

      {/* Bar */}
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-300 ${scheme.bar}`}
          style={{ width: `${percentage}%` }}
        />
      </div>

      {/* Rationale */}
      <p className={`mt-2 text-xs ${scheme.bg} rounded px-2 py-1.5 ${scheme.text}`}>
        {rationale}
      </p>
    </div>
  );
}

function getGradientClass(value: number, type: "cost" | "benefit"): string {
  if (type === "cost") {
    // Low cost (1-3) = green, medium (4-6) = yellow, high (7-10) = red
    if (value <= 3) return "bg-green-400";
    if (value <= 6) return "bg-yellow-400";
    return "bg-red-500";
  } else {
    // Low benefit (1-3) = red, medium (4-6) = yellow, high (7-10) = green
    if (value <= 3) return "bg-red-400";
    if (value <= 6) return "bg-yellow-400";
    return "bg-green-500";
  }
}

interface ValueRatioProps {
  cost: number;
  benefit: number;
}

function ValueRatio({ cost, benefit }: ValueRatioProps) {
  const ratio = benefit / cost;
  let assessment: { label: string; color: string; emoji: string };

  if (ratio >= 2) {
    assessment = { label: "High Value", color: "text-green-600", emoji: "🎯" };
  } else if (ratio >= 1) {
    assessment = { label: "Balanced", color: "text-blue-600", emoji: "⚖️" };
  } else if (ratio >= 0.5) {
    assessment = { label: "Low Value", color: "text-yellow-600", emoji: "⚠️" };
  } else {
    assessment = { label: "Poor Value", color: "text-red-600", emoji: "❌" };
  }

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center space-x-2">
        <span className="text-xs text-gray-500">Value Ratio:</span>
        <span className={`text-sm font-medium ${assessment.color}`}>
          {assessment.emoji} {assessment.label}
        </span>
      </div>
      <span className="text-xs text-gray-400">
        {ratio.toFixed(1)}x (benefit/cost)
      </span>
    </div>
  );
}
