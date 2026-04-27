import { BeltUserSwitcher } from "../components/BeltUserSwitcher";

type BeltLoginPageProps = {
  onNavigate: (nextPath: string) => void;
};

export function BeltLoginPage({ onNavigate }: BeltLoginPageProps) {
  return (
    <section className="belt-panel belt-panel--narrow">
      <h2>Login</h2>
      <form className="belt-form">
        <label className="belt-field">
          <span>Phone</span>
          <input type="tel" defaultValue="+3725550001" />
        </label>
        <BeltUserSwitcher onNavigate={onNavigate} />
        <button
          type="button"
          className="belt-button belt-button--primary"
          onClick={() => onNavigate("/home")}
        >
          Continue
        </button>
      </form>
    </section>
  );
}
