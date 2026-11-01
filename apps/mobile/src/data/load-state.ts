interface Read {
  data: unknown;
  isError: boolean;
  fetchStatus: "fetching" | "paused" | "idle";
}

/** Whether a read has nothing to show because it failed, or waits for a connection with nothing kept. */
const unloaded = (read: Read, online: boolean) =>
  read.data === undefined && (read.isError || (!online && read.fetchStatus === "paused"));

/** Whether any of a screen's reads could not run, so it has nothing to draw. */
export const couldNotLoad = (reads: readonly Read[], online: boolean) =>
  reads.some((read) => unloaded(read, online));
