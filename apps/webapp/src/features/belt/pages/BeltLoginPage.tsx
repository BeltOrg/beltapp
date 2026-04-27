import type { FormEvent } from "react";
import { useLocation, useNavigate } from "react-router";
import { BeltUserSwitcher } from "../components/BeltUserSwitcher";
import {
  signInCurrentMvpUser,
  useCurrentMvpUser,
} from "../../../shared/auth/mvp-auth";
import { Button, Field, Surface, TextInput } from "../../../shared/ui";

function getRedirectPath(routeState: unknown): string {
  if (typeof routeState !== "object" || routeState === null) {
    return "/home";
  }

  const from = (routeState as { from?: unknown }).from;
  return typeof from === "string" && from.startsWith("/") ? from : "/home";
}

export function BeltLoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const currentUser = useCurrentMvpUser();
  const redirectPath = getRedirectPath(location.state);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    signInCurrentMvpUser();
    void navigate(redirectPath, { replace: true });
  }

  return (
    <Surface framed className="max-w-xl">
      <h2 className="m-0 text-xl font-semibold">Login</h2>
      <form className="grid gap-3" onSubmit={handleSubmit}>
        <Field label="Phone">
          <TextInput type="tel" value={currentUser.phone} readOnly />
        </Field>
        <BeltUserSwitcher />
        <Button type="submit" variant="primary">
          Continue
        </Button>
      </form>
    </Surface>
  );
}
