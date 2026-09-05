import { createFileRoute } from "@tanstack/react-router";
import { Recipes } from "../docs/pages/Recipes";

export const Route = createFileRoute("/docs/recipes")({ component: Recipes });
