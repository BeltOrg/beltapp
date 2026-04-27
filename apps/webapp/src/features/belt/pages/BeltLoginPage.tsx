import { useNavigate } from "react-router";
import { BeltUserSwitcher } from "../components/BeltUserSwitcher";
import { Button, Field, Surface, TextInput } from "../../../shared/ui";

export function BeltLoginPage() {
  const navigate = useNavigate();

  return (
    <Surface framed className="max-w-xl">
      <h2 className="m-0 text-xl font-semibold">Login</h2>
      <form className="grid gap-3">
        <Field label="Phone">
          <TextInput type="tel" defaultValue="+3725550001" />
        </Field>
        <BeltUserSwitcher onNavigate={(nextPath) => void navigate(nextPath)} />
        <Button variant="primary" onClick={() => void navigate("/home")}>
          Continue
        </Button>
      </form>
    </Surface>
  );
}
