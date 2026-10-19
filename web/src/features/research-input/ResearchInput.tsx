interface ResearchInputProps {
  value: string;
  onValueChange: (value: string) => void;
  onSubmit: () => void;
  onFileSelected: (file: File) => void;
  isProcessing?: boolean;
  error?: string | null;
}

export function ResearchInput({
  value,
  onValueChange,
  onSubmit,
  onFileSelected,
  isProcessing = false,
  error = null,
}: ResearchInputProps) {
  return (
    <section className="workflow-card" aria-labelledby="research-input-title">
      <div className="section-heading">
        <div>
          <p className="section-kicker">Step 1</p>
          <h2 id="research-input-title">Describe your research</h2>
        </div>
        <span className="privacy-pill">Processed locally</span>
      </div>
      <p className="section-copy">
        Paste a project idea or upload a text-based research paper. Your file
        stays in this browser.
      </p>
      <form
        className="research-form"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
      >
        <label htmlFor="research-description">Research idea or description</label>
        <textarea
          id="research-description"
          value={value}
          onChange={(event) => onValueChange(event.target.value)}
          placeholder="Example: I want to classify retinal images for diabetic retinopathy..."
          rows={7}
        />
        <div className="input-actions">
          <label className="file-picker">
            <span>Upload PDF or DOCX</span>
            <input
              type="file"
              accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) onFileSelected(file);
                event.currentTarget.value = "";
              }}
            />
          </label>
          <button
            type="submit"
            className="primary-button"
            disabled={isProcessing || value.trim().length === 0}
          >
            {isProcessing ? "Reading document..." : "Analyze my research"}
          </button>
        </div>
      </form>
      {error ? (
        <p className="inline-error" role="alert">
          {error}
        </p>
      ) : null}
    </section>
  );
}
