import {
  MVP_USERS,
  setCurrentMvpUserId,
  useCurrentMvpUser,
} from "../../../shared/auth/mvp-auth";
import { Field, SelectInput } from "../../../shared/ui";

type BeltUserSwitcherProps = {
  onNavigate?: (nextPath: string) => void;
};

export function BeltUserSwitcher({ onNavigate }: BeltUserSwitcherProps) {
  const currentUser = useCurrentMvpUser();

  return (
    <Field label="MVP session">
      <SelectInput
        value={currentUser.id}
        onChange={(event) => {
          setCurrentMvpUserId(Number(event.target.value));
          onNavigate?.("/home");
        }}
      >
        {MVP_USERS.map((user) => (
          <option key={user.id} value={user.id}>
            {user.label} - {user.phone}
          </option>
        ))}
      </SelectInput>
    </Field>
  );
}
