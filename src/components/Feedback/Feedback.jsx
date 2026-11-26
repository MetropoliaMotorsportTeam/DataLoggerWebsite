import { useEffect, useId, useRef, useState } from "react";
import { getApiBase, getAuthHeaders, handleUnauthorized } from '../../utils/api';
import "./FeedbackWidget.css";

const API_URL = getApiBase();

const SUBJECT_SUGGESTIONS = [
  "Dashboard",
  "Firmware",
  "Data Monitoring",
  "Car Settings",
  "Sessions",
  "Packing List",
  "Pedal Mapping",
  "Other",
];

export default function Feedback({
  onSubmit,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [feedback, setFeedback] = useState("");
  const [status, setStatus] = useState("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const tabRef = useRef(null);
  const feedbackRef = useRef(null);

  const panelId = useId();
  const headingId = useId();
  const subjectId = useId();
  const subjectHintId = `${subjectId}-hint`;
  const subjectListId = useId();
  const feedbackId = useId();

  const isSubmitting = status === "submitting";

  useEffect(() => {
    if (isOpen) {
      feedbackRef.current?.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        setIsOpen(false);
        tabRef.current?.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  function openWidget() {
    setStatus("idle");
    setErrorMessage("");
    setIsOpen(true);
  }

  function closeWidget() {
    setIsOpen(false);
    tabRef.current?.focus();
  }

  function handleToggle() {
    if (isOpen) {
      setIsOpen(false);
    } else {
      openWidget();
    }
  }

  function handleSubjectChange(event) {
    setSubject(event.target.value);
    setStatus("idle");
    setErrorMessage("");
  }

  function handleFeedbackChange(event) {
    setFeedback(event.target.value);
    setStatus("idle");
    setErrorMessage("");
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const cleanSubject = subject.trim();
    const cleanFeedback = feedback.trim();

    if (!cleanSubject || !cleanFeedback) {
      setStatus("error");
      setErrorMessage("Please enter a subject and some feedback.");
      return;
    }

    setStatus("submitting");
    setErrorMessage("");

    const payload = {
      component: cleanSubject,
      feedback: cleanFeedback,
    };

    try {
      if (onSubmit) {
        await onSubmit(payload);
      } else {
        const response = await fetch(`${API_URL}/feedback`, {
          method: "POST",
          headers: {
            "Content-Type":"application/json",
            ...getAuthHeaders(),
          }, 
          body: JSON.stringify(payload)
        });
        if (response.status === 401) {
                handleUnauthorized(res);
                return;
              }
        if (!response.ok) {
          throw new Error(
            `Feedback submission failed with status ${response.status}`
          );
        }
      }

      setSubject("");
      setFeedback("");
      setStatus("success");
    } catch {
      setStatus("error");
      setErrorMessage(
        "Your feedback could not be sent. Please try again."
      );
    }
  }

  return (
    <div className="feedback-widget">
      {isOpen && (
        <div
          className="feedback-widget__panel"
          id={panelId}
          role="dialog"
          aria-labelledby={headingId}
        >
          <div className="feedback-widget__header">
            <h2 id={headingId}>Send feedback</h2>

            <button
              type="button"
              className="feedback-widget__close"
              onClick={closeWidget}
              aria-label="Close feedback form"
            >
              ×
            </button>
          </div>

          <form onSubmit={handleSubmit} aria-busy={isSubmitting}>
            <div className="feedback-widget__field">
              <label htmlFor={subjectId}>Subject</label>

              <p
                className="feedback-widget__hint"
                id={subjectHintId}
              >
                Choose a suggestion or type your own subject.
              </p>

              <input
                id={subjectId}
                type="text"
                list={subjectListId}
                value={subject}
                onChange={handleSubjectChange}
                aria-describedby={subjectHintId}
                autoComplete="off"
                placeholder="Choose or type a subject"
                maxLength={120}
                disabled={isSubmitting}
                required
              />

              <datalist id={subjectListId}>
                {SUBJECT_SUGGESTIONS.map((option) => (
                  <option key={option} value={option} />
                ))}
              </datalist>
            </div>

            <div className="feedback-widget__field">
              <label htmlFor={feedbackId}>Feedback</label>

              <textarea
                ref={feedbackRef}
                id={feedbackId}
                value={feedback}
                onChange={handleFeedbackChange}
                placeholder="Tell us what worked, what didn't, or what you'd like to see..."
                rows={6}
                maxLength={5000}
                disabled={isSubmitting}
                required
              />
            </div>

            {status === "success" && (
              <p
                className="feedback-widget__status feedback-widget__status--success"
                role="status"
              >
                Thanks! Your feedback was sent.
              </p>
            )}

            {status === "error" && (
              <p
                className="feedback-widget__status feedback-widget__status--error"
                role="alert"
              >
                {errorMessage}
              </p>
            )}

            <div className="feedback-widget__actions">
              <button
                type="submit"
                className="feedback-widget__submit"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Sending…" : "Send feedback"}
              </button>
            </div>
          </form>
        </div>
      )}

      <button
        ref={tabRef}
        type="button"
        className="feedback-widget__tab"
        onClick={handleToggle}
        aria-expanded={isOpen}
        aria-controls={isOpen ? panelId : undefined}
        aria-haspopup="dialog"
      >
        Feedback
      </button>
    </div>
  );
}
