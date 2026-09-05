import { createFileRoute } from "@tanstack/react-router";
import { Cards } from "../docs/pages/Cards";

export const Route = createFileRoute("/docs/cards")({ component: Cards });
