const LESSON_MODULE = /\/apps\/site\/src\/(?:components\/learn|lib\/learn|locales\/learn)\//;
const LESSON_ENTRY =
  /\/components\/islands\/(?:LearnHubPage|LearnLessonPage|LearnReload|LearnReviewPage|LessonKitPage|LessonKitReload)\.tsx$/;

/** @type {(bundle: Record<string, { type: string, fileName: string, moduleIds?: string[], imports?: string[], isEntry?: boolean, facadeModuleId?: string | null }>) => string[]} */
export const leakedLessonChunks = (bundle) => {
  const entries = Object.values(bundle).filter(
    (output) =>
      output.type === "chunk" && output.isEntry && !LESSON_ENTRY.test(output.facadeModuleId ?? ""),
  );
  return entries.flatMap((entry) => {
    const queue = [entry.fileName];
    const seen = new Set();
    while (queue.length > 0) {
      const name = queue.pop();
      const output = name === undefined || seen.has(name) ? undefined : bundle[name];
      if (!output || name === undefined) continue;
      seen.add(name);
      const module = output.moduleIds?.find((id) => LESSON_MODULE.test(id));
      if (module) return [`${entry.facadeModuleId ?? entry.fileName} loads ${module}`];
      queue.push(...(output.imports ?? []));
    }
    return [];
  });
};

export function lessonIsolation() {
  return {
    name: "lesson-isolation",
    generateBundle(_options, bundle) {
      if (this.environment?.name !== "client") return;
      const leaked = leakedLessonChunks(bundle);
      if (leaked.length > 0)
        this.error(`Estonian lesson code would load on other pages:\n${leaked.join("\n")}`);
    },
  };
}
