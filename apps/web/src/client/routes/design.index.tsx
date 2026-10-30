import { createFileRoute } from "@tanstack/react-router";
import { Overview } from "../design/home";

export const Route = createFileRoute("/design/")({ component: Overview });
