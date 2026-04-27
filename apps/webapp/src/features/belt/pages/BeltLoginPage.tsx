import { BeltUserSwitcher } from "../components/BeltUserSwitcher";
import { Button, Field, Surface, TextInput } from "../../../shared/ui";

type BeltLoginPageProps = {
  onNavigate: (nextPath: string) => void;
};

export function BeltLoginPage({ onNavigate }: BeltLoginPageProps) {
  return (
    <Surface framed className="max-w-xl">
      <h2 className="m-0 text-xl font-semibold">Login</h2>
      <form className="grid gap-3">
        <Field label="Phone">
          <TextInput type="tel" defaultValue="+3725550001" />
        </Field>
        <BeltUserSwitcher onNavigate={onNavigate} />
        <Button variant="primary" onClick={() => onNavigate("/home")}>
          Continue
        </Button>
      </form>
    </Surface>
  );
}
