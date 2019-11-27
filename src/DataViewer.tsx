import React, { Component, FC, ReactNode } from "react";
import { ICellComponentProps } from "./types";

type Cell = {
  component?: Component<{
    row: number;
    column: number;
    value: ReactNode;
  }>;
};

type Props = ICellComponentProps<Cell, ReactNode> & {
  formulaParser: any; // FormulaParser for hot-formula-parser
};

const toView = (value: ReactNode) => {
  if (value === false) {
    return <div className="boolean">FALSE</div>;
  }
  if (value === true) {
    return <div className="boolean">TRUE</div>;
  }

  return value;
};

const DataViewer: FC<Props> = ({
  getValue,
  cell,
  column,
  row,
  formulaParser
}: Props) => {
  const rawValue = getValue({ data: cell, column, row });
  if (typeof rawValue === "string" && rawValue.startsWith("=")) {
    const { result, error } = formulaParser.parse(rawValue.slice(1));
    return error || toView(result);
  }

  return toView(rawValue);
};

export default DataViewer;
