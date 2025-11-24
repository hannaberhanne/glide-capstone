import { useState } from "react";
import "./OnboardingPage.css";

export default function OnboardingPage() {
  const [step, setStep] = useState(1);
  const [answers, setAnswers] = useState({});
  const [finished, setFinished] = useState(false);
  const totalSteps = 5;

  const questions = [
    {
      id: 1,
      question: "What’s your main reason for using Glide+?",
      type: "multiple",
      options: [
        "Stay organized and manage my time better",
        "Keep track of classes, deadlines, and exams",
        "Reduce stress and avoid burnout",
        "Build productive habits and routines",
        "Other",
      ],
    },
    {
      id: 2,
      question: "Which area would you like Glide+ to help you improve most?",
      type: "multiple",
      options: [
        "Time management and scheduling",
        "Focus and motivation",
        "Consistency and routine-building",
        "Mental health and balance",
        "Other",
      ],
    },
    {
      id: 3,
      question: "How do you usually plan your week?",
      type: "multiple",
      options: [
        "I use a planner or calendar app",
        "I write things down manually",
        "I mostly keep it in my head",
        "I go with the flow",
        "Other",
      ],
    },
    {
      id: 4,
      question: "What motivates you to stay on track?",
      type: "multiple",
      options: [
        "Achieving goals and progress milestones",
        "Encouragement or reminders",
        "Rewards, streaks, or gamified achievements",
        "Accountability and teamwork",
        "Other",
      ],
    },
    {
      id: 5,
      question: "What’s one big goal you’d like to accomplish?",
      type: "text",
    },
  ];

  const current = questions[step - 1];

  // canvas sync question
  if (finished) {
    return (
      <div className="onboarding-container">
        <div className="onboarding-card" style={{ textAlign: "center" }}>
          
          <h2 className="onboarding-question">Sync your Canvas account?</h2>
  
          <p style={{ marginBottom: "30px", fontSize: "18px" }}>
            You can automatically import assignments and class data from Canvas.
          </p>
  
          <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
            
            {/* YES BUTTON → Canvas setup page (placeholder for now) */}
            <a
              href="/canvas-setup"
              className="onboarding-next"
              style={{ textDecoration: "none", display: "inline-block" }}
            >
              Yes, sync Canvas →
            </a>
  
            {/* NO BUTTON → Dashboard */}
            <a
              href="/dashboard"
              className="onboarding-back"
              style={{
                textDecoration: "none",
                display: "inline-block",
                textAlign: "center",
              }}
            >
              No thanks
            </a>
  
          </div>
        </div>
      </div>
    );
  }  

  return (
    <div className="onboarding-container">
      {/* Logo */}
      <div className="onboarding-logo">
        Glide<span>+</span>
      </div>

      {/* Step Indicator */}
      <p className="onboarding-step">
        Step {step} of {totalSteps}
      </p>

      {/* Main Card */}
      <div className="onboarding-card">
        <h2 className="onboarding-question">{current.question}</h2>

        <div className="onboarding-choices">
          {/* MULTIPLE CHOICE */}
          {current.type === "multiple" &&
            current.options.map((opt) => (
              <label key={opt} className="onboarding-option">
                <input
                  type="radio"
                  name={`step-${step}`}
                  value={opt}
                  checked={answers[step] === opt}
                  onChange={() =>
                    setAnswers((prev) => ({ ...prev, [step]: opt }))
                  }
                />
                {opt}
              </label>
            ))}

          {/* TEXT INPUT */}
          {current.type === "text" && (
            <textarea
              className="onboarding-textarea"
              placeholder="Type your answer..."
              value={answers[step] || ""}
              onChange={(e) =>
                setAnswers((prev) => ({ ...prev, [step]: e.target.value }))
              }
            />
          )}
        </div>
      </div>

      {/* ⭐ Back + Next row under card */}
      <div className="onboarding-nav">
        {step > 1 ? (
          <button
            className="onboarding-back"
            onClick={() => setStep(step - 1)}
          >
            ← Back
          </button>
        ) : (
          <div></div> // keeps layout aligned
        )}

        <button
          className="onboarding-next"
          disabled={!answers[step]}
          onClick={() => {
            if (step < totalSteps) {
              setStep(step + 1);
            } else {
              setFinished(true);
            }
          }}
        >
          {step === totalSteps ? "Finish" : "Next →"}
        </button>
      </div>
    </div>
  );
}
