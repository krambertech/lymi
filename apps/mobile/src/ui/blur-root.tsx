import type { ReactNode } from "react";

interface Props {
  children: ReactNode;
  over?: ReactNode;
}

export function BlurRoot({ children, over }: Props) {
  return (
    <>
      {children}
      {over}
    </>
  );
}
