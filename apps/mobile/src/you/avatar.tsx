import { apiUrl } from "@lymi/client/api";
import { avatarQuery } from "@lymi/client/queries";
import { useQuery } from "@tanstack/react-query";
import { Image, View } from "react-native";
import { useSessionHeaders } from "../auth/client";
import { Text } from "../ui/primitives";

interface Props {
  name: string | undefined;
  size: number;
  /** Dimmed while a new photo uploads. */
  pending?: boolean;
}

/** The learner's photo, fetched with their session, or their initial until there is one. */
export function Avatar({ name, size, pending = false }: Props) {
  const version = useQuery(avatarQuery).data?.version;
  const headers = useSessionHeaders();
  const box = { width: size, height: size, borderRadius: size / 2, opacity: pending ? 0.5 : 1 };
  if (version && headers) {
    return (
      <Image
        source={{ uri: apiUrl(`/api/avatar/${version}`), headers }}
        style={box}
        className="border border-edge bg-plate-2"
        accessible={false}
      />
    );
  }
  return (
    <View style={box} className="items-center justify-center border border-edge bg-plate-2">
      <Text className={`font-medium text-text-2 ${size >= 80 ? "text-3xl" : "text-xl"}`}>
        {name?.trim().charAt(0).toUpperCase()}
      </Text>
    </View>
  );
}
