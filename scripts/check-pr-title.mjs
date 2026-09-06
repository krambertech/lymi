const title = process.argv.slice(2).join(" ").trim();
const allowedTypes = "feat|fix|docs|refactor|test|perf|build|ci|chore|revert";
const pattern = new RegExp(`^(${allowedTypes})\\([a-z0-9]+(?:-[a-z0-9]+)*\\)!?: [a-z0-9].*[^.]$`);

const errors = [];

if (!title) {
  errors.push("the title is empty");
}

if (title.length > 72) {
  errors.push(`the title is ${title.length} characters; the maximum is 72`);
}

if (title.includes("\n") || !pattern.test(title)) {
  errors.push("expected type(scope): imperative summary with no final period");
}

if (errors.length > 0) {
  console.error(`Invalid pull request title: ${JSON.stringify(title)}`);
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  console.error("Example: feat(review): add keyboard grading");
  process.exit(1);
}

console.log(`Valid pull request title: ${title}`);
