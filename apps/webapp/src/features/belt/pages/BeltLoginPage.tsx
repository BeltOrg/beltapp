import { type FormEvent, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import {
  AuthApiError,
  loginWithPassword,
  registerWithPassword,
} from "../../../shared/auth/auth-api";
import { getAuthRedirectPath } from "../../../shared/auth/redirect";
import type { UserRole } from "../../../shared/auth/session";
import { Alert, Button, Field, Surface, TextInput } from "../../../shared/ui";

type AuthMode = "login" | "register";

export function BeltLoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const redirectPath = getAuthRedirectPath(location.state);
  const [mode, setMode] = useState<AuthMode>("login");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [roles, setRoles] = useState<UserRole[]>(["OWNER"]);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      if (mode === "login") {
        await loginWithPassword({ phone, password });
      } else {
        await registerWithPassword({ phone, password, roles });
      }

      void navigate(redirectPath, { replace: true });
    } catch (submitError) {
      setError(
        submitError instanceof AuthApiError
          ? submitError.message
          : "Authentication failed.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  function toggleRole(role: UserRole): void {
    setRoles((currentRoles) => {
      if (currentRoles.includes(role)) {
        const nextRoles = currentRoles.filter((item) => item !== role);
        return nextRoles.length > 0 ? nextRoles : currentRoles;
      }

      return [...currentRoles, role];
    });
  }

  return (
    <Surface framed className="max-w-xl">
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant={mode === "login" ? "primary" : "secondary"}
          onClick={() => setMode("login")}
        >
          Login
        </Button>
        <Button
          type="button"
          variant={mode === "register" ? "primary" : "secondary"}
          onClick={() => setMode("register")}
        >
          Register
        </Button>
      </div>
      <h2 className="m-0 text-xl font-semibold">
        {mode === "login" ? "Login" : "Create account"}
      </h2>
      <form
        aria-busy={isSubmitting}
        className="grid gap-3"
        onSubmit={handleSubmit}
      >
        {error ? <Alert>{error}</Alert> : null}
        <Field label="Phone">
          <TextInput
            type="tel"
            autoComplete="tel"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            required
          />
        </Field>
        <Field label="Password">
          <TextInput
            type="password"
            autoComplete={
              mode === "login" ? "current-password" : "new-password"
            }
            minLength={8}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </Field>
        {mode === "register" ? (
          <fieldset className="grid gap-2 border-0 p-0" disabled={isSubmitting}>
            <legend className="text-sm font-semibold text-muted-foreground">
              Roles
            </legend>
            <label className="flex items-center gap-2 text-sm font-semibold">
              <input
                type="checkbox"
                checked={roles.includes("OWNER")}
                onChange={() => toggleRole("OWNER")}
              />
              Owner
            </label>
            <label className="flex items-center gap-2 text-sm font-semibold">
              <input
                type="checkbox"
                checked={roles.includes("WALKER")}
                onChange={() => toggleRole("WALKER")}
              />
              Walker
            </label>
          </fieldset>
        ) : null}
        <Button type="submit" variant="primary">
          {isSubmitting
            ? "Working..."
            : mode === "login"
              ? "Login"
              : "Create account"}
        </Button>
      </form>
    </Surface>
  );
}
