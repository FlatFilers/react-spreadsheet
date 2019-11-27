import React, { ReactNode } from "react";

export type Props = {
  children: ReactNode;
};

export default ({ children }: Props) => <tr>{children}</tr>;
