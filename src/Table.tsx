import React, { FC, ReactNode } from "react";
import { range } from "./util";

export type Props = {
  columns: number;
  hideColumnIndicators?: boolean;
  children: ReactNode;
};

const Table: FC<Props> = ({
  children,
  columns,
  hideColumnIndicators
}: Props) => {
  const columnIndicatorsShown = !hideColumnIndicators;
  const columnNodes = range(columns + Number(columnIndicatorsShown)).map(i => (
    <col key={i} />
  ));
  return (
    <table className="SpreadsheetTable">
      <colgroup>{columnNodes}</colgroup>
      <tbody>{children}</tbody>
    </table>
  );
};

export default Table;
