import { createFileRoute } from "@tanstack/react-router";
import { Authentication } from "../docs/pages/Authentication";

export const Route = createFileRoute("/docs/authentication")({ component: Authentication });
