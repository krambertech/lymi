import { useRouter } from "expo-router";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useDoor } from "../../auth/door";
import { Brand, DevSignIn, DoorButtons, Pool } from "../../auth/door-parts";
import type { Step } from "../../auth/use-sign-in";

/**
 * The welcome screen never moves once it has arrived: the lantern lights the room, then the ways
 * in rise under the thumb. Email opens on its own screen, top-aligned.
 */
export default function Welcome() {
  const door = useDoor();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const open = (step: Exclude<Step, "doors">) => {
    door.goTo(step);
    router.push("/email");
  };
  return (
    <View className="flex-1 bg-canvas">
      <Pool className="-inset-x-10 -top-40 h-[70%]" />
      <View className="flex-1 items-center justify-center px-5" style={{ paddingTop: insets.top }}>
        <Brand />
      </View>
      <View className="gap-1 px-5" style={{ paddingBottom: insets.bottom + 8 }}>
        <DoorButtons door={door} open={open} />
        <DevSignIn />
      </View>
    </View>
  );
}
