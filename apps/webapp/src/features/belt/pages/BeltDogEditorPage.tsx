type BeltDogEditorPageProps = {
  mode: "create" | "edit";
};

export function BeltDogEditorPage({ mode }: BeltDogEditorPageProps) {
  return (
    <section className="belt-panel">
      <h2>{mode === "create" ? "Add dog" : "Edit dog"}</h2>
      <form className="belt-form">
        <label className="belt-field">
          <span>Name</span>
          <input name="name" type="text" />
        </label>
        <label className="belt-field">
          <span>Size</span>
          <select name="size" defaultValue="MEDIUM">
            <option value="SMALL">Small</option>
            <option value="MEDIUM">Medium</option>
            <option value="LARGE">Large</option>
          </select>
        </label>
        <label className="belt-field">
          <span>Notes</span>
          <textarea name="notes" rows={5} />
        </label>
        <button type="button" className="belt-button belt-button--primary">
          Save dog
        </button>
      </form>
    </section>
  );
}
