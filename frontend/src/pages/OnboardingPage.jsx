import { useState } from "react";
import { Link } from "react-router-dom";
import "./OnboardingPage.css";

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

const totalSteps = questions.length;

export default function OnboardingPage() {
  const [step, setStep] = useState(1);
  const [answers, setAnswers] = useState({});
  const [finished, setFinished] = useState(false);

  const current = questions[step - 1];

  const handleNext = () => {
    if (!answers[step]) return;
    if (step < totalSteps) {
      setStep(step + 1);
    } else {
      setFinished(true);
    }
  };

  if (finished) {
    return (
      <div className="onboarding-container">
        <div className="onboarding-card onboarding-card--centered">
          <div className="onboarding-header">
            <h1>Sync Canvas</h1>
            <p>Bring assignments, deadlines, and course data into Glide+ automatically.</p>
          </div>

          <h2 className="onboarding-question">Sync your Canvas account?</h2>
          <p className="onboarding-sub">
            Staying in sync with Canvas helps Glide+ understand your academic load and surface smarter suggestions.
          </p>

          <div className="onboarding-choices onboarding-choices--stacked">
            <Link to="/canvas-setup" className="onboarding-primary-btn">
              Yes, sync Canvas →
            </Link>
            <Link to="/dashboard" className="onboarding-backbtn">
              No thanks
            </Link>
          </div>

          <p className="onboarding-footer">
            Need an account?{" "}
            <Link to="/signup" className="onboarding-link">
              Sign up here
            </Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="onboarding-container">
      <div className="onboarding-card">
        <div className="onboarding-header">
          <h1>Personalize Glide+</h1>
          <p>Five quick questions to tailor the experience to your goals.</p>
        </div>

        <p className="onboarding-step">
          Step {step} of {totalSteps}
        </p>

        <h2 className="onboarding-question">{current.question}</h2>

        <div className="onboarding-choices">
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
                <span className="onboarding-option-text">{opt}</span>
              </label>
            ))}

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

        <div className="onboarding-nav">
          <button
            className="onboarding-backbtn"
            type="button"
            onClick={() => setStep(Math.max(1, step - 1))}
            disabled={step === 1}
          >
            ← Back
          </button>
          <button
            className="onboarding-primary-btn"
            type="button"
            disabled={!answers[step]}
            onClick={handleNext}
          >
            {step === totalSteps ? "Finish" : "Next →"}
          </button>
        </div>
      </div>
    </div>
  );
}
