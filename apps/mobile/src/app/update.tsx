import { useUpdateRequired } from "@lymi/client/update-required";
import { UpdateLymi } from "../update/update-lymi";

export default function Update() {
  const update = useUpdateRequired();
  return update ? <UpdateLymi state={update} /> : null;
}
